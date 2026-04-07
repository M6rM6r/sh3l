"""
Gamification API Endpoints - XP, Levels, Coins, Shop, Daily Rewards
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta

from .database import get_db
from .auth import get_current_user
from .gamification_models import (
    UserGamificationProfile, XPHistory, CoinTransaction, ShopItem,
    UserInventoryItem, DailyRewardClaim, XPRewardSource, ActivityFeedItem
)
from .models import User

router = APIRouter(prefix="/gamification", tags=["Gamification"])

# ═══════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════

class XPGainRequest(BaseModel):
    amount: int
    source: str
    description: Optional[str] = None
    game_type: Optional[str] = None
    game_score: Optional[int] = None

class XPGainResponse(BaseModel):
    xp_gained: int
    current_xp: int
    current_level: int
    xp_to_next: int
    leveled_up: bool
    level_ups: List[int]

class GamificationProfileResponse(BaseModel):
    user_id: int
    username: str
    current_xp: int
    total_xp_earned: int
    current_level: int
    xp_to_next_level: int
    level_progress_percent: float
    coins: int
    total_coins_earned: int
    longest_streak: int
    current_streak: int
    games_played_today: int
    
    class Config:
        from_attributes = True

class XPHistoryItem(BaseModel):
    amount: int
    source: str
    description: Optional[str]
    level_before: int
    level_after: int
    created_at: datetime

class ShopItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    item_type: str
    rarity: str
    coin_price: int
    icon: str
    color: str
    is_limited: bool
    limited_quantity: Optional[int]
    requires_level: int
    is_owned: bool = False

class PurchaseResponse(BaseModel):
    success: bool
    message: str
    new_balance: int
    item_id: Optional[int] = None

class DailyRewardInfo(BaseModel):
    day_number: int
    reward_type: str
    reward_amount: Optional[int]
    item_name: Optional[str]
    is_claimed: bool
    can_claim: bool
    is_today: bool

class DailyRewardClaimResponse(BaseModel):
    success: bool
    reward_type: str
    reward_amount: Optional[int]
    item_name: Optional[str]
    new_balance: Optional[int]
    current_streak: int

class InventoryItemResponse(BaseModel):
    id: int
    item_name: str
    item_type: str
    rarity: str
    icon: str
    color: str
    is_equipped: bool
    quantity: int
    acquired_at: datetime

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    level: int
    total_xp: int
    is_current_user: bool

# ═══════════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════════

def get_or_create_profile(db: Session, user_id: int) -> UserGamificationProfile:
    """Get existing profile or create new one"""
    profile = db.query(UserGamificationProfile).filter(
        UserGamificationProfile.user_id == user_id
    ).first()
    
    if not profile:
        profile = UserGamificationProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
        # Initialize daily rewards
        create_daily_rewards(db, profile.id)
    
    return profile

def create_daily_rewards(db: Session, profile_id: int):
    """Create 30-day reward calendar for user"""
    rewards_config = [
        # Week 1
        {"day": 1, "type": "coins", "amount": 50},
        {"day": 2, "type": "coins", "amount": 75},
        {"day": 3, "type": "coins", "amount": 100},
        {"day": 4, "type": "coins", "amount": 125},
        {"day": 5, "type": "coins", "amount": 150},
        {"day": 6, "type": "coins", "amount": 200},
        {"day": 7, "type": "item", "item_name": "Lucky Charm"},
        # Week 2
        {"day": 8, "type": "coins", "amount": 100},
        {"day": 9, "type": "coins", "amount": 125},
        {"day": 10, "type": "xp", "amount": 500},
        {"day": 11, "type": "coins", "amount": 150},
        {"day": 12, "type": "coins", "amount": 175},
        {"day": 13, "type": "coins", "amount": 200},
        {"day": 14, "type": "item", "item_name": "Brain Boost"},
        # Week 3
        {"day": 15, "type": "coins", "amount": 150},
        {"day": 16, "type": "coins", "amount": 175},
        {"day": 17, "type": "xp", "amount": 750},
        {"day": 18, "type": "coins", "amount": 200},
        {"day": 19, "type": "coins", "amount": 225},
        {"day": 20, "type": "coins", "amount": 250},
        {"day": 21, "type": "item", "item_name": "Focus Lens"},
        # Week 4
        {"day": 22, "type": "coins", "amount": 200},
        {"day": 23, "type": "coins", "amount": 225},
        {"day": 24, "type": "xp", "amount": 1000},
        {"day": 25, "type": "coins", "amount": 250},
        {"day": 26, "type": "coins", "amount": 275},
        {"day": 27, "type": "coins", "amount": 300},
        {"day": 28, "type": "item", "item_name": "Genius Crown"},
        {"day": 29, "type": "coins", "amount": 500},
        {"day": 30, "type": "item", "item_name": "Legendary Badge"},
    ]
    
    for reward in rewards_config:
        daily_reward = DailyRewardClaim(
            profile_id=profile_id,
            day_number=reward["day"],
            reward_type=reward["type"],
            reward_amount=reward.get("amount"),
            is_claimed=False
        )
        db.add(daily_reward)
    
    db.commit()

def calculate_xp_for_game(score: int, accuracy: float, difficulty: int, streak: int) -> int:
    """Calculate XP gained from a game session"""
    base_xp = 10
    
    # Score multiplier (0.5x to 2x based on score)
    score_multiplier = min(2.0, 0.5 + (score / 1000))
    
    # Accuracy bonus (up to 50% bonus)
    accuracy_bonus = accuracy / 200
    
    # Difficulty multiplier
    difficulty_multiplier = 1 + (difficulty - 1) * 0.2
    
    # Streak bonus (up to 100% bonus)
    streak_bonus = min(1.0, streak * 0.1)
    
    total_xp = int(base_xp * score_multiplier * (1 + accuracy_bonus) * difficulty_multiplier * (1 + streak_bonus))
    
    return max(5, total_xp)  # Minimum 5 XP

def add_activity_feed_item(db: Session, user_id: int, activity_type: str, title: str, 
                          description: str = None, **kwargs):
    """Add item to activity feed"""
    activity = ActivityFeedItem(
        user_id=user_id,
        activity_type=activity_type,
        title=title,
        description=description,
        **kwargs
    )
    db.add(activity)
    db.commit()

# ═══════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/profile", response_model=GamificationProfileResponse)
async def get_gamification_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's gamification profile"""
    profile = get_or_create_profile(db, current_user.id)
    
    # Calculate level progress percentage
    xp_for_current_level = profile.calculate_xp_for_level(profile.current_level)
    xp_for_next_level = profile.xp_to_next_level
    total_xp_needed = xp_for_next_level
    current_xp_in_level = profile.current_xp
    
    progress_percent = (current_xp_in_level / total_xp_needed) * 100 if total_xp_needed > 0 else 0
    
    return GamificationProfileResponse(
        user_id=current_user.id,
        username=current_user.username,
        current_xp=profile.current_xp,
        total_xp_earned=profile.total_xp_earned,
        current_level=profile.current_level,
        xp_to_next_level=profile.xp_to_next_level,
        level_progress_percent=round(progress_percent, 1),
        coins=profile.coins,
        total_coins_earned=profile.total_coins_earned,
        longest_streak=profile.longest_streak,
        current_streak=profile.current_streak,
        games_played_today=profile.games_played_today
    )

