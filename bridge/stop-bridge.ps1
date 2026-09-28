$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$connections = @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)
if (-not $connections.Count) {
    Write-Host "Nenhum Bridge escutando na porta 8765." -ForegroundColor Yellow
    exit 0
}

$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pidValue in $pids) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$pidValue" -ErrorAction SilentlyContinue
    if (-not $process) {
        Write-Host "Processo $pidValue nao encontrado." -ForegroundColor Yellow
        continue
    }

    $commandLine = [string]$process.CommandLine
    $looksLikeBridge = $commandLine -match "uvicorn" -and $commandLine -match "app\.main:app"
    if (-not $looksLikeBridge) {
        Write-Host "A porta 8765 esta sendo usada por outro processo e nao sera encerrada automaticamente." -ForegroundColor Red
        Write-Host "PID: $pidValue" -ForegroundColor Yellow
        Write-Host "Comando: $commandLine" -ForegroundColor DarkGray
        exit 1
    }

    Write-Host "Encerrando JV FX MT5 Bridge (PID $pidValue)..." -ForegroundColor Cyan
    Stop-Process -Id $pidValue -Force
}

Start-Sleep -Milliseconds 600
Write-Host "Bridge encerrado." -ForegroundColor Green
