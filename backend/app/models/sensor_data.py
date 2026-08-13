"""
app/models/sensor_data.py

Pydantic domain models for sensor data.
These are the internal representation used throughout the backend.
They are distinct from schemas (which are API input/output shapes).
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class WarningStatus(str, Enum):
    """Early warning classification levels."""

    NORMAL = "Normal"
    WASPADA = "Waspada"
    SIAGA = "Siaga"
    AWAS = "Awas"


class TourismStatus(str, Enum):
    """Tourism suitability classification."""

    SUITABLE = "Suitable"
    CAUTION = "Caution"
    NOT_RECOMMENDED = "Not Recommended"


class RainStatus(str, Enum):
    """Rain intensity classification from ADC reading."""

    NO_RAIN = "No Rain"
    LIGHT_RAIN = "Light Rain"
    RAIN = "Rain"


class SensorData(BaseModel):
    """
    Parsed and validated sensor data from an MQTT message.

    Field names match the MQTT payload specification exactly so that
    JSON parsing requires zero field renaming.
    """

    device_id: str = Field(..., description="ESP32 device identifier")
    location: str = Field(..., description="Physical location name")
    temperature: float = Field(..., ge=-40.0, le=85.0, description="°C from AHT10")
    humidity: float = Field(..., ge=0.0, le=100.0, description="% RH from AHT10")
    heat_index: float = Field(..., description="Apparent temperature °C")
    raw_distance: float = Field(..., ge=0.0, description="Raw sensor-to-water distance in cm")
    water_level: Optional[float] = Field(None, ge=0.0, description="Computed water-level increase in cm")
    wind_speed: float = Field(..., ge=0.0, description="km/h from anemometer")
    rain_raw: int = Field(..., ge=0, le=4095, description="ADC 12-bit rain reading")
    rain_status: Optional[str] = Field(None, description="Derived by backend if absent: 'No Rain'|'Light Rain'|'Rain'")
    rssi: int = Field(..., description="WiFi signal strength dBm")
    measurement_method: str = Field(default="relative", description="Water-level measurement method")
    timestamp: Optional[datetime] = Field(None, description="Optional device-side epoch or ISO timestamp")


class ProcessedSensorData(SensorData):
    """SensorData extended with backend-computed fields."""

    warning_status: WarningStatus = Field(
        ..., description="Early warning classification"
    )
    tourism_status: TourismStatus = Field(
        ..., description="Tourism suitability classification"
    )
    timestamp: datetime = Field(
        ...,
        description="Server or device-side UTC timestamp of ingestion",
    )


class HeartbeatData(BaseModel):
    """Parsed heartbeat message from ESP32."""

    device_id: str
    status: str
    rssi: int
    uptime_s: int
    free_heap: int
    fw_version: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
