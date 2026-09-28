# JV FX v1.2.9 — estabilidade de schema e contas MT5

Esta versão corrige a quebra do dashboard quando o código novo é aberto antes da migration do Supabase.

## 1. Atualização única do banco

No Supabase → SQL Editor, execute **uma vez** o arquivo:

`SUPABASE_1_2_9.sql`

Ele é idempotente: pode ser executado novamente sem duplicar a estrutura.

O script:
- adiciona `trading_accounts.is_primary` se ainda não existir;
- move vínculos Demo/Trial que tenham sido associados por engano à conta Real;
- garante que um login MT5 pertença a somente uma conta JV FX por usuário;
- define a conta Real como principal sempre que existir;
- mantém a Conta Demonstração separada;
- atualiza o trigger de novos usuários;
- registra a versão de schema 1.2.9.

## 2. Compatibilidade automática

Mesmo antes de aplicar a migration, a v1.2.9 não deve mais derrubar `/dashboard` com erro `column trading_accounts.is_primary does not exist`.

Ela entra em modo compatível e usa `Exness Real` como conta principal lógica até a migration ser aplicada.

## 3. Validação

Na raiz do projeto:

```powershell
.\TESTAR_V1_2_9.ps1
```

O teste verifica:
- dependências Node;
- `.env.local`;
- schema do Supabase;
- TypeScript;
- build Next.js;
- sintaxe do Bridge Python.

## 4. Inicialização

Apenas web:

```powershell
.\INICIAR_JVFX.ps1
```

Web + Bridge MT5:

```powershell
.\INICIAR_TUDO.ps1
```

Use sempre os scripts a partir da **raiz do projeto**, não da pasta `bridge`.
