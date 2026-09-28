"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Database } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { DailyReviewEditor } from "@/features/reports/components/daily-review-editor";
import { ReportMetric } from "@/features/reports/components/report-metric";
import { loadDemoTrades } from "@/features/journal/data/demo-trade-store";
import { buildDailyReport } from "@/lib/core/report-service";
import type { TradeRecord } from "@/lib/types/journal";
import type { DailyReview } from "@/lib/types/reports";
import { formatters, labelDataSource, labelDirection, labelTradingSession } from "@/lib/i18n/pt-br";

export function DailyReportView({ dateKey, initialTrades, initialReview, timeZone, source }: { dateKey: string; initialTrades: TradeRecord[]; initialReview: DailyReview | null; timeZone: string; source: "DEMO" | "MANUAL" }) {
  const [trades, setTrades] = useState(initialTrades);
  useEffect(() => {
    if (source !== "DEMO") {
      setTrades(initialTrades);
      return;
    }
    const local = loadDemoTrades();
    const ids = new Set(local.map((trade) => trade.id));
    setTrades([...local, ...initialTrades.filter((trade) => !ids.has(trade.id))]);
  }, [initialTrades, source]);
  const report = useMemo(() => buildDailyReport(trades, dateKey, timeZone), [dateKey, timeZone, trades]);
  const title = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${dateKey}T12:00:00Z`));

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><Link href="/dashboard/reports" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"><ArrowLeft className="size-3" />Relatórios</Link><h1 className="text-2xl font-semibold tracking-tight">Relatório Diário</h1><p className="mt-1 text-sm text-slate-500 capitalize">{title} · agrupado pela data de abertura</p></div><StatusPill tone={source === "DEMO" ? "info" : "neutral"}><Database className="mr-1 size-3" />{labelDataSource(source)}</StatusPill></div>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <ReportMetric label="P&L líquido" value={formatters.usd.format(report.netPnl)} tone={tone(report.netPnl)} />
      <ReportMetric label="R total" value={`${signed(report.totalR)}R`} tone={tone(report.totalR)} />
      <ReportMetric label="Taxa de acerto" value={`${report.winRate.toFixed(1)}%`} detail={`${report.wins}G · ${report.losses}P · ${report.breakEvens}BE`} />
      <ReportMetric label="R médio" value={`${signed(report.averageR)}R`} tone={tone(report.averageR)} />
      <ReportMetric label="Fator de lucro" value={report.profitFactor == null ? "∞" : report.profitFactor.toFixed(2)} />
      <ReportMetric label="Recuo máx.*" value={`${report.maxDrawdownR.toFixed(2)}R`} detail="aproximação pela sequência de operações" tone={report.maxDrawdownR > 0 ? "warning" : "neutral"} />
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
      <div className="panel overflow-hidden"><div className="panel-header"><div><p className="eyebrow">Execuções</p><h2 className="mt-1 text-sm font-semibold">Operações</h2></div><span className="text-xs text-slate-500">{report.tradeCount} no total · {report.openCount} em aberto</span></div><div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left text-xs"><thead className="border-b border-slate-800/80 text-[9px] uppercase tracking-[0.15em] text-slate-600"><tr><th className="px-4 py-3">Estratégia</th><th className="px-3 py-3">Ativo</th><th className="px-3 py-3">Direção</th><th className="px-3 py-3">Sessão</th><th className="px-3 py-3">R</th><th className="px-3 py-3">P&L</th><th className="px-4 py-3 text-right">Detalhes</th></tr></thead><tbody>{report.trades.map((trade) => <tr key={trade.id} className="border-b border-slate-900 text-slate-300"><td className="px-4 py-3"><p className="font-medium text-slate-200">{trade.setupId}</p><p className="mt-0.5 text-[10px] text-slate-600">{trade.setupName}</p></td><td className="px-3 py-3 font-medium">{trade.symbol}</td><td className={`px-3 py-3 ${trade.direction === "LONG" ? "text-emerald-300" : "text-red-300"}`}>{labelDirection(trade.direction)}</td><td className="px-3 py-3 text-slate-500">{labelTradingSession(trade.session)}</td><td className={`tabular px-3 py-3 ${toneClass(trade.realizedR)}`}>{trade.realizedR == null ? "ABERTA" : `${signed(trade.realizedR)}R`}</td><td className={`tabular px-3 py-3 ${toneClass(trade.netPnl)}`}>{trade.netPnl == null ? "—" : formatters.usd.format(trade.netPnl)}</td><td className="px-4 py-3 text-right"><Link href={`/dashboard/journal/${trade.id}`} className="inline-flex items-center gap-1 text-slate-400 hover:text-white">Ver <ArrowUpRight className="size-3" /></Link></td></tr>)}</tbody></table>{!report.trades.length ? <div className="p-8 text-center text-sm text-slate-500">Nenhuma operação foi aberta nesta data.</div> : null}</div></div>
      <div className="grid gap-4"><Spotlight title="Melhor operação" trade={report.bestTrade} /><Spotlight title="Pior operação" trade={report.worstTrade} /></div>
    </section>

    <section className="grid gap-4 xl:grid-cols-3"><Breakdown title="Por sessão" rows={report.sessionBreakdown} /><Breakdown title="Por ativo" rows={report.assetBreakdown} /><Breakdown title="Por conta" rows={report.accountBreakdown} /></section>
    <DailyReviewEditor dateKey={dateKey} source={source} initialReview={initialReview} />
    <p className="text-[11px] leading-5 text-slate-600">* O recuo diário é uma aproximação derivada da sequência de resultados das operações fechadas. Não representa a oscilação intradiária do patrimônio marcado a mercado.</p>
  </div>;
}

function Breakdown({ title, rows }: { title: string; rows: ReturnType<typeof buildDailyReport>["sessionBreakdown"] }) {
  return <div className="panel overflow-hidden"><div className="panel-header"><h2 className="text-sm font-semibold">{title}</h2></div><div>{rows.map((row) => <div key={row.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-slate-900 px-4 py-3 text-xs last:border-0"><div><p className="font-medium text-slate-300">{row.label}</p><p className="mt-0.5 text-[10px] text-slate-600">{row.trades} operações · {row.winRate.toFixed(0)}% acerto</p></div><span className={`tabular ${toneClass(row.totalR)}`}>{signed(row.totalR)}R</span><span className={`tabular min-w-20 text-right ${toneClass(row.netPnl)}`}>{formatters.usd.format(row.netPnl)}</span></div>)}{!rows.length ? <p className="p-5 text-sm text-slate-600">Sem dados.</p> : null}</div></div>;
}

function Spotlight({ title, trade }: { title: string; trade: TradeRecord | null }) {
  return <div className="panel p-4"><p className="eyebrow">{title}</p>{trade ? <><div className="mt-3 flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-200">{trade.symbol} · {labelDirection(trade.direction)}</p><p className="mt-1 text-xs text-slate-500">{trade.setupName}</p></div><span className={`tabular text-sm font-semibold ${toneClass(trade.realizedR)}`}>{signed(trade.realizedR ?? 0)}R</span></div><p className={`tabular mt-4 text-xl font-semibold ${toneClass(trade.netPnl)}`}>{formatters.usd.format(trade.netPnl ?? 0)}</p></> : <p className="mt-3 text-sm text-slate-600">Nenhuma operação fechada.</p>}</div>;
}

function signed(value: number) { return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`; }
function tone(value: number): "neutral" | "positive" | "negative" { return value > 0 ? "positive" : value < 0 ? "negative" : "neutral"; }
function toneClass(value: number | null) { if (value == null || value === 0) return "text-slate-400"; return value > 0 ? "text-emerald-300" : "text-red-300"; }
