#!/usr/bin/env python3
"""
Advanced ML Pipeline for Cognitive Analysis
Implements model versioning, A/B testing, and feature engineering
"""
import os
import json
import pickle
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import (
    RandomForestRegressor, GradientBoostingRegressor, 
    AdaBoostRegressor, ExtraTreesRegressor
)
from sklearn.model_selection import (
    train_test_split, cross_val_score, GridSearchCV,
    RandomizedSearchCV
)
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.feature_selection import SelectKBest, mutual_info_regression
import joblib
import redis
import boto3
from botocore.exceptions import ClientError

@dataclass
class ModelMetadata:
    model_id: str
    version: str
    algorithm: str
    created_at: str
    features: List[str]
    metrics: Dict[str, float]
    hyperparameters: Dict
    dataset_hash: str
    deployed: bool = False

class ModelVersioning:
    def __init__(self, model_dir: str = "./ml-models", redis_url: str = None):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        self.redis_client = redis.from_url(redis_url) if redis_url else None
        self.metadata_file = self.model_dir / "model_registry.json"
        self.registry = self._load_registry()
    
    def _load_registry(self) -> Dict:
        if self.metadata_file.exists():
            with open(self.metadata_file, 'r') as f:
                return json.load(f)
        return {"models": {}, "active_models": {}}
    
    def _save_registry(self):
        with open(self.metadata_file, 'w') as f:
            json.dump(self.registry, f, indent=2, default=str)
    
    def _generate_model_id(self, algorithm: str, dataset_hash: str) -> str:
        timestamp = datetime.utcnow().isoformat()
        content = f"{algorithm}_{dataset_hash}_{timestamp}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _compute_dataset_hash(self, X: pd.DataFrame, y: pd.Series) -> str:
        data_str = f"{X.to_json()}_{y.to_json()}"
        return hashlib.sha256(data_str.encode()).hexdigest()[:16]
    
    def register_model(
        self, 
        model, 
        algorithm: str,
        features: List[str],
        metrics: Dict[str, float],
        hyperparameters: Dict,
        X: pd.DataFrame,
        y: pd.Series
    ) -> str:
        dataset_hash = self._compute_dataset_hash(X, y)
        model_id = self._generate_model_id(algorithm, dataset_hash)
        version = f"v{len([m for m in self.registry['models'].values() if m['algorithm'] == algorithm]) + 1}"
        
        metadata = ModelMetadata(
            model_id=model_id,
            version=version,
            algorithm=algorithm,
            created_at=datetime.utcnow().isoformat(),
            features=features,
            metrics=metrics,
            hyperparameters=hyperparameters,
            dataset_hash=dataset_hash
        )
        
        # Save model
        model_path = self.model_dir / f"{model_id}.pkl"
        joblib.dump(model, model_path)
        
        # Save metadata
        self.registry["models"][model_id] = asdict(metadata)
        self._save_registry()
        
        # Cache in Redis
        if self.redis_client:
            self.redis_client.hset(f"model:{model_id}", mapping={
                "metadata": json.dumps(asdict(metadata)),
                "path": str(model_path)
            })
        
        return model_id
    
    def load_model(self, model_id: str):
        if self.redis_client and self.redis_client.exists(f"model:{model_id}"):
            model_path = self.redis_client.hget(f"model:{model_id}", "path")
        else:
            model_path = self.model_dir / f"{model_id}.pkl"
        
        return joblib.load(model_path)
    
    def get_active_model(self, algorithm: str) -> Optional[str]:
        return self.registry["active_models"].get(algorithm)
    
    def deploy_model(self, model_id: str):
        if model_id not in self.registry["models"]:
            raise ValueError(f"Model {model_id} not found")
        
        algorithm = self.registry["models"][model_id]["algorithm"]
        self.registry["active_models"][algorithm] = model_id
        self.registry["models"][model_id]["deployed"] = True
        self._save_registry()
        
        if self.redis_client:
            self.redis_client.set(f"active_model:{algorithm}", model_id)

class FeatureEngineering:
    def __init__(self):
        self.scaler = StandardScaler()
        self.poly = PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)
    
    def create_temporal_features(self, df: pd.DataFrame, timestamp_col: str) -> pd.DataFrame:
        df = df.copy()
        df['hour'] = pd.to_datetime(df[timestamp_col]).dt.hour
        df['day_of_week'] = pd.to_datetime(df[timestamp_col]).dt.dayofweek
        df['month'] = pd.to_datetime(df[timestamp_col]).dt.month
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        df['is_morning'] = ((df['hour'] >= 6) & (df['hour'] < 12)).astype(int)
        df['is_evening'] = ((df['hour'] >= 18) & (df['hour'] < 22)).astype(int)
        return df
    
    def create_rolling_features(self, df: pd.DataFrame, group_col: str, value_col: str, windows: List[int] = [3, 7, 30]) -> pd.DataFrame:
        df = df.copy()
        for window in windows:
            df[f'{value_col}_rolling_mean_{window}'] = df.groupby(group_col)[value_col].transform(
                lambda x: x.rolling(window=window, min_periods=1).mean()
            )
            df[f'{value_col}_rolling_std_{window}'] = df.groupby(group_col)[value_col].transform(
                lambda x: x.rolling(window=window, min_periods=1).std()
            )
        return df
    
    def create_lag_features(self, df: pd.DataFrame, group_col: str, value_col: str, lags: List[int] = [1, 2, 3, 7]) -> pd.DataFrame:
        df = df.copy()
        for lag in lags:
            df[f'{value_col}_lag_{lag}'] = df.groupby(group_col)[value_col].shift(lag)
        return df
    
    def select_features(self, X: pd.DataFrame, y: pd.Series, k: int = 20) -> List[str]:
        selector = SelectKBest(mutual_info_regression, k=min(k, X.shape[1]))
        selector.fit(X, y)
        mask = selector.get_support()
        return X.columns[mask].tolist()

