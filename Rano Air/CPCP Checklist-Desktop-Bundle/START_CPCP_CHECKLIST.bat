@echo off
title Rano Air CPCP Tracker Launcher
echo Checking for Python to run secure local origin...
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Python detected! Starting local server on http://localhost:8081/
    start "" http://localhost:8081/index.html
    python -m http.server 8081
) else (
    echo Python not found. Launching index.html directly...
    start "" index.html
)