@router.post("/xp/gain", response_model=XPGainResponse)
async def gain_xp(
    request: XPGainRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Award XP to user (called after game completion, achievements, etc.)"""
    profile = get_or_create_profile(db, current_user.id)
    
    # Record XP history
    xp_history = XPHistory(
        profile_id=profile.id,
        amount=request.amount,
        source=request.source,
        description=request.description,
        level_before=profile.current_level,
        level_after=profile.current_level,  # Will be updated after add_xp
        xp_before=profile.current_xp,
        xp_after=profile.current_xp + request.amount,
        game_type=request.game_type,
        game_score=request.game_score
    )
    db.add(xp_history)
    
    # Add XP and handle level ups
    result = profile.add_xp(request.amount, request.source, request.description)
    
    # Update XP history with final level
    xp_history.level_after = result["current_level"]
    
    # Award coins for level ups
    coins_earned = 0
    if result["leveled_up"]:
        for level in result["level_ups"]:
            level_reward = level * 10  # 10 coins per level
            coins_earned += level_reward
            profile.add_coins(level_reward, "level_up", f"Level {level} reached!")
        
        # Add activity feed item for level up
        background_tasks.add_task(
            add_activity_feed_item,
            db=db,
            user_id=current_user.id,
            activity_type="level_up",
            title=f"Reached Level {result['current_level']}!",
            description=f"Earned {coins_earned} coins as reward",
            new_level=result["current_level"]
        )
    
    db.commit()
    
    return XPGainResponse(**result)

@router.get("/xp/history", response_model=List[XPHistoryItem])
async def get_xp_history(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get XP gain history"""
    profile = get_or_create_profile(db, current_user.id)
    
    history = db.query(XPHistory).filter(
        XPHistory.profile_id == profile.id
    ).order_by(desc(XPHistory.created_at)).limit(limit).all()
    
    return [
        XPHistoryItem(
            amount=h.amount,
            source=h.source,
            description=h.description,
            level_before=h.level_before,
            level_after=h.level_after,
            created_at=h.created_at
        ) for h in history
    ]

@router.post("/game-complete")
async def process_game_complete(
    game_type: str,
    score: int,
    accuracy: float,
    difficulty: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process game completion - award XP, update streak, etc."""
    profile = get_or_create_profile(db, current_user.id)
    
    # Update streak
    streak_info = profile.update_streak(played_today=True)
    
    # Calculate XP
    xp_earned = calculate_xp_for_game(score, accuracy, difficulty, streak_info["current_streak"])
    
    # Add XP
    xp_result = profile.add_xp(xp_earned, XPRewardSource.GAME_COMPLETE, f"Completed {game_type}")
    
    # Award coins (base + streak bonus)
    base_coins = 10
    streak_bonus = min(50, streak_info["current_streak"] * 2)
    coins_earned = base_coins + streak_bonus
    profile.add_coins(coins_earned, "game_complete", f"Game: {game_type}")
    
    # Award streak maintenance XP if applicable
    streak_xp = 0
    if streak_info["current_streak"] > 1:
        streak_xp = min(100, streak_info["current_streak"] * 5)
        profile.add_xp(streak_xp, XPRewardSource.STREAK_MAINTAIN, f"{streak_info['current_streak']} day streak!")
    
    # Perfect score bonus
    perfect_bonus_xp = 0
    if accuracy >= 95:
        perfect_bonus_xp = 50
        profile.add_xp(perfect_bonus_xp, XPRewardSource.PERFECT_SCORE, "Perfect performance!")
    
    db.commit()
    
    return {
        "xp_earned": xp_earned + streak_xp + perfect_bonus_xp,
        "coins_earned": coins_earned,
        "streak": streak_info["current_streak"],
        "level_up": xp_result["leveled_up"],
        "new_level": xp_result["current_level"] if xp_result["leveled_up"] else None
    }

@router.get("/shop/items", response_model=List[ShopItemResponse])
async def get_shop_items(
    item_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available shop items"""
    profile = get_or_create_profile(db, current_user.id)
    
    query = db.query(ShopItem).filter(ShopItem.is_active == True)
    
    if item_type:
        query = query.filter(ShopItem.item_type == item_type)
    
    # Filter by level requirement
    query = query.filter(ShopItem.requires_level <= profile.current_level)
    
    items = query.all()
    
    # Check ownership
    owned_item_ids = {inv.item_id for inv in profile.inventory_items}
    
    return [
        ShopItemResponse(
            id=item.id,
            name=item.name,
            description=item.description,
            item_type=item.item_type,
            rarity=item.rarity,
            coin_price=item.coin_price,
            icon=item.icon,
            color=item.color,
            is_limited=item.is_limited,
            limited_quantity=item.limited_quantity,
            requires_level=item.requires_level,
            is_owned=item.id in owned_item_ids
        ) for item in items
    ]

@router.post("/shop/purchase/{item_id}", response_model=PurchaseResponse)
async def purchase_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Purchase item from shop"""
    profile = get_or_create_profile(db, current_user.id)
    
    # Get item
    item = db.query(ShopItem).filter(ShopItem.id == item_id, ShopItem.is_active == True).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check level requirement
    if item.requires_level > profile.current_level:
        raise HTTPException(status_code=403, detail=f"Requires level {item.requires_level}")
    
    # Check if already owned (for non-stackable items)
    if item.item_type != "powerup":
        existing = db.query(UserInventoryItem).filter(
            UserInventoryItem.profile_id == profile.id,
            UserInventoryItem.item_id == item_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Item already owned")
    
    # Check balance
    if profile.coins < item.coin_price:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Spend coins
    if not profile.spend_coins(item.coin_price):
        raise HTTPException(status_code=400, detail="Transaction failed")
    
    # Record transaction
    transaction = CoinTransaction(
        profile_id=profile.id,
        amount=-item.coin_price,
        balance_after=profile.coins,
        transaction_type="spent",
        source="shop_purchase",
        description=f"Purchased {item.name}",
        item_id=item_id
    )
    db.add(transaction)
    
    # Add to inventory
    inventory_item = db.query(UserInventoryItem).filter(
        UserInventoryItem.profile_id == profile.id,
        UserInventoryItem.item_id == item_id
    ).first()
    
    if inventory_item:
        # Stackable item
        inventory_item.quantity += 1
    else:
        # New item
        inventory_item = UserInventoryItem(
            profile_id=profile.id,
            item_id=item_id,
            quantity=1
        )
        db.add(inventory_item)
    
    db.commit()
    
    return PurchaseResponse(
        success=True,
        message=f"Successfully purchased {item.name}!",
        new_balance=profile.coins,
        item_id=item_id
    )

@router.get("/inventory", response_model=List[InventoryItemResponse])
async def get_inventory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's inventory"""
    profile = get_or_create_profile(db, current_user.id)
    
    inventory = db.query(UserInventoryItem).filter(
        UserInventoryItem.profile_id == profile.id
    ).all()
    
    return [
        InventoryItemResponse(
            id=inv.id,
            item_name=inv.item.name,
            item_type=inv.item.item_type,
            rarity=inv.item.rarity,
            icon=inv.item.icon,
            color=inv.item.color,
            is_equipped=inv.is_equipped,
            quantity=inv.quantity,
            acquired_at=inv.acquired_at
        ) for inv in inventory
    ]

@router.post("/inventory/equip/{inventory_item_id}")
async def equip_item(
    inventory_item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Equip/unequip inventory item"""
    profile = get_or_create_profile(db, current_user.id)
    
    item = db.query(UserInventoryItem).filter(
        UserInventoryItem.id == inventory_item_id,
        UserInventoryItem.profile_id == profile.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Unequip all items of same type
    if not item.is_equipped:
        db.query(UserInventoryItem).filter(
            UserInventoryItem.profile_id == profile.id,
            UserInventoryItem.item.item_type == item.item.item_type,
            UserInventoryItem.is_equipped == True
        ).update({"is_equipped": False})
    
    # Toggle equipped status
    item.is_equipped = not item.is_equipped
    item.equipped_at = datetime.utcnow() if item.is_equipped else None
    
    db.commit()
    
    return {
        "success": True,
        "equipped": item.is_equipped,
        "item_name": item.item.name
    }

@router.get("/daily-rewards", response_model=List[DailyRewardInfo])
async def get_daily_rewards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get daily reward calendar"""
    profile = get_or_create_profile(db, current_user.id)
    
    rewards = db.query(DailyRewardClaim).filter(
        DailyRewardClaim.profile_id == profile.id
    ).order_by(DailyRewardClaim.day_number).all()
    
    today = datetime.utcnow().date()
    last_played = profile.last_played_date.date() if profile.last_played_date else None
    
    # Determine today's reward
    can_claim_today = True
    if last_played == today:
        can_claim_today = False  # Already played today
    elif last_played and (today - last_played).days > 1:
        # Streak broken, reset to day 1
        can_claim_today = True
    
    result = []
    for reward in rewards:
        is_today = reward.day_number == profile.current_streak and can_claim_today
        
        item_name = None
        if reward.reward_type == "item" and reward.item_id:
            item = db.query(ShopItem).filter(ShopItem.id == reward.item_id).first()
            item_name = item.name if item else "Mystery Item"
        
        result.append(DailyRewardInfo(
            day_number=reward.day_number,
            reward_type=reward.reward_type,
            reward_amount=reward.reward_amount,
            item_name=item_name,
            is_claimed=reward.is_claimed,
            can_claim=can_claim_today and is_today,
            is_today=is_today
        ))
    
    return result

@router.post("/daily-rewards/claim", response_model=DailyRewardClaimResponse)
async def claim_daily_reward(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Claim today's daily reward"""
    profile = get_or_create_profile(db, current_user.id)
    
    # Check if already claimed today
    today_reward = db.query(DailyRewardClaim).filter(
        DailyRewardClaim.profile_id == profile.id,
        DailyRewardClaim.day_number == profile.current_streak,
        DailyRewardClaim.is_claimed == True
    ).first()
    
    if today_reward:
        raise HTTPException(status_code=400, detail="Already claimed today")
    
    # Get today's reward
    reward = db.query(DailyRewardClaim).filter(
        DailyRewardClaim.profile_id == profile.id,
        DailyRewardClaim.day_number == profile.current_streak
    ).first()
    
    if not reward:
        raise HTTPException(status_code=404, detail="No reward available")
    
    # Claim reward
    reward.is_claimed = True
    reward.claimed_at = datetime.utcnow()
    
    new_balance = None
    item_name = None
    
    if reward.reward_type == "coins":
        profile.add_coins(reward.reward_amount, "daily_reward", f"Day {reward.day_number}")
        new_balance = profile.coins
    elif reward.reward_type == "xp":
        profile.add_xp(reward.reward_amount, XPRewardSource.DAILY_LOGIN, f"Day {reward.day_number}")
    elif reward.reward_type == "item":
        if reward.item_id:
            inventory_item = UserInventoryItem(
                profile_id=profile.id,
                item_id=reward.item_id,
                quantity=1
            )
            db.add(inventory_item)
            item = db.query(ShopItem).filter(ShopItem.id == reward.item_id).first()
            item_name = item.name if item else "Mystery Item"
    
    db.commit()
    
    return DailyRewardClaimResponse(
        success=True,
        reward_type=reward.reward_type,
        reward_amount=reward.reward_amount if reward.reward_type in ["coins", "xp"] else None,
        item_name=item_name,
        new_balance=new_balance,
        current_streak=profile.current_streak
    )

@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get global XP leaderboard"""
    # Get top users by XP
    top_profiles = db.query(
        UserGamificationProfile,
        User.username
    ).join(User).order_by(
        desc(UserGamificationProfile.total_xp_earned)
    ).limit(limit).all()
    
    result = []
    for rank, (profile, username) in enumerate(top_profiles, 1):
        result.append(LeaderboardEntry(
            rank=rank,
            user_id=profile.user_id,
            username=username,
            level=profile.current_level,
            total_xp=profile.total_xp_earned,
            is_current_user=profile.user_id == current_user.id
        ))
    
    return result

@router.get("/friends/activity", response_model=List[dict])
async def get_friends_activity(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get activity feed from friends"""
    # Get friend IDs
    from .gamification_models import FriendRelationship
    
    friend_ids = db.query(FriendRelationship.friend_id).filter(
        FriendRelationship.user_id == current_user.id,
        FriendRelationship.status == "accepted"
    ).all()
    
    friend_ids = [f[0] for f in friend_ids]
    
    # Get recent activity from friends
    activities = db.query(ActivityFeedItem, User.username).join(User).filter(
        ActivityFeedItem.user_id.in_(friend_ids),
        ActivityFeedItem.is_public == True
    ).order_by(desc(ActivityFeedItem.created_at)).limit(limit).all()
    
    return [
        {
            "id": activity.id,
            "user_id": activity.user_id,
            "username": username,
            "activity_type": activity.activity_type,
            "title": activity.title,
            "description": activity.description,
            "game_type": activity.game_type,
            "score": activity.score,
            "new_level": activity.new_level,
            "created_at": activity.created_at
        } for activity, username in activities
    ]
