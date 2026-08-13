"""
app/schemas/weather.py

API input/output schemas (Pydantic models for request/response bodies).
Distinct from domain models — these define the public API contract.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.sensor_data import WarningStatus, TourismStatus


class WeatherResponse(BaseModel):
    """Single weather data point returned by the API."""

    device_id: str
    location: str
    temperature: float
    humidity: float
    heat_index: float
    water_level: float
    raw_distance: Optional[float] = None
    wind_speed: float
    rain_raw: int
    rain_status: Optional[str] = None
    rssi: int
    warning_status: WarningStatus
    tourism_status: TourismStatus
    timestamp: datetime

    model_config = {"from_attributes": True}


class HistoryQueryParams(BaseModel):
    """Query parameters for the history endpoint."""

    start: Optional[datetime] = Field(
        None, description="Start datetime (ISO 8601). Defaults to -24h."
    )
    end: Optional[datetime] = Field(
        None, description="End datetime (ISO 8601). Defaults to now."
    )
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(50, ge=1, le=500, description="Records per page")
    device_id: Optional[str] = Field(None, description="Filter by device ID")


class HistoryResponse(BaseModel):
    """Paginated history response."""

    data: List[WeatherResponse]
    total: int
    page: int
    page_size: int
    pages: int


class ChartDataPoint(BaseModel):
    """Single data point for time-series charts."""

    timestamp: datetime
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    heat_index: Optional[float] = None
    water_level: Optional[float] = None
    raw_distance: Optional[float] = None
    wind_speed: Optional[float] = None


class ChartResponse(BaseModel):
    """Chart data response for the dashboard."""

    data: List[ChartDataPoint]
    field: str
    aggregation_window: str


class SystemStatusResponse(BaseModel):
    """System component status response."""

    backend: str = "online"
    mqtt_connected: bool
    influxdb_connected: bool
    telegram_enabled: bool
    last_data_received: Optional[datetime]
    device_id: Optional[str]
    device_online: bool
    uptime_seconds: float


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