class CognitiveMLPipeline:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.model_versioning = ModelVersioning(redis_url=redis_url)
        self.feature_engineering = FeatureEngineering()
        self.experiments = {}
    
    def train_score_prediction_model(
        self, 
        sessions_df: pd.DataFrame,
        algorithm: str = "gradient_boosting",
        experiment_id: Optional[str] = None
    ) -> Tuple[str, Dict[str, float]]:
        
        # Feature engineering
        df = self.feature_engineering.create_temporal_features(sessions_df, 'played_at')
        df = self.feature_engineering.create_rolling_features(df, 'user_id', 'score')
        
        # Select features
        feature_cols = [
            'accuracy', 'difficulty_level', 'hour', 'day_of_week',
            'is_weekend', 'is_morning', 'is_evening'
        ] + [col for col in df.columns if 'rolling' in col]
        
        X = df[feature_cols].fillna(df[feature_cols].mean())
        y = df['score']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Select model
        if algorithm == "random_forest":
            model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
            param_grid = {
                'n_estimators': [50, 100, 200],
                'max_depth': [5, 10, 15, None],
                'min_samples_split': [2, 5, 10]
            }
        elif algorithm == "gradient_boosting":
            model = GradientBoostingRegressor(n_estimators=100, random_state=42)
            param_grid = {
                'n_estimators': [50, 100, 200],
                'learning_rate': [0.01, 0.1, 0.3],
                'max_depth': [3, 5, 7]
            }
        elif algorithm == "adaboost":
            model = AdaBoostRegressor(n_estimators=100, random_state=42)
            param_grid = {'n_estimators': [50, 100, 200], 'learning_rate': [0.01, 0.1, 1.0]}
        else:  # extra_trees
            model = ExtraTreesRegressor(n_estimators=100, random_state=42, n_jobs=-1)
            param_grid = {'n_estimators': [50, 100, 200], 'max_depth': [5, 10, 15, None]}
        
        # Hyperparameter tuning
        search = RandomizedSearchCV(
            model, param_grid, n_iter=10, 
            cv=3, scoring='neg_mean_absolute_error',
            random_state=42, n_jobs=-1
        )
        search.fit(X_train_scaled, y_train)
        best_model = search.best_estimator_
        
        # Evaluate
        y_pred = best_model.predict(X_test_scaled)
        metrics = {
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'mae': mean_absolute_error(y_test, y_pred),
            'r2': r2_score(y_test, y_pred),
            'cv_score': cross_val_score(best_model, X_train_scaled, y_train, cv=5).mean()
        }
        
        # Register model
        model_id = self.model_versioning.register_model(
            model=best_model,
            algorithm=algorithm,
            features=feature_cols,
            metrics=metrics,
            hyperparameters=search.best_params_,
            X=X,
            y=y
        )
        
        if experiment_id:
            self.experiments[experiment_id] = {
                'model_id': model_id,
                'metrics': metrics,
                'algorithm': algorithm
            }
        
        return model_id, metrics
    
    def run_ab_test(
        self, 
        sessions_df: pd.DataFrame,
        algorithms: List[str] = ["gradient_boosting", "random_forest", "extra_trees"]
    ) -> Dict[str, Dict]:
        results = {}
        for algo in algorithms:
            exp_id = f"ab_test_{algo}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            model_id, metrics = self.train_score_prediction_model(
                sessions_df, algorithm=algo, experiment_id=exp_id
            )
            results[algo] = {
                'model_id': model_id,
                'metrics': metrics
            }
        
        # Select best model based on MAE
        best_algo = min(results.items(), key=lambda x: x[1]['metrics']['mae'])[0]
        self.model_versioning.deploy_model(results[best_algo]['model_id'])
        
        return results
    
    def predict_score(
        self, 
        user_features: Dict[str, float],
        algorithm: str = "gradient_boosting"
    ) -> float:
        active_model_id = self.model_versioning.get_active_model(algorithm)
        if not active_model_id:
            raise ValueError(f"No active model for {algorithm}")
        
        model = self.model_versioning.load_model(active_model_id)
        metadata = self.model_versioning.registry["models"][active_model_id]
        features = metadata["features"]
        
        X = pd.DataFrame([{f: user_features.get(f, 0) for f in features}])
        prediction = model.predict(X)[0]
        
        return float(prediction)
    
    def get_model_performance_report(self) -> pd.DataFrame:
        models = self.model_versioning.registry["models"]
        data = []
        for model_id, metadata in models.items():
            data.append({
                'model_id': model_id,
                'algorithm': metadata['algorithm'],
                'version': metadata['version'],
                'mae': metadata['metrics']['mae'],
                'rmse': metadata['metrics']['rmse'],
                'r2': metadata['metrics']['r2'],
                'deployed': metadata['deployed'],
                'created_at': metadata['created_at']
            })
        return pd.DataFrame(data)

if __name__ == "__main__":
    # Example usage
    pipeline = CognitiveMLPipeline()
    print("ML Pipeline initialized")
    print(f"Registered models: {len(pipeline.model_versioning.registry['models'])}")
