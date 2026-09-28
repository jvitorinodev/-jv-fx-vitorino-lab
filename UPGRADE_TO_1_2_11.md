# JV FX · Vitorino LAB v1.2.11 — UX de desempenho e gestão de risco

Esta versão parte da **v1.2.10-STABLE** já validada para Supabase, Bridge MT5, conta Real, Demo e sincronização.

## Escopo desta atualização

- Visão Geral:
  - substitui Fator de Lucro / Lucro médio por **Último lucro** e **Última perda**;
  - remove o gráfico redundante de ganhos/perdas por dia;
  - adiciona lista dos últimos resultados com data, hora e motivo;
  - P&L acumulado interativo por operação com tooltip de data, hora, P&L e motivo.
- Operações / Journal:
  - cards principais passam a destacar **Último lucro** e **Última perda**;
  - filtros, importação MT5, isolamento por conta e anotações permanecem intactos.
- Calendário:
  - mostra o motivo principal dos trades dentro do respectivo dia;
  - substitui métricas redundantes por último lucro / última perda;
  - incorpora a calculadora de lote Exness / MT5.
- Calculadora de lote:
  - perfis Conservador, Arriscado e Especulador;
  - cálculo de lote, orçamento de risco, risco real, margem estimada, alavancagem e capital comprometido;
  - usa o endpoint de estimativa de execução já existente e não envia ordens.
- Desempenho:
  - P&L acumulado interativo com data/hora/motivo;
  - qualidade do histórico usa verde para positivo, vermelho para negativo e cinza para neutro/sem operação;
  - cards principais destacam último lucro / última perda.

## Banco e infraestrutura

**Nenhuma migration nova é necessária.** Não execute SQL adicional para esta versão.

A atualização não altera:

- autenticação Supabase;
- RLS;
- vínculo de contas MT5;
- Bridge Python;
- associação Real/Demo;
- importação e deduplicação do histórico;
- sincronização automática;
- segredos `.env`.

## Atualização segura

1. Mantenha a pasta `v1.2.10-STABLE` como backup.
2. Extraia `v1.2.11-STABLE` em outra pasta.
3. Não copie `.env.local` de outra instalação se o pacote já contém a configuração validada.
4. Rode:

```powershell
.\TESTAR_V1_2_11.ps1
```

5. Somente após a validação completa, rode:

```powershell
.\INICIAR_TUDO.ps1
```

## Checklist funcional

- Real continua principal e vinculada ao login correto.
- Demo continua vinculada ao login correto.
- Seletor Real/Demo continua isolando histórico e Journal.
- P&L acumulado mostra tooltip por operação.
- Último lucro e última perda mudam conforme conta/filtros.
- Calendário mostra motivo do trade quando houver nota/setup.
- Calculadora de lote responde com margem estimada quando o Bridge MT5 está online.
- Nenhum módulo envia ordens automaticamente.
