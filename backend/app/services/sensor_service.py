"""
app/services/sensor_service.py

Sensor Service — coordinates the business logic when new sensor readings arrive.
Orchestrates:
  1. Early Warning status classification.
  2. Tourism suitability classification.
  3. Data persistence to InfluxDB (WeatherRepository).
  4. Realtime WebSocket broadcast.
  5. Telegram alerts for Waspada, Siaga, or Awas states.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable, Optional

from app.config.settings import Settings
from app.logging.logger import get_logger
from app.models.sensor_data import SensorData, ProcessedSensorData
from app.repositories.weather_repository import WeatherRepository
from app.services.warning_service import WarningService
from app.services.tourism_service import TourismService
from app.services.telegram_service import TelegramService
from app.websocket.manager import ConnectionManager

logger = get_logger(__name__)


class SensorService:
    """Orchestrator service for processing incoming sensor data."""

    def __init__(
        self,
        repository: WeatherRepository,
        warning_service: WarningService,
        tourism_service: TourismService,
        telegram_service: TelegramService,
        connection_manager: ConnectionManager,
        settings: Settings,
        publish_command: Optional[Callable[[dict], bool]] = None,
    ) -> None:
        self._repository = repository
        self._warning_service = warning_service
        self._tourism_service = tourism_service
        self._telegram_service = telegram_service
        self._connection_manager = connection_manager
        self._settings = settings
        self._publish_command = publish_command
        self._last_warning_status = None
        self._last_data_received: Optional[datetime] = None
        self._last_device_id: Optional[str] = None
        self._last_heartbeat_received: Optional[datetime] = None
        self._last_device_activity_received: Optional[datetime] = None

    async def process_reading(self, raw_data: SensorData) -> ProcessedSensorData:
        """Process a raw sensor reading from ESP32.

        Stamps the data with an ingestion timestamp, runs the Early Warning
        and Tourism classification engines, saves to InfluxDB, broadcasts to
        dashboard clients via WebSocket, and fires Telegram alerts.
        """
        logger.info("Processing sensor data for device: %s", raw_data.device_id)

        # 1. Compute water level increase from raw distance
        if raw_data.raw_distance is not None:
            water_level = self._settings.normal_distance_cm - raw_data.raw_distance
            if water_level < 0:
                water_level = 0.0
        else:
            water_level = 0.0

        raw_data.water_level = water_level

        # 2. Classify warning and tourism status
        warning_status = self._warning_service.classify(raw_data)
        tourism_status = self._tourism_service.classify(raw_data, warning_status)

        if warning_status != self._last_warning_status:
            interval_ms = {
                "Siaga": 500,
                "Awas": 200,
            }.get(warning_status.value, 0)
            if self._publish_command is not None:
                self._publish_command({
                    "command": "buzzer",
                    "buzzer": warning_status.value,
                    "status": warning_status.value,
                    "interval_ms": interval_ms,
                })
            self._last_warning_status = warning_status

        # 3. Resolve timestamp (device NTP if synced, else server time)
        resolved_time = raw_data.timestamp or datetime.now(timezone.utc)

        # Build processed data dict
        data_dict = raw_data.model_dump()
        data_dict.pop("timestamp", None)

        processed_data = ProcessedSensorData(
            **data_dict,
            warning_status=warning_status,
            tourism_status=tourism_status,
            timestamp=resolved_time,
        )

        # Update service activity metrics
        received_at = datetime.now(timezone.utc)
        self._last_data_received = processed_data.timestamp
        self._last_device_id = processed_data.device_id
        self._last_device_activity_received = received_at

        # 3. Persist in InfluxDB
        self._repository.write(processed_data)

        # 4. Broadcast via WebSocket
        ws_payload = {
            "type": "weather_update",
            "data": processed_data.model_dump(mode="json"),
        }
        await self._connection_manager.broadcast(ws_payload)

        # 5. Fire Telegram notification for non-normal status
        await self._telegram_service.notify(processed_data)

        return processed_data

    def record_heartbeat(self) -> None:
        """Record the server time when an ESP32 heartbeat was received."""
        received_at = datetime.now(timezone.utc)
        self._last_heartbeat_received = received_at
        self._last_device_activity_received = received_at

    def is_device_online(self, timeout_seconds: int = 90) -> bool:
        """Return whether recent heartbeat or weather data was received."""
        if self._last_device_activity_received is None:
            return False
        elapsed = datetime.now(timezone.utc) - self._last_device_activity_received
        return elapsed.total_seconds() <= timeout_seconds

    def get_last_activity(self) -> tuple[Optional[datetime], Optional[str]]:
        """Return timestamp of last received reading and device_id."""
        return self._last_data_received, self._last_device_id

