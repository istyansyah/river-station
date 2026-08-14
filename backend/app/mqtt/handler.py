"""
app/mqtt/handler.py

MQTT Message Router/Handler.
Parses incoming JSON payloads from MQTT topics, validates them using Pydantic,
and routes them to the appropriate application services.

rain_status normalization:
  - If absent  → derived from rain_raw ADC value
  - "DRY"      → "No Rain"
  - "DRIZZLE"  → "Light Rain"
  - "RAIN"     → "Rain"
"""

from __future__ import annotations

import json
from app.logging.logger import get_logger
from app.models.sensor_data import SensorData, HeartbeatData
from app.services.sensor_service import SensorService

logger = get_logger(__name__)

# Mapping for legacy firmware rain labels → canonical backend labels
_RAIN_LABEL_MAP: dict[str, str] = {
    "DRY": "No Rain",
    "DRIZZLE": "Light Rain",
    "RAIN": "Rain",
}


def _derive_rain_status(rain_raw: int) -> str:
    """Classify rain status from ADC reading when firmware does not send it."""
    if rain_raw < 2000:
        return "Rain"
    if rain_raw < 3000:
        return "Light Rain"
    return "No Rain"


def _normalize_payload(raw_dict: dict) -> dict:
    """Normalize firmware payload before Pydantic validation.

    - Derive rain_status from rain_raw if not present.
    - Translate legacy DRY / DRIZZLE / RAIN labels to canonical values.
    """
    rain_status = raw_dict.get("rain_status")
    if rain_status is None:
        raw_dict["rain_status"] = _derive_rain_status(int(raw_dict.get("rain_raw", 4095)))
    else:
        raw_dict["rain_status"] = _RAIN_LABEL_MAP.get(str(rain_status).upper(), rain_status)
    return raw_dict


def _normalize_heartbeat_payload(raw_dict: dict) -> dict:
    """Normalize heartbeat field names from firmware before validation."""
    if "status" not in raw_dict and "type" in raw_dict:
        raw_dict["status"] = raw_dict["type"]
    if "uptime_s" not in raw_dict and "uptime" in raw_dict:
        raw_dict["uptime_s"] = raw_dict["uptime"]
    return raw_dict


class MQTTMessageHandler:
    """Routes and handles incoming MQTT messages."""

    def __init__(self, sensor_service: SensorService) -> None:
        self._sensor_service = sensor_service

    async def handle_weather_message(self, topic: str, payload_bytes: bytes) -> None:
        """Process incoming weather message from the river/weather topic."""
        try:
            payload_str = payload_bytes.decode("utf-8")
            logger.debug("Received MQTT weather payload: %s on topic %s", payload_str, topic)

            # 1. Parse JSON
            raw_dict = json.loads(payload_str)

            # 2. Normalize rain_status before validation
            raw_dict = _normalize_payload(raw_dict)

            # 3. Validate using Pydantic model (SensorData)
            sensor_data = SensorData(**raw_dict)

            # 4. Hand over to SensorService for processing
            await self._sensor_service.process_reading(sensor_data)

        except json.JSONDecodeError as exc:
            logger.error("Failed to decode JSON from MQTT weather payload: %s", exc)
        except Exception as exc:
            logger.error("Error processing MQTT weather message: %s", exc, exc_info=True)



    async def handle_heartbeat_message(self, topic: str, payload_bytes: bytes) -> None:
        """Process incoming heartbeat message from the river/heartbeat topic."""
        try:
            payload_str = payload_bytes.decode("utf-8")
            logger.debug("Received MQTT heartbeat payload: %s on topic %s", payload_str, topic)

            # 1. Parse and Normalize
            raw_dict = json.loads(payload_str)
            raw_dict = _normalize_heartbeat_payload(raw_dict)
            heartbeat = HeartbeatData(**raw_dict)
            self._sensor_service.record_heartbeat()

            logger.info(
                "MQTT Device Heartbeat | device=%s status=%s RSSI=%ddBm uptime=%ds heap=%dbytes",
                heartbeat.device_id,
                heartbeat.status,
                heartbeat.rssi,
                heartbeat.uptime_s,
                heartbeat.free_heap,
            )

        except json.JSONDecodeError as exc:
            logger.error("Failed to decode JSON from MQTT heartbeat payload: %s", exc)
        except Exception as exc:
            logger.error("Error processing MQTT heartbeat message: %s", exc)
