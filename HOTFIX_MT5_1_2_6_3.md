# JV FX v1.2.6 - MT5 Hotfix 3

## Motivo
Algumas instalacoes do Python 3.14 podem demorar ou ser interrompidas durante o `ensurepip` executado automaticamente pelo `python -m venv`. O traceback termina em `KeyboardInterrupt`, portanto a criacao do `.venv` nao foi concluida.

## Mudanca
O Bridge nao depende mais de `.venv`.

As dependencias Python sao instaladas em `bridge/.packages` usando o `pip` do Python principal. Isso elimina a etapa de `venv/ensurepip` que estava bloqueando a instalacao.

## Como iniciar
Na pasta `bridge`:

```powershell
.\run.ps1
```

Ou diretamente:

```powershell
.\run.cmd
```

O script agora executa seis etapas numeradas e interrompe de forma clara em caso de erro.

Depois que aparecer `Uvicorn running on http://127.0.0.1:8765`, abra outro PowerShell e execute:

```powershell
.\test-bridge.ps1
```

## Observacao
A pasta `.venv` de tentativas anteriores nao e mais usada e pode ser apagada.
