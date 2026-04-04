"""
Ygy — Database seeder.
Run manually to populate the DB with sample users and achievements for dev/testing.
Usage:  python seed.py
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import async_session, create_tables
from models import Achievement, User
from auth import get_password_hash


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

ACHIEVEMENTS = [
    dict(achievement_id="first_game",       name="First Steps",      description="Complete your first game",                   icon="🎯", requirement_type="games",    requirement_value=1,    points=10,  rarity="common"),
    dict(achievement_id="ten_games",         name="Getting Started",  description="Complete 10 games",                          icon="🎮", requirement_type="games",    requirement_value=10,   points=25,  rarity="common"),
    dict(achievement_id="hundred_games",     name="Century Club",     description="Complete 100 games",                         icon="💯", requirement_type="games",    requirement_value=100,  points=100, rarity="rare"),
    dict(achievement_id="score_1000",        name="High Scorer",      description="Score 1000 points in a single game",         icon="⭐", requirement_type="score",    requirement_value=1000, points=50,  rarity="common"),
    dict(achievement_id="score_5000",        name="Legendary",        description="Score 5000 points in a single game",         icon="👑", requirement_type="score",    requirement_value=5000, points=200, rarity="legendary"),
    dict(achievement_id="perfect_accuracy",  name="Perfectionist",    description="Achieve 100% accuracy in a game",            icon="🎯", requirement_type="accuracy", requirement_value=100,  points=75,  rarity="rare"),
    dict(achievement_id="week_streak",       name="Week Warrior",     description="Play every day for 7 consecutive days",      icon="🔥", requirement_type="streak",   requirement_value=7,    points=150, rarity="rare"),
    dict(achievement_id="month_streak",      name="Dedicated",        description="Play every day for 30 consecutive days",     icon="🏆", requirement_type="streak",   requirement_value=30,   points=500, rarity="epic"),
]

DEMO_USERS = [
    dict(email="admin@ygy.app",    username="admin",    password="Admin@ygy2026",   subscription_tier="premium"),
    dict(email="demo@ygy.app",     username="demo",     password="Demo@ygy2026",    subscription_tier="free"),
    dict(email="tester@ygy.app",   username="tester",   password="Test@ygy2026",    subscription_tier="free"),
]


async def seed_achievements(db: AsyncSession):
    existing = await db.execute(select(Achievement))
    existing_ids = {a.achievement_id for a in existing.scalars().all()}
    added = 0
    for data in ACHIEVEMENTS:
        if data["achievement_id"] not in existing_ids:
            db.add(Achievement(**data))
            added += 1
    await db.commit()
    print(f"Achievements: {added} added, {len(existing_ids)} already existed")


async def seed_users(db: AsyncSession):
    added = 0
    for data in DEMO_USERS:
        result = await db.execute(select(User).where(User.email == data["email"]))
        if not result.scalars().first():
            user = User(
                email=data["email"],
                username=data["username"],
                hashed_password=get_password_hash(data["password"]),
                subscription_tier=data["subscription_tier"],
                cognitive_profile={
                    "memory": 50.0,
                    "speed": 50.0,
                    "attention": 50.0,
                    "flexibility": 50.0,
                    "problem_solving": 50.0,
                },
            )
            db.add(user)
            added += 1
    await db.commit()
    print(f"Users: {added} added")


async def main():
    print("Creating tables ...")
    await create_tables()

    async with async_session() as db:
        print("Seeding achievements ...")
        await seed_achievements(db)

        print("Seeding demo users ...")
        await seed_users(db)

    print("Seeding complete.")


if __name__ == "__main__":
    asyncio.run(main())
