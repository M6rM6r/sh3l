from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserUpdate(BaseModel):
    username: Optional[str] = None
    cognitive_profile: Optional[Dict[str, Any]] = None
    subscription_tier: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool
    cognitive_profile: Dict[str, Any]
    subscription_tier: str
    last_login: Optional[datetime]

    class Config:
        from_attributes = True

# Game schemas
class GameSessionBase(BaseModel):
    game_type: str
    score: int
    accuracy: float
    duration_seconds: Optional[int] = None
    difficulty_level: int = 1
    cognitive_area: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class GameSessionCreate(GameSessionBase):
    pass

class GameSessionResponse(GameSessionBase):
    id: int
    user_id: int
    played_at: datetime

    class Config:
        from_attributes = True

# Achievement schemas
class AchievementBase(BaseModel):
    achievement_id: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    requirement_type: str
    requirement_value: int
    points: int = 10
    rarity: str = "common"

class AchievementResponse(AchievementBase):
    id: int

    class Config:
        from_attributes = True

class UserAchievementResponse(BaseModel):
    achievement: AchievementResponse
    unlocked_at: datetime
    progress: float

    class Config:
        from_attributes = True

# Statistics schemas
class DailyStatResponse(BaseModel):
    date: datetime
    games_played: int
    total_score: int
    avg_accuracy: float
    streak_maintained: int
    cognitive_areas_practiced: List[str]

    class Config:
        from_attributes = True

# Social features
class FriendshipBase(BaseModel):
    friend_id: int

class FriendshipResponse(BaseModel):
    id: int
    user_id: int
    friend_id: int
    status: str
    created_at: datetime
    accepted_at: Optional[datetime]

    class Config:
        from_attributes = True

class ChallengeBase(BaseModel):
    title: str
    description: Optional[str] = None
    game_type: str
    difficulty_level: int = 1
    max_participants: int = 10
    expires_at: Optional[datetime] = None

class ChallengeResponse(ChallengeBase):
    id: int
    creator_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Analytics schemas
class CognitiveProfile(BaseModel):
    memory: float
    speed: float
    attention: float
    flexibility: float
    problem_solving: float
    spatial: float

class UserAnalytics(BaseModel):
    total_games: int
    total_score: int
    avg_accuracy: float

class AnalyticsSummary(BaseModel):
    total_games: int
    total_score: int
    avg_accuracy: float
    current_streak: int
    best_streak: int
    cognitive_profile: Dict[str, Any]
    weekly_activity: List[Dict[str, Any]]
    monthly_activity: List[Dict[str, Any]]
    improvement_trend: float
    percentile_rank: float
    time_spent_minutes: int

class GameRecommendation(BaseModel):
    game_type: str
    priority: int
    reason: str
    predicted_improvement: float
    estimated_duration: int
    current_streak: int
    longest_streak: int
    cognitive_profile: Dict[str, Any]
    achievements_unlocked: int
    time_spent_minutes: int

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None

class TokenData(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None


# Goals schemas
class GoalCreateRequest(BaseModel):
    type: str = Field(..., max_length=64)
    target: int = Field(..., ge=1, le=100000)
    area: Optional[str] = Field(None, max_length=64)
    deadline: str = Field(..., max_length=32)


class GoalResponse(BaseModel):
    id: int
    type: str
    target: int
    area: Optional[str]
    deadline: str
    created_at: datetime

    class Config:
        from_attributes = True


# AI Difficulty schemas
class DifficultyRequest(BaseModel):
    game_type: str = Field(..., max_length=64)
    score: float = Field(..., ge=0)
    accuracy: float = Field(..., ge=0, le=100)
    duration_seconds: int = Field(default=60, ge=1, le=3600)
    current_difficulty: float = Field(default=1.0, ge=1, le=10)


class DifficultyResponse(BaseModel):
    recommended_difficulty: float
    confidence: float
    reason: str
    delta: float


# NLP / Pattern analysis
class PatternAnalysisRequest(BaseModel):
    response_times: List[float] = Field(..., min_length=1, max_length=500)
    accuracies: List[float] = Field(..., min_length=1, max_length=500)
    scores: List[float] = Field(default_factory=list, max_length=500)


# Mobile sync
class UserSyncRequest(BaseModel):
    name: str
    level: int
    totalScore: int
    gamesPlayed: int
    streak: int
    cognitiveAreas: Dict[str, Any]


# Telemetry
class TelemetryEventIn(BaseModel):
    id: str
    name: str
    properties: Dict[str, Any] = {}
    timestamp: int
    session_id: str


class TelemetryBatch(BaseModel):
    events: List[TelemetryEventIn]


# ── Social / Friends ────────────────────────────────────────
class FriendRequestCreate(BaseModel):
    target_user_id: int

class FriendRequestResponse(BaseModel):
    id: int
    user_id: int
    friend_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class FriendPublicInfo(BaseModel):
    id: int
    username: str
    subscription_tier: str
    cognitive_profile: Dict[str, Any]

    class Config:
        from_attributes = True


# ── Head-to-Head Challenges ─────────────────────────────────
class H2HChallengeCreate(BaseModel):
    opponent_id: int
    game_type: str = Field(..., max_length=50)
    expires_in_hours: int = Field(default=24, ge=1, le=168)

class H2HChallengeResponse(BaseModel):
    id: int
    challenger_id: int
    opponent_id: int
    game_type: str
    status: str
    result_challenger: Optional[int]
    result_opponent: Optional[int]
    room_id: Optional[str]
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Subscription ────────────────────────────────────────────
class SubscriptionUpgrade(BaseModel):
    tier: str = Field(..., pattern="^(pro|premium)$")

class SubscriptionStatus(BaseModel):
    tier: str
    daily_games_used: int
    daily_games_limit: int  # -1 = unlimited
    features: Dict[str, Any]


# ── Auth extras ─────────────────────────────────────────────
class UserResponseV2(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime
    is_active: bool
    is_verified: bool
    cognitive_profile: Dict[str, Any]
    subscription_tier: str
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


# ── Difficulty suggest ──────────────────────────────────────
class DifficultySuggestResponse(BaseModel):
    recommended_level: int
    confidence: float

