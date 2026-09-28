# Hotfix MT5 1.2.6.2

Correções:

- removido `python -c` com aspas incompatíveis com PowerShell/Windows;
- validação do Python movida para script Python dedicado;
- criação e sincronização automática do segredo do Bridge;
- `.env.local` e `bridge/.env` recebem o mesmo segredo automaticamente;
- validação separada de MetaTrader5/FastAPI/Uvicorn;
- fluxo de instalação interrompe imediatamente quando uma etapa falha;
- adicionado `bridge/test-bridge.ps1` para validar `/health` e `/account`;
- mensagens do PowerShell simplificadas para evitar problemas de encoding.
