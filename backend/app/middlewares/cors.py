"""
app/middlewares/cors.py

CORS Middleware configuration.
Allows React dashboards hosted on different domains/ports to access the REST endpoints.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import Settings


def setup_cors(app: FastAPI, settings: Settings) -> None:
    """Register CORSMiddleware onto the FastAPI app."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
