# JV FX v1.2.7 — Hotfix de inicialização do MT5 Bridge

Este hotfix corrige `PermissionError: [WinError 5] Acesso negado` em arquivos como
`bridge/.packages/httptools/parser/*.pyd`.

## Causa

O erro aparece quando `run.ps1` tenta reinstalar dependências enquanto outro processo do
Bridge ainda está usando módulos binários (`.pyd`) no Windows.

## Alterações

- `run.ps1` agora detecta se a porta 8765 já está ativa e não reinstala dependências.
- Dependências ficam em `.packages-v1_2_7`, separadas de versões anteriores.
- Dependências válidas são reutilizadas; `pip install` só roda quando necessário.
- `run.ps1 -Repair` força reinstalação apenas com o Bridge parado.
- Novo `stop-bridge.ps1` encerra somente um processo reconhecido como Uvicorn do JV FX.
- Novo `restart-bridge.ps1` reinicia o Bridge de forma organizada.

## Fluxo recomendado

Iniciar:

```powershell
cd bridge
.\run.ps1
```

Testar:

```powershell
.\test-bridge.ps1 -Days 7
```

Reiniciar depois de atualizar arquivos:

```powershell
.\restart-bridge.ps1
```

Reparar dependências:

```powershell
.\stop-bridge.ps1
.\run.ps1 -Repair
```
