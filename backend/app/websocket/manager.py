"""
app/websocket/manager.py

WebSocket connection manager for handling active connections,
broadcasting realtime updates to all connected dashboards, and checking health.
"""

from __future__ import annotations

import asyncio
from typing import List, Set
from fastapi import WebSocket
from app.logging.logger import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections for realtime broadcasts."""

    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept a new WebSocket connection and track it."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info("WebSocket client connected. Total connections: %d", len(self.active_connections))

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a disconnected WebSocket from tracking."""
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info("WebSocket client disconnected. Total connections: %d", len(self.active_connections))

    async def broadcast(self, message: dict) -> None:
        """Send a JSON message to all active WebSocket clients.

        Handles broken connections gracefully.
        """
        if not self.active_connections:
            return

        logger.debug("Broadcasting message to %d clients", len(self.active_connections))
        
        async with self._lock:
            # Create a copy to prevent modification during iteration
            connections = list(self.active_connections)

        failed_connections: List[WebSocket] = []

        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as exc:
                logger.warning("Failed to send message to a WebSocket client: %s", exc)
                failed_connections.append(connection)

        if failed_connections:
            async with self._lock:
                for connection in failed_connections:
                    self.active_connections.discard(connection)
            logger.info("Cleaned up %d stale WebSocket connections", len(failed_connections))
