@echo off
REM ============================================================
REM NCAA Regulatory Intelligence Platform
REM One-Click Desktop Launcher (Windows)
REM ============================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Colors and formatting
cls
echo.
echo ============================================================
echo   NCAA REGULATORY INTELLIGENCE PLATFORM
echo   Desktop Version 1.0
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    cls
    echo.
    echo ERROR: Python 3.11+ is not installed!
    echo.
    echo SOLUTION:
    echo 1. Download Python from: https://www.python.org/downloads/
    echo 2. Run the installer
    echo 3. IMPORTANT: Check "Add Python to PATH" during installation
    echo 4. Restart your computer
    echo 5. Try running this file again
    echo.
    pause
    exit /b 1
)

echo [OK] Python is installed
echo.
echo Setting up application...
echo.

REM Navigate to ml-question-generator
cd ml-question-generator

REM Create virtual environment if it doesn't exist
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
    echo [OK] Virtual environment created
    echo.
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies (this may take 2-5 minutes first time)...
echo.
pip install -q -r requirements.txt

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo [OK] Dependencies installed
echo.
echo ============================================================
echo   Starting NCAA Regulatory Intelligence Platform
echo ============================================================
echo.
echo Opening http://127.0.0.1:5000 in your browser...
echo.
echo To stop the app: Press Ctrl+C in this window
echo.
timeout /t 3 /nobreak

start http://127.0.0.1:5000/

REM Start Flask
python api.py

pause
