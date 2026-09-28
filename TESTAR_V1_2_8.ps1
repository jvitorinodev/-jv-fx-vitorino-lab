$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "" 
Write-Host "JV FX v1.2.8 - Validacao local" -ForegroundColor Cyan
Write-Host "Pasta: $PSScriptRoot" -ForegroundColor DarkGray

if (-not (Test-Path ".\package.json")) {
  throw "package.json nao encontrado. Execute este script na raiz do JV FX."
}

if (-not (Test-Path ".\node_modules\.bin\next.cmd")) {
  Write-Host "[1/5] Instalando dependencias Node..." -ForegroundColor Yellow
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm install falhou (exit code $LASTEXITCODE)." }
} else {
  Write-Host "[1/5] Dependencias Node ja instaladas." -ForegroundColor Green
}

Write-Host "[2/5] Verificando ambiente..." -ForegroundColor Cyan
npm run verify:env
if ($LASTEXITCODE -ne 0) { throw "verify:env falhou." }

Write-Host "[3/5] TypeScript..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "typecheck falhou." }

Write-Host "[4/5] Build de producao..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "build falhou." }

Write-Host "[5/5] Bridge Python - sintaxe..." -ForegroundColor Cyan
$python = Get-Command py -ErrorAction SilentlyContinue
if ($python) {
  py -3 -m compileall -q .\bridge\app .\bridge\scripts
  if ($LASTEXITCODE -ne 0) { throw "Validacao Python falhou." }
} else {
  Write-Host "Python Launcher nao encontrado; validacao Python sera feita pelo bridge/run.ps1." -ForegroundColor Yellow
}

Write-Host "" 
Write-Host "VALIDACAO CONCLUIDA: projeto pronto para iniciar." -ForegroundColor Green
Write-Host "Rode: npm run dev" -ForegroundColor White
Write-Host "Bridge: cd bridge; .\run.ps1" -ForegroundColor White
