# Checklist de Produção — JV FX v1.2.2

## Código
- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `python -m py_compile bridge/app/*.py`

## Supabase
- [ ] migrations até `0015_journal_access.sql`
- [ ] RLS validada com dois usuários distintos
- [ ] e-mail/senha testado
- [ ] confirmação de e-mail testada
- [ ] Google provider configurado
- [ ] callback `/auth/callback` adicionado às URLs permitidas
- [ ] cadastro entra como PENDING
- [ ] administrador aprova PENDING → ACTIVE
- [ ] usuário suspenso não acessa dashboard

## Ambiente
- [ ] `NEXT_PUBLIC_APP_MODE=production`
- [ ] `NEXT_PUBLIC_SITE_URL` HTTPS em produção
- [ ] `REGISTRATION_OPEN` definido
- [ ] chaves Supabase fora do código
- [ ] segredo do Bridge fora do frontend

## MT5
- [ ] bridge autenticado
- [ ] conta correta vinculada
- [ ] deduplicação por login + position_id validada
- [ ] sincronização incremental testada

## Operação
- [ ] backups
- [ ] monitoramento/erros
- [ ] política de privacidade/termos antes de abrir para terceiros

## v1.2.5 — integração beta
- [ ] `/dashboard/integrations` abre para usuário ACTIVE.
- [ ] Google OAuth testado com conta diferente em janela anônima.
- [ ] usuário Google novo fica PENDING.
- [ ] ADMIN aprova e o usuário continua isolado.
- [ ] `MARKET_DATA_PROVIDER=mt5` somente quando Bridge estiver configurado.
- [ ] `npm run verify:beta` passa.
- [ ] login e servidor exibidos no JV FX conferem com o MT5.
- [ ] primeira sincronização usa janela de 30 dias.
- [ ] amostra de tickets/P&L confere manualmente com o MT5.
