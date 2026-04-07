from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, Request, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func, or_, and_
from typing import Optional, List, Dict
import redis.asyncio as redis
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import pandas as pd
import os
import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from jose import JWTError, jwt
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
import secrets

from config import settings
from database import get_db, create_tables, async_session
from auth import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    authenticate_user,
    get_password_hash,
    verify_password
)
from models import User, GameSession, Achievement, UserAchievement, DailyStat, UserGoal, LeaderboardEntry, StreakData, Friendship, HeadToHeadChallenge
from schemas import (
    UserCreate, UserResponse, UserLogin, TokenResponse,
    GameSessionCreate, GameSessionResponse,
    AchievementResponse, UserAchievementResponse,
    DailyStatResponse, AnalyticsSummary, GameRecommendation,
    GoalCreateRequest, GoalResponse,
    DifficultyRequest, DifficultyResponse,
    PatternAnalysisRequest,
    UserSyncRequest, TelemetryEventIn, TelemetryBatch,
    FriendRequestCreate, FriendRequestResponse, FriendPublicInfo,
    H2HChallengeCreate, H2HChallengeResponse,
    SubscriptionUpgrade, SubscriptionStatus,
    UserResponseV2, DifficultySuggestResponse,
)
from cognitive_ml_service import get_ml_service, CognitiveMLService
from sanitize import sanitize_game_type, clamp, check_score_anomaly

# Async context manager for app lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await create_tables()
    # Seed achievements using a fresh session
    async with async_session() as seed_db:
        existing = await seed_db.execute(select(Achievement))
        if not existing.scalars().first():
            seed_achievements = [
                Achievement(achievement_id="first_game", name="First Steps", description="Complete your first game", icon="🎯", requirement_type="games", requirement_value=1),
                Achievement(achievement_id="ten_games", name="Getting Started", description="Complete 10 games", icon="🎮", requirement_type="games", requirement_value=10),
                Achievement(achievement_id="hundred_games", name="Century Club", description="Complete 100 games", icon="💯", requirement_type="games", requirement_value=100),
                Achievement(achievement_id="score_1000", name="High Scorer", description="Score 1000 points in a single game", icon="⭐", requirement_type="score", requirement_value=1000),
                Achievement(achievement_id="score_5000", name="Legendary", description="Score 5000 points in a single game", icon="👑", requirement_type="score", requirement_value=5000),
                Achievement(achievement_id="perfect_accuracy", name="Perfectionist", description="Achieve 100% accuracy", icon="🎯", requirement_type="accuracy", requirement_value=100),
            ]
            for a in seed_achievements:
                seed_db.add(a)
            await seed_db.commit()
    yield
    # Shutdown — close Redis pool
    await redis_client.aclose()

# Initialize FastAPI with async lifespan
app = FastAPI(
    title="Ygy Clone API",
    version="1.0.0",
    docs_url="/api/docs",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gzip compression for responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Redis client
redis_client = redis.from_url(settings.redis_url, decode_responses=True)

# Connection manager for WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)

manager = ConnectionManager()

# ══════════════════════════════════════════════════════════════════
#  SUBSCRIPTION TIER CONFIG (defined early — used as Depends)
# ══════════════════════════════════════════════════════════════════
TIER_LIMITS: dict = {
    "free":    {"daily_games": 5,  "ai_recommendations": False, "multiplayer": False},
    "pro":     {"daily_games": 20, "ai_recommendations": True,  "multiplayer": True},
    "premium": {"daily_games": -1, "ai_recommendations": True,  "multiplayer": True},
}


async def _daily_games_used(user_id: int, db: AsyncSession) -> int:
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(DailyStat).where(DailyStat.user_id == user_id, DailyStat.date == today)
    )
    stat = result.scalars().first()
    return stat.games_played if stat else 0


