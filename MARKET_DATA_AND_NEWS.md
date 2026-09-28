# Dados externos — v1.2.0

A v1.2.0 não utiliza gráfico de mercado em tempo real na interface principal.

## Fonte externa prioritária

**Exness via MetaTrader 5**, através do Bridge JV FX.

Uso atual:
- conta;
- histórico fechado;
- ticket/position id;
- volume;
- P&L;
- comissão;
- swap;
- preços históricos associados à operação quando disponíveis.

## Fora do escopo desta versão
- feed de candles na interface;
- WebSocket de preços para gráfico;
- desenho automático de estruturas;
- notícias macro na navegação principal.

O código legado pode continuar presente durante a transição, porém a evolução do produto passa a priorizar a integridade do histórico e a performance.
