# JV FX v1.2.3 — Setup do beta real

Objetivo: sair do modo demonstração e validar o produto com usuários reais, sem ainda abrir a plataforma ao público.

## Ordem de validação

1. Criar projeto Supabase real.
2. Rodar migrations `0001` até `0015` e depois `seed.sql`.
3. Configurar `.env.local`.
4. Criar a primeira conta pelo próprio JV FX.
5. Promover essa conta a ADMIN com `supabase/bootstrap_admin.sql`.
6. Criar um segundo usuário por e-mail/senha e aprovar no painel Admin.
7. Confirmar isolamento de dados entre usuários.
8. Configurar Google OAuth e repetir o fluxo com uma terceira conta.
9. Somente depois conectar Exness/MT5.

## Ambiente local

```env
NEXT_PUBLIC_APP_MODE=production
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
REGISTRATION_OPEN=true
MARKET_DATA_PROVIDER=demo
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` continua aceito como compatibilidade, mas o projeto prioriza `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Valide:

```bash
npm run verify:env
npm run typecheck
npm run build
npm run dev
```

## Primeiro administrador

Cadastre sua conta em `/signup`, confirme o e-mail se necessário e rode `supabase/bootstrap_admin.sql` após substituir `SEU_EMAIL_AQUI`.

Depois saia e entre novamente. `/dashboard/admin` deve abrir.

## Teste de isolamento

Usuário A:
- crie uma conta de trading;
- crie/importa uma operação;
- adicione uma nota/tag.

Usuário B:
- entre em outro navegador/perfil;
- confirme que não vê conta, operação, nota, tags ou relatórios do Usuário A.

Administrador:
- deve ver os usuários na gestão administrativa, mas os módulos normais de journal continuam obedecendo ao `user_id` e RLS.

## Google

Após e-mail/senha funcionar, configure Google no Supabase. O callback do aplicativo é `/auth/callback`; o callback OAuth do Google deve ser o callback fornecido na tela do provider Google do próprio Supabase.

## Critério para avançar ao MT5

Não conectar conta Exness real até estes testes passarem:
- login por e-mail;
- aprovação administrativa;
- suspensão;
- segundo usuário isolado;
- Google OAuth;
- `npm run build` sem erro.
