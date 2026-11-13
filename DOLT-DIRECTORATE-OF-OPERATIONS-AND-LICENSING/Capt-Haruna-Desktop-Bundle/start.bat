@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title NCAA DOLT - Capt. Haruna Desktop PWA

echo ================================================================
echo   NCAA DOLT - Capt. Haruna License Management System (Desktop)
echo ================================================================
echo Working Directory: %CD%
echo.

REM 1. Check for genuine Python (testing execution, avoiding Microsoft Store placeholder)
set "PYTHON_EXE="
python -c "import sys" >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_EXE=python"
) else (
    py -c "import sys" >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_EXE=py"
    ) else (
        python3 -c "import sys" >nul 2>&1
        if not errorlevel 1 (
            set "PYTHON_EXE=python3"
        )
    )
)

REM 2. Check for Node.js
set "NODE_EXE="
node -v >nul 2>&1
if not errorlevel 1 (
    set "NODE_EXE=node"
) else if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
)

REM 3. If neither Python nor Node.js is available, open HTML directly
if not defined PYTHON_EXE if not defined NODE_EXE (
    echo [NOTICE] Neither Python nor Node.js detected on PATH.
    echo Launching application directly in default web browser...
    start "" "index.html"
    exit /b 0
)

REM 4. Select port (8000 -> 8080 -> 8081)
set "PORT=8000"
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Port 8000 is currently occupied. Switching to 8080...
    set "PORT=8080"
    netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul 2>&1
    if not errorlevel 1 (
        echo [INFO] Port 8080 is currently occupied. Switching to 8081...
        set "PORT=8081"
    )
)

echo.
echo ================================================================
if defined PYTHON_EXE (
    echo   Runtime Engine: Python (!PYTHON_EXE!)
) else (
    echo   Runtime Engine: Node.js (!NODE_EXE!)
)
echo   Local Address:  http://127.0.0.1:!PORT!/
echo ================================================================
echo.
echo Launching login page in your default browser...
echo Keep this terminal window open while using NCAA DOLT.
echo To shut down the server when finished, press Ctrl+C or close this window.
echo.

REM 5. Open the login page directly in default browser
start "" "http://127.0.0.1:!PORT!/"

REM 6. Start the web server
if defined PYTHON_EXE (
    !PYTHON_EXE! -m http.server !PORT! --bind 127.0.0.1
) else (
    "!NODE_EXE!" "%~dp0server.js" !PORT!
)

if errorlevel 1 (
    echo.
    echo [ERROR] The server stopped unexpectedly.
    pause
)
exit /b 0
