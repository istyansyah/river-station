"""
app/logging/logger.py

Structured logging setup for the River Station backend.
Configures uvicorn-compatible log formatting with timestamps,
levels, and component tags for easy Serial-Monitor-style filtering.
"""

import logging
import sys
from typing import Any


def setup_logging(debug: bool = False) -> None:
    """Configure root logger for the application."""
    level = logging.DEBUG if debug else logging.INFO

    formatter = logging.Formatter(
        fmt="[%(asctime)s][%(levelname)-8s][%(name)-20s] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)

    # Remove existing handlers to avoid duplicate output
    root.handlers.clear()
    root.addHandler(handler)

    # Silence noisy third-party loggers
    logging.getLogger("paho.mqtt").setLevel(logging.WARNING)
    logging.getLogger("influxdb_client").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger for a specific module.

    Usage:
        logger = get_logger(__name__)
        logger.info("Message")

    Args:
        name: Module name (typically __name__).

    Returns:
        Configured Logger instance.
    """
    return logging.getLogger(name)
