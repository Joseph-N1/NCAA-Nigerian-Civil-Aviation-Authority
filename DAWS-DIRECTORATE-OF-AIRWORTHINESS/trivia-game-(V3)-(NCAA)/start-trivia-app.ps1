$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Join-Path $projectRoot "ml-question-generator"
$venvRoot = Join-Path $backendRoot ".venv"
$pythonExe = Join-Path $venvRoot "Scripts\python.exe"
$venvSitePackages = Join-Path $venvRoot "Lib\site-packages"
$backendPort = 5000
$backendUrl = "http://127.0.0.1:$backendPort"
$frontendUrl = "$backendUrl/"

function Test-Url {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Get-UrlContent {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url
    )

    try {
        return (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3).Content
    } catch {
        return $null
    }
}

function Test-FrontendExperience {
    $homeContent = Get-UrlContent -Url $frontendUrl
    if (-not $homeContent) {
        return $false
    }

    $hasNewHomePage = $homeContent -match 'One home page for NCAA quiz generation'
    $askReady = Test-Url -Url "$backendUrl/ask"
    $catalogContent = Get-UrlContent -Url "$backendUrl/list-db-pdfs"
    $localDatabaseCount = (Get-ChildItem -Path (Join-Path $projectRoot 'database') -Recurse -Filter *.pdf -ErrorAction SilentlyContinue | Measure-Object).Count

    if ($localDatabaseCount -gt 0) {
        $catalogReady = $catalogContent -and ($catalogContent -match 'doc_id')
    } else {
        $catalogReady = $catalogContent -and ($catalogContent.Trim().StartsWith('['))
    }

    return $hasNewHomePage -and $askReady -and $catalogReady
}

function Get-ListeningProcessId {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $listener = netstat -ano | Select-String -Pattern ":$Port\s+.*LISTENING\s+(\d+)$" | Select-Object -First 1
    if (-not $listener) {
        return $null
    }

    if ($listener.Matches.Count -gt 0) {
        return [int]$listener.Matches[0].Groups[1].Value
    }

    return $null
}

function Restart-BackendProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PythonPath
    )

    $existingPid = Get-ListeningProcessId -Port $backendPort
    if ($existingPid) {
        Write-Host "Stopping stale backend process on port $backendPort (PID $existingPid) ..." -ForegroundColor Yellow
        Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    Write-Host "Starting Flask backend on $backendUrl ..." -ForegroundColor Cyan
    Start-Process -FilePath $PythonPath -WorkingDirectory $backendRoot -ArgumentList @("api.py") | Out-Null
}

function Get-BasePythonExecutable {
    $registryPaths = @(
        "HKCU:\Software\Python\PythonCore\3.11\InstallPath",
        "HKLM:\Software\Python\PythonCore\3.11\InstallPath",
        "HKCU:\Software\Python\PythonCore\3.12\InstallPath",
        "HKLM:\Software\Python\PythonCore\3.12\InstallPath"
    )

    foreach ($registryPath in $registryPaths) {
        try {
            $item = Get-ItemProperty -Path $registryPath -ErrorAction Stop
            if ($item.ExecutablePath -and (Test-Path $item.ExecutablePath)) {
                return $item.ExecutablePath
            }
        } catch {
        }
    }

    return $null
}

function Test-PythonExecutableQuick {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    return (Test-Path $Path)
}

function Wait-ForUrl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [int]$TimeoutSeconds = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Url -Url $Url) {
            return $true
        }
        Start-Sleep -Seconds 1
    }

    return $false
}

function Test-ExecutionEnvironment {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PythonPath
    )

    $savedPythonPath = $env:PYTHONPATH
    $env:PYTHONPATH = @($backendRoot, $venvSitePackages, $savedPythonPath) -join [IO.Path]::PathSeparator

    try {
        & $PythonPath -c "import flask, flask_cors, fitz, numpy, sklearn, sentence_transformers, faiss; print('ok')" *> $null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    } finally {
        $env:PYTHONPATH = $savedPythonPath
    }
}

if (-not (Test-Path $backendRoot)) {
    throw "Backend folder not found: $backendRoot"
}

$basePythonExe = Get-BasePythonExecutable
$executionPython = $pythonExe

if (-not (Test-PythonExecutableQuick -Path $executionPython) -and $basePythonExe) {
    $executionPython = $basePythonExe
}

if (-not (Test-PythonExecutableQuick -Path $executionPython)) {
    throw "No usable Python executable was found. Repair Python 3.11+ and rerun this script."
}

if (-not (Test-Path $venvSitePackages)) {
    throw "Missing project packages folder: $venvSitePackages"
}

$savedPythonPath = $env:PYTHONPATH
$env:PYTHONPATH = @($backendRoot, $venvSitePackages, $savedPythonPath) -join [IO.Path]::PathSeparator

if (-not (Test-ExecutionEnvironment -PythonPath $executionPython)) {
    throw "Python was found, but the required packages could not be imported. Repair or recreate ml-question-generator\\.venv and rerun this script."
}

$backendReady = Test-Url -Url "$backendUrl/health"
$frontendReady = $false

if ($backendReady) {
    $frontendReady = Test-FrontendExperience
    if (-not $frontendReady) {
        Write-Host "Detected an older backend build. Restarting to load the unified home and ask routes..." -ForegroundColor Yellow
        Restart-BackendProcess -PythonPath $executionPython
        $backendReady = Wait-ForUrl -Url "$backendUrl/health"
    }
}

if (-not $backendReady) {
    Restart-BackendProcess -PythonPath $executionPython
    $backendReady = Wait-ForUrl -Url "$backendUrl/health"
}

if (-not $backendReady) {
    throw "Backend did not become ready at $backendUrl"
}

$frontendReady = $false
$deadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $deadline) {
    if (Test-FrontendExperience) {
        $frontendReady = $true
        break
    }
    Start-Sleep -Seconds 1
}

if (-not $frontendReady) {
    throw "Frontend did not become ready at $frontendUrl"
}

Write-Host ""
Write-Host "Frontend is ready:" -ForegroundColor Green
Write-Host $frontendUrl -ForegroundColor Green
Write-Host ""
Write-Host "Backend health check passed at $backendUrl/health" -ForegroundColor DarkGreen
$env:PYTHONPATH = $savedPythonPath
