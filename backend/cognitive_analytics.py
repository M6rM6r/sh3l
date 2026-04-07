"""
Cognitive Analytics Engine — computes user performance fingerprints,
decay curves, and optimal scheduling using Bayesian estimation.
Consumes game_sessions, outputs structured cognitive reports.
"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import numpy as np

from models import GameSession, DailyStat


# Cognitive dimension mapping
GAME_DIMENSIONS: dict[str, list[str]] = {
    "memory": ["memory"],
    "memory_match": ["memory"],
    "speed": ["speed", "attention"],
    "attention": ["attention", "focus"],
    "flexibility": ["flexibility", "attention"],
    "problemSolving": ["problem_solving", "logic"],
    "math": ["math", "speed"],
    "reaction": ["speed", "reaction"],
    "word": ["language", "memory"],
    "visual": ["attention", "spatial"],
    "spatial": ["spatial", "memory"],
    "logic_grid": ["logic", "problem_solving"],
    "code_breaker": ["logic", "memory"],
    "tower_of_hanoi": ["logic", "spatial"],
    "math_marathon": ["math", "speed"],
    "chess": ["logic", "problem_solving", "spatial"],
    "focus_grid": ["focus", "memory"],
    "word_unscramble": ["language"],
    "sliding_puzzle": ["spatial", "logic"],
    "attention_grid": ["attention", "speed"],
    "speed_reaction": ["speed", "reaction"],
    "math_blitz": ["math", "speed"],
    "voice_command": ["attention", "language"],
    "voice_math": ["math", "language"],
    "voice_memory": ["memory", "language"],
    "voice_spelling": ["language"],
}

ALL_DIMENSIONS = [
    "memory", "speed", "attention", "flexibility",
    "problem_solving", "logic", "math", "language",
    "spatial", "focus", "reaction",
]


async def compute_cognitive_fingerprint(
    db: AsyncSession, user_id: int, window_days: int = 30
) -> dict:
    """
    Returns a normalized 0-100 score per cognitive dimension
    weighted by recency and accuracy.
    """
    since = datetime.utcnow() - timedelta(days=window_days)
    result = await db.execute(
        select(GameSession)
        .where(GameSession.user_id == user_id, GameSession.played_at >= since)
        .order_by(GameSession.played_at.desc())
    )
    sessions = result.scalars().all()

    if not sessions:
        return {d: 50.0 for d in ALL_DIMENSIONS}

    dim_scores: dict[str, list[float]] = {d: [] for d in ALL_DIMENSIONS}
    now = datetime.utcnow()

    for s in sessions:
        dims = GAME_DIMENSIONS.get(s.game_type, ["problem_solving"])
        age_days = max(1, (now - s.played_at).days)
        recency_weight = 1.0 / (1 + 0.05 * age_days)  # exponential decay
        weighted_score = (s.score / max(1, s.score + 500)) * 100 * recency_weight
        for d in dims:
            if d in dim_scores:
                dim_scores[d].append(weighted_score)

    fingerprint = {}
    for d in ALL_DIMENSIONS:
        vals = dim_scores[d]
        if vals:
            fingerprint[d] = round(min(100, np.mean(vals) * 1.2), 1)
        else:
            fingerprint[d] = 50.0

    return fingerprint


async def compute_trend(
    db: AsyncSession, user_id: int, dimension: str, window_days: int = 14
) -> dict:
    """
    Computes linear trend (slope) for a cognitive dimension over window.
    Returns { slope, direction, confidence }.
    """
    since = datetime.utcnow() - timedelta(days=window_days)
    result = await db.execute(
        select(GameSession)
        .where(GameSession.user_id == user_id, GameSession.played_at >= since)
        .order_by(GameSession.played_at)
    )
    sessions = result.scalars().all()

    relevant = [
        s for s in sessions
        if dimension in GAME_DIMENSIONS.get(s.game_type, [])
    ]

    if len(relevant) < 3:
        return {"slope": 0, "direction": "insufficient_data", "confidence": 0}

    x = np.arange(len(relevant), dtype=float)
    y = np.array([s.score for s in relevant], dtype=float)
    coeffs = np.polyfit(x, y, 1)
    slope = float(coeffs[0])
    correlation = float(np.corrcoef(x, y)[0, 1]) if len(x) > 2 else 0

    direction = "improving" if slope > 1 else "declining" if slope < -1 else "stable"
    return {
        "slope": round(slope, 2),
        "direction": direction,
        "confidence": round(abs(correlation), 2),
    }


async def get_session_distribution(
    db: AsyncSession, user_id: int, window_days: int = 30
) -> dict:
    """
    Returns hour-of-day distribution to identify optimal training windows.
    """
    since = datetime.utcnow() - timedelta(days=window_days)
    result = await db.execute(
        select(
            func.extract("hour", GameSession.played_at).label("hour"),
            func.count().label("count"),
            func.avg(GameSession.score).label("avg_score"),
        )
        .where(GameSession.user_id == user_id, GameSession.played_at >= since)
        .group_by("hour")
    )
    rows = result.all()
    dist = {int(r.hour): {"count": r.count, "avg_score": round(float(r.avg_score), 1)} for r in rows}

    # Find peak hour
    if dist:
        peak_hour = max(dist, key=lambda h: dist[h]["avg_score"])
    else:
        peak_hour = None

    return {"distribution": dist, "peak_performance_hour": peak_hour}


async def generate_cognitive_report(
    db: AsyncSession, user_id: int
) -> dict:
    """
    Full cognitive report: fingerprint + trends + optimal schedule.
    """
    fingerprint = await compute_cognitive_fingerprint(db, user_id)

    # Compute trends for top 5 dimensions
    top_dims = sorted(fingerprint, key=lambda d: fingerprint[d], reverse=True)[:5]
    trends = {}
    for d in top_dims:
        trends[d] = await compute_trend(db, user_id, d)

    schedule = await get_session_distribution(db, user_id)

    # Identify weakest dimensions for targeted training
    weakest = sorted(fingerprint, key=lambda d: fingerprint[d])[:3]

    return {
        "fingerprint": fingerprint,
        "trends": trends,
        "schedule": schedule,
        "weakest_dimensions": weakest,
        "recommended_games": _recommend_for_weaknesses(weakest),
        "generated_at": datetime.utcnow().isoformat(),
    }


def _recommend_for_weaknesses(weak_dims: list[str]) -> list[str]:
    """Map weak dimensions to game types that train them."""
    recommendations = []
    for dim in weak_dims:
        for game, dims in GAME_DIMENSIONS.items():
            if dim in dims and game not in recommendations:
                recommendations.append(game)
                if len(recommendations) >= 5:
                    return recommendations
    return recommendations
