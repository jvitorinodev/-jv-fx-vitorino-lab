param(
    [switch]$Repair
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {
}

function Get-PythonRunner {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @{ Exe = "py"; Prefix = @("-3") }
    }
    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @{ Exe = "python"; Prefix = @() }
    }
    throw "Python nao foi encontrado. Instale Python 64-bit 3.10+."
}

function Invoke-PythonScript([string]$ScriptPath) {
    $runner = Get-PythonRunner
    & $runner.Exe @($runner.Prefix) $ScriptPath
    if ($LASTEXITCODE -ne 0) { throw "Falha ao executar $ScriptPath." }
}

function Get-EnvValue([string]$Path, [string]$Key) {
    if (-not (Test-Path $Path)) { return $null }
    $line = Get-Content $Path | Where-Object { $_ -match "^$([regex]::Escape($Key))=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -split "=", 2)[1].Trim()
}

function Get-BridgeListener {
    try {
        return Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction Stop | Select-Object -First 1
    } catch {
        return $null
    }
}

function Test-CurrentBridge([string]$Secret) {
    if (-not $Secret) { return $null }
    try {
        return Invoke-RestMethod -Uri "http://127.0.0.1:8765/health" -Headers @{ "x-jvfx-key" = $Secret } -Method Get -TimeoutSec 2
    } catch {
        return $null
    }
}

Write-Host "JV FX - MT5 Bridge v1.2.10" -ForegroundColor Green
Write-Host "Inicializacao segura, idempotente e com recuperacao de processo antigo." -ForegroundColor DarkGray
Write-Host ""

Write-Host "Pre-configurando bridge/.env e .env.local..." -ForegroundColor Cyan
Invoke-PythonScript (Join-Path $PSScriptRoot "scripts\configure_env.py")
$secret = Get-EnvValue (Join-Path $PSScriptRoot ".env") "JVFX_BRIDGE_SHARED_SECRET"
if (-not $secret) { throw "JVFX_BRIDGE_SHARED_SECRET nao foi configurado." }

$listener = Get-BridgeListener
$health = Test-CurrentBridge $secret

if ($listener -and $health -and -not $Repair) {
    Write-Host "Bridge ja esta ativo e autenticado na porta 8765." -ForegroundColor Green
    if ($health.connected) {
        Write-Host $health.detail -ForegroundColor Green
    } else {
        Write-Host $health.detail -ForegroundColor Yellow
    }
    exit 0
}

if ($listener) {
    Write-Host "Processo antigo/incompativel detectado na porta 8765." -ForegroundColor Yellow
    $stopScript = Join-Path $PSScriptRoot "stop-bridge.ps1"
    $stopProcess = Start-Process powershell.exe -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$stopScript`"") -Wait -PassThru
    if ($stopProcess.ExitCode -ne 0) {
        throw "Nao foi possivel liberar a porta 8765 com seguranca."
    }
    Start-Sleep -Milliseconds 800
}

$runner = Join-Path $PSScriptRoot "run.cmd"
if (-not (Test-Path $runner)) { throw "run.cmd nao encontrado em $PSScriptRoot" }

if ($Repair) { $env:JVFX_FORCE_REPAIR = "1" } else { Remove-Item Env:JVFX_FORCE_REPAIR -ErrorAction SilentlyContinue }

& cmd.exe /d /c $runner
$exitCode = $LASTEXITCODE
Remove-Item Env:JVFX_FORCE_REPAIR -ErrorAction SilentlyContinue

if ($exitCode -ne 0) { throw "O Bridge encerrou com exit code $exitCode." }
