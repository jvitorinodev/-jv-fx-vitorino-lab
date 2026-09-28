# JV FX · Vitorino LAB — v1.2.5

## Accounts & Session UX

Esta versão fecha o gerenciamento visual de contas antes da ativação do Bridge MT5 real.

### Novo
- Seletor global de contas no topo do dashboard.
- Opção **Todas as contas ativas**.
- Identificação visual **REAL / DEMO** no seletor e na Central de Integrações.
- Conta padrão `Exness Real` para vínculo futuro com o MT5.
- Conta `Conta Demonstração` com saldo inicial de USD 25.000 para testes separados.
- Central de Integrações passa a listar todas as contas ativas, saldo, equity e vínculo MT5 quando existir.
- Menu de usuário no canto superior direito com nome, e-mail, role, status e botão explícito **Sair da conta**.
- Conta selecionada é persistida em cookie do JV FX e usada como contexto inicial da Visão geral e formulários de operação/sincronização.

### Supabase
- Nova migration `0016_default_trading_accounts.sql`.
- Arquivo de execução rápida `SUPABASE_1_2_5.sql`.
- O bootstrap de novos usuários passa a criar as contas-base ausentes.
- Usuários existentes recebem backfill somente das contas que ainda não possuem.

### Segurança
- Nenhuma credencial MT5 é armazenada nesta fase.
- Nenhuma execução automática de ordens foi adicionada.
- A integração continua planejada em modo somente leitura/sincronização.

## v1.2.7 — Histórico flexível + Journal MT5 automático

- janelas de histórico: 7, 14, 30, 90, 180, 365, 1095 e 3650 dias;
- filtros visuais alinhados entre Visão geral, Journal, Performance e importador MT5;
- sincronização automática da conta MT5 vinculada aproximadamente a cada 15 s com a aba visível;
- Journal, Performance, Relatórios e Calendário passam a aceitar dados novos após refresh do servidor;
- Bridge reconstrói posições fechadas na janela mesmo quando a abertura ocorreu antes dela;
- `test-bridge.ps1` aceita `-Days` para testar a janela desejada;
- pacote beta passa a iniciar com `MARKET_DATA_PROVIDER=mt5`.

## v1.2.8 — Conta principal e associação MT5
- `Exness Real` passa a ser a conta principal por padrão.
- Reparo de vínculo antigo Demo/Real via `SUPABASE_1_2_8.sql`.
- Um login MT5 fica vinculado a uma única conta JV FX.
- Sincronização manual pode atualizar o vínculo da conta escolhida para o MT5 atual.
- Central de Integrações ganhou: **Tornar principal**, **Associar MT5 atual**, **Desvincular** e **Adicionar conta**.
- Novas contas podem ser adicionadas sem editar SQL.
- Scripts `TESTAR_V1_2_8.ps1` e `INICIAR_JVFX.ps1` reduzem erros de pasta/dependência no Windows.

## v1.2.9 — Schema-safe MT5 accounts

- Dashboard não quebra mais se `is_primary` ainda não existir no Supabase.
- Fallback compatível escolhe `Exness Real` como principal lógica.
- `SUPABASE_1_2_9.sql` consolida a atualização do banco.
- `npm run verify:db` detecta schema desatualizado antes do uso.
- Central de Integrações mostra estado do schema.
- Criação e seleção de contas toleram bancos legados durante a atualização.
- `INICIAR_TUDO.ps1` padroniza o início do Bridge + web a partir da raiz.
