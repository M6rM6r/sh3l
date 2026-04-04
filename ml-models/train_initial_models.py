"""
Ygy — Initial ML model training script.
Generates synthetic cognitive game data and trains baseline sklearn models.
Run once before the API starts (or let the ml-trainer Docker service handle it).
"""
import os
import sys
import logging
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
import random

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("ygy.train")

# ---------------------------------------------------------------------------
# Add ml-models dir to path so we can import CognitiveMLPipeline
# ---------------------------------------------------------------------------
HERE = Path(__file__).parent
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(HERE / "models")))
MODEL_PATH.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(HERE))


def generate_synthetic_data(n_users: int = 200, sessions_per_user: int = 50) -> pd.DataFrame:
    """Generate realistic synthetic game session data for initial training."""
    rng = np.random.default_rng(42)
    rows = []
    game_types = ["memory_matrix", "number_speed", "attention_focus", "pattern_shift", "problem_solver"]
    cognitive_areas = ["memory", "speed", "attention", "flexibility", "problem_solving"]

    start_date = datetime.utcnow() - timedelta(days=180)

    for user_id in range(1, n_users + 1):
        # Each user has a stable "true skill" per area
        skill = {area: rng.uniform(30, 90) for area in cognitive_areas}
        for _ in range(sessions_per_user):
            area = random.choice(cognitive_areas)
            game = next(g for g, a in zip(game_types, cognitive_areas) if a == area)
            difficulty = rng.integers(1, 5)
            base_score = skill[area] * 15 * difficulty
            score = max(0, int(rng.normal(base_score, base_score * 0.15)))
            accuracy = min(1.0, max(0.0, rng.normal(skill[area] / 100, 0.1)))
            duration = max(10, int(rng.normal(60 / difficulty, 15)))
            played_at = start_date + timedelta(
                days=rng.integers(0, 180),
                hours=rng.integers(0, 24),
                minutes=rng.integers(0, 60),
            )
            rows.append({
                "user_id": user_id,
                "game_type": game,
                "score": score,
                "accuracy": accuracy,
                "duration_seconds": duration,
                "difficulty_level": int(difficulty),
                "cognitive_area": area,
                "played_at": played_at,
            })

    df = pd.DataFrame(rows).sort_values("played_at").reset_index(drop=True)
    logger.info("Generated %d synthetic sessions for %d users", len(df), n_users)
    return df


def main():
    try:
        from advanced_pipeline import CognitiveMLPipeline
    except ImportError:
        logger.error("Could not import CognitiveMLPipeline — check that advanced_pipeline.py is in the same directory")
        sys.exit(1)

    logger.info("Generating synthetic training data ...")
    df = generate_synthetic_data()

    logger.info("Initialising CognitiveMLPipeline (model_dir=%s) ...", MODEL_PATH)
    pipeline = CognitiveMLPipeline(model_dir=str(MODEL_PATH))

    logger.info("Training models ...")
    try:
        pipeline.train(df)
        logger.info("Training complete — models saved to %s", MODEL_PATH)
    except Exception as exc:
        logger.error("Training failed: %s", exc, exc_info=True)
        # Non-fatal — API will use rule-based fallback
        sys.exit(0)

    # Quick smoke-test
    sample_features = {
        "accuracy": 0.75,
        "difficulty_level": 2,
        "hour": 10,
        "day_of_week": 1,
        "is_weekend": 0,
        "is_morning": 1,
        "is_evening": 0,
        "score_rolling_mean_3": 1200.0,
        "score_rolling_std_3": 80.0,
        "score_rolling_mean_7": 1150.0,
    }
    try:
        pred = pipeline.predict_score(sample_features)
        logger.info("Smoke-test prediction: %.1f (expect ~1000-2000)", pred)
    except Exception as exc:
        logger.warning("Smoke-test failed (non-fatal): %s", exc)

    logger.info("Done.")


if __name__ == "__main__":
    main()
