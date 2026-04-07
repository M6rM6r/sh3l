import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import joblib
import os
import logging
from typing import List, Dict, Any
from collections import deque
import random

logger = logging.getLogger(__name__)

class AdaptiveDifficultyAgent:
    def __init__(self, state_size=10, action_size=5):
        self.state_size = state_size
        self.action_size = action_size
        self.memory = deque(maxlen=2000)
        self.gamma = 0.95  # discount rate
        self.epsilon = 1.0  # exploration rate
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.learning_rate = 0.001
        self.model = self._build_model()

    def _build_model(self):
        model = keras.Sequential([
            keras.layers.Dense(24, input_dim=self.state_size, activation='relu'),
            keras.layers.Dense(24, activation='relu'),
            keras.layers.Dense(self.action_size, activation='linear')
        ])
        model.compile(loss='mse', optimizer=keras.optimizers.Adam(learning_rate=self.learning_rate))
        return model

    def remember(self, state, action, reward, next_state, done):
        self.memory.append((state, action, reward, next_state, done))

    def act(self, state):
        if np.random.rand() <= self.epsilon:
            return random.randrange(self.action_size)
        act_values = self.model.predict(state, verbose=0)
        return np.argmax(act_values[0])

    def replay(self, batch_size=32):
        if len(self.memory) < batch_size:
            return
        minibatch = random.sample(self.memory, batch_size)
        for state, action, reward, next_state, done in minibatch:
            target = reward
            if not done:
                target = reward + self.gamma * np.amax(self.model.predict(next_state, verbose=0)[0])
            target_f = self.model.predict(state, verbose=0)
            target_f[0][action] = target
            self.model.fit(state, target_f, epochs=1, verbose=0)
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

    def load(self, name):
        self.model.load_weights(name)

    def save(self, name):
        self.model.save_weights(name)

class DifficultyPredictor:
    """Neural network for predicting optimal difficulty level"""

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.build_model()

    def build_model(self):
        """Build neural network for difficulty prediction"""
        self.model = keras.Sequential([
            layers.Dense(64, activation='relu', input_dim=15),  # 15 features
            layers.Dropout(0.3),
            layers.Dense(32, activation='relu'),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(3, activation='softmax')  # easy, medium, hard
        ])

        self.model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )

    def predict_difficulty(self, user_profile: Dict[str, float], game_history: List[Dict]) -> str:
        """Predict optimal difficulty based on user profile and history"""
        # Extract features
        features = self.extract_features(user_profile, game_history)

        # Scale features
        features_scaled = self.scaler.transform([features])

        # Predict
        prediction = self.model.predict(features_scaled, verbose=0)
        difficulty_levels = ['easy', 'medium', 'hard']

        return difficulty_levels[np.argmax(prediction[0])]

    def extract_features(self, user_profile: Dict[str, float], game_history: List[Dict]) -> List[float]:
        """Extract features for difficulty prediction"""
        features = []

        # Cognitive profile features (5 domains)
        for domain in ['memory', 'speed', 'attention', 'flexibility', 'problem_solving']:
            features.append(user_profile.get(domain, 0.5))

        # Performance metrics
        if game_history:
            recent_scores = [h.get('score', 0) for h in game_history[-10:]]
            features.extend([
                np.mean(recent_scores),
                np.std(recent_scores),
                np.max(recent_scores),
                len([s for s in recent_scores if s > 80]) / len(recent_scores),  # success rate
            ])
        else:
            features.extend([50, 10, 60, 0.5])  # default values

        # Time-based features
        features.extend([
            len(game_history),  # total games played
            sum(h.get('duration', 0) for h in game_history[-5:]) / max(1, len(game_history[-5:])),  # avg recent duration
        ])

        return features[:15]  # Ensure exactly 15 features

