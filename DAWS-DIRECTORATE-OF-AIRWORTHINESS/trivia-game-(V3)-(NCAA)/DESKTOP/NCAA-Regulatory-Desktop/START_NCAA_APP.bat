@echo off
setlocal EnableExtensions

set "APP_ROOT=%~dp0"
set "BACKEND_DIR=%APP_ROOT%ml-question-generator"
set "VENV_DIR=%APP_ROOT%.venv-runtime"
set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"
set "WHEELHOUSE=%APP_ROOT%wheelhouse"
set "REQ_LOCK=%APP_ROOT%requirements-lock.txt"
set "APP_HOST=127.0.0.1"
set "APP_PORT=5000"
set "APP_URL=http://%APP_HOST%:%APP_PORT%/"
set "RUNTIME_LOG_DIR=%APP_ROOT%runtime-logs"

set "HF_HOME=%APP_ROOT%hf_cache"
set "HF_HUB_CACHE=%APP_ROOT%hf_cache\hub"
set "TRANSFORMERS_CACHE=%APP_ROOT%hf_cache\hub"
set "HF_HUB_OFFLINE=1"
set "TRANSFORMERS_OFFLINE=1"
set "FLASK_HOST=%APP_HOST%"
set "FLASK_PORT=%APP_PORT%"
set "FLASK_DEBUG=0"

cls
echo.
echo ============================================================
echo   NCAA REGULATORY INTELLIGENCE PLATFORM
echo   Offline Desktop Launcher
echo ============================================================
echo.

if exist "%BACKEND_DIR%\api.py" goto BackendFound
echo ERROR: Backend file missing:
echo   "%BACKEND_DIR%\api.py"
echo.
pause
exit /b 1
:BackendFound

if exist "%REQ_LOCK%" goto RequirementsFound
echo ERROR: Missing requirements-lock.txt.
echo.
pause
exit /b 1
:RequirementsFound

if exist "%WHEELHOUSE%\*.whl" goto WheelhouseFound
echo ERROR: The offline wheelhouse is empty or missing.
echo Expected Python wheels in:
echo   "%WHEELHOUSE%"
echo.
pause
exit /b 1
:WheelhouseFound

if exist "%HF_HUB_CACHE%\models--sentence-transformers--all-MiniLM-L6-v2\refs\main" goto ModelFound
echo ERROR: The offline MiniLM model cache is missing.
echo Expected model cache in:
echo   "%HF_HUB_CACHE%"
echo.
pause
exit /b 1
:ModelFound

if not exist "%RUNTIME_LOG_DIR%" mkdir "%RUNTIME_LOG_DIR%" >nul 2>nul

call :FindPython312
if errorlevel 1 (
    echo ERROR: Python 3.12 x64 was not found.
    echo.
    echo Install Python 3.12 for Windows x64 from python.org.
    echo During install, enable "Add python.exe to PATH".
    echo Then close this window and double-click START_NCAA_APP.bat again.
    echo.
    pause
    exit /b 1
)

echo [OK] Python 3.12 x64 found:
echo      %BASE_PYTHON%
echo.

if exist "%PYTHON_EXE%" goto RuntimeFound
echo Creating local runtime environment...
"%BASE_PYTHON%" -m venv "%VENV_DIR%"
if errorlevel 1 goto :SetupFailed
:RuntimeFound

echo Installing or verifying offline packages...
"%PYTHON_EXE%" -m pip install --no-index --find-links "%WHEELHOUSE%" -r "%REQ_LOCK%"
if errorlevel 1 goto :SetupFailed

echo Checking runtime imports...
"%PYTHON_EXE%" -c "import flask, flask_cors, fitz, numpy, sklearn, sentence_transformers, faiss; print('imports ok')" >nul 2>nul
if errorlevel 1 goto :SetupFailed

call :IsHealthy
if not errorlevel 1 (
    echo App is already running at %APP_URL%
    call :OpenBrowser
    exit /b 0
)

echo Starting local backend...
set "NCAA_PYTHON_EXE=%PYTHON_EXE%"
set "NCAA_BACKEND_DIR=%BACKEND_DIR%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath $env:NCAA_PYTHON_EXE -ArgumentList @('api.py') -WorkingDirectory $env:NCAA_BACKEND_DIR -WindowStyle Hidden"
if errorlevel 1 (
    echo ERROR: Could not start the backend process.
    echo.
    pause
    exit /b 1
)

echo Waiting for the app to become ready...
for /L %%I in (1,1,90) do (
    call :IsHealthy
    if not errorlevel 1 (
        echo.
        echo [OK] App is ready.
        echo Opening %APP_URL%
        call :OpenBrowser
        exit /b 0
    )
    timeout /t 1 /nobreak >nul
)

echo.
echo ERROR: The app did not become ready on %APP_URL%.
echo If another program is using port %APP_PORT%, close it or run STOP_NCAA_APP.bat.
echo.
pause
exit /b 1

:FindPython312
set "BASE_PYTHON="
set "PYTHON_PROBE=%TEMP%\ncaa_python_312.txt"

py -3.12 -c "import struct, sys; assert sys.version_info[:2] == (3, 12) and struct.calcsize('P') == 8; print(sys.executable)" > "%PYTHON_PROBE%" 2>nul
if not errorlevel 1 (
    set /p BASE_PYTHON=<"%PYTHON_PROBE%"
    del "%PYTHON_PROBE%" >nul 2>nul
    exit /b 0
)

python -c "import struct, sys; assert sys.version_info[:2] == (3, 12) and struct.calcsize('P') == 8; print(sys.executable)" > "%PYTHON_PROBE%" 2>nul
if not errorlevel 1 (
    set /p BASE_PYTHON=<"%PYTHON_PROBE%"
    del "%PYTHON_PROBE%" >nul 2>nul
    exit /b 0
)

del "%PYTHON_PROBE%" >nul 2>nul
exit /b 1

:IsHealthy
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri '%APP_URL%health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200 -and $r.Content -match 'ok') { exit 0 } } catch { }; exit 1" >nul 2>nul
exit /b %ERRORLEVEL%

:OpenBrowser
if "%NCAA_SKIP_BROWSER%"=="1" exit /b 0
start "" "%APP_URL%"
exit /b 0

:SetupFailed
echo.
echo ERROR: Offline setup failed.
echo Check that Python 3.12 x64 is installed and that wheelhouse contains all wheels.
echo.
pause
exit /b 1
