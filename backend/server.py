"""
A.R.C SENTINEL - Server Entry Point
====================================
UVicorn server runner for the FastAPI application.

This file is the entry point for running the application.
All FastAPI routes and configuration are in app/main.py
"""

import uvicorn
from app.config import settings


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )


