"""
app/core/exceptions.py

Custom exception hierarchy for the River Station backend.
All domain exceptions derive from RiverStationError so callers
can catch broadly or specifically.
"""

from __future__ import annotations


class RiverStationError(Exception):
    """Base exception for all River Station domain errors."""

    def __init__(self, message: str, detail: str | None = None) -> None:
        self.message = message
        self.detail = detail
        super().__init__(message)


class DatabaseError(RiverStationError):
    """Raised when InfluxDB operations fail."""


class MQTTError(RiverStationError):
    """Raised on MQTT connection or publish failures."""


class TelegramError(RiverStationError):
    """Raised when Telegram Bot API calls fail."""


class PayloadParseError(RiverStationError):
    """Raised when incoming MQTT payload cannot be parsed."""


class SensorDataNotFoundError(RiverStationError):
    """Raised when a query returns no sensor data."""
