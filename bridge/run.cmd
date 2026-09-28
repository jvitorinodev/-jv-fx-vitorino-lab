@echo off
setlocal EnableExtensions
cd /d "%~dp0"

chcp 65001 >nul 2>nul

set "DEPS_DIR=%CD%\.packages"
set "PY_CMD="

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 set "PY_CMD=py -3"

if not defined PY_CMD (
  where python >nul 2>nul
  if %ERRORLEVEL% EQU 0 set "PY_CMD=python"
)

if not defined PY_CMD (
  echo [ERRO] Python nao foi encontrado.
  echo Instale Python 64-bit 3.10+ e marque a opcao para adicionar ao PATH.
  exit /b 1
)

echo.
echo ==============================================
echo   JV FX - MT5 Bridge v1.2.10
echo ==============================================
echo Pasta: %CD%
echo Dependencias: %DEPS_DIR%
echo.

echo [1/6] Validando Python...
%PY_CMD% "%CD%\scripts\check_python.py"
if errorlevel 1 goto :fail

echo.
echo [2/6] Sincronizando configuracao antes de iniciar...
%PY_CMD% "%CD%\scripts\configure_env.py"
if errorlevel 1 goto :fail

echo.
echo [3/6] Verificando pip...
%PY_CMD% -m pip --version
if errorlevel 1 (
  echo [ERRO] O pip nao esta disponivel no Python instalado.
  echo Abra o instalador do Python, escolha Modify e habilite pip.
  exit /b 1
)

echo.
echo [4/6] Validando dependencias locais do Bridge...
set "PYTHONPATH=%DEPS_DIR%;%PYTHONPATH%"

if "%JVFX_FORCE_REPAIR%"=="1" goto :install_deps

if exist "%DEPS_DIR%" (
  %PY_CMD% "%CD%\scripts\check_dependencies.py" >nul 2>nul
  if not errorlevel 1 (
    echo Dependencias ja instaladas e validas. Instalacao ignorada.
    goto :deps_ready
  )
)

:install_deps
echo Instalando dependencias em pasta local...
if exist "%DEPS_DIR%" rmdir /s /q "%DEPS_DIR%" 2>nul
if exist "%DEPS_DIR%" (
  echo [ERRO] Nao foi possivel limpar %DEPS_DIR%.
  echo Feche o Bridge antigo e tente novamente.
  exit /b 1
)
mkdir "%DEPS_DIR%"
%PY_CMD% -m pip install --disable-pip-version-check --no-input --target "%DEPS_DIR%" -r "%CD%\requirements.txt"
if errorlevel 1 goto :fail

:deps_ready
set "PYTHONPATH=%DEPS_DIR%;%PYTHONPATH%"

echo.
echo [5/6] Validando MetaTrader5, FastAPI e Uvicorn...
%PY_CMD% "%CD%\scripts\check_dependencies.py"
if errorlevel 1 goto :fail

echo.
echo [6/6] Iniciando Bridge...
echo.
echo Servidor: http://127.0.0.1:8765
echo Deixe esta janela aberta enquanto usar o JV FX com MT5.
echo.

%PY_CMD% -m uvicorn app.main:app --host 127.0.0.1 --port 8765
if errorlevel 1 goto :fail
exit /b 0

:fail
echo.
echo ==============================================
echo [ERRO] O Bridge parou porque uma etapa falhou.
echo Copie a mensagem acima para diagnostico.
echo ==============================================
exit /b 1