async def check_daily_limit(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dependency: raises 429 if the user has exceeded their daily game limit."""
    limits = TIER_LIMITS.get(current_user.subscription_tier, TIER_LIMITS["free"])
    if limits["daily_games"] == -1:
        return  # unlimited
    used = await _daily_games_used(current_user.id, db)
    if used >= limits["daily_games"]:
        raise HTTPException(
            status_code=429,
            detail=f"Daily game limit ({limits['daily_games']}) reached for your '{current_user.subscription_tier}' plan. Upgrade to play more."
        )


# Rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# API Endpoints
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/health/ready")
async def readiness_check():
    """Kubernetes readiness probe - checks dependencies"""
    from sqlalchemy import text
    checks = {
        "database": False,
        "redis": False
    }

    # Check database
    try:
        async with get_db() as db:
            await db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        pass

    # Check Redis
    try:
        await redis_client.ping()
        checks["redis"] = True
    except Exception:
        pass

    all_healthy = all(checks.values())

    if not all_healthy:
        raise HTTPException(status_code=503, detail=checks)

    return {"status": "ready", "checks": checks}

@app.post("/api/auth/register", response_model=TokenResponse)
@limiter.limit("3/minute")
async def register(request: Request, user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(
        select(User).where((User.email == user.email) | (User.username == user.username))
    )
    existing_user = result.scalars().first()
    if existing_user:
        if existing_user.email == user.email:
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            raise HTTPException(status_code=400, detail="Username already taken")

    # Create new user
    hashed_password = get_password_hash(user.password)
    verification_token = secrets.token_hex(32)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        is_verified=False,
        verification_token=verification_token,
        cognitive_profile={
            "memory": 50.0,
            "speed": 50.0,
            "attention": 50.0,
            "flexibility": 50.0,
            "problem_solving": 50.0
        }
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    import logging as _log
    _log.getLogger(__name__).info("VERIFY TOKEN for %s: %s", db_user.email, verification_token)

    # Create tokens
    access_token = create_access_token(data={"sub": str(db_user.id)})
    refresh_token = create_refresh_token(data={"sub": str(db_user.id)})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@app.post("/api/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, user: UserLogin, db: AsyncSession = Depends(get_db)):
    # Authenticate user
    db_user = await authenticate_user(user.email, user.password, db)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create tokens
    access_token = create_access_token(data={"sub": str(db_user.id)})
    refresh_token = create_refresh_token(data={"sub": str(db_user.id)})

    # Track login in Redis
    await redis_client.setex(f"session:{db_user.id}", 3600, datetime.utcnow().isoformat())

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@app.post("/api/auth/refresh")
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        token_type = payload.get("type")
        if token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access_token = create_access_token(data={"sub": user_id})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/games/session", response_model=GameSessionResponse)
async def record_session(
    session: GameSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ml_service: CognitiveMLService = Depends(get_ml_service),
    _limit: None = Depends(check_daily_limit),
):
    user_id = current_user.id

    # Sanitize inputs
    try:
        game_type = sanitize_game_type(session.game_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid game type")
    score = int(clamp(session.score, 0, 100_000))
    accuracy = round(clamp(session.accuracy, 0.0, 100.0), 2)
    duration = int(clamp(session.duration_seconds, 0, 7200))
    difficulty = int(clamp(session.difficulty_level, 1, 10))

    # Create game session
    db_session = GameSession(
        user_id=user_id,
        game_type=game_type,
        score=score,
        accuracy=accuracy,
        duration_seconds=duration,
        difficulty_level=difficulty,
        cognitive_area=session.cognitive_area
    )
    db.add(db_session)

    # Update daily stats
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(DailyStat).where(
            DailyStat.user_id == user_id,
            DailyStat.date == today
        )
    )
    daily_stat = result.scalars().first()

    if daily_stat:
        daily_stat.games_played += 1
        daily_stat.total_score += session.score
        daily_stat.avg_accuracy = (daily_stat.avg_accuracy * (daily_stat.games_played - 1) + session.accuracy) / daily_stat.games_played
    else:
        daily_stat = DailyStat(
            user_id=user_id,
            date=today,
            games_played=1,
            total_score=session.score,
            avg_accuracy=session.accuracy
        )
        db.add(daily_stat)

    # Update cognitive profile
    if current_user.cognitive_profile:
        profile = dict(current_user.cognitive_profile)
        area = session.cognitive_area or "memory"
        if area in profile:
            # Exponential moving average
            profile[area] = profile[area] * 0.9 + (session.score / 10) * 0.1
            profile[area] = min(100, max(0, profile[area]))
        current_user.cognitive_profile = profile

    await db.commit()
    await db.refresh(db_session)

    # Invalidate cache
    await redis_client.delete(f"analytics:{user_id}")
    await redis_client.delete(f"recommendations:{user_id}")

    # Update leaderboard entry and broadcast if in top 20
    lb_result = await db.execute(
        select(LeaderboardEntry).where(
            LeaderboardEntry.user_id == user_id,
            LeaderboardEntry.game_type == session.game_type,
        )
    )
    lb_entry = lb_result.scalars().first()
    if lb_entry:
        if session.score > lb_entry.high_score:
            lb_entry.high_score = session.score
            lb_entry.updated_at = datetime.utcnow()
            await db.commit()
    else:
        lb_entry = LeaderboardEntry(user_id=user_id, game_type=session.game_type, high_score=session.score)
        db.add(lb_entry)
        await db.commit()

    # Check if new score enters top 20
    rank_result = await db.execute(
        select(func.count(LeaderboardEntry.id)).where(
            LeaderboardEntry.game_type == session.game_type,
            LeaderboardEntry.high_score >= session.score,
        )
    )
    rank = rank_result.scalar_one()
    if rank <= 20:
        await manager.broadcast({
            "type": "leaderboard_update",
            "payload": {
                "user_id": user_id,
                "username": current_user.username,
                "score": session.score,
                "game_type": session.game_type,
                "rank": rank,
            },
        })
        await redis_client.delete(f"leaderboard:{session.game_type}")

    # Trigger ML model update (async)
    session_data = {
        'game_type': session.game_type,
        'score': session.score,
        'accuracy': session.accuracy,
        'cognitive_area': session.cognitive_area,
        'played_at': datetime.utcnow().isoformat()
    }
    await ml_service.update_user_model(user_id, [session_data])

    return GameSessionResponse.from_orm(db_session)

@app.get("/api/users/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.from_orm(current_user)

@app.get("/api/achievements", response_model=List[AchievementResponse])
async def get_achievements(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Achievement))
    achievements = result.scalars().all()
    return [AchievementResponse.from_orm(a) for a in achievements]

@app.get("/api/users/me/achievements", response_model=List[UserAchievementResponse])
async def get_user_achievements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == current_user.id)
    )
    user_achievements = result.scalars().all()
    return [UserAchievementResponse.from_orm(ua) for ua in user_achievements]

@app.get("/api/analytics/daily", response_model=List[DailyStatResponse])
async def get_daily_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = 7
):
    from datetime import timedelta
    start_date = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(DailyStat).where(
            DailyStat.user_id == current_user.id,
            DailyStat.date >= start_date
        ).order_by(DailyStat.date)
    )
    stats = result.scalars().all()
    return [DailyStatResponse.from_orm(s) for s in stats]

@app.get("/api/ml/predict-score")
async def predict_user_score(
    current_user: User = Depends(get_current_user),
    ml_service: CognitiveMLService = Depends(get_ml_service),
    db: AsyncSession = Depends(get_db)
):
    """Predict user's next game score"""
    # Get recent sessions for feature engineering
    result = await db.execute(
        select(GameSession).where(GameSession.user_id == current_user.id)
        .order_by(GameSession.played_at.desc()).limit(20)
    )
    recent_sessions = result.scalars().all()

    # Extract features
    features = {}
    if recent_sessions:
        latest_session = recent_sessions[0]
        features = {
            'accuracy': latest_session.accuracy,
            'difficulty_level': latest_session.difficulty_level,
            'hour': latest_session.played_at.hour if latest_session.played_at else 12,
            'day_of_week': latest_session.played_at.weekday() if latest_session.played_at else 0,
            'is_weekend': 1 if latest_session.played_at and latest_session.played_at.weekday() >= 5 else 0,
            'is_morning': 1 if latest_session.played_at and 6 <= latest_session.played_at.hour < 12 else 0,
            'is_evening': 1 if latest_session.played_at and 18 <= latest_session.played_at.hour < 22 else 0,
        }

        # Add rolling averages
        scores = [s.score for s in recent_sessions[:10]]
        accuracies = [s.accuracy for s in recent_sessions[:10]]

        features.update({
            'score_rolling_mean_3': np.mean(scores[:3]) if len(scores) >= 3 else np.mean(scores),
            'score_rolling_std_3': np.std(scores[:3]) if len(scores) >= 3 else 0,
            'score_rolling_mean_7': np.mean(scores[:7]) if len(scores) >= 7 else np.mean(scores),
        })

    prediction = await ml_service.predict_user_score(current_user.id, features)
    return {"predicted_score": prediction, "confidence": 0.85}  # Placeholder confidence

@app.get("/api/ml/cognitive-profile")
async def get_cognitive_profile(
    current_user: User = Depends(get_current_user),
    ml_service: CognitiveMLService = Depends(get_ml_service),
    db: AsyncSession = Depends(get_db)
):
    """Get user's cognitive profile analysis"""
    # Get user's game sessions
    result = await db.execute(
        select(GameSession).where(GameSession.user_id == current_user.id)
        .order_by(GameSession.played_at.desc()).limit(100)
    )
    sessions = result.scalars().all()

    session_data = [{
        'game_type': s.game_type,
        'score': s.score,
        'accuracy': s.accuracy,
        'cognitive_area': s.cognitive_area,
        'played_at': s.played_at.isoformat() if s.played_at else None
    } for s in sessions]

    profile = await ml_service.analyze_cognitive_profile(session_data)
    return profile

@app.get("/api/ml/recommendations")
async def get_personalized_recommendations(
    current_user: User = Depends(get_current_user),
    ml_service: CognitiveMLService = Depends(get_ml_service),
    db: AsyncSession = Depends(get_db)
):
    """Get personalized game recommendations"""
    # Get cognitive profile first
    result = await db.execute(
        select(GameSession).where(GameSession.user_id == current_user.id)
        .order_by(GameSession.played_at.desc()).limit(50)
    )
    sessions = result.scalars().all()

    session_data = [{
        'game_type': s.game_type,
        'score': s.score,
        'accuracy': s.accuracy,
        'cognitive_area': s.cognitive_area,
        'played_at': s.played_at.isoformat() if s.played_at else None
    } for s in sessions]

    profile = await ml_service.analyze_cognitive_profile(session_data)
    recommendations = await ml_service.get_personalized_recommendations(current_user.id, profile)

    return {"recommendations": recommendations, "cognitive_profile": profile}

@app.get("/api/ml/model-metrics")
async def get_model_performance_metrics(
    ml_service: CognitiveMLService = Depends(get_ml_service)
):
    """Get ML model performance metrics"""
    metrics = await ml_service.get_model_performance_metrics()
    return metrics

@app.get("/api/analytics/summary", response_model=AnalyticsSummary)
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id

    # Check cache
    cached = await redis_client.get(f"analytics:{user_id}")
    if cached:
        return json.loads(cached)

    # All sessions
    sessions_result = await db.execute(
        select(GameSession).where(GameSession.user_id == user_id)
        .order_by(GameSession.played_at)
    )
    sessions = sessions_result.scalars().all()

    if not sessions:
        default_profile = current_user.cognitive_profile or {}
        empty = AnalyticsSummary(
            total_games=0,
            total_score=0,
            avg_accuracy=0.0,
            current_streak=0,
            best_streak=0,
            cognitive_profile=default_profile,
            weekly_activity=[],
            monthly_activity=[],
            improvement_trend=0.0,
            percentile_rank=50.0,
            time_spent_minutes=0,
        )
        return empty

    total_games = len(sessions)
    total_score = sum(s.score for s in sessions)
    avg_accuracy = sum(s.accuracy for s in sessions) / total_games
    total_seconds = sum(s.duration_seconds or 0 for s in sessions)

    # Calculate streak from daily stats
    daily_result = await db.execute(
        select(DailyStat).where(DailyStat.user_id == user_id)
        .order_by(DailyStat.date.desc())
    )
    daily_stats = daily_result.scalars().all()
    current_streak = 0
    best_streak = 0
    running = 0
    prev_date = None
    for stat in daily_stats:
        if stat.games_played > 0:
            if prev_date is None or (prev_date - stat.date).days == 1:
                running += 1
                if prev_date is None:
                    current_streak = running
            else:
                running = 1
            best_streak = max(best_streak, running)
            prev_date = stat.date
        else:
            if prev_date is not None:
                running = 0

    # Weekly activity
    week_ago = datetime.utcnow() - timedelta(days=7)
    weekly_result = await db.execute(
        select(DailyStat).where(
            DailyStat.user_id == user_id,
            DailyStat.date >= week_ago
        )
    )
    weekly_stats = weekly_result.scalars().all()
    weekly_activity = [
        {"date": w.date.isoformat(), "games": w.games_played, "score": w.total_score}
        for w in weekly_stats
    ]

    # Monthly activity
    month_ago = datetime.utcnow() - timedelta(days=30)
    monthly_result = await db.execute(
        select(DailyStat).where(
            DailyStat.user_id == user_id,
            DailyStat.date >= month_ago
        )
    )
    monthly_stats = monthly_result.scalars().all()
    monthly_activity = [
        {"date": m.date.isoformat(), "games": m.games_played, "score": m.total_score}
        for m in monthly_stats
    ]

    # Improvement trend
    scores = [s.score for s in sessions]
    if len(scores) >= 2:
        recent = scores[max(0, len(scores) - 10):]
        older = scores[max(0, len(scores) - 20): max(0, len(scores) - 10)]
        improvement = float(np.mean(recent) - np.mean(older)) if older else 0.0
    else:
        improvement = 0.0

    result = AnalyticsSummary(
        total_games=total_games,
        total_score=total_score,
        avg_accuracy=round(avg_accuracy, 2),
        current_streak=current_streak,
        best_streak=best_streak,
        cognitive_profile=current_user.cognitive_profile or {},
        weekly_activity=weekly_activity,
        monthly_activity=monthly_activity,
        improvement_trend=round(improvement, 2),
        percentile_rank=50.0,
        time_spent_minutes=total_seconds // 60,
    )

    await redis_client.setex(f"analytics:{user_id}", 300, json.dumps(result.model_dump()))
    return result


_GAME_CATALOG = [
    # Classic games (camelCase IDs from frontend)
    {"game_type": "memory",           "cognitive_area": "memory",          "base_duration": 5},
    {"game_type": "speed",            "cognitive_area": "speed",           "base_duration": 3},
    {"game_type": "attention",        "cognitive_area": "attention",       "base_duration": 4},
    {"game_type": "flexibility",      "cognitive_area": "flexibility",     "base_duration": 4},
    {"game_type": "problemSolving",   "cognitive_area": "problem_solving", "base_duration": 8},
    {"game_type": "math",             "cognitive_area": "problem_solving", "base_duration": 5},
    {"game_type": "reaction",         "cognitive_area": "speed",           "base_duration": 3},
    {"game_type": "word",             "cognitive_area": "memory",          "base_duration": 4},
    {"game_type": "visual",           "cognitive_area": "attention",       "base_duration": 4},
    {"game_type": "spatial",          "cognitive_area": "problem_solving", "base_duration": 5},
    {"game_type": "memorySequence",   "cognitive_area": "memory",          "base_duration": 5},
    # Arcade games (snake_case IDs)
    {"game_type": "memory_match",        "cognitive_area": "memory",          "base_duration": 5},
    {"game_type": "number_sequence",     "cognitive_area": "problem_solving", "base_duration": 4},
    {"game_type": "pipe_connection",     "cognitive_area": "problem_solving", "base_duration": 6},
    {"game_type": "pattern_recognition", "cognitive_area": "attention",       "base_duration": 4},
    {"game_type": "logic_grid",          "cognitive_area": "problem_solving", "base_duration": 8},
    {"game_type": "code_breaker",        "cognitive_area": "problem_solving", "base_duration": 6},
    {"game_type": "tower_of_hanoi",      "cognitive_area": "problem_solving", "base_duration": 8},
    {"game_type": "color_harmony",       "cognitive_area": "attention",       "base_duration": 4},
    {"game_type": "math_marathon",       "cognitive_area": "problem_solving", "base_duration": 5},
    {"game_type": "shape_shifter",       "cognitive_area": "attention",       "base_duration": 4},
    {"game_type": "rhythm_blocks",       "cognitive_area": "speed",           "base_duration": 4},
    {"game_type": "maze_runner",         "cognitive_area": "problem_solving", "base_duration": 5},
    {"game_type": "bubble_sort",         "cognitive_area": "problem_solving", "base_duration": 5},
    {"game_type": "quick_reflexes",      "cognitive_area": "speed",           "base_duration": 3},
    {"game_type": "chess",               "cognitive_area": "problem_solving", "base_duration": 15},
    # Voice games
    {"game_type": "voice_command",       "cognitive_area": "attention",       "base_duration": 4},
    {"game_type": "voice_math",          "cognitive_area": "problem_solving", "base_duration": 4},
    {"game_type": "voice_memory",        "cognitive_area": "memory",          "base_duration": 5},
    {"game_type": "voice_spelling",      "cognitive_area": "memory",          "base_duration": 4},
    # Imported games
    {"game_type": "focus_grid",          "cognitive_area": "attention",       "base_duration": 4},
    {"game_type": "word_unscramble",     "cognitive_area": "memory",          "base_duration": 4},
    {"game_type": "sliding_puzzle",      "cognitive_area": "problem_solving", "base_duration": 6},
    {"game_type": "attention_grid",      "cognitive_area": "attention",       "base_duration": 4},
    {"game_type": "speed_reaction",      "cognitive_area": "speed",           "base_duration": 3},
    {"game_type": "math_blitz",          "cognitive_area": "problem_solving", "base_duration": 3},
    # Orphaned games (now wired)
    {"game_type": "dual_n_back",         "cognitive_area": "memory",          "base_duration": 6},
    {"game_type": "map_navigator",       "cognitive_area": "problem_solving", "base_duration": 5},
    {"game_type": "mental_rotation_3d",  "cognitive_area": "problem_solving", "base_duration": 5},
    {"game_type": "perspective_shift",   "cognitive_area": "attention",       "base_duration": 5},
    {"game_type": "stroop_challenge",    "cognitive_area": "attention",       "base_duration": 4},
    {"game_type": "task_switcher",       "cognitive_area": "flexibility",     "base_duration": 5},
    {"game_type": "tower_planner",       "cognitive_area": "problem_solving", "base_duration": 8},
    # INTJ Strategic Games
    {"game_type": "logic_grid_puzzle",   "cognitive_area": "problem_solving", "base_duration": 10},
    {"game_type": "chess_tactics",       "cognitive_area": "problem_solving", "base_duration": 8},
    {"game_type": "pattern_sequence",    "cognitive_area": "problem_solving", "base_duration": 5},
    {"game_type": "resource_management", "cognitive_area": "problem_solving", "base_duration": 8},
    {"game_type": "deduction_chain",     "cognitive_area": "problem_solving", "base_duration": 5},
    {"game_type": "cipher_breaker",      "cognitive_area": "problem_solving", "base_duration": 7},
    {"game_type": "sudoku",              "cognitive_area": "problem_solving", "base_duration": 10},
    {"game_type": "syllogism_engine",    "cognitive_area": "problem_solving", "base_duration": 5},
    {"game_type": "systems_cascade",     "cognitive_area": "problem_solving", "base_duration": 5},
    {"game_type": "binary_matrix",       "cognitive_area": "problem_solving", "base_duration": 6},
    {"game_type": "graph_pathfinder",    "cognitive_area": "problem_solving", "base_duration": 5},
    {"game_type": "cryptogram",          "cognitive_area": "language",        "base_duration": 8},
    {"game_type": "strategic_conquest",  "cognitive_area": "problem_solving", "base_duration": 5},
]

@app.get("/api/recommendations", response_model=List[GameRecommendation])
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id

    cached = await redis_client.get(f"recommendations:{user_id}")
    if cached:
        return json.loads(cached)

    profile = current_user.cognitive_profile or {}
    # Rule-based: recommend games that target the weakest cognitive areas
    area_scores = {
        g["cognitive_area"]: profile.get(g["cognitive_area"], 50.0)
        for g in _GAME_CATALOG
    }
    sorted_games = sorted(_GAME_CATALOG, key=lambda g: area_scores.get(g["cognitive_area"], 50.0))

    recommendations = []
    for priority, game in enumerate(sorted_games[:3], start=1):
        area = game["cognitive_area"]
        current_score = area_scores.get(area, 50.0)
        rec = GameRecommendation(
            game_type=game["game_type"],
            priority=priority,
            reason=f"Your {area} score ({current_score:.0f}) has room for improvement",
            predicted_improvement=max(0.5, (100 - current_score) * 0.05),
            estimated_duration=game["base_duration"],
            current_streak=0,
            longest_streak=0,
            cognitive_profile=profile,
            achievements_unlocked=0,
            time_spent_minutes=0,
        )
        recommendations.append(rec)

    await redis_client.setex(
        f"recommendations:{user_id}", 600,
        json.dumps([r.model_dump() for r in recommendations])
    )
    return recommendations


@app.get("/api/users/me/achievements-status")
async def get_user_achievement_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id

    all_result = await db.execute(select(Achievement))
    all_achievements = all_result.scalars().all()

    unlocked_result = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == user_id)
    )
    unlocked = unlocked_result.scalars().all()
    unlocked_ids = {ua.achievement_id for ua in unlocked}

    return {
        "achievements": [
            {
                "id": a.achievement_id,
                "name": a.name,
                "description": a.description,
                "icon": a.icon,
                "unlocked": a.achievement_id in unlocked_ids,
            }
            for a in all_achievements
        ]
    }


