"""
app/services/tourism_service.py

Tourism Classification Engine — classifies river area suitability
for tourism based on river warning status and environmental parameters.

Decision Matrix:
  River Status   | Environmental Condition | Tourism Status
  Siaga/Awas     | Any                     | Not Recommended
  Waspada        | Any                     | Caution
  Normal         | Rain / Hot / Windy      | Caution
  Normal         | All normal              | Suitable
"""

from __future__ import annotations

from app.config.settings import Settings
from app.logging.logger import get_logger
from app.models.sensor_data import SensorData, TourismStatus, WarningStatus

logger = get_logger(__name__)


class TourismService:
    """Stateless tourism suitability classification engine."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def classify(self, data: SensorData, warning_status: WarningStatus) -> TourismStatus:
        """Determine tourism suitability for given conditions.

        Args:
            data: Validated sensor reading.
            warning_status: Already-computed river warning status.

        Returns:
            TourismStatus enum value.
        """
        status = self._classify_from_warning(warning_status)
        if status == TourismStatus.SUITABLE:
            status = self._apply_environment_caution(data)

        logger.info(
            "Tourism classification | device=%s river=%s => %s",
            data.device_id,
            warning_status.value,
            status.value,
        )
        return status

    @staticmethod
    def _classify_from_warning(warning_status: WarningStatus) -> TourismStatus:
        """Map river warning level to base tourism status."""
        if warning_status in (WarningStatus.SIAGA, WarningStatus.AWAS):
            return TourismStatus.NOT_RECOMMENDED
        if warning_status == WarningStatus.WASPADA:
            return TourismStatus.CAUTION
        return TourismStatus.SUITABLE


    def _apply_environment_caution(self, data: SensorData) -> TourismStatus:
        """Set tourism to Caution when weather is unfavorable and river is Normal."""
        rain_str = (data.rain_status or "").upper()
        is_raining = rain_str in ("RAIN", "DRIZZLE") or data.rain_status in ("Rain", "Light Rain")
        is_hot = data.heat_index > self._settings.warning_heat_index_c

        is_windy = data.wind_speed >= self._settings.warning_wind_speed_kmh

        if is_raining or is_hot or is_windy:
            reasons = []
            if is_raining:
                reasons.append(f"rain={data.rain_status}")
            if is_hot:
                reasons.append(f"heat_index={data.heat_index:.1f}C")
            if is_windy:
                reasons.append(f"wind={data.wind_speed:.1f}km/h")
            logger.debug("Tourism caution: %s", ", ".join(reasons))
            return TourismStatus.CAUTION

        return TourismStatus.SUITABLE
