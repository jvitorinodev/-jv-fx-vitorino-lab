# JV FX · Vitorino LAB — v1.2.7

## Histórico por janelas úteis

A sincronização e as telas de análise agora trabalham com janelas padronizadas:

- 1 semana (7 dias)
- 14 dias
- 1 mês (30 dias)
- 3 meses (90 dias)
- 6 meses (180 dias)
- 1 ano (365 dias)
- 3 anos (1095 dias)
- Tudo (até 10 anos / 3650 dias)

O período padrão de sincronização manual passa a ser 30 dias.

## Journal MT5 automático

Depois que uma conta do JV FX for vinculada uma vez ao login MT5 correspondente, o dashboard passa a executar uma sincronização automática em segundo plano aproximadamente a cada 15 segundos enquanto a aba estiver visível e online.

A sincronização automática usa uma janela de 7 dias para localizar operações recém-fechadas e atualiza:

- Journal
- Visão geral
- Calendário
- Relatórios
- Desempenho
- saldo/equity da conta vinculada

A interface mostra um indicador no topo com o estado do Journal MT5 automático.

## Operações abertas antes da janela

O Bridge agora tenta reconstruir o histórico completo de uma posição quando encontra o fechamento dentro da janela consultada, mesmo que a entrada tenha ocorrido antes dela. Isso reduz o risco de perder uma operação de longa duração em sincronizações curtas de 7 ou 14 dias.

## Atualização dos componentes

Journal, Performance, Relatórios e Calendário agora aceitam corretamente novos dados recebidos após `router.refresh()`, em vez de manter estado antigo no navegador.

## Teste do Bridge

O script aceita a janela desejada:

```powershell
.\test-bridge.ps1 -Days 7
.\test-bridge.ps1 -Days 14
.\test-bridge.ps1 -Days 30
.\test-bridge.ps1 -Days 90
```

Valores aceitos: `7, 14, 30, 90, 180, 365, 1095, 3650`.
