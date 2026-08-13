"""
app/routers/websocket.py

WebSocket Route handler for broadcasting realtime weather updates.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.core.dependencies import get_connection_manager, get_weather_repository
from app.logging.logger import get_logger
from app.repositories.weather_repository import WeatherRepository
from app.websocket.manager import ConnectionManager

logger = get_logger(__name__)

router = APIRouter(tags=["Websocket"])


@router.websocket("/ws/weather")
async def websocket_weather_endpoint(
    websocket: WebSocket,
    manager: ConnectionManager = Depends(get_connection_manager),
    repository: WeatherRepository = Depends(get_weather_repository),
) -> None:
    """Accept incoming WebSocket connection and register it for updates.

    Immediately pushes the latest cached sensor reading on connection,
    then keeps the socket open.
    """
    await manager.connect(websocket)

    # 1. Immediately push the latest available reading to the client on connect
    try:
        latest_data = repository.get_latest()
        await websocket.send_json(
            {
                "type": "welcome",
                "message": "Connected to River Station realtime stream",
                "data": latest_data.model_dump(mode="json"),
            }
        )
    except Exception as exc:
        logger.warning(
            "Could not send initial weather state to new websocket: %s", exc
        )

    # 2. Keep the socket open to listen for client disconnect or incoming pings
    try:
        while True:
            # We don't expect client messages, but reading is necessary to detect disconnects
            data = await websocket.receive_text()
            logger.debug("Received message from websocket client: %s", data)
            # Echo ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as exc:
        logger.error("Websocket handler encountered an error: %s", exc)
        await manager.disconnect(websocket)
