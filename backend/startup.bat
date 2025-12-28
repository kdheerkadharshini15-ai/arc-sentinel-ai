@echo off
REM ============================================================================
REM A.R.C SENTINEL - Windows Startup Script
REM Quick start for development and demo
REM ============================================================================

echo ==============================================
echo   A.R.C SENTINEL - SOC Platform Startup
echo ==============================================

REM Check Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

echo [OK] Python found

REM Navigate to backend directory
cd /d "%~dp0"

REM Check for virtual environment
if not exist "venv" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo [INFO] Installing dependencies...
pip install -r requirements.txt -q

REM Check for .env file
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo Please create .env with the following variables:
    echo   SUPABASE_URL=your_supabase_url
    echo   SUPABASE_KEY=your_anon_key
    echo   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    echo   GEMINI_API_KEY=your_gemini_api_key
    pause
    exit /b 1
)

echo [OK] Environment configured

echo.
echo [INFO] Starting A.R.C SENTINEL Backend...
echo ==============================================
echo.
echo   API Server:    http://localhost:8000
echo   API Docs:      http://localhost:8000/docs
echo   WebSocket:     ws://localhost:8000/ws
echo.
echo ==============================================
echo.

REM Run server
python server.py

pause