@app.websocket("/api/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("action") == "ping":
                await manager.send_personal_message({"type": "pong"}, user_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)


async def check_achievements(user_id: int, db: AsyncSession):
    sessions_result = await db.execute(
        select(GameSession).where(GameSession.user_id == user_id)
    )
    sessions = sessions_result.scalars().all()
    total_games = len(sessions)

    achievement_checks = [
        ("first_game", total_games >= 1),
        ("ten_games", total_games >= 10),
        ("hundred_games", total_games >= 100),
        ("score_1000", any(s.score >= 1000 for s in sessions)),
        ("score_5000", any(s.score >= 5000 for s in sessions)),
        ("perfect_accuracy", any(s.accuracy >= 100 for s in sessions)),
    ]

    for achievement_id, condition in achievement_checks:
        if condition:
            existing_result = await db.execute(
                select(UserAchievement).where(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement_id
                )
            )
            if not existing_result.scalars().first():
                ua = UserAchievement(user_id=user_id, achievement_id=achievement_id)
                db.add(ua)
                import asyncio
                asyncio.create_task(
                    manager.send_personal_message(
                        {"type": "achievement_unlocked", "achievement_id": achievement_id},
                        user_id
                    )
                )

    await db.commit()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


# ==================== PORTED ENDPOINTS FROM api.py ====================

@app.get("/health")
async def health_root():
    """Liveness probe alias."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/metrics")
async def prometheus_metrics():
    """Expose Prometheus metrics."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# ── Cognitive Analytics ────────────────────────────────────────────────────
@app.get("/api/cognitive/report")
async def cognitive_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Full cognitive fingerprint + trends + optimal schedule."""
    from cognitive_analytics import generate_cognitive_report
    return await generate_cognitive_report(db, current_user.id)


@app.get("/api/cognitive/fingerprint")
async def cognitive_fingerprint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from cognitive_analytics import compute_cognitive_fingerprint
    return await compute_cognitive_fingerprint(db, current_user.id)


@app.get("/api/cognitive/trend/{dimension}")
async def cognitive_trend(
    dimension: str,
    days: int = Query(default=14, ge=3, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from cognitive_analytics import compute_trend, ALL_DIMENSIONS
    if dimension not in ALL_DIMENSIONS:
        raise HTTPException(400, f"Unknown dimension: {dimension}. Valid: {ALL_DIMENSIONS}")
    return await compute_trend(db, current_user.id, dimension, days)


@app.post("/api/telemetry/perf")
async def ingest_perf_telemetry(
    batch: List[Dict],
    current_user: Optional[User] = Depends(get_current_user),
):
    """Ingest client-side performance metrics (FCP, LCP, game load times)."""
    user_id = current_user.id if current_user else "anonymous"
    key = f"perf:{user_id}:{datetime.utcnow().strftime('%Y%m%d')}"
    await redis_client.lpush(key, json.dumps(batch))
    await redis_client.expire(key, 86400 * 7)
    return {"ingested": len(batch)}


@app.get("/api/stats/global")
async def get_global_stats(db: AsyncSession = Depends(get_db)):
    cached = await redis_client.get("global_stats")
    if cached:
        return json.loads(cached)

    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar_one()

    total_games_result = await db.execute(select(func.count(GameSession.id)))
    total_games = total_games_result.scalar_one()

    total_score_result = await db.execute(select(func.sum(GameSession.score)))
    total_score = int(total_score_result.scalar_one_or_none() or 0)

    avg_acc_result = await db.execute(select(func.avg(GameSession.accuracy)))
    avg_acc = avg_acc_result.scalar_one_or_none()
    avg_acc_f = round(float(avg_acc), 2) if avg_acc is not None else 0.0

    result = {
        "total_users": total_users,
        "total_games_played": total_games,
        "total_points_earned": total_score,
        "average_accuracy": avg_acc_f,
    }
    await redis_client.setex("global_stats", 3600, json.dumps(result))
    return result


@app.post("/api/goals", status_code=201)
@limiter.limit("20/minute")
async def create_goal(
    request: Request,
    body: GoalCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = UserGoal(
        user_id=current_user.id,
        type=body.type,
        target=body.target,
        area=body.area,
        deadline=body.deadline,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return {"id": goal.id}


@app.get("/api/goals", response_model=List[GoalResponse])
@limiter.limit("60/minute")
async def get_goals(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserGoal)
        .where(UserGoal.user_id == current_user.id)
        .order_by(UserGoal.created_at.desc())
    )
    goals = result.scalars().all()
    return [GoalResponse.model_validate(g) for g in goals]


@app.get("/api/games/word-prompt")
@limiter.limit("120/minute")
async def get_word_prompt(
    request: Request,
    difficulty: int = 5,
    current_user: User = Depends(get_current_user),
):
    from nlp_games_service import word_game_nlp
    difficulty = max(1, min(10, difficulty))
    word = word_game_nlp.get_word_for_level(difficulty)
    scrambled = word_game_nlp.scramble_word(word)
    diff_score = word_game_nlp.get_word_difficulty(word)
    return {
        "word": word,
        "scrambled": scrambled,
        "difficulty_score": diff_score,
        "length": len(word),
    }


@app.post("/api/analytics/pattern-analysis")
@limiter.limit("30/minute")
async def analyze_patterns(
    request: Request,
    body: PatternAnalysisRequest,
    current_user: User = Depends(get_current_user),
):
    from nlp_games_service import pattern_analyzer
    fatigue = pattern_analyzer.detect_fatigue(body.response_times)
    consistency = pattern_analyzer.calculate_consistency_score(body.accuracies)
    trend = pattern_analyzer.trending_direction(body.scores) if body.scores else "stable"
    predicted = pattern_analyzer.predict_next_score(body.scores) if body.scores else None
    return {
        "fatigue_detected": fatigue,
        "consistency_score": consistency,
        "trend": trend,
        "predicted_next_score": predicted,
        "recommendation": (
            "Take a short break — fatigue detected." if fatigue
            else "You're performing consistently — keep it up!"
        ),
    }


@app.post("/api/games/validate-anagram")
@limiter.limit("120/minute")
async def validate_anagram(
    request: Request,
    word: str,
    letters: List[str],
    current_user: User = Depends(get_current_user),
):
    from nlp_games_service import word_game_nlp
    valid = word_game_nlp.validate_anagram(word, letters)
    return {"word": word, "valid": valid}


@app.get("/api/leaderboard/{game_type}")
@limiter.limit("30/minute")
async def get_leaderboard(
    request: Request,
    game_type: str,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cached = await redis_client.get(f"leaderboard:{game_type}")
    if cached:
        return json.loads(cached)

    entries_result = await db.execute(
        select(LeaderboardEntry, User.username)
        .join(User, LeaderboardEntry.user_id == User.id)
        .where(LeaderboardEntry.game_type == game_type)
        .order_by(LeaderboardEntry.high_score.desc())
        .limit(limit)
    )
    entries = entries_result.all()

    result = [
        {
            "rank": i + 1,
            "username": username,
            "score": entry.high_score,
            "is_current_user": entry.user_id == current_user.id,
        }
        for i, (entry, username) in enumerate(entries)
    ]

    # Append current user's entry if not in top
    if not any(e["is_current_user"] for e in result):
        user_entry_result = await db.execute(
            select(LeaderboardEntry).where(
                LeaderboardEntry.user_id == current_user.id,
                LeaderboardEntry.game_type == game_type,
            )
        )
        user_entry = user_entry_result.scalars().first()
        if user_entry:
            rank_result = await db.execute(
                select(func.count(LeaderboardEntry.id)).where(
                    LeaderboardEntry.game_type == game_type,
                    LeaderboardEntry.high_score > user_entry.high_score,
                )
            )
            rank = rank_result.scalar_one() + 1
            result.append({
                "rank": rank,
                "username": current_user.username,
                "score": user_entry.high_score,
                "is_current_user": True,
            })

    await redis_client.setex(f"leaderboard:{game_type}", 300, json.dumps(result))
    return {"game_type": game_type, "entries": result}


@app.post("/api/ai/difficulty-recommend", response_model=DifficultyResponse)
@limiter.limit("60/minute")
async def recommend_difficulty(
    request: Request,
    body: DifficultyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    recent_result = await db.execute(
        select(GameSession)
        .where(
            GameSession.user_id == current_user.id,
            GameSession.game_type == body.game_type,
        )
        .order_by(GameSession.played_at.desc())
        .limit(10)
    )
    recent = recent_result.scalars().all()

    if len(recent) < 3:
        return DifficultyResponse(
            recommended_difficulty=body.current_difficulty,
            confidence=0.4,
            reason="Not enough history yet — keep practising!",
            delta=0.0,
        )

    avg_accuracy = sum(s.accuracy for s in recent) / len(recent)

    if body.accuracy >= 82 and avg_accuracy >= 78:
        delta = 0.5
        reason = "Great accuracy! Stepping up the challenge."
    elif body.accuracy >= 70 and avg_accuracy >= 65:
        delta = 0.2
        reason = "Solid performance — slight difficulty increase."
    elif body.accuracy < 45 or avg_accuracy < 50:
        delta = -0.5
        reason = "Building fundamentals — easing difficulty slightly."
    else:
        delta = 0.0
        reason = "Performance is on track — maintaining current difficulty."

    recommended = round(min(10.0, max(1.0, body.current_difficulty + delta)), 1)
    confidence = min(0.95, 0.5 + len(recent) * 0.04)

    return DifficultyResponse(
        recommended_difficulty=recommended,
        confidence=round(confidence, 2),
        reason=reason,
        delta=delta,
    )


@app.post("/api/sync")
@limiter.limit("10/minute")
async def sync_user_data(
    request: Request,
    sync_data: UserSyncRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sync mobile app user data. Requires authenticated user."""
    current_user.username = sync_data.name
    current_user.cognitive_profile = sync_data.cognitiveAreas
    await db.commit()

    streak_result = await db.execute(
        select(StreakData).where(StreakData.user_id == current_user.id)
    )
    streak_data = streak_result.scalars().first()
    if streak_data:
        streak_data.current_streak = sync_data.streak
        streak_data.best_streak = max(streak_data.best_streak, sync_data.streak)
    else:
        streak_data = StreakData(
            user_id=current_user.id,
            current_streak=sync_data.streak,
            best_streak=sync_data.streak,
        )
        db.add(streak_data)
    await db.commit()

    return {
        "user_id": current_user.id,
        "name": current_user.username,
        "level": sync_data.level,
        "totalScore": sync_data.totalScore,
        "gamesPlayed": sync_data.gamesPlayed,
        "streak": sync_data.streak,
        "cognitiveAreas": current_user.cognitive_profile,
    }


@app.post("/api/telemetry/batch", status_code=202)
async def ingest_telemetry(
    batch: TelemetryBatch,
    background_tasks: BackgroundTasks,
    request: Request,
):
    """Accept client-side telemetry events. Fire-and-forget persist."""
    async def _persist():
        try:
            pipe = redis_client.pipeline()
            for ev in batch.events:
                pipe.lpush("telemetry_stream", json.dumps({
                    "id": ev.id,
                    "name": ev.name,
                    "properties": ev.properties,
                    "timestamp": ev.timestamp,
                    "session_id": ev.session_id,
                    "ip": request.client.host if request.client else None,
                }))
            pipe.ltrim("telemetry_stream", 0, 49_999)
            await pipe.execute()
        except Exception as exc:
            pass  # fire-and-forget: log failures silently

    background_tasks.add_task(_persist)
    return {"accepted": len(batch.events)}


# ══════════════════════════════════════════════════════════════════
#  EMAIL VERIFICATION
# ══════════════════════════════════════════════════════════════════

@app.get("/api/auth/verify-email")
async def verify_email(token: str = Query(..., min_length=32, max_length=64), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.verification_token == token))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    user.is_verified = True
    user.verification_token = None
    await db.commit()
    return {"message": "Email verified successfully. You can now play games."}


