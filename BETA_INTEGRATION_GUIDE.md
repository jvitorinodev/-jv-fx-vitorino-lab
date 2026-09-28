# JV FX · Guia de integração beta — v1.2.5

Esta versão não adiciona novos módulos de trading. Ela consolida o caminho para uso real controlado.

## Ordem recomendada

1. **Supabase em produção**
   - `NEXT_PUBLIC_APP_MODE=production`
   - URL e Publishable Key configuradas
   - sua conta `ACTIVE + ADMIN`
   - segundo usuário `ACTIVE + TRADER`
   - isolamento de dados validado

2. **Google OAuth**
   - origem autorizada: valor de `NEXT_PUBLIC_SITE_URL`
   - callback do provider no Google Cloud: `https://SEU-PROJETO.supabase.co/auth/v1/callback`
   - redirect autorizado no Supabase: `NEXT_PUBLIC_SITE_URL/auth/callback`
   - testar com uma conta Google nova em janela anônima
   - confirmar que o novo usuário fica `PENDING` até aprovação do ADMIN

3. **Exness / MT5**
   - MetaTrader 5 instalado e aberto no Windows
   - conta Exness logada no terminal
   - `bridge/.env` criado a partir de `bridge/.env.example`
   - o mesmo `MT5_BRIDGE_SHARED_SECRET` deve existir no `.env.local` e no `bridge/.env`
   - `MARKET_DATA_PROVIDER=mt5`
   - iniciar o Bridge com `bridge/run.ps1`

4. **Diagnóstico**

```powershell
npm run verify:beta
```

5. **Central de integrações**

Abra:

```text
http://localhost:3000/dashboard/integrations
```

A página mostra o estado da autenticação, callbacks Google, Bridge, conta MT5 e última sincronização.

6. **Primeira sincronização real**

Depois que a conta MT5 aparecer conectada, use **Sincronização Exness / MT5** e importe inicialmente 30 dias. Confira manualmente alguns tickets no MT5 antes de ampliar o período.

## Critério para beta real

- build passa;
- e-mail/senha passa;
- Google passa;
- aprovação ADMIN passa;
- isolamento entre usuários passa;
- Bridge detecta MT5;
- login/servidor da Exness conferem;
- uma sincronização de 30 dias não duplica trades;
- P&L do Journal confere com o histórico do MT5 em uma amostra manual.
