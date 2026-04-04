"""
Ygy Celery tasks — background processing for analytics, ML retraining,
achievement checks, and session cleanup.
Broker: Redis  |  Backend: Redis
"""
import os
import sys
import logging
from pathlib import Path
from datetime import datetime, timedelta

from celery import Celery
from celery.schedules import crontab

# ---------------------------------------------------------------------------
# App bootstrap
# ---------------------------------------------------------------------------
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

celery_app = Celery(
    "ygy",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
    beat_schedule={
        # Aggregate daily stats every hour
        "aggregate-daily-stats": {
            "task": "tasks.aggregate_daily_stats",
            "schedule": crontab(minute=0),
        },
        # Retrain ML models nightly at 2 AM
        "retrain-ml-models": {
            "task": "tasks.retrain_all_models",
            "schedule": crontab(hour=2, minute=0),
        },
        # Clean up expired sessions every 6 hours
        "cleanup-sessions": {
            "task": "tasks.cleanup_sessions",
            "schedule": crontab(minute=0, hour="*/6"),
        },
        # Check achievements for all active users daily at midnight
        "check-achievements": {
            "task": "tasks.check_all_achievements",
            "schedule": crontab(hour=0, minute=0),
        },
    },
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)

_DB_INITIALIZED = False


def _get_sync_db():
    """Return a synchronous SQLAlchemy session for Celery workers."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    db_url = os.getenv("DATABASE_URL", "postgresql://ygy:password@db:5432/ygy")
    # Strip asyncpg driver if present — Celery workers use sync psycopg2
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

    engine = create_engine(db_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session()


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def aggregate_daily_stats(self):
    """Compute and persist daily stats for all users who played today."""
    try:
        from sqlalchemy import text
        db = _get_sync_db()
        try:
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            db.execute(text("""
                INSERT INTO daily_stats (user_id, date, games_played, total_score, avg_accuracy)
                SELECT
                    user_id,
                    DATE_TRUNC('day', played_at) AS date,
                    COUNT(*)                     AS games_played,
                    SUM(score)                   AS total_score,
                    AVG(accuracy)                AS avg_accuracy
                FROM game_sessions
                WHERE played_at >= :today
                GROUP BY user_id, DATE_TRUNC('day', played_at)
                ON CONFLICT (user_id, date)
                DO UPDATE SET
                    games_played = EXCLUDED.games_played,
                    total_score  = EXCLUDED.total_score,
                    avg_accuracy = EXCLUDED.avg_accuracy
            """), {"today": today})
            db.commit()
            logger.info("Daily stats aggregation complete for %s", today.date())
        finally:
            db.close()
    except Exception as exc:
        logger.error("aggregate_daily_stats failed: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=300)
def retrain_all_models(self):
    """Retrain cognitive ML models using the latest data."""
    try:
        ml_path = Path(__file__).parent.parent / "ml-models"
        sys.path.insert(0, str(ml_path))
        from advanced_pipeline import CognitiveMLPipeline

        db = _get_sync_db()
        try:
            import pandas as pd
            from sqlalchemy import text
            rows = db.execute(text(
                "SELECT user_id, game_type, score, accuracy, duration_seconds, "
                "cognitive_area, played_at FROM game_sessions ORDER BY played_at"
            )).fetchall()
            if not rows:
                logger.info("No session data for retraining — skipping")
                return

            df = pd.DataFrame(rows, columns=[
                "user_id", "game_type", "score", "accuracy",
                "duration_seconds", "cognitive_area", "played_at"
            ])

            pipeline = CognitiveMLPipeline()
            pipeline.train(df)
            logger.info("ML models retrained on %d session rows", len(df))
        finally:
            db.close()
    except Exception as exc:
        logger.error("retrain_all_models failed: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3)
def check_all_achievements(self):
    """Award any newly-earned achievements for all users."""
    try:
        from sqlalchemy import text
        db = _get_sync_db()
        try:
            users = db.execute(text("SELECT id FROM users WHERE is_active = TRUE")).fetchall()
            for (user_id,) in users:
                check_user_achievements.delay(user_id)
            logger.info("Queued achievement checks for %d users", len(users))
        finally:
            db.close()
    except Exception as exc:
        logger.error("check_all_achievements failed: %s", exc)
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3)
def check_user_achievements(self, user_id: int):
    """Check and award achievements for a single user."""
    try:
        from sqlalchemy import text
        db = _get_sync_db()
        try:
            rows = db.execute(
                text("SELECT score, accuracy FROM game_sessions WHERE user_id = :uid"),
                {"uid": user_id},
            ).fetchall()
            total_games = len(rows)

            rules = [
                ("first_game",       total_games >= 1),
                ("ten_games",        total_games >= 10),
                ("hundred_games",    total_games >= 100),
                ("score_1000",       any(r[0] >= 1000 for r in rows)),
                ("score_5000",       any(r[0] >= 5000 for r in rows)),
                ("perfect_accuracy", any(r[1] >= 100  for r in rows)),
            ]

            for achievement_id, earned in rules:
                if not earned:
                    continue
                existing = db.execute(
                    text("SELECT 1 FROM user_achievements WHERE user_id=:uid AND achievement_id=:aid"),
                    {"uid": user_id, "aid": achievement_id},
                ).fetchone()
                if not existing:
                    db.execute(
                        text("INSERT INTO user_achievements (user_id, achievement_id) VALUES (:uid, :aid)"),
                        {"uid": user_id, "aid": achievement_id},
                    )
            db.commit()
        finally:
            db.close()
    except Exception as exc:
        logger.error("check_user_achievements(%s) failed: %s", user_id, exc)
        raise self.retry(exc=exc)


@celery_app.task
def cleanup_sessions():
    """Delete very old, low-value session data to keep the DB lean."""
    from sqlalchemy import text
    db = _get_sync_db()
    try:
        cutoff = datetime.utcnow() - timedelta(days=365)
        result = db.execute(
            text("DELETE FROM game_sessions WHERE played_at < :cutoff"),
            {"cutoff": cutoff},
        )
        db.commit()
        logger.info("Cleaned up %d old sessions", result.rowcount)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Entry point for `celery -A tasks worker`
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    celery_app.start()
