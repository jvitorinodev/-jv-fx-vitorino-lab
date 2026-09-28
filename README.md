# JV FX · Vitorino LAB v1.2.10

> Atualização operacional: Bridge MT5 resiliente, inicialização ordenada e proteção contra mistura Demo/Real.
> Para iniciar o conjunto completo, use `./INICIAR_TUDO.ps1`. Para diagnóstico, use `./DIAGNOSTICAR_MT5.ps1`.

# JV FX · Vitorino LAB

**Versão:** 1.2.5 — Beta Integration Center

Journal de operações e análise de performance com arquitetura multiusuário, aprovação administrativa e sincronização planejada com Exness via MetaTrader 5.

## Foco atual

```text
Exness / MT5
   ↓
Sincronização
   ↓
Operações
   ↓
Calendário
   ↓
Relatórios
   ↓
Performance
```

O JV FX não gera sinais de compra ou venda e não envia ordens para a corretora nesta fase.

## Instalação

```powershell
npm install
npm run verify:env
npm run typecheck
npm run build
npm run dev
```

Para a validação do beta:

```powershell
npm run verify:beta
```

## Central de integrações

```text
/dashboard/integrations
```

Mostra:
- status do ambiente Supabase;
- conta e role atuais;
- URLs necessárias ao Google OAuth;
- status do Bridge MT5;
- conta Exness/MT5 detectada;
- saldo, equity, margem livre e alavancagem quando disponíveis;
- marcos que faltam para iniciar o beta real.

## Documentação

- `BETA_INTEGRATION_GUIDE.md`
- `AUTH_SETUP.md`
- `MT5_SETUP.md`
- `MT5_HISTORY_IMPORT.md`
- `PERFORMANCE_ARCHITECTURE.md`
- `PRODUCTION_CHECKLIST.md`


## v1.2.5 — contas ativas e sessão

- seletor global REAL/DEMO;
- conta Exness Real + Conta Demonstração padrão;
- todas as contas ativas na Central de Integrações;
- menu do usuário com logout explícito;
- próxima etapa: Bridge MT5 real.

### Journal MT5 automático (v1.2.7)

Após vincular uma conta do JV FX ao login do MT5 por uma primeira sincronização manual, o sistema verifica novas operações fechadas automaticamente aproximadamente a cada 15 segundos enquanto a aba está visível. Sincronizações históricas maiores continuam disponíveis manualmente em 1 semana, 14 dias, 1 mês, 3 meses, 6 meses, 1 ano, 3 anos e até 10 anos.
