# JV FX v1.2.6 — MT5 Bridge Hotfix

Correções desta revisão:

- substitui o pin indisponível `MetaTrader5==5.0.5120` por uma faixa compatível `MetaTrader5>=5.0.5488,<6`;
- o `run.ps1` agora usa diretamente o Python do `.venv`;
- falhas do `pip` interrompem o script imediatamente em vez de continuar e gerar erros secundários;
- valida Python 64-bit antes da instalação;
- valida `MetaTrader5`, `FastAPI` e `Uvicorn` antes de iniciar o servidor;
- mantém o Bridge em `127.0.0.1:8765`.

## Uso

```powershell
cd bridge
.\run.ps1
```

Se existir um `.venv` criado pela tentativa anterior, ele pode ser reutilizado. Se quiser recriar do zero:

```powershell
Remove-Item .venv -Recurse -Force
.\run.ps1
```
