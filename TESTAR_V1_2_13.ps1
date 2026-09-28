$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "JV FX v1.2.13 - Validacao completa" -ForegroundColor Cyan
Write-Host "Raiz: $PSScriptRoot" -ForegroundColor DarkGray

if (-not (Test-Path ".\package.json")) {
  throw "package.json nao encontrado. Use este script na raiz do JV FX."
}

if (-not (Test-Path ".\node_modules\.bin\next.cmd")) {
  Write-Host "[1/8] Instalando dependencias Node..." -ForegroundColor Yellow
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm install falhou (exit code $LASTEXITCODE)." }
} else {
  Write-Host "[1/8] Dependencias Node ja instaladas." -ForegroundColor Green
}

Write-Host "[2/8] Ambiente..." -ForegroundColor Cyan
npm run verify:env
if ($LASTEXITCODE -ne 0) { throw "verify:env falhou." }

Write-Host "[3/8] Schema Supabase..." -ForegroundColor Cyan
npm run verify:db
if ($LASTEXITCODE -ne 0) {
  throw "Schema Supabase pendente. Se necessario, execute SUPABASE_1_2_9.sql uma vez."
}

Write-Host "[4/8] Configuracao MT5/Bridge..." -ForegroundColor Cyan
$python = Get-Command py -ErrorAction SilentlyContinue
if ($python) {
  py -3 .\bridge\scripts\configure_env.py
  if ($LASTEXITCODE -ne 0) { throw "configure_env.py falhou." }
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  python .\bridge\scripts\configure_env.py
  if ($LASTEXITCODE -ne 0) { throw "configure_env.py falhou." }
} else {
  throw "Python 3.10+ nao encontrado. Ele e necessario para o Bridge MT5."
}
npm run verify:bridge
if ($LASTEXITCODE -ne 0) { throw "verify:bridge falhou." }

Write-Host "[5/8] TypeScript..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "typecheck falhou." }

Write-Host "[6/8] Build de producao..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "build falhou." }

Write-Host "[7/8] Bridge Python - sintaxe..." -ForegroundColor Cyan
if ($python) {
  py -3 -m compileall -q .\bridge\app .\bridge\scripts
  if ($LASTEXITCODE -ne 0) { throw "Validacao Python falhou." }
} else {
  python -m compileall -q .\bridge\app .\bridge\scripts
  if ($LASTEXITCODE -ne 0) { throw "Validacao Python falhou." }
}

Write-Host "[8/8] Scripts PowerShell - sintaxe..." -ForegroundColor Cyan
$files = @(
  ".\INICIAR_TUDO.ps1",
  ".\INICIAR_JVFX.ps1",
  ".\DIAGNOSTICAR_MT5.ps1",
  ".\bridge\run.ps1",
  ".\bridge\stop-bridge.ps1",
  ".\bridge\restart-bridge.ps1"
)
foreach ($file in $files) {
  $tokens = $null
  $errors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $file), [ref]$tokens, [ref]$errors)
  if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Host $_.Message -ForegroundColor Red }
    throw "Erro de sintaxe em $file"
  }
}

Write-Host ""
Write-Host "VALIDACAO CONCLUIDA: JV FX v1.2.13 pronto." -ForegroundColor Green
Write-Host "Iniciar tudo: .\INICIAR_TUDO.ps1" -ForegroundColor White
Write-Host "Diagnostico MT5: .\DIAGNOSTICAR_MT5.ps1" -ForegroundColor White
