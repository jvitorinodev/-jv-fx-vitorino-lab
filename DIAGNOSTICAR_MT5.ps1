$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Get-EnvValue([string]$Path, [string]$Key) {
    if (-not (Test-Path $Path)) { return $null }
    $line = Get-Content $Path | Where-Object { $_ -match "^$([regex]::Escape($Key))=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -split "=", 2)[1].Trim()
}

Write-Host "" 
Write-Host "JV FX v1.2.10 - Diagnostico MT5" -ForegroundColor Cyan

$rootEnv = Join-Path $PSScriptRoot ".env.local"
$bridgeEnv = Join-Path $PSScriptRoot "bridge\.env"
$provider = Get-EnvValue $rootEnv "MARKET_DATA_PROVIDER"
$appSecret = Get-EnvValue $rootEnv "MT5_BRIDGE_SHARED_SECRET"
$bridgeSecret = Get-EnvValue $bridgeEnv "JVFX_BRIDGE_SHARED_SECRET"
$url = Get-EnvValue $rootEnv "MT5_BRIDGE_HTTP_URL"
if (-not $url) { $url = "http://127.0.0.1:8765" }
$url = $url.TrimEnd('/')

Write-Host ("Provider: {0}" -f ($(if ($provider) { $provider } else { "ausente" })))
Write-Host ("Segredo app: {0}" -f ($(if ($appSecret) { "OK" } else { "AUSENTE" })))
Write-Host ("Segredo bridge: {0}" -f ($(if ($bridgeSecret) { "OK" } else { "AUSENTE" })))
Write-Host ("Segredos iguais: {0}" -f ($(if ($appSecret -and $appSecret -eq $bridgeSecret) { "SIM" } else { "NAO" })))

$listener = Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
Write-Host ("Porta 8765: {0}" -f ($(if ($listener) { "ESCUTANDO" } else { "FECHADA" })))

if (-not $appSecret) {
    Write-Host "" 
    Write-Host "Execute .\INICIAR_TUDO.ps1. Ele gera e sincroniza a configuracao automaticamente." -ForegroundColor Yellow
    exit 1
}

$headers = @{ "x-jvfx-key" = $appSecret }
try {
    $health = Invoke-RestMethod -Uri "$url/health" -Headers $headers -Method Get -TimeoutSec 3
    Write-Host "Bridge HTTP: OK" -ForegroundColor Green
    Write-Host ("MT5 conectado: {0}" -f ($(if ($health.connected) { "SIM" } else { "NAO" })))
    Write-Host ("Detalhe: {0}" -f $health.detail)

    if ($health.connected) {
        $account = Invoke-RestMethod -Uri "$url/account" -Headers $headers -Method Get -TimeoutSec 3
        $kind = if ([string]$account.server -match "demo|trial|practice|contest") { "DEMO/TRIAL" } elseif ([string]$account.server -match "real|live") { "REAL" } else { "NAO IDENTIFICADO" }
        Write-Host "" 
        Write-Host "Conta detectada:" -ForegroundColor Cyan
        Write-Host ("  Login: {0}" -f $account.login)
        Write-Host ("  Servidor: {0}" -f $account.server)
        Write-Host ("  Tipo: {0}" -f $kind)
        Write-Host ("  Moeda: {0}" -f $account.currency)
        Write-Host ("  Saldo: {0:N2}" -f [double]$account.balance)
        Write-Host ("  Equity: {0:N2}" -f [double]$account.equity)
        Write-Host "" 
        if ($kind -eq "DEMO/TRIAL") {
            Write-Host "Associe este login ao cartao Conta Demonstracao no JV FX." -ForegroundColor Yellow
        } elseif ($kind -eq "REAL") {
            Write-Host "Associe este login ao cartao Exness Real no JV FX." -ForegroundColor Green
        }
    }
    exit 0
} catch {
    Write-Host "Bridge HTTP: FALHA" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "" 
    Write-Host "Execute .\INICIAR_TUDO.ps1 e mantenha a janela do Bridge aberta." -ForegroundColor Yellow
    exit 1
}
