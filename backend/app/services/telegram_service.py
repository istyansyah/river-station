"""
app/services/telegram_service.py

Telegram Bot notification service.
Sends alert messages via the Telegram Bot API using httpx (async HTTP).
Sends on Waspada, Siaga, or Awas status — never on Normal.

Message format matches specification:
  🚨 PERINGATAN - RIVER STATION
  📍 Location   : Lubuk Minturun
  🕐 Time        : 2024-01-15 14:30:22 WIB
  ⚠️ Status      : WARNING
  💧 Water Level : 80.0 cm
  🌡️ Temperature : 32.5°C
  💦 Humidity    : 85%
  🌤️ Heat Index  : 38.2°C
  💨 Wind Speed  : 12.5 m/s
  🌧️ Rain Status : Rain
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta

import httpx

from app.config.settings import Settings
from app.core.exceptions import TelegramError
from app.logging.logger import get_logger
from app.models.sensor_data import ProcessedSensorData, WarningStatus

logger = get_logger(__name__)

# UTC+7 for WIB timezone display
WIB = timezone(timedelta(hours=7))

# Telegram Bot API base URL
TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"


class TelegramService:
    """Async Telegram Bot notification sender."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def notify(self, data: ProcessedSensorData) -> None:
        """Send Telegram alerts only for Siaga and Awas river status.

        Normal and Waspada statuses are silently ignored.

        Args:
            data: ProcessedSensorData with warning_status populated.
        """
        if data.warning_status not in (WarningStatus.SIAGA, WarningStatus.AWAS):
            return

        if not self._settings.telegram_enabled:
            logger.debug("Telegram disabled — skipping notification.")
            return

        if not self._settings.telegram_bot_token or not self._settings.telegram_chat_id:
            logger.warning("Telegram credentials not configured.")
            return

        message = self._format_message(data)

        try:
            url = TELEGRAM_API.format(token=self._settings.telegram_bot_token)
            payload = {
                "chat_id": self._settings.telegram_chat_id,
                "text": message,
                "parse_mode": "HTML",
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()

            logger.info(
                "Telegram notification sent | status=%s device=%s",
                data.warning_status.value,
                data.device_id,
            )

        except httpx.HTTPStatusError as exc:
            logger.error("Telegram API error: %s — %s", exc.response.status_code, exc.response.text)
            raise TelegramError("Telegram API returned error", str(exc)) from exc
        except Exception as exc:
            logger.error("Telegram send failed: %s", exc)
            raise TelegramError("Failed to send Telegram message", str(exc)) from exc

    def _format_message(self, data: ProcessedSensorData) -> str:
        """Build an actionable alert message from sensor data."""
        is_awas = data.warning_status == WarningStatus.AWAS
        status_icon = "🔴" if is_awas else "🟠"
        status_text = data.warning_status.value.upper()
        water_threshold = 90 if is_awas else 60
        tourism_text = data.tourism_status.value.upper()

        conditions = ["Muka air tinggi"]
        if data.rain_status and data.rain_status.lower() not in ("no rain", "dry"):
            conditions.append(f"Hujan ({data.rain_status})")
        if data.heat_index > self._settings.warning_heat_index_c:
            conditions.append("Panas")
        if data.wind_speed >= self._settings.warning_wind_speed_kmh:
            conditions.append("Angin kencang")

        action = (
            "Tutup lokasi wisata dan evakuasi pengunjung ke tempat aman."
            if is_awas
            else "Hentikan aktivitas air dan siapkan evakuasi pengunjung."
        )
        local_time = data.timestamp.astimezone(WIB)
        time_str = local_time.strftime("%Y-%m-%d %H:%M:%S WIB")

        return (
            f"<b>{status_icon} PERINGATAN {status_text} — RIVER STATION</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📍 <b>Lokasi</b> : {data.location}\n"
            f"🕐 <b>Waktu</b> : {time_str}\n\n"
            f"🌊 <b>STATUS SUNGAI: {status_text}</b>\n"
            f"💧 Kenaikan muka air: <b>{data.water_level:.1f} cm</b>\n"
            f"📏 Ambang {status_text}: {water_threshold} cm\n"
            f"🏊 Kelayakan wisata: <b>{tourism_text}</b>\n\n"
            f"⚠️ <b>KONDISI TERDETEKSI</b>\n"
            + "".join(f"• {condition}\n" for condition in conditions)
            + "\n"
            f"📋 <b>TINDAKAN</b>\n{action}\n\n"
            f"🌡️ Suhu: {data.temperature:.1f} °C\n"
            f"🌤️ Heat Index: {data.heat_index:.1f} °C\n"
            f"💦 Kelembapan: {data.humidity:.1f} %\n"
            f"💨 Kecepatan angin: {data.wind_speed:.1f} km/jam\n"
            f"🌧️ Hujan: {data.rain_status}\n"
            f"📶 Sinyal: {data.rssi} dBm\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"<i>Device: {data.device_id}</i>"
        )
