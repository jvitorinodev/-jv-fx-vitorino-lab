param(
    [ValidateSet(7,14,30,90,180,365,1095,3650)]
    [int]$Days = 30
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Get-EnvValue([string]$Path, [string]$Key) {
    $line = Get-Content $Path | Where-Object { $_ -match "^$([regex]::Escape($Key))=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -split "=", 2)[1].Trim()
}

$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    throw "bridge/.env nao encontrado. Execute .\run.ps1 primeiro."
}

$secret = Get-EnvValue $envFile "JVFX_BRIDGE_SHARED_SECRET"
if (-not $secret) {
    throw "JVFX_BRIDGE_SHARED_SECRET nao configurado. Execute .\run.ps1 novamente."
}

$headers = @{ "x-jvfx-key" = $secret }

Write-Host "Testando /health..." -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "http://127.0.0.1:8765/health" -Headers $headers -Method Get
$health | Format-List

Write-Host ""
Write-Host "Testando /account..." -ForegroundColor Cyan
$account = Invoke-RestMethod -Uri "http://127.0.0.1:8765/account" -Headers $headers -Method Get
$account | Format-List

Write-Host ""
Write-Host ("Testando /history/closed ({0} dias)..." -f $Days) -ForegroundColor Cyan
$started = Get-Date
try {
    $history = Invoke-RestMethod -Uri "http://127.0.0.1:8765/history/closed?days=$Days&limit=50&offset=0" -Headers $headers -Method Get -TimeoutSec 90
    $elapsed = [math]::Round(((Get-Date) - $started).TotalSeconds, 2)
    Write-Host ("Historico OK em {0}s" -f $elapsed) -ForegroundColor Green
    [pscustomobject]@{
        account_login = $history.account_login
        currency      = $history.currency
        days          = $history.days
        total         = $history.total
        returned      = @($history.trades).Count
        has_more      = $history.has_more
    } | Format-List
} catch {
    $elapsed = [math]::Round(((Get-Date) - $started).TotalSeconds, 2)
    Write-Host ("Falha ao consultar historico apos {0}s" -f $elapsed) -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    throw
}
