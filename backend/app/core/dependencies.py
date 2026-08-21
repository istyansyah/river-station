"""
app/core/dependencies.py

FastAPI dependency injection providers.
All shared resources (settings, DB clients, services) are injected
via FastAPI's Depends() system — enabling clean unit testing with mocks.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Callable, Generator, Optional

from fastapi import Depends
from influxdb_client import InfluxDBClient

from app.config.settings import Settings, get_settings
from app.database.influxdb import create_influxdb_client
from app.repositories.weather_repository import WeatherRepository
from app.services.sensor_service import SensorService
from app.services.warning_service import WarningService
from app.services.tourism_service import TourismService
from app.services.telegram_service import TelegramService
from app.websocket.manager import ConnectionManager
from fastapi import Depends


# ── Singleton WebSocket Manager ────────────────────────────────
_connection_manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """Return the singleton WebSocket ConnectionManager."""
    return _connection_manager


# ── Settings ──────────────────────────────────────────────────
def get_settings_dep() -> Settings:
    """FastAPI dependency: inject application Settings."""
    return get_settings()


# ── InfluxDB Client ───────────────────────────────────────────
def get_influxdb_client() -> Generator[InfluxDBClient, None, None]:
    """FastAPI dependency: inject a scoped InfluxDB client.

    Yields a client and ensures it is closed after the request.
    """
    settings = get_settings()
    client = create_influxdb_client(settings)
    try:
        yield client
    finally:
        client.close()


# ── Repository ────────────────────────────────────────────────
def get_weather_repository(
    client: InfluxDBClient = Depends(get_influxdb_client),
) -> WeatherRepository:
    """FastAPI dependency: inject WeatherRepository with DB client."""
    settings = get_settings()
    return WeatherRepository(client=client, settings=settings)


# ── Services ──────────────────────────────────────────────────
def get_warning_service() -> WarningService:
    """FastAPI dependency: inject EarlyWarningService."""
    return WarningService(settings=get_settings())


def get_tourism_service() -> TourismService:
    """FastAPI dependency: inject TourismService."""
    return TourismService(settings=get_settings())


def get_telegram_service() -> TelegramService:
    """FastAPI dependency: inject TelegramService."""
    return TelegramService(settings=get_settings())


def get_sensor_service(
    repository: WeatherRepository = Depends(get_weather_repository),
    warning_service: WarningService = Depends(get_warning_service),
    tourism_service: TourismService = Depends(get_tourism_service),
    telegram_service: TelegramService = Depends(get_telegram_service),
    manager: ConnectionManager = Depends(get_connection_manager),
    settings: Settings = Depends(get_settings_dep),
    publish_command: Optional[Callable[[dict], bool]] = None,
) -> SensorService:
    """FastAPI dependency: inject fully wired SensorService."""
    return SensorService(
        repository=repository,
        warning_service=warning_service,
        tourism_service=tourism_service,
        telegram_service=telegram_service,
        connection_manager=manager,
        settings=settings,
        publish_command=publish_command,
    )
