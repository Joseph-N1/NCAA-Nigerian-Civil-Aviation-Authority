@echo off
setlocal EnableExtensions

set "APP_PORT=5000"

echo.
echo Stopping NCAA Regulatory Intelligence Platform on port %APP_PORT%...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$conn = Get-NetTCPConnection -LocalPort %APP_PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force; Write-Host ('Stopped process ' + $conn.OwningProcess) } else { Write-Host 'No running app was found on this port.' }"

echo.
pause
