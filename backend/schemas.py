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