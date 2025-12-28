"""
A.R.C SENTINEL - Configuration Management
==========================================
Centralized configuration using pydantic-settings
"""

from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Supabase (Database + Auth)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    
    # Gemini AI
    GEMINI_API_KEY: str = ""
    
    # CORS
    CORS_ORIGINS: str = "*"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # Telemetry
    TELEMETRY_INTERVAL_SECONDS: int = 5
    
    # ML Configuration
    ML_ANOMALY_THRESHOLD: float = 0.75
    ML_CONTAMINATION: float = 0.1
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()

