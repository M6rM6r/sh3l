import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import tensorflow as tf
from tensorflow import keras
import redis
import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIPersonalizationEngine:
    """
    Advanced AI engine for personalized cognitive training.
    Uses ensemble ML models + deep learning for difficulty adjustment,
    content recommendation, and learning path optimization.
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.scaler = StandardScaler()
        self.difficulty_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.game_recommender = GradientBoostingClassifier(n_estimators=100, random_state=42)
        self.user_clustering = KMeans(n_clusters=5, random_state=42)
        self.deep_performance_model = None
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize or load pre-trained models"""
        try:
            self.deep_performance_model = keras.Sequential([
                keras.layers.Dense(128, activation='relu', input_shape=(20,)),
                keras.layers.Dropout(0.3),
                keras.layers.Dense(64, activation='relu'),
                keras.layers.Dropout(0.2),
                keras.layers.Dense(32, activation='relu'),
                keras.layers.Dense(1, activation='linear')
            ])
            self.deep_performance_model.compile(
                optimizer='adam', 
                loss='mse', 
                metrics=['mae']
            )
            logger.info("Deep learning model initialized")
        except Exception as e:
            logger.error(f"Model initialization failed: {e}")
    
    def analyze_user_profile(self, user_id: int, session_history: List[Dict]) -> Dict:
        """
        Comprehensive cognitive profile analysis using multi-dimensional metrics.
        """
        if not session_history:
            return self._get_default_profile()
        
        df = pd.DataFrame(session_history)
        
        # Calculate cognitive metrics
        profile = {
            'cognitive_areas': self._analyze_cognitive_areas(df),
            'performance_trends': self._calculate_trends(df),
            'learning_velocity': self._calculate_learning_velocity(df),
            'optimal_difficulty': self._calculate_optimal_difficulty(df),
            'weakness_analysis': self._identify_weaknesses(df),
            'strength_analysis': self._identify_strengths(df),
            'attention_pattern': self._analyze_attention_pattern(df),
            'fatigue_indicators': self._detect_fatigue(df),
            'recommended_session_length': self._recommend_session_length(df),
            'skill_progression': self._calculate_skill_progression(df),
        }
        
        # Cache for 1 hour
        self.redis.setex(
            f"ai_profile:{user_id}", 
            3600, 
            json.dumps(profile, default=str)
        )
        
        return profile
    
    def predict_performance(self, user_id: int, game_type: str, difficulty: int) -> Dict:
        """
        Predict user performance using ensemble of ML models.
        """
        # Get cached profile
        profile_json = self.redis.get(f"ai_profile:{user_id}")
        if not profile_json:
            return {'predicted_score': 50, 'confidence': 0.5}
        
        profile = json.loads(profile_json)
        
        # Prepare features
        features = self._extract_features(profile, game_type, difficulty)
        
        # Ensemble prediction
        predictions = []
        
        # Random Forest prediction
        try:
            rf_pred = self.difficulty_model.predict([features])[0]
            predictions.append(rf_pred)
        except:
            pass
        
        # Deep learning prediction
        try:
            dl_pred = self.deep_performance_model.predict(
                np.array([features]), verbose=0
            )[0][0]
            predictions.append(dl_pred)
        except:
            pass
        
        # Fallback to heuristic
        if not predictions:
            predictions = [self._heuristic_prediction(profile, difficulty)]
        
        final_prediction = np.mean(predictions)
        confidence = 1 - (np.std(predictions) / 100) if len(predictions) > 1 else 0.7
        
        return {
            'predicted_score': round(final_prediction, 2),
            'confidence': round(confidence, 2),
            'predicted_accuracy': round(self._predict_accuracy(profile, difficulty), 2),
            'estimated_duration': self._estimate_duration(profile, game_type),
        }
    
    def optimize_difficulty(self, user_id: int, game_type: str) -> int:
        """
        Dynamic difficulty adjustment using reinforcement learning principles.
        """
        cache_key = f"difficulty:{user_id}:{game_type}"
        current_difficulty = int(self.redis.get(cache_key) or 1)
        
        # Predict performance at different difficulties
        results = []
        for diff in range(max(1, current_difficulty - 1), min(11, current_difficulty + 2)):
            prediction = self.predict_performance(user_id, game_type, diff)
            results.append({
                'difficulty': diff,
                'predicted_score': prediction['predicted_score'],
                'confidence': prediction['confidence'],
            })
        
        # Find sweet spot: score between 70-85 (challenging but achievable)
        optimal = None
        for r in results:
            if 70 <= r['predicted_score'] <= 85:
                optimal = r['difficulty']
                break
        
        # If no sweet spot, adjust gradually
        if optimal is None:
            avg_score = np.mean([r['predicted_score'] for r in results])
            if avg_score > 85:
                optimal = min(current_difficulty + 1, 10)
            elif avg_score < 60:
                optimal = max(current_difficulty - 1, 1)
            else:
                optimal = current_difficulty
        
        self.redis.setex(cache_key, 86400, str(optimal))
        return optimal
    
    def generate_learning_path(self, user_id: int, goals: List[str]) -> List[Dict]:
        """
        Generate personalized learning path using graph optimization.
        """
        profile_json = self.redis.get(f"ai_profile:{user_id}")
        profile = json.loads(profile_json) if profile_json else {}
        
        weaknesses = profile.get('weakness_analysis', [])
        strengths = profile.get('strength_analysis', [])
        
        path = []
        
        # Phase 1: Address critical weaknesses
        for weakness in weaknesses[:2]:
            path.append({
                'phase': 'foundation',
                'area': weakness['area'],
                'game_types': weakness['recommended_games'],
                'duration_days': 7,
                'target_improvement': 20,
            })
        
        # Phase 2: Build on strengths
        for strength in strengths[:2]:
            path.append({
                'phase': 'enhancement',
                'area': strength['area'],
                'game_types': self._get_advanced_games(strength['area']),
                'duration_days': 5,
                'target_improvement': 15,
            })
        
        # Phase 3: Integrated training
        path.append({
            'phase': 'integration',
            'area': 'mixed',
            'game_types': self._get_mixed_training_games(),
            'duration_days': 14,
            'target_improvement': 10,
        })
        
        return path
    
    def real_time_adaptation(
        self, 
        user_id: int, 
        session_data: Dict
    ) -> Dict:
        """
        Real-time session adaptation based on performance indicators.
        """
        current_score = session_data.get('current_score', 0)
        accuracy = session_data.get('accuracy', 0)
        reaction_time = session_data.get('avg_reaction_time', 0)
        streak = session_data.get('current_streak', 0)
        
        adjustments = {
            'difficulty_delta': 0,
            'time_pressure': False,
            'hint_level': 'none',
            'encouragement': False,
            'break_recommended': False,
        }
        
        # Performance-based adjustments
        if accuracy > 90 and streak > 5:
            adjustments['difficulty_delta'] = 1
            adjustments['encouragement'] = True
        elif accuracy < 50:
            adjustments['difficulty_delta'] = -1
            adjustments['hint_level'] = 'moderate'
        
        # Fatigue detection
        if reaction_time > session_data.get('baseline_reaction_time', 1000) * 1.5:
            adjustments['break_recommended'] = True
            adjustments['time_pressure'] = False
        
        # Flow state optimization
        if 70 <= current_score <= 85:
            adjustments['time_pressure'] = True
        
        return adjustments
    
    def cluster_users(self, user_profiles: List[Dict]) -> Dict:
        """
        User segmentation for cohort analysis and benchmarking.
        """
        if len(user_profiles) < 5:
            return {'clusters': []}
        
        # Extract features
        features = []
        for profile in user_profiles:
            features.append([
                profile.get('avg_score', 50),
                profile.get('games_played', 0),
                profile.get('consistency', 0),
                profile.get('improvement_rate', 0),
                profile.get('session_frequency', 0),
            ])
        
        X = np.array(features)
        X_scaled = self.scaler.fit_transform(X)
        
        # Cluster users
        clusters = self.user_clustering.fit_predict(X_scaled)
        
        # Analyze clusters
        cluster_analysis = []
        for i in range(self.user_clustering.n_clusters):
            cluster_users = [user_profiles[j] for j, c in enumerate(clusters) if c == i]
            if cluster_users:
                analysis = {
                    'cluster_id': i,
                    'size': len(cluster_users),
                    'avg_score': np.mean([u.get('avg_score', 0) for u in cluster_users]),
                    'characteristics': self._describe_cluster(cluster_users),
                    'recommended_strategy': self._get_cluster_strategy(i),
                }
                cluster_analysis.append(analysis)
        
        return {'clusters': cluster_analysis}
    
    def _analyze_cognitive_areas(self, df: pd.DataFrame) -> Dict:
        """Analyze performance by cognitive area"""
        areas = {}
        for area in df['cognitive_area'].unique():
            area_data = df[df['cognitive_area'] == area]
            areas[area] = {
                'avg_score': area_data['score'].mean(),
                'avg_accuracy': area_data['accuracy'].mean(),
                'games_played': len(area_data),
                'trend': self._calculate_single_trend(area_data['score']),
                'volatility': area_data['score'].std(),
            }
        return areas
    
    def _calculate_trends(self, df: pd.DataFrame) -> Dict:
        """Calculate performance trends"""
        df = df.sort_values('played_at')
        
        trends = {}
        for window in [7, 14, 30]:
            recent = df.tail(window)
            if len(recent) > 1:
                x = np.arange(len(recent))
                y = recent['score'].values
                slope = np.polyfit(x, y, 1)[0]
                trends[f'{window}d'] = {
                    'slope': slope,
                    'direction': 'improving' if slope > 0.5 else 
                                ('declining' if slope < -0.5 else 'stable'),
                    'avg_score': recent['score'].mean(),
                }
        return trends
    
    def _calculate_learning_velocity(self, df: pd.DataFrame) -> float:
        """Calculate learning velocity (score improvement per session)"""
        if len(df) < 5:
            return 0
        
        df = df.sort_values('played_at')
        first_half = df.head(len(df) // 2)['score'].mean()
        second_half = df.tail(len(df) // 2)['score'].mean()
        
        velocity = (second_half - first_half) / (len(df) / 2)
        return velocity
    
    def _calculate_optimal_difficulty(self, df: pd.DataFrame) -> int:
        """Calculate optimal difficulty level"""
        optimal_scores = df[
            (df['score'] >= 70) & (df['score'] <= 85)
        ]['difficulty_level']
        
        if len(optimal_scores) > 0:
            return int(optimal_scores.mode().iloc[0])
        
        # Default progression
        avg_score = df['score'].mean()
        if avg_score > 80:
            return int(df['difficulty_level'].max()) + 1
        return 1
    
    def _identify_weaknesses(self, df: pd.DataFrame) -> List[Dict]:
        """Identify cognitive weaknesses"""
        weaknesses = []
        
        for area in df['cognitive_area'].unique():
            area_data = df[df['cognitive_area'] == area]
            avg_score = area_data['score'].mean()
            
            if avg_score < 60:
                weaknesses.append({
                    'area': area,
                    'severity': 'critical' if avg_score < 40 else 'moderate',
                    'current_score': avg_score,
                    'recommended_games': self._get_games_for_area(area),
                })
        
        return sorted(weaknesses, key=lambda x: x['current_score'])
    
    def _identify_strengths(self, df: pd.DataFrame) -> List[Dict]:
        """Identify cognitive strengths"""
        strengths = []
        
        for area in df['cognitive_area'].unique():
            area_data = df[df['cognitive_area'] == area]
            avg_score = area_data['score'].mean()
            
            if avg_score > 80:
                strengths.append({
                    'area': area,
                    'level': 'expert' if avg_score > 90 else 'advanced',
                    'current_score': avg_score,
                })
        
        return sorted(strengths, key=lambda x: x['current_score'], reverse=True)
    
    def _analyze_attention_pattern(self, df: pd.DataFrame) -> Dict:
        """Analyze user's attention patterns"""
        df = df.sort_values('played_at')
        
        # Calculate performance by session number in day
        df['hour'] = pd.to_datetime(df['played_at']).dt.hour
        hourly_performance = df.groupby('hour')['score'].mean()
        
        peak_hour = hourly_performance.idxmax()
        low_hour = hourly_performance.idxmin()
        
        return {
            'peak_performance_hour': int(peak_hour),
            'low_performance_hour': int(low_hour),
            'consistency_by_hour': hourly_performance.std(),
            'recommended_training_time': f"{int(peak_hour)}:00",
        }
    
    def _detect_fatigue(self, df: pd.DataFrame) -> Dict:
        """Detect fatigue indicators"""
        df = df.sort_values('played_at')
        
        # Check for declining performance within sessions
        session_groups = df.groupby(df.index // 5)  # Group by 5-game blocks
        block_scores = session_groups['score'].mean()
        
        if len(block_scores) > 2:
            fatigue_trend = block_scores.iloc[-1] < block_scores.iloc[0] * 0.8
        else:
            fatigue_trend = False
        
        return {
            'fatigue_detected': fatigue_trend,
            'recommended_break_after': 5 if fatigue_trend else 10,
            'optimal_session_count_per_day': 5 if fatigue_trend else 10,
        }
    
    def _recommend_session_length(self, df: pd.DataFrame) -> int:
        """Recommend optimal session length in minutes"""
        avg_duration = df['duration_seconds'].mean() / 60
        
        # Adjust based on performance trends
        if 'trends' in str(df.columns):
            trend = self._calculate_single_trend(df['score'])
            if trend == 'improving':
                return min(30, int(avg_duration * 1.2))
        
        return min(20, int(avg_duration))
    
    def _calculate_skill_progression(self, df: pd.DataFrame) -> Dict:
        """Calculate skill progression over time"""
        df = df.sort_values('played_at')
        df['date'] = pd.to_datetime(df['played_at']).dt.date
        
        daily_scores = df.groupby('date')['score'].mean()
        
        progression = []
        for date, score in daily_scores.items():
            progression.append({
                'date': str(date),
                'score': round(score, 2),
            })
        
        return {
            'daily_progression': progression,
            'total_improvement': round(daily_scores.iloc[-1] - daily_scores.iloc[0], 2) if len(daily_scores) > 1 else 0,
            'days_to_mastery': self._estimate_mastery_days(daily_scores),
        }
    
    def _calculate_single_trend(self, series: pd.Series) -> str:
        """Calculate trend direction for a single series"""
        if len(series) < 2:
            return 'neutral'
        
        x = np.arange(len(series))
        slope = np.polyfit(x, series.values, 1)[0]
        
        if slope > 0.5:
            return 'improving'
        elif slope < -0.5:
            return 'declining'
        return 'stable'
    
    def _extract_features(self, profile: Dict, game_type: str, difficulty: int) -> List[float]:
        """Extract features for ML prediction"""
        features = [
            difficulty,
            profile.get('cognitive_areas', {}).get('memory', {}).get('avg_score', 50),
            profile.get('cognitive_areas', {}).get('attention', {}).get('avg_score', 50),
            profile.get('cognitive_areas', {}).get('speed', {}).get('avg_score', 50),
            profile.get('cognitive_areas', {}).get('flexibility', {}).get('avg_score', 50),
            profile.get('learning_velocity', 0),
            profile.get('optimal_difficulty', 1),
            len(profile.get('weakness_analysis', [])),
            len(profile.get('strength_analysis', [])),
            hash(game_type) % 100,  # Encode game type
        ]
        
        # Pad to 20 features
        while len(features) < 20:
            features.append(0)
        
        return features[:20]
    
    def _heuristic_prediction(self, profile: Dict, difficulty: int) -> float:
        """Fallback heuristic prediction"""
        base_score = 50
        optimal = profile.get('optimal_difficulty', 5)
        
        # Higher difficulty = lower expected score
        diff_factor = max(0, 1 - abs(difficulty - optimal) * 0.1)
        
        return base_score + (diff_factor * 40)
    
    def _predict_accuracy(self, profile: Dict, difficulty: int) -> float:
        """Predict accuracy percentage"""
        base_accuracy = 70
        optimal = profile.get('optimal_difficulty', 5)
        
        diff_penalty = abs(difficulty - optimal) * 5
        return max(40, min(98, base_accuracy - diff_penalty))
    
    def _estimate_duration(self, profile: Dict, game_type: str) -> int:
        """Estimate session duration in seconds"""
        base_duration = 120
        
        # Adjust by game type
        game_multipliers = {
            'memory_match': 1.0,
            'speed_match': 0.8,
            'math_challenge': 1.2,
            'focus_challenge': 1.5,
        }
        
        multiplier = game_multipliers.get(game_type, 1.0)
        return int(base_duration * multiplier)
    
    def _get_games_for_area(self, area: str) -> List[str]:
        """Get recommended games for cognitive area"""
        mapping = {
            'memory': ['memory_match', 'pattern_recall', 'sequence_memory'],
            'attention': ['focus_challenge', 'distraction_filter', 'sustained_attention'],
            'speed': ['speed_match', 'rapid_math', 'quick_reflexes'],
            'flexibility': ['task_switch', 'color_word', 'cognitive_flexibility'],
            'problem_solving': ['logic_puzzle', 'math_challenge', 'pattern_completion'],
        }
        return mapping.get(area, ['memory_match'])
    
    def _get_advanced_games(self, area: str) -> List[str]:
        """Get advanced games for strong areas"""
        advanced = {
            'memory': ['dual_n_back', 'memory_palace', 'chunking_challenge'],
            'attention': ['divided_attention', 'selective_focus_pro', 'attention_switching'],
            'speed': ['speed_arithmetic', 'rapid_pattern', 'temporal_processing'],
            'flexibility': ['mental_rotation', 'set_shifting', 'category_switch'],
            'problem_solving': ['insight_problems', 'lateral_thinking', 'abstraction_challenge'],
        }
        return advanced.get(area, [])
    
    def _get_mixed_training_games(self) -> List[str]:
        """Get games for integrated training"""
        return [
            'cognitive_switch',
            'dual_task_challenge',
            'adaptive_mixed',
            'comprehensive_assessment',
        ]
    
    def _get_default_profile(self) -> Dict:
        """Default profile for new users"""
        return {
            'cognitive_areas': {},
            'performance_trends': {},
            'learning_velocity': 0,
            'optimal_difficulty': 1,
            'weakness_analysis': [],
            'strength_analysis': [],
            'attention_pattern': {'recommended_training_time': '09:00'},
            'fatigue_indicators': {'fatigue_detected': False},
            'recommended_session_length': 10,
            'skill_progression': {'daily_progression': []},
        }
    
    def _describe_cluster(self, users: List[Dict]) -> str:
        """Describe characteristics of a user cluster"""
        avg_score = np.mean([u.get('avg_score', 0) for u in users])
        avg_games = np.mean([u.get('games_played', 0) for u in users])
        
        if avg_score > 80 and avg_games > 50:
            return "Expert users with high engagement"
        elif avg_score > 70:
            return "Advanced users showing consistent performance"
        elif avg_games < 10:
            return "New users in onboarding phase"
        else:
            return "Developing users with growth potential"
    
    def _get_cluster_strategy(self, cluster_id: int) -> str:
        """Get recommended strategy for cluster"""
        strategies = {
            0: "Challenge with advanced content",
            1: "Maintain engagement with varied content",
            2: "Focus on foundational skills",
            3: "Accelerated learning path",
            4: "Personalized remediation",
        }
        return strategies.get(cluster_id, "Standard progression")
    
    def _estimate_mastery_days(self, daily_scores: pd.Series) -> int:
        """Estimate days to mastery (90+ score)"""
        if len(daily_scores) < 3:
            return 30
        
        current = daily_scores.iloc[-1]
        if current >= 90:
            return 0
        
        # Linear extrapolation
        x = np.arange(len(daily_scores))
        slope = np.polyfit(x, daily_scores.values, 1)[0]
        
        if slope <= 0:
            return 60  # Default
        
        days_needed = (90 - current) / slope
        return max(7, min(90, int(days_needed)))
