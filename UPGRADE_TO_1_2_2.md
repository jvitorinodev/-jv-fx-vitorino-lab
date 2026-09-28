# Atualização para v1.2.2

## 1. Código

Use uma pasta nova e execute:

```powershell
npm install
npm run typecheck
npm run build
```

## 2. Banco

Aplique a nova migration:

```text
0015_journal_access.sql
```

Ela adiciona:

- `trades.tags`;
- `trades.quick_note`;
- status `PENDING` para novos usuários;
- aprovação administrativa;
- estatística de usuários pendentes.

## 3. Autenticação

Configure:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
REGISTRATION_OPEN=true
```

Veja `AUTH_SETUP.md` para Google e Supabase.

## 4. Journal

A v1.2.2 adiciona tags, nota rápida, filtros por ativo/conta/período/origem/tag e paginação.

## 5. Desempenho

Novas métricas:

- drawdown monetário;
- ganho médio;
- perda média;
- expectância monetária;
- custos totais;
- sequência máxima de ganhos;
- sequência máxima de perdas;
- análises por conta e por tag.
