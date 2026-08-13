from __future__ import annotations

from app.config.settings import Settings
from app.logging.logger import get_logger
from app.models.sensor_data import SensorData, WarningStatus

logger = get_logger(__name__)


class WarningService:
    """Classify river safety from relative water-level increase."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def classify(self, data: SensorData) -> WarningStatus:
        status = self._classify_water_level(data.water_level)

        logger.info(
            "River classification | device=%s water_increase=%.1fcm → %s",
            data.device_id,
            data.water_level,
            status.value,
        )
        return status

    def classify_tourism_conditions(self, data: SensorData) -> list[str]:
        conditions: list[str] = []
        rain = (data.rain_status or "").lower()
        if rain not in ("no rain", "dry", ""):
            conditions.append("Hujan")
        if data.heat_index > self._settings.warning_heat_index_c:
            conditions.append("Panas")
        if data.wind_speed >= self._settings.warning_wind_speed_kmh:
            conditions.append("Angin Kencang")
        return conditions

    def _classify_water_level(self, water_level: float) -> WarningStatus:
        if water_level >= self._settings.critical_water_level_increase_cm:
            return WarningStatus.AWAS
        if water_level >= self._settings.danger_water_level_increase_cm:
            return WarningStatus.SIAGA
        if water_level >= self._settings.warning_water_level_increase_cm:
            return WarningStatus.WASPADA
        return WarningStatus.NORMAL
