# JV FX · Vitorino LAB v1.2.5 — Teste local

Este pacote já inclui `.env.local` configurado para o ambiente beta informado pelo proprietário do projeto.

## Primeira execução

No PowerShell, dentro desta pasta:

```powershell
npm install
npm run verify:env
npm run typecheck
npm run build
npm run dev
```

Abra:

- `http://localhost:3000`
- `http://localhost:3000/dashboard/integrations`

## Verificação beta

Com o aplicativo configurado, execute:

```powershell
npm run verify:beta
```

Enquanto `MARKET_DATA_PROVIDER=demo`, o Bridge MT5 não é obrigatório.

## Próxima etapa do projeto

1. Validar Google OAuth.
2. Confirmar cadastro PENDING -> aprovação ADMIN -> ACTIVE.
3. Depois alterar a integração para MT5 e testar o Bridge com a conta Exness.

> Não publique o arquivo `.env.local` em repositórios. Ele já está ignorado pelo `.gitignore`.


## v1.2.5 — antes do teste de contas

No Supabase SQL Editor execute `SUPABASE_1_2_5.sql`. Depois reinicie o app e valide no topo as opções `Todas as contas ativas`, `REAL · Exness Real` e `DEMO · Conta Demonstração`. Abra também o menu do usuário e teste `Sair da conta`.
