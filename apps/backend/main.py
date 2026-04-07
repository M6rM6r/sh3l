from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, JSON, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import redis
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import pandas as pd
import os
import json
from dotenv import load_dotenv

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://Ygy:password@localhost/Ygy")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Initialize FastAPI
app = FastAPI(title="Ygy Clone API", version="1.0.0", docs_url="/api/docs")

# CORS - allow_origins=["*"] cannot be used with allow_credentials=True
# For production, specify exact origins
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
if os.getenv("ENVIRONMENT") == "development":
    CORS_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_ORIGINS != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gzip compression for responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Database with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Redis
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Integer, default=1)
    cognitive_profile = Column(JSON, default={})
    
    game_sessions = relationship("GameSession", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    daily_stats = relationship("DailyStat", back_populates="user", cascade="all, delete-orphan")

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
    played_at = Column(DateTime, default=datetime.utcnow, index=True)
    
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

class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    achievement_id = Column(String(100), ForeignKey("achievements.achievement_id"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    
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

# Pydantic Schemas
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class GameSessionCreate(BaseModel):
    game_type: str
    score: int
    accuracy: float
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

class AnalyticsSummary(BaseModel):
    total_games: int
    total_score: int
    avg_accuracy: float
    current_streak: int
    best_streak: int
    cognitive_profile: CognitiveProfile
    weekly_activity: List[Dict]
    improvement_trend: float

# AI Recommendation Engine
class CognitiveRecommender:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.is_trained = False
        
    def train(self, sessions: List[GameSession]):
        if len(sessions) < 10:
            return
            
        df = pd.DataFrame([{
            'game_type': s.game_type,
            'score': s.score,
            'accuracy': s.accuracy,
            'difficulty': s.difficulty_level,
            'hour': s.played_at.hour if s.played_at else 12,
            'cognitive_area': s.cognitive_area
        } for s in sessions])
        
        # Feature engineering
        area_performance = df.groupby('cognitive_area')['score'].mean().to_dict()
        
        X = df[['score', 'accuracy', 'difficulty', 'hour']].values
        y = df['score'].shift(-1).fillna(df['score'].mean()).values
        
        self.model.fit(X, y)
        self.is_trained = True
        self.area_performance = area_performance
        
    def recommend(self, user_stats: Dict, recent_sessions: List[GameSession]) -> List[GameRecommendation]:
        if not recent_sessions:
            return [
                GameRecommendation(game_type="memory", priority=1, reason="Baseline assessment", predicted_improvement=10.0),
                GameRecommendation(game_type="speed", priority=2, reason="Baseline assessment", predicted_improvement=10.0),
                GameRecommendation(game_type="attention", priority=3, reason="Baseline assessment", predicted_improvement=10.0),
            ]
        
        # Calculate weakest areas
        area_scores = {}
        for session in recent_sessions:
            area = session.cognitive_area or "memory"
            if area not in area_scores:
                area_scores[area] = []
            area_scores[area].append(session.score)
        
        avg_by_area = {area: sum(scores)/len(scores) for area, scores in area_scores.items()}
        
        # Prioritize underperforming areas
        recommendations = []
        game_mapping = {
            "memory": ["memory", "word"],
            "speed": ["speed", "reaction"],
            "attention": ["attention", "visual"],
            "flexibility": ["flexibility"],
            "problem_solving": ["problemSolving", "math", "spatial"]
        }
        
        sorted_areas = sorted(avg_by_area.items(), key=lambda x: x[1])
        
        for i, (area, score) in enumerate(sorted_areas[:3]):
            games = game_mapping.get(area, ["memory"])
            for game in games[:1]:
                recommendations.append(GameRecommendation(
                    game_type=game,
                    priority=i + 1,
                    reason=f"Improve your {area} skills (current avg: {score:.0f})",
                    predicted_improvement=max(15 - i * 3, 5.0)
                ))
        
        return recommendations[:5]

# Initialize AI engine
recommender = CognitiveRecommender()

# Helper functions
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
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        token_type = payload.get("type")
        if token_type != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Check Redis cache
    cached_user = redis_client.get(f"user:{user_id}")
    if cached_user:
        return json.loads(cached_user)
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Cache user data
    user_dict = {"id": user.id, "email": user.email, "username": user.username}
    redis_client.setex(f"user:{user_id}", 300, json.dumps(user_dict))
    
    return user_dict

# WebSocket connection manager
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
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/health/ready")
def readiness_check():
    """Kubernetes readiness probe - checks dependencies"""
    checks = {
        "database": False,
        "redis": False
    }
    
    # Check database
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        checks["database"] = True
    except Exception:
        pass
    
    # Check Redis
    try:
        redis_client.ping()
        checks["redis"] = True
    except Exception:
        pass
    
    all_healthy = all(checks.values())
    
    if not all_healthy:
        raise HTTPException(status_code=503, detail=checks)
    
    return {"status": "ready", "checks": checks}

@app.post("/api/auth/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
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
    
    access_token = create_access_token(data={"sub": db_user.id})
    refresh_token = create_refresh_token(data={"sub": db_user.id})
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": db_user.id})
    refresh_token = create_refresh_token(data={"sub": db_user.id})
    
    # Track login in Redis
    redis_client.setex(f"session:{db_user.id}", 3600, datetime.utcnow().isoformat())
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@app.post("/api/auth/refresh")
def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        token_type = payload.get("type")
        if token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    access_token = create_access_token(data={"sub": user_id})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/games/session")
def record_session(
    session: GameSessionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["id"]
    
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
    
    # Update cognitive profile
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.cognitive_profile:
        profile = user.cognitive_profile
        area = session.cognitive_area or "memory"
        if area in profile:
            # Exponential moving average
            profile[area] = profile[area] * 0.9 + (session.score / 10) * 0.1
            profile[area] = min(100, max(0, profile[area]))
        user.cognitive_profile = profile
    
    db.commit()
    
    # Invalidate cache
    redis_client.delete(f"analytics:{user_id}")
    redis_client.delete(f"recommendations:{user_id}")
    
    # Check achievements (async via WebSocket)
    check_achievements(user_id, db)
    
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
        import json
        return json.loads(cached)
    
    # Calculate statistics
    sessions = db.query(GameSession).filter(GameSession.user_id == user_id).all()
    
    if not sessions:
        return AnalyticsSummary(
            total_games=0,
            total_score=0,
            avg_accuracy=0,
            current_streak=0,
            best_streak=0,
            cognitive_profile=CognitiveProfile(),
            weekly_activity=[],
            improvement_trend=0.0
        )
    
    total_games = len(sessions)
    total_score = sum(s.score for s in sessions)
    avg_accuracy = sum(s.accuracy for s in sessions) / total_games
    
    # Calculate streak
    daily_stats = db.query(DailyStat).filter(DailyStat.user_id == user_id).order_by(DailyStat.date.desc()).all()
    current_streak = 0
    best_streak = 0
    
    for i, stat in enumerate(daily_stats):
        if stat.games_played > 0:
            if i == current_streak:
                current_streak += 1
            best_streak += 1
    
    # Cognitive profile
    user = db.query(User).filter(User.id == user_id).first()
    profile = user.cognitive_profile if user else {}
    
    # Weekly activity
    week_ago = datetime.utcnow() - timedelta(days=7)
    weekly = db.query(DailyStat).filter(
        DailyStat.user_id == user_id,
        DailyStat.date >= week_ago
    ).all()
    weekly_activity = [{"date": w.date.isoformat(), "games": w.games_played, "score": w.total_score} for w in weekly]
    
    # Improvement trend
    recent_scores = [s.score for s in sessions[-10:]]
    older_scores = [s.score for s in sessions[-20:-10]] if len(sessions) >= 20 else recent_scores
    improvement = np.mean(recent_scores) - np.mean(older_scores) if older_scores else 0
    
    result = {
        "total_games": total_games,
        "total_score": total_score,
        "avg_accuracy": round(avg_accuracy, 2),
        "current_streak": current_streak,
        "best_streak": best_streak,
        "cognitive_profile": profile or CognitiveProfile().model_dump(),
        "weekly_activity": weekly_activity,
        "improvement_trend": round(improvement, 2)
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
        import json
        return json.loads(cached)
    
    # Get recent sessions
    sessions = db.query(GameSession).filter(
        GameSession.user_id == user_id
    ).order_by(GameSession.played_at.desc()).limit(50).all()
    
    # Train model if enough data
    if len(sessions) >= 10:
        recommender.train(sessions)
    
    # Get recommendations
    user = db.query(User).filter(User.id == user_id).first()
    recommendations = recommender.recommend(user.cognitive_profile if user else {}, sessions)
    
    # Cache for 10 minutes
    redis_client.setex(f"recommendations:{user_id}", 600, json.dumps([r.model_dump() for r in recommendations]))
    
    return recommendations

@app.get("/api/achievements")
def get_achievements(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["id"]
    
    # Get all achievements
    all_achievements = db.query(Achievement).all()
    
    # Get user's unlocked achievements
    unlocked = db.query(UserAchievement).filter(UserAchievement.user_id == user_id).all()
    unlocked_ids = {ua.achievement_id for ua in unlocked}
    
    return {
        "achievements": [
            {
                "id": a.achievement_id,
                "name": a.name,
                "description": a.description,
                "icon": a.icon,
                "unlocked": a.achievement_id in unlocked_ids
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
            # Handle real-time updates
            if data.get("action") == "ping":
                await manager.send_personal_message({"type": "pong"}, user_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)

def check_achievements(user_id: int, db: Session):
    """Check and award achievements"""
    # Get user stats
    sessions = db.query(GameSession).filter(GameSession.user_id == user_id).all()
    total_games = len(sessions)
    
    # Define achievement checks
    achievement_checks = [
        ("first_game", total_games >= 1),
        ("ten_games", total_games >= 10),
        ("hundred_games", total_games >= 100),
        ("score_1000", any(s.score >= 1000 for s in sessions)),
        ("score_5000", any(s.score >= 5000 for s in sessions)),
        ("perfect_accuracy", any(s.accuracy == 100 for s in sessions)),
    ]
    
    for achievement_id, condition in achievement_checks:
        if condition:
            existing = db.query(UserAchievement).filter(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id == achievement_id
            ).first()
            if not existing:
                ua = UserAchievement(user_id=user_id, achievement_id=achievement_id)
                db.add(ua)
                # Notify via WebSocket
                import asyncio
                asyncio.create_task(
                    manager.send_personal_message({
                        "type": "achievement_unlocked",
                        "achievement_id": achievement_id
                    }, user_id)
                )
    
    db.commit()

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    
    # Seed achievements
    db = SessionLocal()
    existing = db.query(Achievement).first()
    if not existing:
        achievements = [
            Achievement(achievement_id="first_game", name="First Steps", description="Complete your first game", icon="🎯", requirement_type="games", requirement_value=1),
            Achievement(achievement_id="ten_games", name="Getting Started", description="Complete 10 games", icon="🎮", requirement_type="games", requirement_value=10),
            Achievement(achievement_id="hundred_games", name="Century Club", description="Complete 100 games", icon="💯", requirement_type="games", requirement_value=100),
            Achievement(achievement_id="score_1000", name="High Scorer", description="Score 1000 points in a single game", icon="⭐", requirement_type="score", requirement_value=1000),
            Achievement(achievement_id="score_5000", name="Legendary", description="Score 5000 points in a single game", icon="👑", requirement_type="score", requirement_value=5000),
            Achievement(achievement_id="perfect_accuracy", name="Perfectionist", description="Achieve 100% accuracy", icon="🎯", requirement_type="accuracy", requirement_value=100),
        ]
        for a in achievements:
            db.add(a)
        db.commit()
    db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)



