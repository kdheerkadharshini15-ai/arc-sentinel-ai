"""
A.R.C SENTINEL - Server Entry Point
====================================
UVicorn server runner for the FastAPI application.

This file is the entry point for running the application.
All FastAPI routes and configuration are in app/main.py
"""

import os
import uvicorn
from app.config import settings


if __name__ == "__main__":
    # Get port from environment variable (for Render) or use settings
    port = int(os.environ.get("PORT", settings.PORT))
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=port,
        reload=settings.DEBUG
    )


