# Configuração do MT5 real — v1.1.2

## Objetivo

Ler dados da conta Exness conectada no MetaTrader 5 sem colocar credenciais da corretora no frontend.

## Passo a passo

1. Instale/abra o MetaTrader 5 no Windows.
2. Faça login na sua conta Exness no próprio terminal.
3. Confirme que os símbolos desejados estão disponíveis no Market Watch.
4. Entre na pasta `bridge`.
5. Copie `.env.example` para `.env`.
6. Defina `JVFX_BRIDGE_SHARED_SECRET` com uma string longa e aleatória.
7. Não preencha senha/login em `.env` se o terminal já estiver autenticado.
8. Execute `./run.ps1`.
9. No `.env.local` do Next.js use:

```env
MARKET_DATA_PROVIDER=mt5
MT5_BRIDGE_HTTP_URL=http://127.0.0.1:8765
MT5_BRIDGE_WS_URL=ws://127.0.0.1:8765/ws/quotes
MT5_BRIDGE_SHARED_SECRET=O_MESMO_SEGREDO
```

10. Reinicie `npm run dev`.

## Dados de execução disponíveis

A v1.1.2 consulta o MT5 para mostrar, sem enviar ordem:

- Bid / Ask;
- spread;
- especificação do símbolo;
- leverage da conta;
- margem necessária;
- custo imediato estimado do spread;
- capital comprometido pela margem;
- exposição nocional.

## Diagnóstico

Abra:

```text
http://localhost:3000/api/health
```

Depois abra `/dashboard/terminal`. O terminal deve indicar `DADOS MT5` quando o Bridge estiver conectado.

## Segurança

A v1.1.2 continua somente leitura. Ela não chama `order_send`, não abre/fecha ordens e não altera SL/TP.

## v1.2.1 — Estado de sincronização

Depois que o Bridge estiver conectado, a Visão geral mostra status, login MT5, saldo, equity, margem livre e alavancagem. O botão **Sincronizar agora** importa o período selecionado e registra a última sincronização no Supabase.

A v1.2.1 exige a migration `0014_broker_sync.sql` em produção.
