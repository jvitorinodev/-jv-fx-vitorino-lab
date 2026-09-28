# Atualização para JV FX v1.0.0

## Projeto local

Recomendado: extraia a v1.0.0 em uma pasta nova e copie apenas seu `.env.local` da versão anterior.

Depois:

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Não copie `node_modules` de uma versão antiga se houver comportamento estranho; reinstale as dependências.

## Banco já existente

Se você já aplicou as migrations da v0.9.0, mantenha o histórico existente e aplique apenas a migration nova:

```text
0011_v1_release_cleanup.sql
```

Ela:

- move usuários da antiga função removida para `TRADER`;
- remove permissões descontinuadas;
- remove tabelas do módulo descontinuado;
- remove confluências antigas correspondentes;
- restringe as funções válidas para `FREE`, `TRADER` e `ADMIN`.

Faça backup do banco antes da migration.
