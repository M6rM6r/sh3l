"""Centralized configuration — single source of truth for environment-driven settings."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    secret_key: str = Field(default="super-secret-key-change-in-production", validation_alias="SECRET_KEY")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    database_url: str = Field(
        default="postgresql://lumosity:password@localhost/lumosity",
        validation_alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379", validation_alias="REDIS_URL")
    environment: str = Field(default="development", validation_alias="ENVIRONMENT")
    # Comma-separated origins, or * for all (dev only)
    cors_origins: str = Field(default="*", validation_alias="CORS_ORIGINS")

    def cors_allow_origins(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
