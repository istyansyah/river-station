"""
app/repositories/weather_repository.py

InfluxDB data access layer — implements the Repository Pattern.
All InfluxDB read/write operations are encapsulated here.
Services never import influxdb-client directly.

Design:
  - write()   → stores one ProcessedSensorData point
  - latest()  → returns the most recent reading (pivot query)
  - history() → paginated time-range query
  - chart()   → aggregated time-series for a specific field
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import List, Optional

from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

from app.config.settings import Settings
from app.core.exceptions import DatabaseError, SensorDataNotFoundError
from app.logging.logger import get_logger
from app.models.sensor_data import ProcessedSensorData, WarningStatus, TourismStatus
from app.schemas.weather import (
    ChartDataPoint,
    ChartResponse,
    HistoryResponse,
    WeatherResponse,
)

logger = get_logger(__name__)

# ── InfluxDB Measurement Name ──────────────────────────────────
MEASUREMENT = "weather"


class WeatherRepository:
    """InfluxDB read/write operations for weather sensor data."""

    def __init__(self, client: InfluxDBClient, settings: Settings) -> None:
        self._client = client
        self._settings = settings
        self._bucket = settings.influxdb_bucket
        self._org = settings.influxdb_org

    # ─────────────────────────────────────────────────────────
    # Write
    # ─────────────────────────────────────────────────────────

    def write(self, data: ProcessedSensorData) -> None:
        """Persist one sensor data point to InfluxDB.

        Args:
            data: Fully processed sensor data with warning status.

        Raises:
            DatabaseError: On InfluxDB write failure.
        """
        try:
            point = (
                Point(MEASUREMENT)
                .tag("device_id", data.device_id)
                .tag("location", data.location)
                .tag("rain_status", data.rain_status or "")
                .tag("warning_status", data.warning_status.value)
                .tag("tourism_status", data.tourism_status.value)
                .field("temperature", float(data.temperature))
                .field("humidity", float(data.humidity))
                .field("heat_index", float(data.heat_index))
                .field("water_level", float(data.water_level))
                .field("wind_speed", float(data.wind_speed))
                .field("rain_raw", int(data.rain_raw))
                .field("rssi", int(data.rssi))
                .time(data.timestamp, WritePrecision.NS)
            )
            if data.raw_distance is not None:
                point.field("raw_distance", float(data.raw_distance))

            write_api = self._client.write_api(write_options=SYNCHRONOUS)
            write_api.write(bucket=self._bucket, record=point)
            logger.debug("Written point for device=%s", data.device_id)

        except Exception as exc:
            logger.error("InfluxDB write failed: %s", exc)
            raise DatabaseError("Failed to write sensor data", str(exc)) from exc

    # ─────────────────────────────────────────────────────────
    # Latest Reading
    # ─────────────────────────────────────────────────────────

    def get_latest(self, device_id: Optional[str] = None) -> WeatherResponse:
        """Return the most recent sensor reading.

        Args:
            device_id: Optional filter by device identifier.

        Returns:
            WeatherResponse with the latest data.

        Raises:
            SensorDataNotFoundError: If no data exists.
            DatabaseError: On query failure.
        """
        device_filter = (
            f'|> filter(fn: (r) => r.device_id == "{device_id}")'
            if device_id
            else ""
        )

        query = f"""
from(bucket: "{self._bucket}")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "{MEASUREMENT}")
  {device_filter}
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 1)
"""
        return self._execute_single_query(query)

    # ─────────────────────────────────────────────────────────
    # History
    # ─────────────────────────────────────────────────────────

    def get_history(
        self,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50,
        device_id: Optional[str] = None,
        warning_status: Optional[WarningStatus] = None,
    ) -> HistoryResponse:
        """Return paginated historical sensor data.

        Args:
            start: Range start (default: -24h).
            end:   Range end (default: now).
            page:  Page number (1-indexed).
            page_size: Records per page.
            device_id: Optional device filter.

        Returns:
            HistoryResponse with data and pagination info.
        """
        start_str = (
            start.isoformat() if start else "-24h"
        )
        end_str = (
            end.isoformat() if end else "now()"
        )
        device_filter = (
            f'|> filter(fn: (r) => r.device_id == "{device_id}")'
            if device_id
            else ""
        )
        warning_filter = (
            f'|> filter(fn: (r) => r.warning_status == "{warning_status.value}")'
            if warning_status
            else ""
        )
        offset = (page - 1) * page_size

        # Count query for total records
        count_query = f"""
from(bucket: "{self._bucket}")
  |> range(start: {start_str}, stop: {end_str})
  |> filter(fn: (r) => r._measurement == "{MEASUREMENT}" and r._field == "temperature")
   {device_filter}
   {warning_filter}
   |> group(columns: [])
   |> count()

"""
        # Data query with pagination
        data_query = f"""
