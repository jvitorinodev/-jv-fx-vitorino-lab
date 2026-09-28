# Status do Projeto — JV FX · Vitorino LAB v1.2.5

## Estado atual

O JV FX está em **beta controlada**, com autenticação, isolamento e experiência multi-conta prontas para a fase MT5.

### Validado
- autenticação e-mail/senha via Supabase;
- Google OAuth;
- aprovação `PENDING → ACTIVE` pelo ADMIN;
- roles `FREE / TRADER / ADMIN`;
- RLS e isolamento por usuário;
- Journal, Calendário, Relatórios e Performance;
- seletor de todas as contas ativas;
- separação visual entre conta real e demonstração;
- logout explícito no menu do usuário;
- sincronização MT5 preparada e idempotente;
- vínculo entre conta JV FX e login MT5 preparado;
- Central de Integrações para acompanhar prontidão.

### Próxima fase
- configurar segredo do Bridge;
- mudar `MARKET_DATA_PROVIDER=mt5`;
- iniciar Bridge Python no Windows;
- detectar o terminal MetaTrader 5 da Exness;
- validar login, servidor, saldo, equity e alavancagem;
- importar primeiro uma janela curta de histórico real;
- reconciliar tickets/P&L antes de ampliar a sincronização.

### Fora de escopo
- execução automática de ordens;
- sinais de compra/venda;
- scanner gráfico automático;
- TradingView embutido.

## v1.2.7

MT5 Bridge validado com conta Exness. Histórico manual disponível de 1 semana a 10 anos. Journal automático implementado por polling local (~15 s) para a conta MT5 já vinculada, com refresh das telas derivadas do Journal.

## v1.2.8
Conta principal e gerenciamento de múltiplas contas MT5 implementados. A conta Real é preferida por padrão; vínculo MT5 pode ser movido explicitamente entre contas e novos cadastros de conta são feitos pela interface.
