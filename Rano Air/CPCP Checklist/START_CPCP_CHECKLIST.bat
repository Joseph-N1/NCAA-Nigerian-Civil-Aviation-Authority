@echo off
title Rano Air CPCP Tracker Launcher
echo ====================================================
echo Starting Rano Air CPCP Progress Tracker...
echo ====================================================

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Node.js detected! Starting local server on http://localhost:8081/
    start "Rano Air CPCP Server" node server.js
    timeout /t 2 /nobreak >nul
    start "" http://localhost:8081/
    exit /b
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Python detected! Starting local server on http://localhost:8081/
    start "Rano Air CPCP Server" python -m http.server 8081
    timeout /t 2 /nobreak >nul
    start "" http://localhost:8081/
    exit /b
)

echo [WARNING] Neither Node.js nor Python detected. Opening index.html directly...
start "" index.html
