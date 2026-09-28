"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import { closeTradeAction } from "@/features/journal/actions/trade-actions";
import { calculateTradeOutcome } from "@/lib/core/trade-lifecycle-service";
import { findDemoTrade, upsertDemoTrade } from "@/features/journal/data/demo-trade-store";
import type { TradeChecklist, TradeRecord } from "@/lib/types/journal";
import { StatusPill } from "@/components/ui/status-pill";
import {
  formatters,
  labelDataSource,
  labelDirection,
  labelTradeResult,
  labelTradeStatus,
  labelTradingSession,
} from "@/lib/i18n/pt-br";

const fieldClass = "mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-500";
const textAreaClass = "mt-1.5 min-h-24 w-full resize-y rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500";

const checklistLabels: Record<keyof TradeChecklist, string> = {
  htfAligned: "Alinhamento do timeframe superior",
  liquidityTaken: "Liquidez capturada",
  poiIdentified: "POI identificado",
  fvgPresent: "FVG presente",
  structureShift: "Mudança de estrutura",
  priceActionConfirmation: "Confirmação por Ação do Preço",
  riskCalculated: "Risco calculado",
  dailyLimitChecked: "Limite diário verificado",
  newsChecked: "Notícias verificadas",
};

export function TradeDetail({ initialTrade, requestedId, demoMode }: { initialTrade: TradeRecord | null; requestedId: string; demoMode: boolean }) {
  const [trade, setTrade] = useState(initialTrade);
  const [exitPrice, setExitPrice] = useState(initialTrade?.targetPrice ?? initialTrade?.entryPrice ?? 0);
  const [commission, setCommission] = useState(0);
  const [swap, setSwap] = useState(0);
  const [mistakes, setMistakes] = useState("");
  const [lessons, setLessons] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!demoMode || trade) return;
    const local = findDemoTrade(requestedId);
    if (local) {
      setTrade(local);
      setExitPrice(local.targetPrice ?? local.entryPrice);
    }
  }, [demoMode, requestedId, trade]);

  const checked = useMemo(() => trade ? Object.values(trade.checklist).filter(Boolean).length : 0, [trade]);

  if (!trade) {
    return <div className="space-y-4"><Link href="/dashboard/journal" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft className="size-4" />Voltar ao diário</Link><div className="panel p-8 text-center text-sm text-slate-500">Operação não encontrada.</div></div>;
  }

  function closeTrade() {
    const current = trade;
    if (!current) return;
    setMessage(null);

    if (demoMode) {
      try {
        if (current.riskAmount == null || current.riskAmount <= 0) throw new Error("Esta operação não possui risco original suficiente para calcular o R automaticamente.");
        const outcome = calculateTradeOutcome({
          direction: current.direction,
          entryPrice: current.entryPrice,
          exitPrice,
          positionSize: current.positionSize,
          contractSize: current.contractSize,
          conversionRate: current.conversionRate,
          riskAmount: current.riskAmount,
          commission,
          swap,
        });
        const now = new Date().toISOString();
        const closed: TradeRecord = {
          ...current,
          status: "CLOSED",
          result: outcome.result,
          exitPrice,
          grossPnl: outcome.grossPnl,
          netPnl: outcome.netPnl,
          realizedR: outcome.realizedR,
          commission: Math.abs(commission),
          swap,
          mistakes: mistakes.trim(),
          lessons: lessons.trim(),
          closedAt: now,
          updatedAt: now,
        };
        upsertDemoTrade(closed);
        setTrade(closed);
        setMessage({ tone: "success", text: `${closed.setupId} fechada em ${closed.realizedR?.toFixed(2) ?? "0.00"}R.` });
      } catch (error) {
        setMessage({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível encerrar a operação." });
      }
      return;
    }

    startTransition(async () => {
      const result = await closeTradeAction({ tradeId: current.id, exitPrice, commission, swap, mistakes, lessons });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      setTrade(result.trade);
      setMessage({ tone: "success", text: result.message });
    });
  }

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><Link href="/dashboard/journal" className="mb-3 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-200"><ArrowLeft className="size-4" />Diário de Operações</Link><h1 className="text-2xl font-semibold tracking-tight">{trade.setupId}</h1><p className="mt-1 text-sm text-slate-500">{trade.symbol} · {trade.setupName}</p></div>
      <div className="flex gap-2"><StatusPill tone={trade.direction === "LONG" ? "positive" : "negative"}>{labelDirection(trade.direction)}</StatusPill><StatusPill tone={trade.status === "OPEN" ? "info" : trade.result === "WIN" ? "positive" : trade.result === "LOSS" ? "negative" : "neutral"}>{trade.status === "CLOSED" ? labelTradeResult(trade.result) : labelTradeStatus(trade.status)}</StatusPill></div>
    </div>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Metric label="Entrada" value={formatPrice(trade.entryPrice)} />
      <Metric label="Preço de Stop" value={trade.stopPrice == null ? "—" : formatPrice(trade.stopPrice)} />
      <Metric label="Alvo" value={trade.targetPrice == null ? "—" : formatPrice(trade.targetPrice)} />
      <Metric label="Lote" value={`${trade.positionSize.toFixed(2)} lote`} />
      <Metric label="Risco" value={trade.riskPercent == null || trade.riskAmount == null ? "Não disponível" : `${trade.riskPercent.toFixed(2)}% · ${formatters.usd.format(trade.riskAmount)}`} />
      <Metric label="R:R esperado" value={trade.expectedRr == null ? "—" : `1:${trade.expectedRr.toFixed(2)}`} />
    </section>

    {trade.status === "CLOSED" ? <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Saída" value={trade.exitPrice == null ? "—" : formatPrice(trade.exitPrice)} /><Metric label="R realizado" value={trade.realizedR == null ? "—" : `${trade.realizedR >= 0 ? "+" : ""}${trade.realizedR.toFixed(2)}R`} tone={(trade.realizedR ?? 0) > 0 ? "positive" : (trade.realizedR ?? 0) < 0 ? "negative" : "neutral"} /><Metric label="P&L líquido" value={trade.netPnl == null ? "—" : formatters.usd.format(trade.netPnl)} tone={(trade.netPnl ?? 0) > 0 ? "positive" : (trade.netPnl ?? 0) < 0 ? "negative" : "neutral"} /><Metric label="Fechamento" value={trade.closedAt ? new Date(trade.closedAt).toLocaleString("pt-BR") : "—"} /></section> : null}

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(350px,.8fr)]">
      <div className="space-y-5">
        <section className="panel overflow-hidden"><div className="panel-header"><div><p className="eyebrow">Tese da operação</p><h2 className="mt-1 text-sm font-semibold">Contexto</h2></div><span className="text-xs text-slate-500">{trade.higherTimeframe ?? "—"} → {trade.timeframe}</span></div><div className="grid gap-4 p-4 sm:grid-cols-2"><Detail label="Conta" value={trade.accountName} /><Detail label="Símbolo da corretora" value={trade.brokerSymbol} /><Detail label="Origem" value={labelDataSource(trade.source)} /><Detail label="Ticket da corretora" value={trade.brokerPositionId ? `#${trade.brokerPositionId}` : "—"} /><Detail label="Sessão" value={labelTradingSession(trade.session)} /><Detail label="Estratégia" value={trade.strategy} /><div className="sm:col-span-2"><p className="eyebrow">Notas</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{trade.notes || "Nenhuma nota pré-operação registrada."}</p></div><div className="sm:col-span-2"><p className="eyebrow">Tags</p><div className="mt-2 flex flex-wrap gap-1">{(trade.tags ?? []).length ? (trade.tags ?? []).map((tag) => <span key={tag} className="rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">{tag}</span>) : <span className="text-sm text-slate-400">Nenhuma tag.</span>}</div></div><div className="sm:col-span-2"><p className="eyebrow">Nota rápida</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">{trade.quickNote || "Nenhuma nota rápida registrada."}</p></div></div></section>

        <section className="panel overflow-hidden"><div className="panel-header"><div><p className="eyebrow">Evidências</p><h2 className="mt-1 text-sm font-semibold">Confluências</h2></div><span className="text-xs text-slate-500">{trade.confluences.length}</span></div><div className="flex flex-wrap gap-2 p-4">{trade.confluences.length ? trade.confluences.map((item) => <span key={`${item.key}-${item.timeframe}`} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">{item.label}<span className="ml-2 text-[10px] text-slate-600">+{item.weight}{item.timeframe ? ` · ${item.timeframe}` : ""}</span></span>) : <p className="text-sm text-slate-500">Nenhuma confluência registrada.</p>}</div></section>

        {trade.status === "CLOSED" ? <section className="panel overflow-hidden"><div className="panel-header"><div><p className="eyebrow">Revisão pós-operação</p><h2 className="mt-1 text-sm font-semibold">Erros e Aprendizados</h2></div></div><div className="grid gap-4 p-4 sm:grid-cols-2"><div><p className="eyebrow">Erros</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{trade.mistakes || "Nenhum erro registrado."}</p></div><div><p className="eyebrow">Aprendizados</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{trade.lessons || "Nenhum aprendizado registrado."}</p></div></div></section> : null}
      </div>

      <aside className="space-y-5">
        <section className="panel overflow-hidden"><div className="panel-header"><div><p className="eyebrow">Registro de prontidão</p><h2 className="mt-1 text-sm font-semibold">Checklist Pré-Operação</h2></div><span className="tabular text-xs text-slate-500">{checked}/{Object.keys(trade.checklist).length}</span></div><div className="space-y-1.5 p-4">{(Object.entries(trade.checklist) as [keyof TradeChecklist, boolean][]).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-lg border border-slate-900 bg-slate-950/25 px-3 py-2 text-xs"><span className="text-slate-400">{checklistLabels[key]}</span>{value ? <Check className="size-4 text-emerald-300" /> : <X className="size-4 text-slate-700" />}</div>)}</div></section>

        {trade.status === "OPEN" && trade.riskAmount != null ? <section className="panel overflow-hidden"><div className="panel-header"><div><p className="eyebrow">Ciclo da operação</p><h2 className="mt-1 text-sm font-semibold">Encerrar Operação</h2></div></div><div className="space-y-4 p-4"><label className="text-xs text-slate-400">Preço de saída<input className={fieldClass} type="number" step="any" value={exitPrice} onChange={(event) => setExitPrice(Number(event.target.value))} /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Comissão<input className={fieldClass} type="number" min="0" step="0.01" value={commission} onChange={(event) => setCommission(Number(event.target.value))} /></label><label className="text-xs text-slate-400">Ajuste noturno (swap)<input className={fieldClass} type="number" step="0.01" value={swap} onChange={(event) => setSwap(Number(event.target.value))} /></label></div><label className="text-xs text-slate-400">Erros<textarea className={textAreaClass} value={mistakes} onChange={(event) => setMistakes(event.target.value)} placeholder="O que poderia ter sido executado melhor?" /></label><label className="text-xs text-slate-400">Aprendizados<textarea className={textAreaClass} value={lessons} onChange={(event) => setLessons(event.target.value)} placeholder="O que esta operação ensinou?" /></label>{message ? <div className={`rounded-lg border p-3 text-xs ${message.tone === "success" ? "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-200" : "border-red-400/20 bg-red-400/[0.04] text-red-200"}`}>{message.text}</div> : null}<button type="button" disabled={isPending || exitPrice <= 0} onClick={closeTrade} className="h-11 w-full rounded-lg bg-slate-100 text-sm font-semibold text-slate-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">{isPending ? "Calculando…" : "Encerrar e Calcular Resultado"}</button><p className="text-[10px] leading-5 text-slate-600">O R realizado e o P&L são calculados com a entrada registrada, especificação do contrato, tamanho da posição e preço real de saída.</p></div></section> : null}
      </aside>
    </div>
  </div>;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "positive" | "negative" }) {
  const cls = tone === "positive" ? "text-emerald-300" : tone === "negative" ? "text-red-300" : "text-slate-100";
  return <div className="panel p-4"><p className="eyebrow">{label}</p><p className={`tabular mt-2 text-sm font-semibold ${cls}`}>{value}</p></div>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="eyebrow">{label}</p><p className="mt-1.5 text-sm text-slate-300">{value}</p></div>; }
function formatPrice(value: number) { return value >= 1000 ? value.toFixed(2) : value >= 10 ? value.toFixed(3) : value.toFixed(5); }
