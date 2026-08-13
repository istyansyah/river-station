"""
main.py

Main entry point for the FastAPI application runner.
To start manually:
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import uvicorn
from app.main import create_app

app = create_app()

if __name__ == "__main__":
    # Start web server locally if called directly
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
