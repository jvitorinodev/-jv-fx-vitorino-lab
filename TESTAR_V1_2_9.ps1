$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "JV FX v1.2.9 - Validacao completa" -ForegroundColor Cyan
Write-Host "Raiz: $PSScriptRoot" -ForegroundColor DarkGray

if (-not (Test-Path ".\package.json")) {
  throw "package.json nao encontrado. Use este script na raiz do JV FX."
}

if (-not (Test-Path ".\node_modules\.bin\next.cmd")) {
  Write-Host "[1/6] Instalando dependencias Node..." -ForegroundColor Yellow
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm install falhou (exit code $LASTEXITCODE)." }
} else {
  Write-Host "[1/6] Dependencias Node ja instaladas." -ForegroundColor Green
}

Write-Host "[2/6] Ambiente..." -ForegroundColor Cyan
npm run verify:env
if ($LASTEXITCODE -ne 0) { throw "verify:env falhou." }

Write-Host "[3/6] Schema Supabase..." -ForegroundColor Cyan
npm run verify:db
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "O codigo possui modo de compatibilidade e nao deve mais derrubar o dashboard." -ForegroundColor Yellow
  Write-Host "Mas execute SUPABASE_1_2_9.sql para habilitar conta principal persistente e concluir a atualizacao do banco." -ForegroundColor Yellow
  throw "Schema Supabase pendente."
}

Write-Host "[4/6] TypeScript..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "typecheck falhou." }

Write-Host "[5/6] Build de producao..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "build falhou." }

Write-Host "[6/6] Bridge Python - sintaxe..." -ForegroundColor Cyan
$python = Get-Command py -ErrorAction SilentlyContinue
if ($python) {
  py -3 -m compileall -q .\bridge\app .\bridge\scripts
  if ($LASTEXITCODE -ne 0) { throw "Validacao Python falhou." }
} else {
  Write-Host "Python Launcher nao encontrado; o bridge/run.ps1 fara a validacao." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "VALIDACAO CONCLUIDA: JV FX v1.2.9 pronto." -ForegroundColor Green
Write-Host "Web: .\INICIAR_JVFX.ps1" -ForegroundColor White
Write-Host "Tudo: .\INICIAR_TUDO.ps1" -ForegroundColor White
