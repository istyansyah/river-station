"""
app/config/settings.py

Centralised application configuration using Pydantic BaseSettings.
All values are read from environment variables or the .env file.
Provides type safety, validation, and a single import point for
config across the entire backend.
"""

from __future__ import annotations

import json
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────
    app_name: str = "River Station API"
    app_version: str = "1.0.0"
    debug: bool = False

    # ── MQTT ──────────────────────────────────────────────────
    mqtt_broker: str = "localhost"
    mqtt_port: int = 1883
    mqtt_topic_weather: str = "river/weather"
    mqtt_topic_heartbeat: str = "river/heartbeat"
    mqtt_client_id: str = "river-backend-01"

    # ── InfluxDB ──────────────────────────────────────────────
    influxdb_url: str = "http://localhost:8086"
    influxdb_token: str = Field(..., description="InfluxDB API token")
    influxdb_org: str = "river-station"
    influxdb_bucket: str = "river_monitoring"

    # ── Telegram ──────────────────────────────────────────────
    telegram_bot_token: str = Field(default="", description="Telegram Bot token")
    telegram_chat_id: str = Field(default="", description="Telegram chat ID")
    telegram_enabled: bool = True

    # ── Relative Water Level Thresholds ───────────────────────
    normal_distance_cm: float = 180.0
    measurement_method: str = "relative"
    warning_water_level_increase_cm: float = 30.0
    danger_water_level_increase_cm: float = 60.0
    critical_water_level_increase_cm: float = 90.0
    warning_heat_index_c: float = 32.2
    danger_heat_index_c: float = 39.4
    critical_heat_index_c: float = 51.7
    warning_wind_speed_kmh: float = 45.0
    danger_wind_speed_kmh: float = 65.0


    # ── CORS ──────────────────────────────────────────────────
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | List[str]) -> List[str]:
        """Parse CORS origins from JSON string or list."""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",")]
        return v


# ── Singleton instance ─────────────────────────────────────────
_settings: Settings | None = None


def get_settings() -> Settings:
    """Return the singleton Settings instance (lazy init)."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
