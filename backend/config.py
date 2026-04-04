from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # App settings
    app_name: str = "Lumosity Clone API"
    app_version: str = "2.0.0"
    debug: bool = False

    # Security
    secret_key: str = os.getenv("SECRET_KEY", "change-this-in-production-please")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://lumosity:password@localhost/lumosity")

    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    cache_ttl: int = 300  # 5 minutes

    # CORS
    cors_origins_str: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    environment: str = os.getenv("ENVIRONMENT", "development")

    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds

    # ML
    model_path: str = "models/"
    enable_ab_testing: bool = True

    # Monitoring
    enable_prometheus: bool = True
    log_level: str = "INFO"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins_str.split(",") if origin.strip()]

    @property
    def cors_allow_credentials(self) -> bool:
        return self.environment == "development"

    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "extra": "ignore"
    }

settings = Settings()

settings = Settings()