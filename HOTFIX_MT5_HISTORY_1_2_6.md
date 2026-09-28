# Hotfix MT5 History — v1.2.6

Correções aplicadas:

- timeout geral do Bridge mantido curto para status/conta;
- histórico fechado ganhou timeout dedicado de 45 segundos;
- consulta de ticket individual ganhou timeout de 20 segundos;
- mensagens `fetch failed` agora mostram a URL do Bridge e a porta esperada;
- `bridge/test-bridge.ps1` agora testa também `/history/closed?days=30&limit=50`;
- nenhuma alteração de credenciais ou do vínculo Supabase é necessária.

Motivo: a leitura de saldo/equity é instantânea, mas a reconstrução do histórico MT5 pode levar mais do que 4,5 s na primeira chamada, principalmente após login/troca de conta.