class CognitiveRecommender:
    def __init__(self):
        self.rf_model = None
        self.gb_model = None
        self.nn_model = None
        self.rl_agent = AdaptiveDifficultyAgent()
        self.difficulty_predictor = DifficultyPredictor()
        self.scaler = None
        self.user_item_matrix = None
        self.item_similarity = None
        self.load_models()

    def load_models(self):
        model_dir = 'models'
        if os.path.exists(f'{model_dir}/rf_model.pkl'):
            self.rf_model = joblib.load(f'{model_dir}/rf_model.pkl')
            self.gb_model = joblib.load(f'{model_dir}/gb_model.pkl')
            self.nn_model = keras.models.load_model(f'{model_dir}/nn_model.h5')
            self.scaler = joblib.load(f'{model_dir}/scaler.pkl')
            if os.path.exists(f'{model_dir}/rl_agent_weights.h5'):
                self.rl_agent.load(f'{model_dir}/rl_agent_weights.h5')
            if os.path.exists(f'{model_dir}/difficulty_predictor.h5'):
                self.difficulty_predictor.model.load_weights(f'{model_dir}/difficulty_predictor.h5')
            logger.info("AI models loaded successfully")

    def build_collaborative_filtering(self, user_game_data: pd.DataFrame):
        """Build user-item matrix for collaborative filtering"""
        self.user_item_matrix = user_game_data.pivot_table(
            index='user_id', columns='game_type', values='score', fill_value=0
        )

        # Calculate item similarity using cosine similarity
        from sklearn.metrics.pairwise import cosine_similarity
        self.item_similarity = pd.DataFrame(
            cosine_similarity(self.user_item_matrix.T),
            index=self.user_item_matrix.columns,
            columns=self.user_item_matrix.columns
        )

    def get_collaborative_recommendations(self, user_id: int, top_n: int = 5) -> List[str]:
        """Get collaborative filtering recommendations"""
        if self.user_item_matrix is None or user_id not in self.user_item_matrix.index:
            return []

        user_ratings = self.user_item_matrix.loc[user_id]
        similar_scores = self.item_similarity.dot(user_ratings)
        similar_scores = similar_scores / self.item_similarity.sum(axis=1)

        # Remove games already played
        similar_scores = similar_scores[user_ratings == 0]
        return similar_scores.nlargest(top_n).index.tolist()

    def get_content_based_recommendations(self, user_profile: Dict[str, float], top_n: int = 5) -> List[str]:
        """Get content-based recommendations based on user cognitive profile"""
        cognitive_weights = {
            'memory': ['memory_matrix', 'word_bubbles'],
            'speed': ['speed_match', 'number_crunch'],
            'attention': ['train_of_thought', 'color_match'],
            'flexibility': ['color_match', 'chalkboard_challenge'],
            'problem_solving': ['chalkboard_challenge', 'word_bubbles']
        }

        # Calculate weighted scores for each game
        game_scores = {}
        for area, weight in user_profile.items():
            if area in cognitive_weights:
                for game in cognitive_weights[area]:
                    if game not in game_scores:
                        game_scores[game] = 0
                    game_scores[game] += weight

        # Sort by score and return top recommendations
        sorted_games = sorted(game_scores.items(), key=lambda x: x[1], reverse=True)
        return [game for game, score in sorted_games[:top_n]]

    def get_hybrid_recommendations(self, user_id: int, user_profile: Dict[str, float], game_history: List[Dict], top_n: int = 5) -> List[Dict[str, Any]]:
        """Combine collaborative, content-based, and difficulty prediction"""
        collab_recs = self.get_collaborative_recommendations(user_id, top_n * 2)
        content_recs = self.get_content_based_recommendations(user_profile, top_n * 2)

        # Combine and rank
        combined_scores = {}
        for game in set(collab_recs + content_recs):
            collab_score = collab_recs.index(game) / len(collab_recs) if game in collab_recs else 0
            content_score = content_recs.index(game) / len(content_recs) if game in content_recs else 0
            combined_scores[game] = (collab_score + content_score) / 2

        sorted_games = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)

        recommendations = []
        for game, score in sorted_games[:top_n]:
            # Predict optimal difficulty
            predicted_difficulty = self.difficulty_predictor.predict_difficulty(user_profile, game_history)

            recommendations.append({
                'game_type': game,
                'confidence': score,
                'predicted_difficulty': predicted_difficulty,
                'reason': self._generate_recommendation_reason(game, user_profile)
            })

        return recommendations

    def _generate_recommendation_reason(self, game: str, user_profile: Dict[str, float]) -> str:
        """Generate human-readable recommendation reason"""
        game_descriptions = {
            'memory_matrix': 'spatial memory training',
            'speed_match': 'processing speed improvement',
            'train_of_thought': 'divided attention enhancement',
            'color_match': 'cognitive flexibility development',
            'chalkboard_challenge': 'quantitative reasoning practice',
            'word_bubbles': 'verbal fluency training',
            'number_crunch': 'mental math skills'
        }

        if game in game_descriptions:
            return f"Recommended for {game_descriptions[game]} based on your cognitive profile"
        return f"Recommended game: {game}"

    def build_neural_network(self, input_dim: int) -> keras.Model:
        model = keras.Sequential([
            layers.Dense(128, activation='relu', input_dim=input_dim),
            layers.Dropout(0.2),
            layers.Dense(64, activation='relu'),
            layers.Dropout(0.2),
            layers.Dense(32, activation='relu'),
            layers.Dense(5, activation='sigmoid')  # 5 cognitive areas
        ])
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        return model

    def train_models(self, data: List[Dict[str, Any]]):
        df = pd.DataFrame(data)
        features = ['memory', 'speed', 'attention', 'flexibility', 'problem_solving', 'age', 'sessions_completed']
        targets = ['memory_gain', 'speed_gain', 'attention_gain', 'flexibility_gain', 'problem_solving_gain']

        X = df[features]
        y = df[targets]

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

        # Random Forest
        self.rf_model = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
        self.rf_model.fit(X_train, y_train)

        # Gradient Boosting
        self.gb_model = GradientBoostingRegressor(n_estimators=200, learning_rate=0.1, random_state=42)
        self.gb_model.fit(X_train, y_train)

        # Neural Network
        self.nn_model = self.build_neural_network(X_train.shape[1])
        early_stopping = keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True)
        self.nn_model.fit(X_train, y_train, epochs=100, batch_size=32, validation_split=0.2,
                         callbacks=[early_stopping], verbose=0)

        # Evaluate
        rf_pred = self.rf_model.predict(X_test)
        gb_pred = self.gb_model.predict(X_test)
        nn_pred = self.nn_model.predict(X_test)

        rf_mse = mean_squared_error(y_test, rf_pred)
        gb_mse = mean_squared_error(y_test, gb_pred)
        nn_mse = mean_squared_error(y_test, nn_pred)

        logger.info(f"Model MSE - RF: {rf_mse:.4f}, GB: {gb_mse:.4f}, NN: {nn_mse:.4f}")

        # Save models
        os.makedirs('models', exist_ok=True)
        joblib.dump(self.rf_model, 'models/rf_model.pkl')
        joblib.dump(self.gb_model, 'models/gb_model.pkl')
        self.nn_model.save('models/nn_model.h5')
        joblib.dump(self.scaler, 'models/scaler.pkl')
        self.rl_agent.save('models/rl_agent_weights.h5')

    def recommend_games(self, user_profile: Dict[str, Any]) -> List[str]:
        if not all([self.rf_model, self.gb_model, self.nn_model, self.scaler]):
            return ['memory', 'speed', 'attention']  # Default

        features = ['memory', 'speed', 'attention', 'flexibility', 'problem_solving', 'age', 'sessions_completed']
        user_data = pd.DataFrame([user_profile])[features]
        user_scaled = self.scaler.transform(user_data)

        # Ensemble predictions
        rf_pred = self.rf_model.predict(user_scaled)[0]
        gb_pred = self.gb_model.predict(user_scaled)[0]
        nn_pred = self.nn_model.predict(user_scaled)[0]

        ensemble_pred = (rf_pred + gb_pred + nn_pred) / 3

        # Map to game types with weights
        game_types = ['memory', 'speed', 'attention', 'flexibility', 'problem_solving']
        game_weights = dict(zip(game_types, ensemble_pred))

        # Sort by predicted improvement potential
        recommended = sorted(game_weights.items(), key=lambda x: x[1], reverse=True)
        return [game for game, _ in recommended[:3]]

    def adaptive_difficulty(self, user_profile: Dict[str, Any], game_type: str) -> Dict[str, Any]:
        base_difficulty = {
            'memory': {'level': 1, 'time_limit': 30, 'complexity': 1},
            'speed': {'level': 1, 'time_limit': 20, 'complexity': 1},
            'attention': {'level': 1, 'time_limit': 25, 'complexity': 1},
            'flexibility': {'level': 1, 'time_limit': 35, 'complexity': 1},
            'problem_solving': {'level': 1, 'time_limit': 40, 'complexity': 1}
        }

        current_score = user_profile.get(game_type, 50)
        sessions = user_profile.get('sessions_completed', 0)

        # RL-based adaptation
        state = np.array([current_score / 100, sessions / 100, user_profile.get('streak', 0) / 30,
                         user_profile.get('age', 25) / 100, user_profile.get('last_accuracy', 0.8)]).reshape(1, -1)

        action = self.rl_agent.act(state)
        difficulty_levels = [1, 2, 3, 4, 5]

        level = difficulty_levels[action]

        if current_score > 80 and sessions > 10:
            level = min(level + 1, 5)
        elif current_score < 40:
            level = max(level - 1, 1)

        time_limit = base_difficulty[game_type]['time_limit'] * (1 - (level - 1) * 0.1)
        complexity = level

        return {
            'level': level,
            'time_limit': int(time_limit),
            'complexity': complexity,
            'hints_available': max(0, 3 - level)
        }

    def update_rl_agent(self, state, action, reward, next_state, done):
        self.rl_agent.remember(state, action, reward, next_state, done)
        if len(self.rl_agent.memory) > 32:
            self.rl_agent.replay(32)

recommender = CognitiveRecommender()

