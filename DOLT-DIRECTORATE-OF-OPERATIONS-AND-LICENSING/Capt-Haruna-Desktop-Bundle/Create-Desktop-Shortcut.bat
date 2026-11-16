@echo off
setlocal
cd /d "%~dp0"
title NCAA DOLT - Create Desktop Shortcut

echo ================================================================
echo   NCAA DOLT - Desktop Shortcut Installer (Option B)
echo ================================================================
echo Folder Location: %CD%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$dir = (Get-Location).Path;" ^
  "$icoPath = Join-Path $dir 'app.ico';" ^
  "$b64 = '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';" ^
  "Write-Host '[1/2] Generating application icon (Option B - Cyan Radar & Jet)...' -ForegroundColor Cyan;" ^
  "[System.IO.File]::WriteAllBytes($icoPath, [System.Convert]::FromBase64String($b64));" ^
  "Write-Host '[2/2] Creating Desktop Shortcut...' -ForegroundColor Cyan;" ^
  "$desktop = [Environment]::GetFolderPath('Desktop');" ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$sc = $ws.CreateShortcut((Join-Path $desktop 'DOLT License Manager.lnk'));" ^
  "$sc.TargetPath = Join-Path $dir 'start.bat';" ^
  "$sc.WorkingDirectory = $dir;" ^
  "$sc.IconLocation = $icoPath + ',0';" ^
  "$sc.Description = 'NCAA DOLT Aviation License Management System — Capt. Haruna';" ^
  "$sc.Save();" ^
  "Write-Host '';" ^
  "Write-Host '================================================================' -ForegroundColor Green;" ^
  "Write-Host '  [SUCCESS] Desktop Shortcut created successfully!' -ForegroundColor Green;" ^
  "Write-Host '  Icon Name: DOLT License Manager' -ForegroundColor Green;" ^
  "Write-Host '  Target:    ' (Join-Path $dir 'start.bat') -ForegroundColor Green;" ^
  "Write-Host '================================================================' -ForegroundColor Green;"

echo.
pause
