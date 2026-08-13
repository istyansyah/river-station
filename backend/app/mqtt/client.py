"""
app/mqtt/client.py

MQTT Client wrapper using paho-mqtt.
Subscribes to topics, connects to the broker, and uses asyncio to route
received messages thread-safely into the FastAPI async event loop.
"""

from __future__ import annotations

import asyncio
from typing import Optional
import paho.mqtt.client as mqtt

from app.config.settings import Settings
from app.logging.logger import get_logger
from app.mqtt.handler import MQTTMessageHandler

logger = get_logger(__name__)


class MQTTClient:
    """Manager for the MQTT connection and subscribers."""

    def __init__(
        self,
        settings: Settings,
        message_handler: MQTTMessageHandler,
        loop: Optional[asyncio.AbstractEventLoop] = None,
    ) -> None:
        self._settings = settings
        self._handler = message_handler
        self._loop = loop or asyncio.get_event_loop()
        self._connected = False

        # Initialize paho MQTT client
        # In paho-mqtt v2.0.0, CallbackAPIVersion must be declared.
        self._client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=self._settings.mqtt_client_id,
        )

        # Set up callbacks
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

    def start(self) -> None:
        """Start the background thread loop for MQTT processing."""
        logger.info(
            "Connecting to MQTT broker at %s:%d...",
            self._settings.mqtt_broker,
            self._settings.mqtt_port,
        )
        try:
            self._client.connect(
                self._settings.mqtt_broker,
                self._settings.mqtt_port,
                keepalive=60,
            )
            # Starts a background thread to handle network loop
            self._client.loop_start()
        except Exception as exc:
            logger.error("Failed to start MQTT client: %s", exc)

    def stop(self) -> None:
        """Stop the background thread loop and disconnect."""
        logger.info("Stopping MQTT client...")
        self._client.loop_stop()
        self._client.disconnect()

    @property
    def is_connected(self) -> bool:
        """Return the current connection status."""
        return self._connected

    # ── MQTT Client Callbacks ──────────────────────────────────

    def _on_connect(self, client, userdata, flags, reason_code, properties) -> None:
        """Callback triggered when the client connects to the broker."""
        if reason_code == 0:
            self._connected = True
            logger.info("Successfully connected to MQTT broker.")
            
            # Subscribe to the required weather and heartbeat topics
            topics = [
                (self._settings.mqtt_topic_weather, 1),
                (self._settings.mqtt_topic_heartbeat, 1),
            ]
            self._client.subscribe(topics)
            logger.info(
                "Subscribed to topics: %s and %s",
                self._settings.mqtt_topic_weather,
                self._settings.mqtt_topic_heartbeat,
            )
        else:
            self._connected = False
            logger.error("MQTT connection failed with reason code: %s", reason_code)

    def _on_disconnect(self, client, userdata, flags, reason_code, properties) -> None:
        """Callback triggered when connection is lost."""
        self._connected = False
        logger.warning("Disconnected from MQTT broker (reason_code=%s). Reconnecting...", reason_code)

    def _on_message(self, client, userdata, message: mqtt.MQTTMessage) -> None:
        """Callback triggered when a message is received from the broker.

        Dispatches the parsing and service logic to the main event loop
        thread-safely.
        """
        topic = message.topic
        payload = message.payload

        if topic == self._settings.mqtt_topic_weather:
            asyncio.run_coroutine_threadsafe(
                self._handler.handle_weather_message(topic, payload),
                self._loop,
            )
        elif topic == self._settings.mqtt_topic_heartbeat:
            asyncio.run_coroutine_threadsafe(
                self._handler.handle_heartbeat_message(topic, payload),
                self._loop,
            )
        else:
            logger.warning("Received message on unhandled topic: %s", topic)
