$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$BridgePort = 8765
$BridgeUrl = "http://127.0.0.1:$BridgePort"
$BridgeWaitSeconds = 300

function Get-PythonRunner {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        return @{ Exe = "py"; Prefix = @("-3") }
    }
    if (Get-Command python -ErrorAction SilentlyContinue) {
        return @{ Exe = "python"; Prefix = @() }
    }
    throw "Python 64-bit nao foi encontrado. Instale Python 3.10+ antes de usar o Bridge MT5."
}

function Invoke-PythonScript([string]$ScriptPath) {
    $runner = Get-PythonRunner
    & $runner.Exe @($runner.Prefix) $ScriptPath
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao executar $ScriptPath (exit code $LASTEXITCODE)."
    }
}

function Get-EnvValue([string]$Path, [string]$Key) {
    if (-not (Test-Path $Path)) { return $null }
    $line = Get-Content $Path | Where-Object { $_ -match "^$([regex]::Escape($Key))=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -split "=", 2)[1].Trim()
}

function Get-BridgeListener {
    try {
        return Get-NetTCPConnection -LocalPort $BridgePort -State Listen -ErrorAction Stop | Select-Object -First 1
    } catch {
        return $null
    }
}

function Get-BridgeHealth([string]$Secret) {
    if (-not $Secret) { return $null }
    try {
        return Invoke-RestMethod -Uri "$BridgeUrl/health" -Headers @{ "x-jvfx-key" = $Secret } -Method Get -TimeoutSec 2
    } catch {
        return $null
    }
}

Write-Host "" 
Write-Host "JV FX v1.2.10 - inicializacao completa" -ForegroundColor Cyan
Write-Host "Raiz: $PSScriptRoot" -ForegroundColor DarkGray

if (-not (Test-Path ".\package.json")) {
    throw "package.json nao encontrado na raiz do JV FX."
}

if (-not (Test-Path ".\node_modules\.bin\next.cmd")) {
    Write-Host "[1/5] Dependencias Node ausentes. Instalando..." -ForegroundColor Yellow
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install falhou (exit code $LASTEXITCODE)." }
} else {
    Write-Host "[1/5] Dependencias Node OK." -ForegroundColor Green
}

Write-Host "[2/5] Sincronizando configuracao do Bridge antes do Next.js..." -ForegroundColor Cyan
$configureScript = Join-Path $PSScriptRoot "bridge\scripts\configure_env.py"
Invoke-PythonScript $configureScript

$rootEnv = Join-Path $PSScriptRoot ".env.local"
$bridgeEnv = Join-Path $PSScriptRoot "bridge\.env"
$appSecret = Get-EnvValue $rootEnv "MT5_BRIDGE_SHARED_SECRET"
$bridgeSecret = Get-EnvValue $bridgeEnv "JVFX_BRIDGE_SHARED_SECRET"

if (-not $appSecret -or -not $bridgeSecret) {
    throw "O segredo do Bridge nao foi configurado. Execute novamente este script."
}
if ($appSecret -ne $bridgeSecret) {
    throw "Os segredos do app e do Bridge ficaram diferentes. A inicializacao foi interrompida para evitar erro 401."
}

Write-Host "[3/5] Validando Bridge MT5 local..." -ForegroundColor Cyan
$health = Get-BridgeHealth $appSecret
$listener = Get-BridgeListener

if ($listener -and -not $health) {
    Write-Host "Existe um processo antigo na porta $BridgePort, mas ele nao responde com a configuracao atual." -ForegroundColor Yellow
    Write-Host "Tentando remover apenas um Bridge JV FX antigo..." -ForegroundColor Yellow
    $stopScript = Join-Path $PSScriptRoot "bridge\stop-bridge.ps1"
    $stopProcess = Start-Process powershell.exe -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$stopScript`"") -Wait -PassThru
    if ($stopProcess.ExitCode -ne 0) {
        throw "A porta $BridgePort esta ocupada por outro processo. Feche o processo que usa a porta e execute INICIAR_TUDO.ps1 novamente."
    }
    Start-Sleep -Milliseconds 800
    $listener = Get-BridgeListener
}

$bridgeProcess = $null
if (-not $health) {
    if ($listener) {
        throw "A porta $BridgePort continua ocupada e o Bridge nao respondeu."
    }

    Write-Host "Iniciando Bridge em uma janela separada..." -ForegroundColor Cyan
    $bridgeScript = Join-Path $PSScriptRoot "bridge\run.ps1"
    $bridgeProcess = Start-Process powershell.exe -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$bridgeScript`"") -PassThru

    $deadline = (Get-Date).AddSeconds($BridgeWaitSeconds)
    $lastProgress = Get-Date
    do {
        Start-Sleep -Seconds 1
        $health = Get-BridgeHealth $appSecret
        if ($health) { break }

        if ($bridgeProcess.HasExited) {
            throw "O Bridge encerrou antes de ficar pronto. Rode .\bridge\run.ps1 manualmente para ver o erro completo."
        }

        if (((Get-Date) - $lastProgress).TotalSeconds -ge 5) {
            $remaining = [math]::Max(0, [math]::Ceiling(($deadline - (Get-Date)).TotalSeconds))
            Write-Host "Aguardando Bridge... ate $remaining s" -ForegroundColor DarkGray
            $lastProgress = Get-Date
        }
    } while ((Get-Date) -lt $deadline)
}

if (-not $health) {
    throw "O Bridge nao respondeu em $BridgeUrl dentro de $BridgeWaitSeconds segundos. Veja a janela do Bridge e execute novamente."
}

if ($health.connected) {
    Write-Host ("[4/5] Bridge OK - {0}" -f $health.detail) -ForegroundColor Green
} else {
    Write-Host "[4/5] Bridge HTTP OK, mas o MetaTrader 5 ainda nao entregou uma conta." -ForegroundColor Yellow
    Write-Host ("Detalhe: {0}" -f $health.detail) -ForegroundColor Yellow
    Write-Host "Abra/logue o MetaTrader 5 da Exness. O site pode iniciar normalmente e detectar a conta ao atualizar." -ForegroundColor DarkGray
}

Write-Host "[5/5] Iniciando JV FX em http://localhost:3000 ..." -ForegroundColor Cyan
Write-Host "IMPORTANTE: mantenha a janela do Bridge aberta enquanto usar MT5/Journal automatico." -ForegroundColor DarkGray
npm run dev
