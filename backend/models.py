from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Index, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(64), nullable=True)
    cognitive_profile = Column(JSON, default=dict)
    subscription_tier = Column(String(50), default="free")
    last_login = Column(DateTime, nullable=True)

    game_sessions = relationship("GameSession", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    daily_stats = relationship("DailyStat", back_populates="user", cascade="all, delete-orphan")
    friends = relationship("Friendship", foreign_keys="Friendship.user_id", back_populates="user")
    friend_requests = relationship("Friendship", foreign_keys="Friendship.friend_id", back_populates="friend")

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
    session_metadata = Column(JSON, default=dict)

    user = relationship("User", back_populates="game_sessions")

    __table_args__ = (
        Index('idx_user_game_date', 'user_id', 'game_type', 'played_at'),
    )

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    achievement_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(String(500))
    icon = Column(String(50))
    requirement_type = Column(String(50))
    requirement_value = Column(Integer)
    points = Column(Integer, default=10)
    rarity = Column(String(20), default="common")  # common, rare, epic, legendary

class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    achievement_id = Column(String(100), ForeignKey("achievements.achievement_id"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    progress = Column(Float, default=1.0)  # For partial achievements

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
    cognitive_areas_practiced = Column(JSON, default=list)

    user = relationship("User", back_populates="daily_stats")

    __table_args__ = (
        Index('idx_user_date', 'user_id', 'date', unique=True),
    )

class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    friend_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(20), default="pending")  # pending, accepted, blocked
    created_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="friends")
    friend = relationship("User", foreign_keys=[friend_id], back_populates="friend_requests")

class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(String(500))
    game_type = Column(String(50), nullable=False)
    difficulty_level = Column(Integer, default=1)
    max_participants = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    participants = relationship("ChallengeParticipant", back_populates="challenge", cascade="all, delete-orphan")

class ChallengeParticipant(Base):
    __tablename__ = "challenge_participants"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    best_score = Column(Integer, default=0)
    completed_at = Column(DateTime, nullable=True)

    challenge = relationship("Challenge", back_populates="participants")


class UserGoal(Base):
    __tablename__ = "user_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(64), nullable=False)
    target = Column(Integer, nullable=False)
    area = Column(String(64), nullable=True)
    deadline = Column(String(32), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    game_type = Column(String(50), nullable=False, index=True)
    high_score = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

    __table_args__ = (
        Index("idx_leaderboard_game_score", "game_type", "high_score"),
    )


class StreakData(Base):
    __tablename__ = "streak_data"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    current_streak = Column(Integer, default=0)
    best_streak = Column(Integer, default=0)
    last_played_date = Column(DateTime, nullable=True)
    total_games = Column(Integer, default=0)

    user = relationship("User")


class HeadToHeadChallenge(Base):
    """1v1 direct challenge between two specific users."""
    __tablename__ = "head_to_head_challenges"

    id = Column(Integer, primary_key=True, index=True)
    challenger_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    opponent_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    game_type = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")  # pending, accepted, in_progress, completed, declined
    result_challenger = Column(Integer, nullable=True)
    result_opponent = Column(Integer, nullable=True)
    room_id = Column(String(64), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    challenger = relationship("User", foreign_keys=[challenger_id])
    opponent = relationship("User", foreign_keys=[opponent_id])

    __table_args__ = (
        Index("idx_h2h_challenger", "challenger_id", "status"),
        Index("idx_h2h_opponent", "opponent_id", "status"),
    )

# ---------------------------------------------------------------------------
# Alembic migration notes (run: alembic revision --autogenerate -m "add_v2_fields")
# New columns to add:
#   users: is_verified BOOLEAN DEFAULT FALSE, verification_token VARCHAR(64)
#   New table: head_to_head_challenges (see model above)
# ---------------------------------------------------------------------------