@app.post("/api/auth/resend-verification")
@limiter.limit("2/minute")
async def resend_verification(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.is_verified:
        return {"message": "Already verified"}
    token = secrets.token_hex(32)
    current_user.verification_token = token
    await db.commit()
    # In production replace with real email send
    logger.info("VERIFICATION TOKEN for %s: %s", current_user.email, token)
    return {"message": "Verification email resent"}


# ══════════════════════════════════════════════════════════════════
#  SUBSCRIPTION
# ══════════════════════════════════════════════════════════════════

@app.get("/api/subscription/status", response_model=SubscriptionStatus)
async def subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    limits = TIER_LIMITS.get(current_user.subscription_tier, TIER_LIMITS["free"])
    used = await _daily_games_used(current_user.id, db)
    return SubscriptionStatus(
        tier=current_user.subscription_tier,
        daily_games_used=used,
        daily_games_limit=limits["daily_games"],
        features=limits,
    )


@app.post("/api/subscription/upgrade")
async def upgrade_subscription(
    body: SubscriptionUpgrade,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Placeholder – integrate Stripe webhooks here in production
    current_user.subscription_tier = body.tier
    await db.commit()
    return {"tier": body.tier, "message": f"Subscription upgraded to {body.tier}"}


# ══════════════════════════════════════════════════════════════════
#  SOCIAL — FRIENDS
# ══════════════════════════════════════════════════════════════════

@app.post("/api/social/friends/request", response_model=FriendRequestResponse, status_code=201)
@limiter.limit("20/minute")
async def send_friend_request(
    request: Request,
    body: FriendRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")

    # Check target exists
    target = await db.get(User, body.target_user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Avoid duplicates
    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_id == current_user.id, Friendship.friend_id == body.target_user_id),
                and_(Friendship.user_id == body.target_user_id, Friendship.friend_id == current_user.id),
            )
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Friend request already exists")

    friendship = Friendship(user_id=current_user.id, friend_id=body.target_user_id, status="pending")
    db.add(friendship)
    await db.commit()
    await db.refresh(friendship)

    # Notify recipient if connected
    await manager.send_personal_message(
        {"type": "friend_request", "from_user_id": current_user.id, "from_username": current_user.username},
        body.target_user_id,
    )
    return FriendRequestResponse.model_validate(friendship)


@app.get("/api/social/friends", response_model=List[FriendPublicInfo])
async def list_friends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.user_id == current_user.id, Friendship.status == "accepted"),
                and_(Friendship.friend_id == current_user.id, Friendship.status == "accepted"),
            )
        )
    )
    friendships = result.scalars().all()
    friend_ids = [
        f.friend_id if f.user_id == current_user.id else f.user_id
        for f in friendships
    ]
    if not friend_ids:
        return []
    friends_result = await db.execute(select(User).where(User.id.in_(friend_ids)))
    friends = friends_result.scalars().all()
    return [FriendPublicInfo.model_validate(f) for f in friends]


