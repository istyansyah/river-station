"""
app/routers/status.py

REST API Routers for system status and health endpoints.
Provides real-time connectivity status of backend dependencies (InfluxDB, MQTT, Telegram).
"""

from __future__ import annotations

import time
from typing import Optional

from fastapi import APIRouter, Depends, Request

from app.config.settings import Settings, get_settings
from app.core.dependencies import get_influxdb_client, get_sensor_service
from app.database.influxdb import verify_connection
from app.logging.logger import get_logger
from app.schemas.weather import HealthResponse, SystemStatusResponse
from app.services.sensor_service import SensorService
from influxdb_client import InfluxDBClient

logger = get_logger(__name__)

router = APIRouter(prefix="/api", tags=["Status"])

# Record application start time for uptime calculation
START_TIME = time.time()


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Basic health check endpoint for proxy / load balancer probing."""
    settings = get_settings()
    return HealthResponse(status="healthy", version=settings.app_version)


@router.get("/status", response_model=SystemStatusResponse)
def get_system_status(
    request: Request,
    influx_client: InfluxDBClient = Depends(get_influxdb_client),
) -> SystemStatusResponse:
    """Retrieve runtime diagnostics, including database, broker, and notification states."""
    settings = get_settings()

    # 1. Verify InfluxDB Connection
    influx_ok = verify_connection(influx_client)

    # 2. Check MQTT connection status from application state
    # The MQTTClient instance is registered under app.state on startup
    mqtt_connected = False
    mqtt_client = getattr(request.app.state, "mqtt_client", None)
    if mqtt_client:
        mqtt_connected = mqtt_client.is_connected

    # 3. Retrieve last ingestion activity from the lifespan service
    sensor_service = getattr(request.app.state, "sensor_service", None)
    last_received, device_id = (
        sensor_service.get_last_activity() if sensor_service else (None, None)
    )

    uptime = time.time() - START_TIME

    return SystemStatusResponse(
        backend="online",
        mqtt_connected=mqtt_connected,
        influxdb_connected=influx_ok,
        telegram_enabled=settings.telegram_enabled,
        last_data_received=last_received,
        device_id=device_id,
        device_online=sensor_service.is_device_online() if sensor_service else False,
        uptime_seconds=uptime,
    )
