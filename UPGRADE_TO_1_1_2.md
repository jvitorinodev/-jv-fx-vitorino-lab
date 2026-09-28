# Atualização v1.1.1 → v1.1.2

1. Faça backup da pasta v1.1.1 e do banco antes de qualquer migration.
2. Extraia a v1.1.2 em uma nova pasta.
3. Copie seu `.env.local` antigo e revise as variáveis.
4. Rode:

```powershell
npm install
npm run typecheck
npm run build
```

5. Em produção, aplique:

```text
0013_v1_1_2_execution_and_evidence.sql
```

6. Substitua também a pasta `bridge`, pois a v1.1.2 adiciona:

```text
GET /symbol/{symbol}/spec
GET /execution/estimate/{symbol}
```

7. Inicie o Bridge e depois o Next.js.
8. Teste `/dashboard/terminal`, `/dashboard/position-size` e o salvamento de snapshot técnico.

## Mudança importante de risco

O teto configurável de risco por operação agora é 100%. Os limites diário (25%) e semanal (50%) continuam ativos e podem reduzir o máximo permitido para a próxima operação.
