# Release notes — v1.2.10

Release focada em confiabilidade operacional do MT5 no Windows.

### Inicialização
- Configuração do Bridge acontece antes do Next.js.
- Handshake autenticado com `/health` antes da interface.
- Detecção e limpeza segura de Bridge antigo/incompatível na porta 8765.
- Espera explícita de inicialização para primeira instalação de dependências.

### Contas
- Proteção contra associação Demo/Trial → conta Real.
- Proteção contra associação Real → conta Demo quando o tipo do servidor é reconhecido.
- Botões incompatíveis ficam bloqueados na Central de integrações.
- Conta vinculada ao login atual é priorizada na sincronização.

### Journal
- Estado de provider corrigido quando o Bridge está indisponível.
- Retry curto para falha transitória de conexão HTTP com o Bridge.
- Backoff de sincronização automática em falhas repetidas.

### Diagnóstico e testes
- `DIAGNOSTICAR_MT5.ps1`.
- `verify:bridge`.
- `TESTAR_V1_2_10.ps1` com 8 etapas.
- Encerramento seguro dos verificadores Node, sem `process.exit()` logo após `fetch`.
