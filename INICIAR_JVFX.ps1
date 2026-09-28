$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".\package.json")) { throw "package.json nao encontrado na raiz do JV FX." }
if (-not (Test-Path ".\node_modules\.bin\next.cmd")) {
  Write-Host "Dependencias ausentes. Instalando..." -ForegroundColor Yellow
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm install falhou." }
}

Write-Host "JV FX v1.2.10 iniciando somente a interface em http://localhost:3000" -ForegroundColor Cyan
Write-Host "Para Exness/MT5 e Journal automatico, prefira .\INICIAR_TUDO.ps1" -ForegroundColor Yellow
npm run dev