from(bucket: "{self._bucket}")
  |> range(start: {start_str}, stop: {end_str})
  |> filter(fn: (r) => r._measurement == "{MEASUREMENT}")
   {device_filter}
   {warning_filter}
   |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
   |> group(columns: [])
   |> sort(columns: ["_time"], desc: true)
   |> limit(n: {page_size}, offset: {offset})

"""
        try:
            total = self._count_query(count_query)
            rows = self._execute_list_query(data_query)
            pages = math.ceil(total / page_size) if total > 0 else 1

            return HistoryResponse(
                data=rows,
                total=total,
                page=page,
                page_size=page_size,
                pages=pages,
            )
        except Exception as exc:
            logger.error("History query failed: %s", exc)
            raise DatabaseError("Failed to query history", str(exc)) from exc

    # ─────────────────────────────────────────────────────────
    # Chart Data
    # ─────────────────────────────────────────────────────────

    def get_chart(
        self,
        field: str,
        start: str = "-1h",
        window: str = "1m",
    ) -> ChartResponse:
        """Return aggregated time-series data for charting.

        Args:
            field:  Field name (e.g., "temperature", "water_level").
            start:  Relative start (e.g., "-1h", "-24h").
            window: Aggregation window (e.g., "1m", "5m").

        Returns:
            ChartResponse with evenly-spaced data points.
        """
        allowed_fields = {
            "temperature", "humidity", "heat_index",
            "water_level", "wind_speed",
        }
        if field not in allowed_fields:
            raise ValueError(f"Invalid field '{field}'. Allowed: {allowed_fields}")

        query = f"""
from(bucket: "{self._bucket}")
  |> range(start: {start})
  |> filter(fn: (r) => r._measurement == "{MEASUREMENT}" and r._field == "{field}")
  |> aggregateWindow(every: {window}, fn: mean, createEmpty: false)
  |> yield(name: "mean")
"""
        try:
            query_api = self._client.query_api()
            tables = query_api.query(query, org=self._org)

            points: List[ChartDataPoint] = []
            for table in tables:
                for record in table.records:
                    point = ChartDataPoint(
                        timestamp=record.get_time(),
                        **{field: record.get_value()},
                    )
                    points.append(point)

            return ChartResponse(
                data=points,
                field=field,
                aggregation_window=window,
            )
        except Exception as exc:
            logger.error("Chart query failed for field=%s: %s", field, exc)
            raise DatabaseError("Failed to query chart data", str(exc)) from exc

    # ─────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────

    def _execute_single_query(self, query: str) -> WeatherResponse:
        """Execute a Flux query and return a single WeatherResponse."""
        try:
            query_api = self._client.query_api()
            tables = query_api.query(query, org=self._org)

            for table in tables:
                for record in table.records:
                    return self._record_to_weather_response(record)

            raise SensorDataNotFoundError("No sensor data found in the last hour")

        except SensorDataNotFoundError:
            raise
        except Exception as exc:
            logger.error("Single query failed: %s", exc)
            raise DatabaseError("Failed to query latest data", str(exc)) from exc

    def _execute_list_query(self, query: str) -> List[WeatherResponse]:
        """Execute a Flux query and return a list of WeatherResponses."""
        query_api = self._client.query_api()
        tables = query_api.query(query, org=self._org)

        results: List[WeatherResponse] = []
        for table in tables:
            for record in table.records:
                results.append(self._record_to_weather_response(record))
        return results

    def _count_query(self, query: str) -> int:
        """Execute a count query and return the integer result."""
        try:
            query_api = self._client.query_api()
            tables = query_api.query(query, org=self._org)
            for table in tables:
                for record in table.records:
                    return int(record.get_value() or 0)
            return 0
        except Exception:
            return 0

    @staticmethod
    def _record_to_weather_response(record: object) -> WeatherResponse:
        """Map a FluxRecord to a WeatherResponse schema."""
        values = record.values  # type: ignore[attr-defined]

        # Safely resolve warning status
        warning_raw = values.get("warning_status")
        try:
            warning_status = WarningStatus(warning_raw)
        except ValueError:
            warning_status = WarningStatus.NORMAL

        # Safely resolve tourism status
        tourism_raw = values.get("tourism_status")
        try:
            tourism_status = TourismStatus(tourism_raw)
        except ValueError:
            tourism_status = TourismStatus.SUITABLE

        return WeatherResponse(
            device_id=values.get("device_id", ""),
            location=values.get("location", ""),
            temperature=float(values.get("temperature", 0.0)),
            humidity=float(values.get("humidity", 0.0)),
            heat_index=float(values.get("heat_index", 0.0)),
            water_level=float(values.get("water_level", 0.0)),
            raw_distance=(
                float(values["raw_distance"])
                if values.get("raw_distance") is not None
                else None
            ),
            wind_speed=float(values.get("wind_speed", 0.0)),
            rain_raw=int(values.get("rain_raw", 0)),
            rain_status=str(values.get("rain_status", "")),
            rssi=int(values.get("rssi", 0)),
            warning_status=warning_status,
            tourism_status=tourism_status,
            timestamp=record.get_time(),  # type: ignore[attr-defined]
        )


