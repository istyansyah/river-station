"""
app/routers/weather.py

REST API Routers for weather data queries (latest reading, paginated history, and chart time-series).
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.core.dependencies import get_weather_repository
from app.core.exceptions import SensorDataNotFoundError
from app.repositories.weather_repository import WeatherRepository
from app.models.sensor_data import WarningStatus
from app.schemas.weather import ChartResponse, HistoryResponse, WeatherResponse

router = APIRouter(prefix="/api/weather", tags=["Weather"])


@router.get("/latest", response_model=WeatherResponse)
def get_latest_weather(
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    repository: WeatherRepository = Depends(get_weather_repository),
) -> WeatherResponse:
    """Retrieve the most recent weather record from the last hour."""
    try:
        return repository.get_latest(device_id=device_id)
    except SensorDataNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch latest weather: {exc}",
        ) from exc


@router.get("/history", response_model=HistoryResponse)
def get_weather_history(
    start: Optional[datetime] = Query(None, description="Start time (UTC ISO 8601)"),
    end: Optional[datetime] = Query(None, description="End time (UTC ISO 8601)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Records per page"),
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    warning_status: Optional[WarningStatus] = Query(None, description="Filter by warning status"),
    repository: WeatherRepository = Depends(get_weather_repository),
) -> HistoryResponse:
    """Retrieve a paginated list of historical weather records."""
    try:
        return repository.get_history(
            start=start,
            end=end,
            page=page,
            page_size=page_size,
            device_id=device_id,
            warning_status=warning_status,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch weather history: {exc}",
        ) from exc


@router.get("/chart", response_model=ChartResponse)
def get_weather_chart(
    field: str = Query(
        ...,
        description="Field to fetch: 'temperature'|'humidity'|'heat_index'|'water_level'|'wind_speed'",
    ),
    start: str = Query("-1h", description="Relative starting range (e.g. -1h, -24h, -7d)"),
    window: str = Query("1m", description="Aggregation window size (e.g. 10s, 1m, 5m, 1h)"),
    repository: WeatherRepository = Depends(get_weather_repository),
) -> ChartResponse:
    """Retrieve aggregated mean time-series data for rendering charts."""
    try:
        return repository.get_chart(field=field, start=start, window=window)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch chart data: {exc}",
        ) from exc
