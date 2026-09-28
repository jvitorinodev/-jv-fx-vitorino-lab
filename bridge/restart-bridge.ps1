$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Reiniciando JV FX MT5 Bridge..." -ForegroundColor Cyan
& "$PSScriptRoot\stop-bridge.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& "$PSScriptRoot\run.ps1"
