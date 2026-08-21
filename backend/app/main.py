"""
app/main.py

FastAPI Application Factory.
Configures lifecycle handlers, routing, logging, exception handlers, and CORS.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.config.settings import get_settings
from app.core.dependencies import (
    get_influxdb_client,
    get_sensor_service,
    get_weather_repository,
    get_warning_service,
    get_tourism_service,
    get_telegram_service,
    get_connection_manager,
)
from app.core.exceptions import RiverStationError
from app.database.influxdb import create_influxdb_client, verify_connection
from app.logging.logger import get_logger, setup_logging
from app.middlewares.cors import setup_cors
from app.mqtt.client import MQTTClient
from app.mqtt.handler import MQTTMessageHandler
from app.routers import status as status_router, weather, websocket

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """App lifetime events context manager (handles startup and shutdown)."""
    settings = get_settings()
    setup_logging(debug=settings.debug)

    logger.info("Initializing River Station Backend Lifespan...")

    # 1. Verify Database Connectivity on startup
    db_client_generator = get_influxdb_client()
    db_client = next(db_client_generator)
    try:
        verify_connection(db_client)
    except Exception as exc:
        logger.critical("Failed to verify InfluxDB connection during startup: %s", exc)
    finally:
        # Close the temporary startup check client
        db_client.close()

    # 2. Wire up services for MQTT Message Handler
    # We resolve dependencies manually for the startup script
    connection_manager = get_connection_manager()
    warning_service = get_warning_service()
    tourism_service = get_tourism_service()
    telegram_service = get_telegram_service()

    # Since WeatherRepository needs a client, we create a lifespan-long client
    # to avoid recycling connections in the MQTT callback thread.
    mqtt_db_client = create_influxdb_client(settings)
    weather_repository = get_weather_repository(client=mqtt_db_client)

    sensor_service = get_sensor_service(
        repository=weather_repository,
        warning_service=warning_service,
        tourism_service=tourism_service,
        telegram_service=telegram_service,
        manager=connection_manager,
        settings=settings,
        publish_command=lambda payload: app.state.mqtt_client.publish_command(payload),
    )

    loop = asyncio.get_running_loop()
    msg_handler = MQTTMessageHandler(sensor_service=sensor_service)
    mqtt_client = MQTTClient(
        settings=settings,
        message_handler=msg_handler,
        loop=loop,
    )
    mqtt_client.start()

    # Save runtime state references for status check endpoints
    app.state.mqtt_client = mqtt_client
    app.state.sensor_service = sensor_service

    logger.info("Startup complete. MQTT background loop thread running.")
    yield

    # Shutdown logic
    logger.info("Executing shutdown lifespan logic...")
    mqtt_client.stop()
    mqtt_db_client.close()
    logger.info("Shutdown complete.")


def create_app() -> FastAPI:
    """FastAPI Application factory function."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Backend API and early warning processing engine for IoT River Monitoring.",
        lifespan=lifespan,
    )

    # ── CORS Middleware ───────────────────────────────────────
    setup_cors(app, settings)

    # ── Routers ───────────────────────────────────────────────
    app.include_router(weather.router)
    app.include_router(status_router.router)
    app.include_router(websocket.router)

    # ── Global Domain Exception Handler ───────────────────────
    @app.exception_handler(RiverStationError)
    async def river_station_error_handler(
        request: Request, exc: RiverStationError
    ) -> JSONResponse:
        logger.error("Domain error caught: %s | Detail: %s", exc.message, exc.detail)
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": exc.__class__.__name__,
                "message": exc.message,
                "detail": exc.detail,
            },
        )

    return app
