# Autenticação e Liberação de Acesso — JV FX v1.2.2

A v1.2.2 suporta:

- cadastro com e-mail + senha;
- login com e-mail + senha;
- login/cadastro com Google via Supabase Auth;
- aprovação administrativa antes do primeiro acesso ao dashboard;
- suspensão e reativação pelo administrador.

## Fluxo

```text
Usuário cria conta
        ↓
Supabase Auth
        ↓
profile.account_status = PENDING
        ↓
Administrador → Usuários
        ↓
Aprovar acesso
        ↓
ACTIVE
        ↓
Dashboard liberado
```

## Variáveis

No `.env.local`:

```env
NEXT_PUBLIC_APP_MODE=production
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA-ANON-KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
REGISTRATION_OPEN=true
```

Em produção, troque `NEXT_PUBLIC_SITE_URL` pela URL HTTPS real.

## Supabase

1. Crie/configure o projeto.
2. Execute as migrations em ordem até `0015_journal_access.sql`.
3. Em **Authentication → URL Configuration**, configure a Site URL e inclua os callbacks permitidos, por exemplo:
   - `http://localhost:3000/auth/callback`
   - `https://seu-dominio.com/auth/callback`
4. Para Google, habilite o provider Google no Supabase e configure Client ID/Secret do Google Cloud.
5. Configure no Google Cloud o redirect URI exigido pelo Supabase para o provider.

## E-mail

Se confirmação de e-mail estiver habilitada no Supabase, após o cadastro o usuário precisa primeiro confirmar o e-mail. Em seguida, a conta permanece `PENDING` até aprovação pelo administrador.

## Aprovação

Abra:

```text
/dashboard/admin/users
```

Usuários pendentes exibem o botão **Aprovar acesso**.

O novo usuário começa com função `FREE`. Depois da aprovação você pode alterá-lo para `TRADER` ou `ADMIN` conforme necessário.

## Fechar novos cadastros

```env
REGISTRATION_OPEN=false
```

Isso bloqueia novos cadastros por e-mail/senha. Para uma política de convites totalmente fechada com OAuth, recomenda-se também desabilitar temporariamente o provider externo no Supabase ou evoluir para uma allowlist administrativa.
