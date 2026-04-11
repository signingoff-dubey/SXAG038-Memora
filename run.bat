@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================
echo Starting Cortex Application
echo ========================================

REM Check if backend folder exists
if not exist "backend" (
    echo [ERROR] Backend folder not found
    pause
    exit /b 1
)

REM Check if frontend folder exists
if not exist "frontend" (
    echo [ERROR] Frontend folder not found
    pause
    exit /b 1
)

echo.
echo [1/5] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.9+
    pause
    exit /b 1
)
echo    Python: OK

echo.
echo [2/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)
echo    Node.js: OK

echo.
echo [3/5] Installing/Updating backend dependencies (v5.0)...
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
echo [4/5] Installing/Updating frontend dependencies (v5.0)...
cd frontend
REM Always run npm install --silent to ensure new v5.0 libs (recharts, etc) are present
call npm install --silent
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
echo    Dependencies: OK
cd ..

echo.
echo [5/5] Starting services...

REM Check if Ollama is installed
where ollama >nul 2>&1
if not errorlevel 1 (
    echo Starting Ollama...
    start "Ollama" cmd /k "ollama serve"
    timeout /t 3 /nobreak >nul
) else (
    echo [WARNING] Ollama not found in PATH. Skipping...
    echo         Install from: https://ollama.ai
)

echo Starting Backend...
start "Cortex Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo Starting Frontend...
netstat -ano | findstr :5173 >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 5173 is already in use! 
    echo           Vite will likely start on 5174 or higher.
    echo           Please check the 'Cortex Frontend' window for the correct URL.
    timeout /t 5
)
start "Cortex Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Opening browsers...
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"
start "" "http://127.0.0.1:8000/docs"

echo.
echo ========================================
echo All services started!
echo.
echo   Ollama:   http://localhost:11434
echo   Backend:  http://127.0.0.1:8000 (Docs: /docs)
echo   Frontend: http://localhost:5173
echo.
echo Press any key to close this window...
echo ========================================
pause >nul