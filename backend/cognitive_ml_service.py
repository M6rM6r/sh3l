"""
Cognitive ML Service
Provides async interface between FastAPI backend and ML pipeline
"""
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import pandas as pd
import numpy as np
from pathlib import Path

from pathlib import Path
import sys

# Add ml-models directory to path
ml_models_path = Path(__file__).parent.parent / "ml-models"
sys.path.insert(0, str(ml_models_path))

from advanced_pipeline import CognitiveMLPipeline
import redis.asyncio as redis

logger = logging.getLogger(__name__)

class CognitiveMLService:
    def __init__(self, redis_url: str = "redis://localhost:6379", model_dir: str = "./ml-models"):
        self.redis_url = redis_url
        self.model_dir = Path(model_dir)
        self.pipeline = None
        self.redis_client = None

    async def initialize(self):
        """Async initialization of ML service"""
        self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
        self.pipeline = CognitiveMLPipeline(redis_url=self.redis_url)
        logger.info("Cognitive ML Service initialized")

    async def predict_user_score(self, user_id: int, features: Dict[str, float]) -> float:
        """Predict user's next game score based on features"""
        try:
            # Check cache first
            cache_key = f"prediction:score:{user_id}:{hash(str(sorted(features.items())))}"
            cached_prediction = await self.redis_client.get(cache_key)

            if cached_prediction:
                return float(cached_prediction)

            # Make prediction
            prediction = self.pipeline.predict_score(features)

            # Cache result for 1 hour
            await self.redis_client.setex(cache_key, 3600, str(prediction))

            return prediction

        except Exception as e:
            logger.error(f"Score prediction failed for user {user_id}: {e}")
            # Return baseline prediction
            return 1000.0

    async def analyze_cognitive_profile(self, user_sessions: List[Dict]) -> Dict[str, Any]:
        """Analyze user's cognitive profile from game sessions"""
        try:
            if not user_sessions:
                return {
                    "memory": 50.0,
                    "speed": 50.0,
                    "attention": 50.0,
                    "flexibility": 50.0,
                    "problem_solving": 50.0,
                    "overall_score": 50.0
                }

            # Convert to DataFrame
            df = pd.DataFrame(user_sessions)

            # Calculate cognitive areas
            cognitive_profile = {}

            # Memory: based on pattern recognition games
            memory_games = df[df['cognitive_area'] == 'memory']
            cognitive_profile['memory'] = memory_games['accuracy'].mean() * 100 if not memory_games.empty else 50.0

            # Speed: based on reaction time games
            speed_games = df[df['cognitive_area'] == 'speed']
            cognitive_profile['speed'] = min(100, 100 - (speed_games['duration_seconds'].mean() or 30) * 2)

            # Attention: based on focus games
            attention_games = df[df['cognitive_area'] == 'attention']
            cognitive_profile['attention'] = attention_games['accuracy'].mean() * 100 if not attention_games.empty else 50.0

            # Flexibility: based on task-switching games
            flexibility_games = df[df['cognitive_area'] == 'flexibility']
            cognitive_profile['flexibility'] = flexibility_games['accuracy'].mean() * 100 if not flexibility_games.empty else 50.0

            # Problem solving: based on logic games
            problem_games = df[df['cognitive_area'] == 'problem_solving']
            cognitive_profile['problem_solving'] = problem_games['accuracy'].mean() * 100 if not problem_games.empty else 50.0

            # Overall score
            cognitive_profile['overall_score'] = np.mean(list(cognitive_profile.values()))

            # Normalize to 0-100 range
            for key in cognitive_profile:
                cognitive_profile[key] = max(0, min(100, cognitive_profile[key]))

            return cognitive_profile

        except Exception as e:
            logger.error(f"Cognitive profile analysis failed: {e}")
            return {
                "memory": 50.0,
                "speed": 50.0,
                "attention": 50.0,
                "flexibility": 50.0,
                "problem_solving": 50.0,
                "overall_score": 50.0
            }

    async def get_personalized_recommendations(self, user_id: int, cognitive_profile: Dict[str, float]) -> List[Dict[str, Any]]:
        """Get personalized game recommendations based on cognitive profile"""
        try:
            # Identify weakest areas
            weakest_areas = sorted(cognitive_profile.items(), key=lambda x: x[1])[:3]

            recommendations = []
            game_mapping = {
                "memory": ["memory_matrix", "word_recall", "pattern_match"],
                "speed": ["reaction_time", "quick_math", "speed_reading"],
                "attention": ["focus_grid", "sustained_attention", "distraction_filter"],
                "flexibility": ["task_switch", "adaptive_learning", "cognitive_flex"],
                "problem_solving": ["logic_puzzles", "spatial_reasoning", "analytical_thinking"]
            }

            for area, score in weakest_areas:
                if area in game_mapping:
                    games = game_mapping[area]
                    for game in games[:2]:  # Recommend 2 games per weak area
                        recommendations.append({
                            "game_type": game,
                            "cognitive_area": area,
                            "priority": 1,
                            "reason": f"Improve your {area} skills (current level: {score:.1f}%)",
                            "predicted_improvement": max(5, 20 - score * 0.2),
                            "difficulty_suggestion": "intermediate" if score > 60 else "beginner"
                        })

            # Sort by priority and predicted improvement
            recommendations.sort(key=lambda x: (-x["priority"], -x["predicted_improvement"]))

            return recommendations[:6]  # Return top 6 recommendations

        except Exception as e:
            logger.error(f"Recommendation generation failed for user {user_id}: {e}")
            # Return default recommendations
            return [
                {
                    "game_type": "memory_matrix",
                    "cognitive_area": "memory",
                    "priority": 1,
                    "reason": "Build foundational memory skills",
                    "predicted_improvement": 15.0,
                    "difficulty_suggestion": "beginner"
                },
                {
                    "game_type": "reaction_time",
                    "cognitive_area": "speed",
                    "priority": 1,
                    "reason": "Improve processing speed",
                    "predicted_improvement": 12.0,
                    "difficulty_suggestion": "beginner"
                }
            ]

    async def update_user_model(self, user_id: int, new_sessions: List[Dict]):
        """Update user's personal model with new session data"""
        try:
            # Convert sessions to DataFrame
            sessions_df = pd.DataFrame(new_sessions)

            # Add temporal features
            sessions_df['played_at'] = pd.to_datetime(sessions_df['played_at'])
            sessions_df = self.pipeline.feature_engineering.create_temporal_features(sessions_df, 'played_at')

            # Retrain model for this user (in background)
            # This would typically be done asynchronously with Celery
            asyncio.create_task(self._retrain_user_model_async(user_id, sessions_df))

        except Exception as e:
            logger.error(f"Model update failed for user {user_id}: {e}")

    async def _retrain_user_model_async(self, user_id: int, sessions_df: pd.DataFrame):
        """Async task to retrain user-specific model"""
        try:
            # This would implement user-specific model training
            # For now, just log the intent
            logger.info(f"Retraining model for user {user_id} with {len(sessions_df)} sessions")

            # In production, this would:
            # 1. Load user's historical data
            # 2. Combine with new sessions
            # 3. Retrain personalized model
            # 4. Update model registry

        except Exception as e:
            logger.error(f"Async model retraining failed for user {user_id}: {e}")

    async def get_model_performance_metrics(self) -> Dict[str, Any]:
        """Get overall model performance metrics"""
        try:
            report_df = self.pipeline.get_model_performance_report()

            if report_df.empty:
                return {"status": "no_models", "metrics": {}}

            # Calculate aggregate metrics
            metrics = {
                "total_models": len(report_df),
                "active_models": report_df['deployed'].sum(),
                "best_mae": report_df['mae'].min(),
                "average_mae": report_df['mae'].mean(),
                "best_r2": report_df['r2'].max(),
                "model_types": report_df['algorithm'].value_counts().to_dict(),
                "recent_models": len(report_df[pd.to_datetime(report_df['created_at']) > datetime.utcnow() - pd.Timedelta(days=7)])
            }

            return {"status": "success", "metrics": metrics}

        except Exception as e:
            logger.error(f"Performance metrics retrieval failed: {e}")
            return {"status": "error", "metrics": {}}

# Global service instance
ml_service = CognitiveMLService()

async def get_ml_service() -> CognitiveMLService:
    """Dependency injection for FastAPI"""
    if ml_service.pipeline is None:
        await ml_service.initialize()
    return ml_service