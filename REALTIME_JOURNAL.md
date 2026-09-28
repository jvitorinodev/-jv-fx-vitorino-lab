# Journal MT5 automático

A v1.2.7 usa sincronização incremental por polling local do Bridge MT5.

- intervalo aproximado: 15 segundos após cada ciclo concluído;
- somente executa quando a aba do navegador está visível e há conexão de rede;
- a conta conectada no MT5 precisa ter sido vinculada pelo menos uma vez a uma conta do JV FX;
- a janela automática é de 7 dias;
- a importação continua idempotente: posições já importadas são ignoradas por `broker_account_login + broker_position_id`;
- sincronizações históricas maiores continuam disponíveis manualmente.

Essa estratégia é adequada ao beta local. Ela não é streaming de ordens em nível de tick; é atualização quase em tempo real do Journal baseada em consulta periódica ao histórico do MT5.
