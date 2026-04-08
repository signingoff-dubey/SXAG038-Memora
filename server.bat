@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================
echo Memora Local AI Server (for Netlify/Cloud UI)
echo ========================================

REM Check if backend folder exists
if not exist "backend" (
    echo [ERROR] Backend folder not found
    pause
    exit /b 1
)

echo.
echo [1/3] Checking Dependencies...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.9+
    pause
    exit /b 1
)
echo    Python: OK

echo.
echo [2/3] Installing/Updating backend dependencies...
cd backend
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies
    cd ..
    pause
    exit /b 1
)
echo    Dependencies: OK
cd ..

echo.
echo [3/3] Starting Services...

REM Check if Ollama is installed
where ollama >nul 2>&1
if not errorlevel 1 (
    echo Starting Ollama...
    start "Ollama" cmd /k "ollama serve"
    timeout /t 3 /nobreak >nul
) else (
    echo [WARNING] Ollama not found in PATH.
)

echo Starting Backend Service (Port 8000)...
echo Press Ctrl+C in the backend window to stop.
echo.
echo ========================================
echo READY: You can now open your Netlify URL.
echo The UI will automatically detect this server.
echo ========================================
echo.

cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

pause
