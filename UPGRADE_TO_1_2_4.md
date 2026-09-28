# Atualização para v1.2.4

## O que muda

- nova **Central de integrações** em `/dashboard/integrations`;
- novo comando `npm run verify:beta`;
- checklist visual para Supabase, Google e Exness/MT5;
- Google OAuth usa `NEXT_PUBLIC_SITE_URL` como origem canônica do callback;
- o seletor de conta Google é forçado durante o teste para facilitar validação com múltiplos usuários;
- não há migration nova de banco nesta versão.

## Atualização

1. extraia a v1.2.4 em uma pasta nova;
2. copie apenas seu `.env.local` da versão anterior;
3. rode `npm install`;
4. rode `npm run verify:env`;
5. rode `npm run typecheck`;
6. rode `npm run build`;
7. rode `npm run dev`;
8. abra `/dashboard/integrations`.

Não copie `node_modules`, `.next` ou arquivos antigos de código para a nova pasta.