@app.get("/api/social/friends/requests")
async def list_friend_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Friendship).where(
            Friendship.friend_id == current_user.id,
            Friendship.status == "pending",
        )
    )
    requests = result.scalars().all()
    out = []
    for r in requests:
        sender = await db.get(User, r.user_id)
        out.append({"id": r.id, "from_user_id": r.user_id, "from_username": sender.username if sender else "?", "created_at": r.created_at.isoformat()})
    return out


@app.put("/api/social/friends/{request_id}/accept", response_model=FriendRequestResponse)
async def accept_friend_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    friendship = await db.get(Friendship, request_id)
    if not friendship or friendship.friend_id != current_user.id:
        raise HTTPException(status_code=404, detail="Request not found")
    if friendship.status != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    friendship.status = "accepted"
    friendship.accepted_at = datetime.utcnow()
    await db.commit()
    await db.refresh(friendship)
    return FriendRequestResponse.model_validate(friendship)


@app.delete("/api/social/friends/{request_id}", status_code=204)
async def remove_friend(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    friendship = await db.get(Friendship, request_id)
    if not friendship or (friendship.user_id != current_user.id and friendship.friend_id != current_user.id):
        raise HTTPException(status_code=404, detail="Friendship not found")
    await db.delete(friendship)
    await db.commit()


# ══════════════════════════════════════════════════════════════════
#  HEAD-TO-HEAD CHALLENGES
# ══════════════════════════════════════════════════════════════════

@app.post("/api/challenges/create", response_model=H2HChallengeResponse, status_code=201)
@limiter.limit("10/minute")
async def create_h2h_challenge(
    request: Request,
    body: H2HChallengeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    limits = TIER_LIMITS.get(current_user.subscription_tier, TIER_LIMITS["free"])
    if not limits["multiplayer"]:
        raise HTTPException(status_code=403, detail="Multiplayer requires Pro or Premium subscription")

    opponent = await db.get(User, body.opponent_id)
    if not opponent:
        raise HTTPException(status_code=404, detail="Opponent not found")

    expires_at = datetime.utcnow() + timedelta(hours=body.expires_in_hours)
    challenge = HeadToHeadChallenge(
        challenger_id=current_user.id,
        opponent_id=body.opponent_id,
        game_type=body.game_type,
        status="pending",
        expires_at=expires_at,
    )
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)

    await manager.send_personal_message(
        {
            "type": "challenge_received",
            "challenge_id": challenge.id,
            "from_username": current_user.username,
            "game_type": body.game_type,
        },
        body.opponent_id,
    )
    return H2HChallengeResponse.model_validate(challenge)


@app.get("/api/challenges/inbox", response_model=List[H2HChallengeResponse])
async def challenge_inbox(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HeadToHeadChallenge).where(
            HeadToHeadChallenge.opponent_id == current_user.id,
            HeadToHeadChallenge.status == "pending",
        ).order_by(HeadToHeadChallenge.created_at.desc())
    )
    return [H2HChallengeResponse.model_validate(c) for c in result.scalars().all()]


