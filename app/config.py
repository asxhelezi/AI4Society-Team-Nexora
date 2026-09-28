from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_ENV: str = "development"
    APP_TIMEZONE: str = "Europe/Tirane"
    DATABASE_URL: str
    REDIS_URL: str = ""
    JWT_SECRET: str = Field(min_length=32)
    JWT_TTL_HOURS: int = 8
    CORS_ORIGINS: Annotated[list[str], NoDecode] = [
        "http://localhost:8000",
        "http://localhost:5174",
        "http://localhost:5175",
    ]
    UPLOAD_DIR: Path = Path("./uploads")
    CITIZEN_ASSETS_DIR: Path = Path(__file__).resolve().parents[2]
    MAX_UPLOAD_MB: int = Field(default=10, ge=1, le=100)
    UPLOAD_MAX_PIXELS: int = Field(default=25_000_000, ge=1_000_000, le=100_000_000)
    PUBLIC_MAP_MAX_RESULTS: int = Field(default=500, ge=1, le=2000)
    IDEMPOTENCY_TTL_HOURS: int = Field(default=48, ge=1, le=168)
    SERVICE_AREA_BOUNDS: Annotated[list[float], NoDecode] = []

    BOOTSTRAP_ADMIN_EMAIL: str = "admin@sinjal.local"
    BOOTSTRAP_ADMIN_PASSWORD: str = "change-this-before-production"
    BOOTSTRAP_ADMIN_NAME: str = "SINJAL Administrator"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""

    TURNSTILE_SITE_KEY: str = ""
    TURNSTILE_SECRET: str = ""
    TURNSTILE_HOSTNAMES: Annotated[list[str], NoDecode] = []
    TURNSTILE_ACTION: str = "submit_report"

    AI_SERVICE_URL: str = ""
    AI_SERVICE_TOKEN: str = ""
    MAP_PROVIDER_URL: str = "https://nominatim.openstreetmap.org"
    MAP_TILE_PROVIDER_URL: str = "https://tile.openstreetmap.org"
    MAP_USER_AGENT: str = "SINJAL/1.0 (contact: ai4societyalbania@gmail.com)"
    MAP_CONTACT_EMAIL: str = "ai4societyalbania@gmail.com"
    MAP_COUNTRY_CODES: str = "al"
    MAP_CACHE_TTL_SECONDS: int = 604800

    @field_validator("CORS_ORIGINS", "TURNSTILE_HOSTNAMES", mode="before")
    @classmethod
    def split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [part.strip() for part in value.split(",") if part.strip()]
        return value

    @field_validator("SERVICE_AREA_BOUNDS", mode="before")
    @classmethod
    def parse_bounds(cls, value: object) -> object:
        if isinstance(value, str):
            if not value.strip():
                return []
            return [float(part.strip()) for part in value.split(",")]
        return value

    @field_validator("SERVICE_AREA_BOUNDS")
    @classmethod
    def validate_bounds(cls, value: list[float]) -> list[float]:
        if value and len(value) != 4:
            raise ValueError("SERVICE_AREA_BOUNDS must be south,west,north,east")
        if value:
            south, west, north, east = value
            if not (-90 <= south < north <= 90 and -180 <= west < east <= 180):
                raise ValueError("SERVICE_AREA_BOUNDS contains invalid coordinates")
        return value

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return "postgresql+asyncpg://" + value[len("postgres://") :]
        if value.startswith("postgresql://") and "+asyncpg" not in value:
            return "postgresql+asyncpg://" + value[len("postgresql://") :]
        return value

    @model_validator(mode="after")
    def validate_production(self) -> "Settings":
        if self.APP_ENV != "production":
            return self
        missing = []
        if self.BOOTSTRAP_ADMIN_PASSWORD.startswith(("change-", "replace-")):
            missing.append("BOOTSTRAP_ADMIN_PASSWORD")
        if self.JWT_SECRET.startswith(("change-", "replace-")):
            missing.append("JWT_SECRET")
        if "replace-" in self.DATABASE_URL:
            missing.append("DATABASE_URL")
        if not self.TURNSTILE_SECRET or self.TURNSTILE_SECRET.startswith("replace-"):
            missing.append("TURNSTILE_SECRET")
        if not self.TURNSTILE_SITE_KEY or self.TURNSTILE_SITE_KEY.startswith(
            "replace-"
        ):
            missing.append("TURNSTILE_SITE_KEY")
        if not self.TURNSTILE_HOSTNAMES or any(
            host.endswith(".example") for host in self.TURNSTILE_HOSTNAMES
        ):
            missing.append("TURNSTILE_HOSTNAMES")
        if not self.REDIS_URL or "replace-" in self.REDIS_URL:
            missing.append("REDIS_URL")
        if "*" in self.CORS_ORIGINS or any(
            origin.endswith(".example") for origin in self.CORS_ORIGINS
        ):
            raise ValueError(
                "CORS_ORIGINS must contain only real HTTPS origins in production"
            )
        if missing:
            raise ValueError("Missing production settings: " + ", ".join(missing))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
