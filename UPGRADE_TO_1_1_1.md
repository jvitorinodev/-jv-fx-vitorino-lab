# Atualização v1.1.0-hotfix.1 → v1.1.1

## Aplicação

Substitua o código pela v1.1.1 e rode:

```powershell
npm install
npm run typecheck
npm run build
```

## Supabase

Se você já possui o banco da v1.1.0/v1.0, aplique somente:

```text
supabase/migrations/0012_mt5_history_import.sql
```

Não execute o seed novamente em produção sem revisar o conteúdo.

## Bridge

Atualize também a pasta `bridge`, porque a v1.1.1 adiciona endpoints de histórico MT5.

Reinicie:

```powershell
cd bridge
./run.ps1
```

## Teste rápido

1. Abra `/dashboard/terminal` e confirme `TEMPO REAL`.
2. Abra `/dashboard/journal/import-mt5`.
3. Importe um ticket fechado.
4. Volte ao Diário e confirme `DADOS DA CORRETORA` e o ticket.
5. Tente importar o mesmo ticket novamente; ele não deve ser duplicado.
