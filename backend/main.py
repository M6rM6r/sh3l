from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
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
from models import User, GameSession, Achievement, UserAchievement, DailyStat
from schemas import (
    UserCreate, UserResponse, UserLogin, TokenResponse,
    GameSessionCreate, GameSessionResponse,
    AchievementResponse, UserAchievementResponse,
    DailyStatResponse, AnalyticsSummary, GameRecommendation
)
from cognitive_ml_service import get_ml_service, CognitiveMLService

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
    title="Lumosity Clone API",
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
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
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
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
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

    # Create tokens
    access_token = create_access_token(data={"sub": str(db_user.id)})
    refresh_token = create_refresh_token(data={"sub": str(db_user.id)})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(user: UserLogin, db: AsyncSession = Depends(get_db)):
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
    ml_service: CognitiveMLService = Depends(get_ml_service)
):
    user_id = current_user.id

    # Create game session
    db_session = GameSession(
        user_id=user_id,
        game_type=session.game_type,
        score=session.score,
        accuracy=session.accuracy,
        duration_seconds=session.duration_seconds,
        difficulty_level=session.difficulty_level,
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
    {"game_type": "memory_matrix", "cognitive_area": "memory", "base_duration": 5},
    {"game_type": "number_speed", "cognitive_area": "speed", "base_duration": 3},
    {"game_type": "attention_focus", "cognitive_area": "attention", "base_duration": 4},
    {"game_type": "pattern_shift", "cognitive_area": "flexibility", "base_duration": 6},
    {"game_type": "problem_solver", "cognitive_area": "problem_solving", "base_duration": 8},
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
