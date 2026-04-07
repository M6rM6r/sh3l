"""
Gamification System Models - XP, Levels, Coins, and Rewards
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
import math

from .database import Base

class RarityTier(str, Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"

class ItemType(str, Enum):
    AVATAR = "avatar"
    THEME = "theme"
    BADGE_EFFECT = "badge_effect"
    POWERUP = "powerup"
    EMOTE = "emote"

class XPRewardSource(str, Enum):
    GAME_COMPLETE = "game_complete"
    STREAK_MAINTAIN = "streak_maintain"
    ACHIEVEMENT_UNLOCK = "achievement_unlock"
    DAILY_LOGIN = "daily_login"
    CHALLENGE_COMPLETE = "challenge_complete"
    PERFECT_SCORE = "perfect_score"
    SOCIAL_SHARE = "social_share"
    REFERRAL = "referral"

class UserGamificationProfile(Base):
    """User's gamification progress and stats"""
    __tablename__ = "user_gamification_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # XP & Leveling
    current_xp = Column(Integer, default=0)
    total_xp_earned = Column(Integer, default=0)
    current_level = Column(Integer, default=1)
    xp_to_next_level = Column(Integer, default=100)
    
    # Virtual Currency
    coins = Column(Integer, default=0)
    total_coins_earned = Column(Integer, default=0)
    total_coins_spent = Column(Integer, default=0)
    
    # Stats
    longest_streak = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    games_played_today = Column(Integer, default=0)
    last_played_date = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="gamification_profile")
    xp_history = relationship("XPHistory", back_populates="profile", cascade="all, delete-orphan")
    coin_transactions = relationship("CoinTransaction", back_populates="profile", cascade="all, delete-orphan")
    inventory_items = relationship("UserInventoryItem", back_populates="profile", cascade="all, delete-orphan")
    daily_rewards = relationship("DailyRewardClaim", back_populates="profile", cascade="all, delete-orphan")
    
    def calculate_xp_for_level(self, level: int) -> int:
        """Calculate XP required for a specific level (exponential curve)"""
        return int(100 * math.pow(1.5, level - 1))
    
    def add_xp(self, amount: int, source: XPRewardSource, description: str = None) -> dict:
        """Add XP and handle level ups, returns level up info if applicable"""
        self.current_xp += amount
        self.total_xp_earned += amount
        
        level_ups = []
        
        # Check for level ups
        while self.current_xp >= self.xp_to_next_level:
            self.current_xp -= self.xp_to_next_level
            self.current_level += 1
            self.xp_to_next_level = self.calculate_xp_for_level(self.current_level)
            level_ups.append(self.current_level)
        
        self.updated_at = datetime.utcnow()
        
        return {
            "xp_gained": amount,
            "current_xp": self.current_xp,
            "current_level": self.current_level,
            "xp_to_next": self.xp_to_next_level,
            "level_ups": level_ups,
            "leveled_up": len(level_ups) > 0
        }
    
    def add_coins(self, amount: int, source: str, description: str = None) -> None:
        """Add coins to user's balance"""
        self.coins += amount
        self.total_coins_earned += amount
        self.updated_at = datetime.utcnow()
    
    def spend_coins(self, amount: int) -> bool:
        """Spend coins if sufficient balance, returns success"""
        if self.coins >= amount:
            self.coins -= amount
            self.total_coins_spent += amount
            self.updated_at = datetime.utcnow()
            return True
        return False
    
    def update_streak(self, played_today: bool) -> dict:
        """Update streak based on daily play"""
        today = datetime.utcnow().date()
        
        if self.last_played_date:
            last_date = self.last_played_date.date()
            
            if last_date == today:
                # Already played today
                pass
            elif (today - last_date).days == 1:
                # Consecutive day
                if played_today:
                    self.current_streak += 1
                    self.games_played_today = 1
            else:
                # Streak broken
                self.current_streak = 1 if played_today else 0
                self.games_played_today = 1 if played_today else 0
        else:
            # First play
            self.current_streak = 1 if played_today else 0
            self.games_played_today = 1 if played_today else 0
        
        if self.current_streak > self.longest_streak:
            self.longest_streak = self.current_streak
        
        self.last_played_date = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        
        return {
            "current_streak": self.current_streak,
            "longest_streak": self.longest_streak,
            "games_today": self.games_played_today
        }

class XPHistory(Base):
    """Track XP gains for audit and analytics"""
    __tablename__ = "xp_history"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("user_gamification_profiles.id", ondelete="CASCADE"), nullable=False)
    
    amount = Column(Integer, nullable=False)
    source = Column(String, nullable=False)  # XPRewardSource
    description = Column(String, nullable=True)
    
    level_before = Column(Integer, nullable=False)
    level_after = Column(Integer, nullable=False)
    xp_before = Column(Integer, nullable=False)
    xp_after = Column(Integer, nullable=False)
    
    game_type = Column(String, nullable=True)  # If from game
    game_score = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    profile = relationship("UserGamificationProfile", back_populates="xp_history")

