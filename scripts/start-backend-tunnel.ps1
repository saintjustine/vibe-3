$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$dataDir = Join-Path $backendDir "data"
$cloudflared = "cloudflared"

if (-not (Get-Command $cloudflared -ErrorAction SilentlyContinue)) {
    $installedPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
    if (Test-Path $installedPath) {
        $cloudflared = $installedPath
    } else {
        throw "cloudflared is not installed. Install it with: winget install --id Cloudflare.cloudflared"
    }
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

$existing = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" }

if (-not $existing) {
    Start-Process `
        -FilePath "C:\Users\admin\.local\bin\uv.exe" `
        -ArgumentList @("run", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000") `
        -WorkingDirectory $backendDir `
        -WindowStyle Hidden

    Start-Sleep -Seconds 3
}

Write-Host "Backend health check: http://127.0.0.1:8000/api/health"
Invoke-RestMethod "http://127.0.0.1:8000/api/health" | Out-Host

Write-Host ""
Write-Host "Starting Cloudflare quick tunnel. Copy the trycloudflare.com URL into the frontend Backend URL field."
Write-Host "Press Ctrl+C to stop the tunnel."
& $cloudflared tunnel --url "http://127.0.0.1:8000"
