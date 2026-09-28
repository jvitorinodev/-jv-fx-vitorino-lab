# Importação de histórico MT5 — v1.1.1

## Objetivo

Trazer operações **já fechadas** no MetaTrader 5 para o Diário do JV FX sem duplicar o mesmo ticket.

A importação é somente leitura no terminal. O Bridge não envia, altera ou fecha ordens.

## Fluxo

```text
Exness / MT5
   ↓
history_deals_get + history_orders_get
   ↓
JV FX MT5 Bridge
   ↓
Reconstrução por position_id
   ↓
Revisão na tela Importar MT5
   ↓
Diário de Operações
```

## Como usar

1. Inicie o MetaTrader 5 e conecte a conta desejada.
2. Inicie `bridge/run.ps1`.
3. Inicie o Next.js com `MARKET_DATA_PROVIDER=mt5`.
4. Abra `/dashboard/journal`.
5. Clique em **Importar MT5**.
6. Escolha a janela de histórico e a conta de destino do JV FX.
7. Importe o ticket desejado.

## Deduplicação

A chave de idempotência é formada por:

- usuário do JV FX;
- provedor `MT5`;
- login da conta MT5;
- `position_id`.

A migration `0012_mt5_history_import.sql` cria um índice único parcial. Mesmo que duas requisições tentem importar o mesmo ticket ao mesmo tempo, o banco impede a duplicação.

## P&L e R

O P&L líquido é reconstruído usando os valores registrados pelo MT5:

```text
profit + commission + swap + fee
```

O JV FX **não inventa o risco original** da operação.

O histórico do MT5 nem sempre preserva contexto suficiente para afirmar com segurança o saldo da conta e o risco percentual no instante da entrada. Por isso, operações importadas podem apresentar:

- Risco: `Não disponível`;
- R realizado: `—`.

O P&L, resultado, volume, entrada, saída, comissão, swap e ticket continuam disponíveis.

## Limitações desta versão

- posições ainda abertas não são importadas como histórico fechado;
- posições parcialmente fechadas ainda em aberto são ignoradas;
- reversões `INOUT` não são importadas automaticamente nesta versão;
- apenas ativos mapeados no universo atual do JV FX podem entrar no Diário;
- sessão e timeframe da análise original não são inferidos do MT5; ficam como `OUTRA` e `N/D`.

Essas limitações são intencionais para evitar que o sistema preencha informação que a corretora não fornece com segurança.

## v1.2.1 — Sincronização em lote

A Visão geral possui **Sincronizar agora**. Esse fluxo percorre o histórico em páginas, importa apenas tickets ausentes e atualiza o painel ao finalizar.

O vínculo inicial registra o login MT5 na conta do JV FX. Depois disso, um login MT5 diferente é recusado para evitar mistura de históricos.

A tela `/dashboard/journal/import-mt5` permanece disponível para conferência e importação manual de um ticket específico.
