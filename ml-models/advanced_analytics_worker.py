import os
import json
import logging
from typing import Dict, Any, Optional
from celery import Celery
from redis import Redis
from scipy.stats import norm
import numpy as np

# Strict Configuration and Typing for OCPD Rigor
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER = os.getenv("CELERY_BROKER_URL", REDIS_URL)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("CognitiveAnalyticsEngine")

# Pure Functional Core
app = Celery('cognitive_analytics', broker=CELERY_BROKER, backend=REDIS_URL)

app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300
)

redis_client = Redis.from_url(REDIS_URL, decode_responses=True)

@app.task(bind=True, max_retries=3)
def compute_cognitive_percentile(self, user_id: str, game_id: str, raw_score: float) -> Dict[str, Any]:
    """
    Statistically pure calculation of user percentiles against global distributions.
    Scales horizontally via Celery workers.
    """
    try:
        dist_key = f"stats:distribution:{game_id}"
        
        # O(1) Redis Retrieval
        dist_data = redis_client.get(dist_key)
        if not dist_data:
            logger.warning(f"Distribution data missing for {game_id}. Falling back to standard normal.")
            mean, std_dev = 1000.0, 150.0 # IQ standard distribution proxy
        else:
            metrics = json.loads(dist_data)
            mean, std_dev = float(metrics.get("mean", 1000)), float(metrics.get("std_dev", 150))

        # Precision Mathematics
        z_score = (raw_score - mean) / (std_dev if std_dev > 0 else 1.0)
        percentile = norm.cdf(z_score) * 100.0

        # Idempotent State Writing
        result = {
            "user_id": user_id,
            "game_id": game_id,
            "raw_score": raw_score,
            "z_score": round(z_score, 4),
            "percentile": round(percentile, 2),
            "calculated_at": pd.Timestamp.now(tz='UTC').isoformat() if 'pd' in globals() else None
        }
        
        redis_client.setex(f"cache:percentile:{user_id}:{game_id}", 3600, json.dumps(result))
        logger.info(f"Processed cognitive telemetry for User {user_id}. Percentile: {percentile}%")
        
        return result

    except Exception as exc:
        logger.error(f"Computation failed for {user_id}. Reason: {exc}")
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