class CoinTransaction(Base):
    """Track all coin transactions (earned/spent)"""
    __tablename__ = "coin_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("user_gamification_profiles.id", ondelete="CASCADE"), nullable=False)
    
    amount = Column(Integer, nullable=False)  # Positive for earned, negative for spent
    balance_after = Column(Integer, nullable=False)
    
    transaction_type = Column(String, nullable=False)  # "earned" or "spent"
    source = Column(String, nullable=False)  # Where coins came from or went to
    description = Column(String, nullable=True)
    
    item_id = Column(Integer, ForeignKey("shop_items.id"), nullable=True)  # If spent on item
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    profile = relationship("UserGamificationProfile", back_populates="coin_transactions")
    item = relationship("ShopItem")

class ShopItem(Base):
    """Items available in the shop"""
    __tablename__ = "shop_items"
    
    id = Column(Integer, primary_key=True, index=True)
    
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    item_type = Column(String, nullable=False)  # ItemType
    rarity = Column(String, default=RarityTier.COMMON)
    
    # Pricing
    coin_price = Column(Integer, nullable=False)
    is_limited = Column(Boolean, default=False)
    limited_quantity = Column(Integer, nullable=True)
    
    # Visuals
    icon = Column(String, nullable=False)
    color = Column(String, default="#4fc3f7")
    preview_image = Column(String, nullable=True)
    
    # Effects (for powerups)
    effect_data = Column(JSON, default={})
    
    # Availability
    is_active = Column(Boolean, default=True)
    requires_level = Column(Integer, default=1)
    season_only = Column(String, nullable=True)  # Season name if seasonal
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    inventory_items = relationship("UserInventoryItem", back_populates="item")

class UserInventoryItem(Base):
    """Items owned by user"""
    __tablename__ = "user_inventory_items"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("user_gamification_profiles.id", ondelete="CASCADE"), nullable=False)
    item_id = Column(Integer, ForeignKey("shop_items.id", ondelete="CASCADE"), nullable=False)
    
    is_equipped = Column(Boolean, default=False)
    quantity = Column(Integer, default=1)  # For stackable items like powerups
    
    acquired_at = Column(DateTime, default=datetime.utcnow)
    equipped_at = Column(DateTime, nullable=True)
    
    # Relationships
    profile = relationship("UserGamificationProfile", back_populates="inventory_items")
    item = relationship("ShopItem", back_populates="inventory_items")

class DailyRewardClaim(Base):
    """Track daily reward claims"""
    __tablename__ = "daily_reward_claims"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("user_gamification_profiles.id", ondelete="CASCADE"), nullable=False)
    
    day_number = Column(Integer, nullable=False)  # Day in streak (1-30)
    reward_type = Column(String, nullable=False)  # "coins", "xp", "item"
    reward_amount = Column(Integer, nullable=True)
    item_id = Column(Integer, ForeignKey("shop_items.id"), nullable=True)
    
    is_claimed = Column(Boolean, default=False)
    claimed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    profile = relationship("UserGamificationProfile", back_populates="daily_rewards")
    item = relationship("ShopItem")

class SeasonalEvent(Base):
    """Seasonal events and challenges"""
    __tablename__ = "seasonal_events"
    
    id = Column(Integer, primary_key=True, index=True)
    
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    season_type = Column(String, nullable=False)  # "halloween", "winter", "spring", etc.
    
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    # Event data
    theme_color = Column(String, default="#4fc3f7")
    banner_image = Column(String, nullable=True)
    special_rewards = Column(JSON, default=[])
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    participations = relationship("EventParticipation", back_populates="event")

class EventParticipation(Base):
    """User participation in seasonal events"""
    __tablename__ = "event_participations"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("seasonal_events.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    progress = Column(Integer, default=0)  # Event-specific progress
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    
    rewards_claimed = Column(JSON, default=[])
    
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    event = relationship("SeasonalEvent", back_populates="participations")
    user = relationship("User")

class FriendRelationship(Base):
    """Social friends system"""
    __tablename__ = "friend_relationships"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    friend_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    status = Column(String, default="pending")  # "pending", "accepted", "blocked"
    
    # Stats
    games_played_together = Column(Integer, default=0)
    last_interaction = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="friendships")
    friend = relationship("User", foreign_keys=[friend_id])

class ActivityFeedItem(Base):
    """Social activity feed items"""
    __tablename__ = "activity_feed_items"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    activity_type = Column(String, nullable=False)  # "game_complete", "achievement", "level_up", "item_purchase", etc.
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Related data
    game_type = Column(String, nullable=True)
    score = Column(Integer, nullable=True)
    new_level = Column(Integer, nullable=True)
    item_name = Column(String, nullable=True)
    
    # Visibility
    is_public = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="activity_items")
