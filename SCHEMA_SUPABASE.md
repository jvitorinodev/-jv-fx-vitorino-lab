# Controle de schema Supabase

A partir da v1.2.9, alterações de banco devem seguir esta regra:

1. Toda mudança estrutural recebe uma migration numerada em `supabase/migrations`.
2. A release inclui um SQL consolidado/idempotente na raiz.
3. O código deve ter fallback compatível quando possível para não derrubar o dashboard.
4. `npm run verify:db` valida as colunas críticas antes de uma release ser usada.
5. `TESTAR_V1_2_9.ps1` executa essa validação antes do build.

Isso evita que código e banco avancem em versões diferentes sem aviso.
