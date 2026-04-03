# FastAPI Backend with PostgreSQL, Redis, and AI
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Response, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uuid

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, JSON, Index, text, func
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
import re
from jose import JWTError, jwt
from passlib.context import CryptContext
import redis
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import json
import asyncio
from dotenv import load_dotenv
import logging
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

from settings import get_settings
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
_settings = get_settings()

# Configuration (from environment via pydantic-settings)
SECRET_KEY = _settings.secret_key
ALGORITHM = _settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = _settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = _settings.refresh_token_expire_days
DATABASE_URL = _settings.database_url
REDIS_URL = _settings.redis_url


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_metric_path(path: str) -> str:
    if path.startswith("/api/ws/"):
        return "/api/ws/{user_id}"
    return re.sub(r"/\d+(?=/|$)", "/{id}", path)


# Database Setup
_engine_kwargs: Dict[str, Any] = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
    _engine_kwargs["poolclass"] = StaticPool
else:
    _engine_kwargs["pool_size"] = 20
    _engine_kwargs["max_overflow"] = 0

engine = create_engine(DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Redis Cache
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ==================== DATABASE MODELS ====================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=_utcnow)
    is_active = Column(Integer, default=1)
    cognitive_profile = Column(JSON, default={
        "memory": 50.0,
        "speed": 50.0,
        "attention": 50.0,
        "flexibility": 50.0,
        "problem_solving": 50.0
    })
    last_login = Column(DateTime)
    
    game_sessions = relationship("GameSession", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    daily_stats = relationship("DailyStat", back_populates="user", cascade="all, delete-orphan")
    streak_data = relationship("StreakData", back_populates="user", uselist=False, cascade="all, delete-orphan")

class GameSession(Base):
    __tablename__ = "game_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    game_type = Column(String(50), nullable=False, index=True)
    score = Column(Integer, nullable=False)
    accuracy = Column(Float, nullable=False)
    duration_seconds = Column(Integer)
    difficulty_level = Column(Integer, default=1)
    cognitive_area = Column(String(50))
    played_at = Column(DateTime, default=_utcnow, index=True)
    
    __table_args__ = (
        Index('idx_user_game_date', 'user_id', 'game_type', 'played_at'),
    )
    
    user = relationship("User", back_populates="game_sessions")

class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    achievement_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(String(500))
    icon = Column(String(50))
    requirement_type = Column(String(50))
    requirement_value = Column(Integer)
    rarity = Column(String(20), default="common")

class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    achievement_id = Column(String(100), ForeignKey("achievements.achievement_id"), nullable=False)
    unlocked_at = Column(DateTime, default=_utcnow)
    progress = Column(Integer, default=0)
    
    user = relationship("User", back_populates="achievements")

class DailyStat(Base):
    __tablename__ = "daily_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    games_played = Column(Integer, default=0)
    total_score = Column(Integer, default=0)
    avg_accuracy = Column(Float, default=0.0)
    streak_maintained = Column(Integer, default=0)
    
    __table_args__ = (
        Index('idx_user_date', 'user_id', 'date', unique=True),
    )
    
    user = relationship("User", back_populates="daily_stats")

class StreakData(Base):
    __tablename__ = "streak_data"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    current_streak = Column(Integer, default=0)
    best_streak = Column(Integer, default=0)
    last_played_date = Column(DateTime)
    total_games = Column(Integer, default=0)
    
    user = relationship("User", back_populates="streak_data")

class LeaderboardEntry(Base):
    __tablename__ = "leaderboard"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_type = Column(String(50), nullable=False)
    high_score = Column(Integer, default=0)
    rank = Column(Integer)
    updated_at = Column(DateTime, default=_utcnow)
    
    __table_args__ = (
        Index('idx_leaderboard_game', 'game_type', 'high_score'),
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(Achievement).first()
        if not existing:
            achievements = [
                Achievement(achievement_id="first_game", name="First Steps", description="Complete your first game", icon="🎯", requirement_type="games", requirement_value=1, rarity="common"),
                Achievement(achievement_id="ten_games", name="Getting Started", description="Complete 10 games", icon="🎮", requirement_type="games", requirement_value=10, rarity="common"),
                Achievement(achievement_id="hundred_games", name="Century Club", description="Complete 100 games", icon="💯", requirement_type="games", requirement_value=100, rarity="rare"),
                Achievement(achievement_id="score_1000", name="High Scorer", description="Score 1000 points in a single game", icon="⭐", requirement_type="score", requirement_value=1000, rarity="uncommon"),
                Achievement(achievement_id="score_5000", name="Legendary", description="Score 5000 points in a single game", icon="👑", requirement_type="score", requirement_value=5000, rarity="legendary"),
                Achievement(achievement_id="perfect_accuracy", name="Perfectionist", description="Achieve 100% accuracy", icon="🎯", requirement_type="accuracy", requirement_value=100, rarity="rare"),
                Achievement(achievement_id="week_streak", name="Week Warrior", description="Maintain a 7-day streak", icon="🔥", requirement_type="streak", requirement_value=7, rarity="rare"),
                Achievement(achievement_id="month_streak", name="Monthly Master", description="Maintain a 30-day streak", icon="📅", requirement_type="streak", requirement_value=30, rarity="epic"),
            ]
            for a in achievements:
                db.add(a)
            db.commit()
            logger.info("Seeded achievements")
    finally:
        db.close()
    yield


app = FastAPI(
    title="Ygy Cognitive Enhancement API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

REQUEST_COUNT = Counter("ygy_requests_total", "Total requests", ["method", "endpoint", "status"])
REQUEST_LATENCY = Histogram("ygy_request_duration_seconds", "Request duration", ["method", "endpoint"])
ACTIVE_USERS = Gauge("ygy_active_users", "Number of active users")
GAME_SESSIONS = Counter("ygy_game_sessions_total", "Total game sessions", ["game_type"])
USER_REGISTRATIONS = Counter("ygy_user_registrations_total", "Total user registrations")

_cors = _settings.cors_allow_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors,
    allow_credentials=_cors != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.middleware("http")
async def metrics_middleware(request, call_next):
    start_time = asyncio.get_event_loop().time()
    response = await call_next(request)
    process_time = asyncio.get_event_loop().time() - start_time
    path = _normalize_metric_path(request.url.path)

    REQUEST_COUNT.labels(method=request.method, endpoint=path, status=response.status_code).inc()
    REQUEST_LATENCY.labels(method=request.method, endpoint=path).observe(process_time)

    return response


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# ==================== PYDANTIC SCHEMAS ====================

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class GameSessionCreate(BaseModel):
    game_type: str
    score: int
    accuracy: float = Field(..., ge=0, le=100)
    duration_seconds: Optional[int] = None
    difficulty_level: Optional[int] = 1
    cognitive_area: Optional[str] = None

class CognitiveProfile(BaseModel):
    memory: float = 50.0
    speed: float = 50.0
    attention: float = 50.0
    flexibility: float = 50.0
    problem_solving: float = 50.0

class GameRecommendation(BaseModel):
    game_type: str
    priority: int
    reason: str
    predicted_improvement: float
    estimated_duration: int

class AnalyticsSummary(BaseModel):
    total_games: int
    total_score: int
    avg_accuracy: float
    current_streak: int
    best_streak: int
    cognitive_profile: CognitiveProfile
    weekly_activity: List[Dict[str, Any]]
    monthly_activity: List[Dict[str, Any]]
    improvement_trend: float
    percentile_rank: float
    time_spent_minutes: int

class AchievementSchema(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    unlocked: bool
    progress: int
    unlocked_at: Optional[datetime] = None
    rarity: str

class LeaderboardEntrySchema(BaseModel):
    rank: int
    username: str
    score: int
    is_current_user: bool

class UserSync(BaseModel):
    name: str
    level: int
    totalScore: int
    gamesPlayed: int
    streak: int
    cognitiveAreas: Dict[str, int]

# ==================== AI RECOMMENDATION ENGINE ====================

class CognitiveRecommender:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.is_trained = False
        self.game_mapping = {
            "memory": ["memory", "word"],
            "speed": ["speed", "reaction"],
            "attention": ["attention", "visual"],
            "flexibility": ["flexibility"],
            "problem_solving": ["problemSolving", "math", "spatial"]
        }
        
    def train(self, sessions: List[GameSession]):
        if len(sessions) < 20:
            logger.info("Not enough data to train model")
            return
            
        df = pd.DataFrame([{
            'game_type': s.game_type,
            'score': s.score,
            'accuracy': s.accuracy,
            'difficulty': s.difficulty_level,
            'hour': s.played_at.hour if s.played_at else 12,
            'day_of_week': s.played_at.weekday() if s.played_at else 0,
            'cognitive_area': s.cognitive_area
        } for s in sessions])
        
        # Train per-game-type models
        for game_type in df['game_type'].unique():
            game_df = df[df['game_type'] == game_type]
            if len(game_df) < 5:
                continue
                
            X = game_df[['accuracy', 'difficulty', 'hour', 'day_of_week']].values
            y = game_df['score'].shift(-1).fillna(game_df['score'].mean()).values
            
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            model = GradientBoostingRegressor(n_estimators=50, random_state=42)
            model.fit(X_scaled, y)
            
            self.models[game_type] = model
            self.scalers[game_type] = scaler
        
        self.is_trained = True
        logger.info(f"Trained models for {len(self.models)} game types")
        
    def predict_score(self, game_type: str, accuracy: float, difficulty: int, hour: int, day: int) -> float:
        if game_type not in self.models:
            return 500  # Default prediction
            
        X = np.array([[accuracy, difficulty, hour, day]])
        X_scaled = self.scalers[game_type].transform(X)
        return float(self.models[game_type].predict(X_scaled)[0])
        
    def recommend(self, user_stats: Dict, recent_sessions: List[GameSession], cognitive_profile: Dict) -> List[GameRecommendation]:
        if not recent_sessions:
            return [
                GameRecommendation(game_type="memory", priority=1, reason="Baseline assessment - establish your memory baseline", predicted_improvement=15.0, estimated_duration=60),
                GameRecommendation(game_type="speed", priority=2, reason="Baseline assessment - test processing speed", predicted_improvement=12.0, estimated_duration=60),
                GameRecommendation(game_type="attention", priority=3, reason="Baseline assessment - measure focus capacity", predicted_improvement=10.0, estimated_duration=60),
            ]
        
        # Calculate area performance
        area_scores = {}
        for session in recent_sessions:
            area = session.cognitive_area or "memory"
            if area not in area_scores:
                area_scores[area] = []
            area_scores[area].append(session.score)
        
        avg_by_area = {area: sum(scores)/len(scores) for area, scores in area_scores.items()}
        
        # Get weakest areas from profile
        profile_scores = {k: v for k, v in cognitive_profile.items() if isinstance(v, (int, float))}
        
        recommendations = []
        now = _utcnow()
        
        # Sort areas by performance (ascending)
        sorted_areas = sorted(avg_by_area.items(), key=lambda x: x[1])
        
        for i, (area, score) in enumerate(sorted_areas[:5]):
            games = self.game_mapping.get(area, ["memory"])
            for game in games[:1]:
                # Predict improvement potential
                predicted_next = self.predict_score(game, 80, 2, now.hour, now.weekday())
                improvement = max(predicted_next - score, 5.0)
                
                recommendations.append(GameRecommendation(
                    game_type=game,
                    priority=i + 1,
                    reason=f"Your {area} score ({score:.0f}) is below optimal. Focus here for maximum cognitive gains.",
                    predicted_improvement=round(improvement, 1),
                    estimated_duration=60
                ))
        
        return recommendations[:5]

# Initialize AI engine
recommender = CognitiveRecommender()

# ==================== HELPER FUNCTIONS ====================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    now = _utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update(
        {
            "exp": int(expire.timestamp()),
            "type": "access",
            "iat": int(now.timestamp()),
        }
    )
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, expire

def create_refresh_token(data: dict):
    to_encode = data.copy()
    now = _utcnow()
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update(
        {
            "exp": int(expire.timestamp()),
            "type": "refresh",
            "iat": int(now.timestamp()),
        }
    )
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        raw_sub = payload.get("sub")
        if raw_sub is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user_id = int(raw_sub)
        token_type = payload.get("type")
        if token_type != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Check Redis cache
    cached_user = redis_client.get(f"user:{user_id}")
    if cached_user:
        return json.loads(cached_user)
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Cache user data
    user_dict = {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "cognitive_profile": user.cognitive_profile
    }
    redis_client.setex(f"user:{user_id}", 300, json.dumps(user_dict))
    
    return user_dict

# ==================== WEBSOCKET MANAGER ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"User {user_id} connected via WebSocket")
    
    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"User {user_id} disconnected")
    
    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {user_id}: {e}")
                self.disconnect(user_id)
    
    async def broadcast(self, message: dict):
        disconnected = []
        for user_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except:
                disconnected.append(user_id)
        
        for user_id in disconnected:
            self.disconnect(user_id)

manager = ConnectionManager()

# ==================== API ENDPOINTS ====================

@app.post("/api/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("12/minute")
def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=get_password_hash(user.password),
        cognitive_profile={
            "memory": 50.0,
            "speed": 50.0,
            "attention": 50.0,
            "flexibility": 50.0,
            "problem_solving": 50.0
        }
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Initialize streak data
    streak = StreakData(user_id=db_user.id)
    db.add(streak)
    db.commit()
    
    access_token, expire = create_access_token(data={"sub": str(db_user.id)})
    refresh_token = create_refresh_token(data={"sub": str(db_user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@app.post("/api/auth/login", response_model=Token)
@limiter.limit("30/minute")
def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    db_user.last_login = _utcnow()
    db.commit()
    
    access_token, expire = create_access_token(data={"sub": str(db_user.id)})
    refresh_token = create_refresh_token(data={"sub": str(db_user.id)})
    
    # Track session in Redis
    redis_client.setex(f"session:{db_user.id}", 3600, _utcnow().isoformat())
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@app.post("/api/auth/refresh")
def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    access_token, expire = create_access_token(data={"sub": str(user_id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@app.post("/api/games/session")
def record_session(
    session: GameSessionCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = current_user["id"]
    
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
    today = _utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_stat = db.query(DailyStat).filter(
        DailyStat.user_id == user_id,
        DailyStat.date == today
    ).first()
    
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
    
    # Update streak
    streak = db.query(StreakData).filter(StreakData.user_id == user_id).first()
    if streak:
        yesterday = today - timedelta(days=1)
        if streak.last_played_date and streak.last_played_date >= yesterday:
            if streak.last_played_date < today:
                streak.current_streak += 1
                streak.best_streak = max(streak.best_streak, streak.current_streak)
        else:
            streak.current_streak = 1
        streak.last_played_date = today
        streak.total_games += 1
    
    # Update cognitive profile
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.cognitive_profile:
        profile = user.cognitive_profile
        area = session.cognitive_area or "memory"
        if area in profile:
            # Weighted moving average
            profile[area] = profile[area] * 0.85 + (session.score / 20) * 0.15
            profile[area] = min(100, max(0, profile[area]))
        user.cognitive_profile = profile
    
    # Update leaderboard
    leaderboard = db.query(LeaderboardEntry).filter(
        LeaderboardEntry.user_id == user_id,
        LeaderboardEntry.game_type == session.game_type
    ).first()
    
    if leaderboard:
        if session.score > leaderboard.high_score:
            leaderboard.high_score = session.score
            leaderboard.updated_at = _utcnow()
    else:
        leaderboard = LeaderboardEntry(
            user_id=user_id,
            game_type=session.game_type,
            high_score=session.score
        )
        db.add(leaderboard)
    
    db.commit()
    
    # Invalidate caches
    redis_client.delete(f"analytics:{user_id}")
    redis_client.delete(f"recommendations:{user_id}")
    redis_client.delete(f"leaderboard:{session.game_type}")
    redis_client.delete("global_stats")
    
    background_tasks.add_task(check_and_notify_achievements, user_id)

    return {"status": "success", "session_id": db_session.id}

@app.get("/api/analytics/summary", response_model=AnalyticsSummary)
def get_analytics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["id"]
    
    # Check cache
    cached = redis_client.get(f"analytics:{user_id}")
    if cached:
        return json.loads(cached)
    
    sessions = db.query(GameSession).filter(GameSession.user_id == user_id).all()
    
    if not sessions:
        return AnalyticsSummary(
            total_games=0,
            total_score=0,
            avg_accuracy=0.0,
            current_streak=0,
            best_streak=0,
            cognitive_profile=CognitiveProfile(),
            weekly_activity=[],
            monthly_activity=[],
            improvement_trend=0.0,
            percentile_rank=50.0,
            time_spent_minutes=0
        )
    
    total_games = len(sessions)
    total_score = sum(s.score for s in sessions)
    avg_accuracy = sum(s.accuracy for s in sessions) / total_games
    time_spent = sum(s.duration_seconds or 60 for s in sessions) // 60
    
    # Get streak data
    streak = db.query(StreakData).filter(StreakData.user_id == user_id).first()
    current_streak = streak.current_streak if streak else 0
    best_streak = streak.best_streak if streak else 0
    
    # Cognitive profile
    user = db.query(User).filter(User.id == user_id).first()
    profile = user.cognitive_profile if user else {}
    
    # Weekly activity
    week_ago = _utcnow() - timedelta(days=7)
    weekly = db.query(DailyStat).filter(
        DailyStat.user_id == user_id,
        DailyStat.date >= week_ago
    ).all()
    weekly_activity = [{"date": w.date.isoformat(), "games": w.games_played, "score": w.total_score} for w in weekly]
    
    # Monthly activity
    month_ago = _utcnow() - timedelta(days=30)
    monthly = db.query(DailyStat).filter(
        DailyStat.user_id == user_id,
        DailyStat.date >= month_ago
    ).all()
    monthly_activity = [{"date": m.date.isoformat(), "games": m.games_played, "score": m.total_score} for m in monthly]
    
    # Improvement trend
    recent_scores = [s.score for s in sessions[-10:]]
    older_scores = [s.score for s in sessions[-20:-10]] if len(sessions) >= 20 else recent_scores
    improvement = np.mean(recent_scores) - np.mean(older_scores) if older_scores else 0.0
    
    # Calculate percentile (simplified)
    all_scores = db.query(GameSession.score).all()
    all_scores_list = [s[0] for s in all_scores]
    user_avg = total_score / total_games if total_games > 0 else 0
    percentile = sum(1 for s in all_scores_list if s < user_avg) / len(all_scores_list) * 100 if all_scores_list else 50.0
    
    result = {
        "total_games": total_games,
        "total_score": total_score,
        "avg_accuracy": round(avg_accuracy, 2),
        "current_streak": current_streak,
        "best_streak": best_streak,
        "cognitive_profile": profile or CognitiveProfile().model_dump(),
        "weekly_activity": weekly_activity,
        "monthly_activity": monthly_activity,
        "improvement_trend": round(improvement, 2),
        "percentile_rank": round(percentile, 1),
        "time_spent_minutes": time_spent
    }
    
    # Cache for 5 minutes
    redis_client.setex(f"analytics:{user_id}", 300, json.dumps(result))
    
    return result

@app.get("/api/recommendations", response_model=List[GameRecommendation])
def get_recommendations(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["id"]
    
    # Check cache
    cached = redis_client.get(f"recommendations:{user_id}")
    if cached:
        return json.loads(cached)
    
    # Get recent sessions for training
    sessions = db.query(GameSession).filter(
        GameSession.user_id == user_id
    ).order_by(GameSession.played_at.desc()).limit(100).all()
    
    # Train model if enough data
    if len(sessions) >= 20:
        recommender.train(sessions)
    
    # Get user profile
    user = db.query(User).filter(User.id == user_id).first()
    profile = user.cognitive_profile if user else {}
    
    # Get recommendations
    recommendations = recommender.recommend(profile, sessions, profile)
    
    # Cache for 10 minutes
    redis_client.setex(
        f"recommendations:{user_id}",
        600,
        json.dumps([r.model_dump() for r in recommendations]),
    )
    
    return recommendations

@app.get("/api/achievements")
def get_achievements(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["id"]
    
    # Get all achievements with user's progress
    all_achievements = db.query(Achievement).all()
    user_achievements = db.query(UserAchievement).filter(UserAchievement.user_id == user_id).all()
    unlocked_map = {ua.achievement_id: ua for ua in user_achievements}
    
    # Calculate progress for locked achievements
    sessions = db.query(GameSession).filter(GameSession.user_id == user_id).all()
    total_games = len(sessions)
    total_score = sum(s.score for s in sessions)
    
    result = []
    for a in all_achievements:
        ua = unlocked_map.get(a.achievement_id)
        
        # Calculate progress
        progress = 0
        if ua:
            progress = 100
        elif a.requirement_type == "games":
            progress = min(100, (total_games / a.requirement_value) * 100) if a.requirement_value else 0
        elif a.requirement_type == "score":
            max_score = max((s.score for s in sessions), default=0)
            progress = min(100, (max_score / a.requirement_value) * 100) if a.requirement_value else 0
        
        result.append({
            "id": a.achievement_id,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "unlocked": a.achievement_id in unlocked_map,
            "progress": round(progress),
            "unlocked_at": ua.unlocked_at.isoformat() if ua else None,
            "rarity": a.rarity
        })
    
    return {"achievements": result}

@app.get("/api/leaderboard/{game_type}")
def get_leaderboard(
    game_type: str,
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["id"]
    
    # Check cache
    cached = redis_client.get(f"leaderboard:{game_type}")
    if cached:
        return json.loads(cached)
    
    # Get top entries with user info
    entries = db.query(LeaderboardEntry, User.username).join(
        User, LeaderboardEntry.user_id == User.id
    ).filter(
        LeaderboardEntry.game_type == game_type
    ).order_by(LeaderboardEntry.high_score.desc()).limit(limit).all()
    
    result = []
    for i, (entry, username) in enumerate(entries):
        result.append({
            "rank": i + 1,
            "username": username,
            "score": entry.high_score,
            "is_current_user": entry.user_id == user_id
        })
    
    # Check if current user is in top
    user_entry = db.query(LeaderboardEntry).filter(
        LeaderboardEntry.user_id == user_id,
        LeaderboardEntry.game_type == game_type
    ).first()
    
    if user_entry and not any(e["is_current_user"] for e in result):
        # Find user's rank
        rank = db.query(LeaderboardEntry).filter(
            LeaderboardEntry.game_type == game_type,
            LeaderboardEntry.high_score > user_entry.high_score
        ).count() + 1
        
        result.append({
            "rank": rank,
            "username": current_user["username"],
            "score": user_entry.high_score,
            "is_current_user": True
        })
    
    # Cache for 5 minutes
    redis_client.setex(f"leaderboard:{game_type}", 300, json.dumps(result))
    
    return {"game_type": game_type, "entries": result}

@app.websocket("/api/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("action") == "ping":
                await manager.send_personal_message({"type": "pong", "timestamp": _utcnow().isoformat()}, user_id)
            elif data.get("action") == "subscribe_achievements":
                await manager.send_personal_message({"type": "subscribed", "channel": "achievements"}, user_id)
            
    except WebSocketDisconnect:
        manager.disconnect(user_id)

async def check_and_notify_achievements(user_id: int) -> None:
    """Check achievements and notify via WebSocket (isolated DB session)."""
    db = SessionLocal()
    try:
        sessions = db.query(GameSession).filter(GameSession.user_id == user_id).all()
        total_games = len(sessions)
        max_score = max((s.score for s in sessions), default=0)

        achievement_checks = [
            ("first_game", total_games >= 1),
            ("ten_games", total_games >= 10),
            ("hundred_games", total_games >= 100),
            ("score_1000", max_score >= 1000),
            ("score_5000", max_score >= 5000),
            ("perfect_accuracy", any(s.accuracy == 100 for s in sessions)),
        ]

        newly_unlocked: List[str] = []
        for achievement_id, condition in achievement_checks:
            if condition:
                existing = (
                    db.query(UserAchievement)
                    .filter(
                        UserAchievement.user_id == user_id,
                        UserAchievement.achievement_id == achievement_id,
                    )
                    .first()
                )
                if not existing:
                    db.add(UserAchievement(user_id=user_id, achievement_id=achievement_id))
                    newly_unlocked.append(achievement_id)

        if newly_unlocked:
            db.commit()
            for achievement_id in newly_unlocked:
                await manager.send_personal_message(
                    {
                        "type": "achievement_unlocked",
                        "achievement_id": achievement_id,
                        "timestamp": _utcnow().isoformat(),
                    },
                    user_id,
                )
    finally:
        db.close()

@app.get("/health")
def health_root():
    """Liveness probe (orchestrators often expect GET /health)."""
    return {"status": "healthy", "timestamp": _utcnow().isoformat()}


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": _utcnow().isoformat()}


@app.get("/api/health/ready")
def readiness():
    """Readiness: PostgreSQL + Redis must respond."""
    db_ok = False
    redis_ok = False
    try:
        dbs = SessionLocal()
        try:
            dbs.execute(text("SELECT 1"))
            db_ok = True
        finally:
            dbs.close()
    except Exception as e:
        logger.warning("readiness db check failed: %s", e)
    try:
        redis_ok = bool(redis_client.ping())
    except Exception as e:
        logger.warning("readiness redis check failed: %s", e)
    if db_ok and redis_ok:
        return {"status": "ready", "database": True, "redis": True}
    raise HTTPException(
        status_code=503,
        detail={"status": "not_ready", "database": db_ok, "redis": redis_ok},
    )

@app.get("/api/stats/global")
def get_global_stats(db: Session = Depends(get_db)):
    # Check cache
    cached = redis_client.get("global_stats")
    if cached:
        return json.loads(cached)
    
    total_users = db.query(User).count()
    total_games = db.query(GameSession).count()
    total_score_raw = db.query(func.sum(GameSession.score)).scalar()
    total_score = int(total_score_raw or 0)
    avg_acc = db.query(func.avg(GameSession.accuracy)).scalar()
    avg_acc_f = round(float(avg_acc), 2) if avg_acc is not None else 0.0

    result = {
        "total_users": total_users,
        "total_games_played": total_games,
        "total_points_earned": int(total_score),
        "average_accuracy": avg_acc_f,
    }
    
    # Cache for 1 hour
    redis_client.setex("global_stats", 3600, json.dumps(result))
    
    return result

@app.post("/api/sync")
def sync_user_data(sync_data: UserSync, db: Session = Depends(get_db)):
    # For mobile app, use a default user or create one
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        # Create default user
        user = User(
            email="mobile@localhost",
            username=sync_data.name,
            hashed_password="dummy",  # Not used for mobile
            cognitive_profile=sync_data.cognitiveAreas
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update existing user
        user.username = sync_data.name
        user.cognitive_profile = sync_data.cognitiveAreas
        db.commit()
    
    # Update or create streak data
    streak_data = db.query(StreakData).filter(StreakData.user_id == user.id).first()
    if streak_data:
        streak_data.current_streak = sync_data.streak
        streak_data.longest_streak = max(streak_data.longest_streak, sync_data.streak)
    else:
        streak_data = StreakData(
            user_id=user.id,
            current_streak=sync_data.streak,
            longest_streak=sync_data.streak
        )
        db.add(streak_data)
    db.commit()
    
    # Return updated data
    return {
        "user_id": user.id,
        "name": user.username,
        "level": sync_data.level,
        "totalScore": sync_data.totalScore,
        "gamesPlayed": sync_data.gamesPlayed,
        "streak": sync_data.streak,
        "cognitiveAreas": user.cognitive_profile
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
