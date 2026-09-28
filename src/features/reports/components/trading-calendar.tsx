"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Database } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { ReportMetric } from "@/features/reports/components/report-metric";
import { loadDemoTrades } from "@/features/journal/data/demo-trade-store";
import { buildMonthlyReport, currentMonthKey, localDateKey, shiftMonthKey } from "@/lib/core/report-service";
import type { TradeRecord } from "@/lib/types/journal";
import { formatters, labelDataSource } from "@/lib/i18n/pt-br";
import { extractTradeReason, getLastLosingTrade, getLastWinningTrade } from "@/lib/core/trade-insight-service";

const weekDays = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

export function TradingCalendar({ initialTrades, timeZone, source }: { initialTrades: TradeRecord[]; timeZone: string; source: "DEMO" | "MANUAL" }) {
  const [trades, setTrades] = useState(initialTrades);
  const [monthKey, setMonthKey] = useState(() => currentMonthKey(timeZone));

  useEffect(() => {
    if (source !== "DEMO") {
      setTrades(initialTrades);
      return;
    }
    const local = loadDemoTrades();
    const ids = new Set(local.map((trade) => trade.id));
    setTrades([...local, ...initialTrades.filter((trade) => !ids.has(trade.id))]);
  }, [initialTrades, source]);

  const month = useMemo(() => buildMonthlyReport(trades, monthKey, timeZone), [monthKey, timeZone, trades]);
  const lastWin = useMemo(() => getLastWinningTrade(trades), [trades]);
  const lastLoss = useMemo(() => getLastLosingTrade(trades), [trades]);
  const reasonsByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    trades.forEach((trade) => {
      const key = localDateKey(trade.openedAt, timeZone);
      const reason = extractTradeReason(trade);
      const current = map.get(key) ?? [];
      if (reason && !current.includes(reason)) current.push(reason);
      map.set(key, current.slice(0, 2));
    });
    return map;
  }, [timeZone, trades]);

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-semibold tracking-tight">Calendário de Operações</h1><p className="mt-1 text-sm text-slate-500">Desempenho diário realizado, agrupada pela data de abertura das operações.</p></div><StatusPill tone={source === "DEMO" ? "info" : "neutral"}><Database className="mr-1 size-3" />{labelDataSource(source)}</StatusPill></div>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><ReportMetric label="P&L mensal" value={formatters.usd.format(month.netPnl)} tone={tone(month.netPnl)} /><ReportMetric label="R total" value={`${signed(month.totalR)}R`} tone={tone(month.totalR)} /><ReportMetric label="Operações" value={String(month.tradeCount)} /><ReportMetric label="Taxa de acerto" value={`${month.winRate.toFixed(1)}%`} /><ReportMetric label="Último lucro" value={lastWin?.netPnl != null ? formatters.usd.format(lastWin.netPnl) : "—"} tone={lastWin ? "positive" : "neutral"} detail={lastWin ? `${lastWin.symbol} · ${formatDate(lastWin.closedAt ?? lastWin.openedAt)}` : "Sem ganho fechado"} /><ReportMetric label="Última perda" value={lastLoss?.netPnl != null ? formatters.usd.format(lastLoss.netPnl) : "—"} tone={lastLoss ? "negative" : "neutral"} detail={lastLoss ? `${lastLoss.symbol} · ${formatDate(lastLoss.closedAt ?? lastLoss.openedAt)}` : "Sem perda fechada"} /></section>

    <section className="panel overflow-hidden"><div className="panel-header"><button type="button" onClick={() => setMonthKey((value) => shiftMonthKey(value, -1))} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-900 hover:text-white" aria-label="Mês anterior"><ChevronLeft className="size-4" /></button><h2 className="text-sm font-semibold capitalize">{month.monthLabel}</h2><button type="button" onClick={() => setMonthKey((value) => shiftMonthKey(value, 1))} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-900 hover:text-white" aria-label="Próximo mês"><ChevronRight className="size-4" /></button></div><div className="grid grid-cols-7 border-b border-slate-800/80 bg-slate-950/35">{weekDays.map((day) => <div key={day} className="px-2 py-2 text-center text-[9px] font-semibold tracking-[0.14em] text-slate-600">{day}</div>)}</div><div className="grid grid-cols-7">{month.days.map((day) => {
      const reasons = reasonsByDate.get(day.dateKey) ?? [];
      const primaryReason = reasons[0] ?? "";
      return <Link key={day.dateKey} href={`/dashboard/reports/${day.dateKey}`} className={`group min-h-[120px] border-b border-r border-slate-900 p-2.5 transition hover:bg-slate-900/45 ${day.inMonth ? "bg-slate-950/20" : "bg-black/15 opacity-35"}`} title={reasons.join(" • ")}><div className="flex items-center justify-between"><span className={`grid size-6 place-items-center rounded-md text-[11px] ${day.isToday ? "bg-sky-500/15 font-semibold text-sky-300 ring-1 ring-sky-500/30" : "text-slate-500"}`}>{day.dayNumber}</span>{day.tradeCount ? <span className="text-[9px] text-slate-600">{day.tradeCount} op.</span> : null}</div>{day.tradeCount ? <div className="mt-4"><p className={`tabular text-xs font-semibold ${toneClass(day.netPnl)}`}>{formatters.usd.format(day.netPnl)}</p><p className={`tabular mt-1 text-[10px] ${toneClass(day.totalR)}`}>{signed(day.totalR)}R</p><p className="mt-2 text-[9px] text-slate-600">{day.wins}G · {day.losses}P · {day.breakEvens}BE</p>{primaryReason ? <p className="mt-2 line-clamp-2 text-[9px] leading-4 text-slate-500">Motivo: {primaryReason}</p> : null}</div> : <p className="mt-6 text-center text-[9px] text-slate-800 group-hover:text-slate-700">Sem operações</p>}</Link>;
    })}</div></section>

    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Ferramenta adicional</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-900">Calculadora de lote · Exness / MT5</h2>
          <p className="mt-1 text-xs text-slate-500">Agora a calculadora fica em um módulo próprio no menu lateral para acesso mais rápido.</p>
        </div>
        <Link href="/dashboard/position-size" className="action">Abrir calculadora</Link>
      </div>
    </section>
  </div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(value)); }
function signed(value: number) { return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`; }
function tone(value: number): "neutral" | "positive" | "negative" { return value > 0 ? "positive" : value < 0 ? "negative" : "neutral"; }
function toneClass(value: number) { return value > 0 ? "text-emerald-300" : value < 0 ? "text-red-300" : "text-slate-500"; }
