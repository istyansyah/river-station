"""
app/database/influxdb.py

InfluxDB v2 client factory and connection management.
Provides a factory function that creates a configured client
from application Settings. Used by the DI layer in dependencies.py.
"""

from __future__ import annotations

from influxdb_client import InfluxDBClient
from influxdb_client.client.exceptions import InfluxDBError

from app.config.settings import Settings
from app.logging.logger import get_logger

logger = get_logger(__name__)


def create_influxdb_client(settings: Settings) -> InfluxDBClient:
    """Create and return a configured InfluxDB v2 client.

    Args:
        settings: Application settings containing InfluxDB credentials.

    Returns:
        Connected InfluxDBClient instance.

    Raises:
        DatabaseError: If the client cannot be created.
    """
    logger.info(
        "Connecting to InfluxDB at %s (org=%s, bucket=%s)",
        settings.influxdb_url,
        settings.influxdb_org,
        settings.influxdb_bucket,
    )

    client = InfluxDBClient(
        url=settings.influxdb_url,
        token=settings.influxdb_token,
        org=settings.influxdb_org,
    )

    return client


def verify_connection(client: InfluxDBClient) -> bool:
    """Verify InfluxDB is reachable by pinging the health endpoint.

    Args:
        client: InfluxDBClient to test.

    Returns:
        True if reachable, False otherwise.
    """
    try:
        health = client.health()
        if health.status == "pass":
            logger.info("InfluxDB health check: OK")
            return True
        logger.warning("InfluxDB health check: %s", health.status)
        return False
    except Exception as exc:
        logger.error("InfluxDB health check failed: %s", exc)
        return False