@app.get("/api/challenges/sent", response_model=List[H2HChallengeResponse])
async def challenges_sent(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HeadToHeadChallenge).where(
            HeadToHeadChallenge.challenger_id == current_user.id,
        ).order_by(HeadToHeadChallenge.created_at.desc()).limit(20)
    )
    return [H2HChallengeResponse.model_validate(c) for c in result.scalars().all()]


@app.put("/api/challenges/{challenge_id}/accept", response_model=H2HChallengeResponse)
async def accept_challenge(
    challenge_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ch = await db.get(HeadToHeadChallenge, challenge_id)
    if not ch or ch.opponent_id != current_user.id:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if ch.status != "pending":
        raise HTTPException(status_code=400, detail="Challenge already processed")
    if ch.expires_at and ch.expires_at < datetime.utcnow():
        ch.status = "expired"
        await db.commit()
        raise HTTPException(status_code=410, detail="Challenge has expired")

    ch.status = "accepted"
    ch.room_id = secrets.token_hex(16)
    await db.commit()
    await db.refresh(ch)

    await manager.send_personal_message(
        {"type": "challenge_accepted", "challenge_id": ch.id, "room_id": ch.room_id},
        ch.challenger_id,
    )
    return H2HChallengeResponse.model_validate(ch)


# ══════════════════════════════════════════════════════════════════
#  MULTIPLAYER WEBSOCKET  /ws/multiplayer/{room_id}?token=...
# ══════════════════════════════════════════════════════════════════

class MultiplayerRoom:
    def __init__(self):
        self.players: Dict[int, WebSocket] = {}  # user_id → ws

    def is_full(self) -> bool:
        return len(self.players) >= 2

    async def broadcast(self, message: dict, exclude: Optional[int] = None):
        for uid, ws in self.players.items():
            if uid != exclude:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass


_multiplayer_rooms: Dict[str, MultiplayerRoom] = {}


@app.websocket("/ws/multiplayer/{room_id}")
async def multiplayer_ws(websocket: WebSocket, room_id: str, token: str = Query(...)):
    # Authenticate via token query param
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        await websocket.close(code=4001)
        return

    room = _multiplayer_rooms.setdefault(room_id, MultiplayerRoom())
    if room.is_full() and user_id not in room.players:
        await websocket.close(code=4002)
        return

    await websocket.accept()
    room.players[user_id] = websocket

    await room.broadcast({"type": "player_joined", "user_id": user_id}, exclude=user_id)

    if len(room.players) == 2:
        await room.broadcast({"type": "game_start"})

    finished: Dict[int, int] = {}
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ready":
                await room.broadcast({"type": "player_ready", "user_id": user_id}, exclude=user_id)

            elif msg_type == "score_update":
                await room.broadcast(
                    {"type": "opponent_score", "user_id": user_id, "payload": data.get("payload", {})},
                    exclude=user_id,
                )

            elif msg_type == "game_over":
                final_score = data.get("payload", {}).get("final_score", 0)
                finished[user_id] = final_score
                await room.broadcast(
                    {"type": "opponent_finished", "user_id": user_id, "final_score": final_score},
                    exclude=user_id,
                )

                if len(finished) == 2:
                    scores = list(finished.items())
                    winner_id = max(scores, key=lambda x: x[1])[0]
                    await room.broadcast({"type": "match_result", "winner_id": winner_id, "scores": dict(finished)})
                    # Persist result to DB
                    async with async_session() as session:
                        ch_result = await session.execute(
                            select(HeadToHeadChallenge).where(HeadToHeadChallenge.room_id == room_id)
                        )
                        ch = ch_result.scalars().first()
                        if ch:
                            player_ids = list(finished.keys())
                            ch.result_challenger = finished.get(ch.challenger_id)
                            ch.result_opponent = finished.get(ch.opponent_id)
                            ch.status = "completed"
                            ch.completed_at = datetime.utcnow()
                            await session.commit()

    except WebSocketDisconnect:
        pass
    finally:
        room.players.pop(user_id, None)
        if not room.players:
            _multiplayer_rooms.pop(room_id, None)
        else:
            await room.broadcast({"type": "player_left", "user_id": user_id})


# ══════════════════════════════════════════════════════════════════
#  DIFFICULTY SUGGEST (used by useAdaptiveDifficulty hook)
# ══════════════════════════════════════════════════════════════════

@app.get("/api/difficulty/suggest/{game_type}", response_model=DifficultySuggestResponse)
async def suggest_difficulty(
    game_type: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GameSession)
        .where(GameSession.user_id == current_user.id, GameSession.game_type == game_type)
        .order_by(GameSession.played_at.desc())
        .limit(5)
    )
    sessions = result.scalars().all()
    if len(sessions) < 3:
        return DifficultySuggestResponse(recommended_level=2, confidence=0.0)

    avg_score = sum(s.score for s in sessions) / len(sessions)
    avg_acc = sum(s.accuracy for s in sessions) / len(sessions)
    current_level = sessions[0].difficulty_level

    if avg_acc > 85 and avg_score > 800:
        rec = min(5, current_level + 1)
    elif avg_acc < 40 or avg_score < 200:
        rec = max(1, current_level - 1)
    else:
        rec = current_level

    confidence = round(min(0.95, 0.5 + len(sessions) * 0.09), 2)
    return DifficultySuggestResponse(recommended_level=rec, confidence=confidence)


@app.post("/api/difficulty/adjust", response_model=DifficultySuggestResponse)
async def adjust_difficulty(
    body: DifficultyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.accuracy >= 82:
        delta = 1
    elif body.accuracy < 40:
        delta = -1
    else:
        delta = 0
    new_level = int(min(5, max(1, body.current_difficulty + delta)))
    return DifficultySuggestResponse(recommended_level=new_level, confidence=0.8)


# ══════════════════════════════════════════════════════════════════
#  IMPORT logger (used by resend-verification)
# ══════════════════════════════════════════════════════════════════
import logging
logger = logging.getLogger(__name__)



