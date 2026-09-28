# JV FX v1.2.6 — Hotfix visual

Correção do erro de build do tema escuro.

## Corrigido

- Removida a dependência circular do Tailwind causada por `@apply bg-slate-900` dentro da camada `.app-dark`.
- O tema escuro agora usa CSS puro e seletores por atributo, sem redefinir diretamente utilitários Tailwind.
- Mantidos o novo badge JV, avatar do usuário, seletor claro/escuro e rodapé visual da sidebar.

## Teste local

```powershell
npm install
npm run verify:env
npm run build
npm run dev
```
