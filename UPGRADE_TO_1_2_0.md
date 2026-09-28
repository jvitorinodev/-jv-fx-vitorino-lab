# Atualização para v1.2.0

Recomendação: instale em uma pasta nova.

```powershell
npm install
npm run typecheck
npm run build
npm run dev
```

A v1.2.0 não exige migration nova.

## Mudança importante

O produto mudou de direção. A antiga experiência de terminal/análise não aparece mais no menu principal. A base passa a ser journal, calendário, relatórios e desempenho alimentados manualmente ou por importação Exness/MT5.

## Dependências

A dependência `lightweight-charts` foi removida. Ao executar `npm install` na pasta nova, ela não será instalada.
