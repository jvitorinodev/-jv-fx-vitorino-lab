"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Database, Download } from "lucide-react";
import type { TradeRecord } from "@/lib/types/journal";
import type { TradingAccount } from "@/lib/types/trading";
import type { BrokerSyncOverview } from "@/lib/types/broker-sync";
import { buildMonthlyReport, currentMonthKey, localDateKey } from "@/lib/core/report-service";
import { calculatePerformanceMetrics } from "@/lib/core/performance-service";
import { buildTradeTimelinePoints, extractTradeReason, getLastLosingTrade, getLastWinningTrade } from "@/lib/core/trade-insight-service";
import { formatters, labelDirection, labelDataSource, labelTradeResult } from "@/lib/i18n/pt-br";
import { StatusPill } from "@/components/ui/status-pill";
import { Mt5SyncCard } from "@/features/sync/components/mt5-sync-card";
import { loadDemoTrades, upsertDemoTrade } from "@/features/journal/data/demo-trade-store";
import { InteractiveEquityCurve } from "@/components/charts/interactive-equity-curve";

const PERIODS = [
  { key: "7", label: "1 semana", days: 7 },
  { key: "14", label: "14 dias", days: 14 },
  { key: "30", label: "1 mês", days: 30 },
  { key: "90", label: "3 meses", days: 90 },
  { key: "180", label: "6 meses", days: 180 },
  { key: "365", label: "1 ano", days: 365 },
  { key: "ALL", label: "Tudo", days: null },
] as const;

type PeriodKey = typeof PERIODS[number]["key"];

type DayTradeDetail = {
  id: string;
  symbol: string;
  timeLabel: string;
  pnl: number;
  reason: string;
  resultLabel: string;
};

type DayBucket = {
  dateKey: string;
  label: string;
  pnl: number;
  wins: number;
  losses: number;
  trades: number;
  details: DayTradeDetail[];
};

export function PerformanceOverview({ initialTrades, accounts, initialAccountId = "ALL", syncOverview, timeZone, source }: { initialTrades: TradeRecord[]; accounts: TradingAccount[]; initialAccountId?: string; syncOverview: BrokerSyncOverview; timeZone: string; source: "DEMO" | "MANUAL" }) {
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [accountId, setAccountId] = useState(initialAccountId);
  const [trades, setTrades] = useState<TradeRecord[]>(initialTrades);

  useEffect(() => {
    setAccountId(initialAccountId);
  }, [initialAccountId]);

  useEffect(() => {
    if (source !== "DEMO") {
      setTrades(initialTrades);
      return;
    }
    const local = loadDemoTrades();
    const map = new Map<string, TradeRecord>();
    [...local, ...initialTrades].forEach((trade) => map.set(trade.id, trade));
    setTrades([...map.values()]);
  }, [initialTrades, source]);

  function mergeDemoTrades(imported: TradeRecord[]) {
    imported.forEach(upsertDemoTrade);
    setTrades((current) => {
      const map = new Map<string, TradeRecord>();
      [...imported, ...current].forEach((trade) => map.set(trade.id, trade));
      return [...map.values()];
    });
  }

  const accountOptions = useMemo(() => {
    if (accounts.length) return accounts;
    const map = new Map<string, string>();
    trades.forEach((trade) => map.set(trade.accountId, trade.accountName));
    return [...map.entries()].map(([id, name]) => ({ id, name, broker: "Exness", type: "PERSONAL" as const, currency: "USD", balance: 0, equity: 0, source: source === "DEMO" ? "DEMO" as const : "MANUAL" as const }));
  }, [accounts, source, trades]);

  const filtered = useMemo(() => {
    const selected = PERIODS.find((item) => item.key === period) ?? PERIODS[1];
    const cutoff = selected.days == null ? null : Date.now() - selected.days * 86400000;
    return trades.filter((trade) => {
      if (accountId !== "ALL" && trade.accountId !== accountId) return false;
      const time = new Date(trade.closedAt ?? trade.openedAt).getTime();
      if (cutoff != null && time < cutoff) return false;
      return true;
    });
  }, [accountId, period, trades]);

  const closed = useMemo(() => filtered.filter((trade) => trade.status === "CLOSED"), [filtered]);
  const metrics = useMemo(() => calculatePerformanceMetrics(filtered), [filtered]);
  const daily = useMemo(() => buildDailyBuckets(closed, timeZone), [closed, timeZone]);
  const currentMonth = useMemo(() => buildMonthlyReport(filtered, currentMonthKey(timeZone), timeZone), [filtered, timeZone]);
  const recent = useMemo(() => [...filtered].sort((a, b) => +new Date(b.openedAt) - +new Date(a.openedAt)).slice(0, 8), [filtered]);
  const brokerCount = filtered.filter((trade) => trade.source === "BROKER" || trade.brokerProvider === "MT5").length;
  const lastWin = useMemo(() => getLastWinningTrade(filtered), [filtered]);
  const lastLoss = useMemo(() => getLastLosingTrade(filtered), [filtered]);
  const timelinePoints = useMemo(() => buildTradeTimelinePoints(filtered, timeZone), [filtered, timeZone]);
  const recentOutcomeTrades = useMemo(() => [...closed].sort((a, b) => new Date(b.closedAt ?? b.openedAt).getTime() - new Date(a.closedAt ?? a.openedAt).getTime()).slice(0, 6), [closed]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={syncOverview.feed.connected && syncOverview.feed.provider === "MT5_BRIDGE" ? "positive" : source === "DEMO" ? "info" : "neutral"}><Database className="mr-1 size-3" />{syncOverview.feed.connected && syncOverview.feed.provider === "MT5_BRIDGE" ? "MT5 AO VIVO" : labelDataSource(source)}</StatusPill>
            <span className="text-[11px] text-slate-500">{brokerCount ? `${brokerCount} operações vinculadas ao MT5` : "Pronto para importar histórico Exness / MT5"}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Visão geral</h1>
          <p className="mt-1 text-sm text-slate-500">Desempenho consolidado, operações e calendário em um único painel.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Conta</span>
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400">
              <option value="ALL">Todas as contas</option>
              {accountOptions.map((account) => <option key={account.id} value={account.id}>{account.type === "DEMO" ? "DEMO" : "REAL"} · {account.name}</option>)}
            </select>
          </label>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            {PERIODS.map((item) => <button key={item.key} type="button" onClick={() => setPeriod(item.key)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium transition ${period === item.key ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{item.label}</button>)}
          </div>
          <Link href="/dashboard/journal/import-mt5" className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"><Download className="size-3.5" />Importar MT5</Link>
        </div>
      </div>

      <Mt5SyncCard accounts={accountOptions} overview={syncOverview} demoMode={source === "DEMO"} onDemoTradesImported={mergeDemoTrades} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric label="P&L total fechado" value={formatters.usd.format(metrics.netPnl)} tone={metrics.netPnl >= 0 ? "positive" : metrics.netPnl < 0 ? "negative" : "neutral"} detail={`${metrics.trades} operações fechadas`} />
        <OverviewMetric label="Taxa de acerto" value={`${metrics.winRatePct.toFixed(2)}%`} detail={`${metrics.wins} ganhos · ${metrics.losses} perdas`} />
        <OverviewMetric label="Último lucro" value={lastWin?.netPnl != null ? formatters.usd.format(lastWin.netPnl) : "—"} tone={lastWin ? "positive" : "neutral"} detail={lastWin ? `${lastWin.symbol} · ${formatDateTime(lastWin.closedAt ?? lastWin.openedAt)}` : "Nenhuma operação vencedora no período"} />
        <OverviewMetric label="Última perda" value={lastLoss?.netPnl != null ? formatters.usd.format(lastLoss.netPnl) : "—"} tone={lastLoss ? "negative" : "neutral"} detail={lastLoss ? `${lastLoss.symbol} · ${formatDateTime(lastLoss.closedAt ?? lastLoss.openedAt)}` : "Nenhuma operação perdedora no período"} />
      </section>

      <section className="grid gap-3 2xl:grid-cols-3">
        <ChartCard title="Últimos resultados" subtitle="Dia, hora e motivo de cada ganho ou perda">
          <RecentOutcomeList trades={recentOutcomeTrades} />
        </ChartCard>
        <ChartCard title="P&L acumulado" subtitle="Passe o mouse em cada ponto para ver dia, hora e motivo do trade">
          <InteractiveEquityCurve points={timelinePoints} emptyText="Sem operações fechadas para desenhar a curva." />
        </ChartCard>
        <ChartCard title="P&L diário" subtitle="Passe o mouse nas barras para ver dia, hora, resultado e motivo">
          <DailyPnlChart days={daily} />
        </ChartCard>
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.55fr)_minmax(420px,.75fr)]">
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <div><p className="eyebrow">Histórico recente</p><h2 className="mt-1 text-sm font-semibold text-slate-900">Operações</h2></div>
            <Link href="/dashboard/journal" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">Ver todas <ArrowUpRight className="size-3" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-left text-xs">
              <thead className="border-y border-slate-200 bg-slate-50 text-[9px] uppercase tracking-[0.12em] text-slate-400"><tr><th className="px-4 py-3">Símbolo</th><th className="px-3 py-3">Abertura</th><th className="px-3 py-3">Fechamento</th><th className="px-3 py-3">P&L</th><th className="px-3 py-3">Direção</th><th className="px-3 py-3">Volume</th><th className="px-3 py-3">Duração</th><th className="px-3 py-3">Custos</th><th className="px-4 py-3">Origem</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((trade) => <tr key={trade.id} className="text-slate-600 transition hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-900">{trade.symbol}</td><td className="px-3 py-3">{formatDateTime(trade.openedAt)}</td><td className="px-3 py-3">{trade.closedAt ? formatDateTime(trade.closedAt) : "Em aberto"}</td><td className={`tabular px-3 py-3 font-semibold ${toneClass(trade.netPnl)}`}>{trade.netPnl == null ? "—" : formatters.usd.format(trade.netPnl)}</td><td className="px-3 py-3">{labelDirection(trade.direction)}</td><td className="tabular px-3 py-3">{trade.positionSize.toFixed(2)}</td><td className="tabular px-3 py-3">{trade.closedAt ? formatDuration(new Date(trade.closedAt).getTime() - new Date(trade.openedAt).getTime()) : "—"}</td><td className="tabular px-3 py-3">{formatters.usd.format(Math.abs(trade.commission || 0) + Math.abs(trade.swap || 0))}</td><td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-[9px] font-semibold ${trade.source === "BROKER" || trade.brokerProvider === "MT5" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{trade.source === "BROKER" || trade.brokerProvider === "MT5" ? "EXNESS / MT5" : labelDataSource(trade.source)}</span></td></tr>)}
              </tbody>
            </table>
            {!recent.length ? <div className="p-8 text-center text-sm text-slate-400">Importe o histórico da Exness/MT5 ou registre uma operação para começar.</div> : null}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="panel-header"><div><p className="eyebrow">Calendário</p><h2 className="mt-1 text-sm font-semibold text-slate-900 capitalize">{currentMonth.monthLabel}</h2></div><Link href="/dashboard/calendar" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"><CalendarDays className="size-3.5" />Abrir</Link></div>
          <MiniCalendar month={currentMonth} />
        </div>
      </section>
    </div>
  );
}

function OverviewMetric({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail: string; tone?: "neutral" | "positive" | "negative" }) {
  const valueClass = tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-600" : "text-slate-950";
  return <div className="panel p-5 text-center"><p className={`tabular text-2xl font-semibold tracking-tight ${valueClass}`}>{value}</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p><p className="mt-1 text-[10px] text-slate-400">{detail}</p></div>;
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="panel overflow-hidden"><div className="border-b border-slate-100 px-4 py-3"><h2 className="text-xs font-semibold text-slate-800">{title}</h2><p className="mt-0.5 text-[10px] text-slate-400">{subtitle}</p></div><div className="p-4">{children}</div></div>;
}

function RecentOutcomeList({ trades }: { trades: TradeRecord[] }) {
  if (!trades.length) return <EmptyChart />;
  return (
    <div className="space-y-2">
      {trades.map((trade) => {
        const closedAt = trade.closedAt ?? trade.openedAt;
        const reason = extractTradeReason(trade);
        const pnl = trade.netPnl ?? 0;
        return (
          <div key={trade.id} className="recent-result-card rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="recent-result-title text-xs font-semibold text-slate-900">{trade.symbol} · {formatDateTime(closedAt)}</p>
                <p className="recent-result-note mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{reason}</p>
              </div>
              <p className={`tabular text-sm font-semibold ${pnl > 0 ? "recent-result-positive text-emerald-700" : pnl < 0 ? "recent-result-negative text-red-600" : "text-slate-500"}`}>{formatters.usd.format(pnl)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DailyPnlChart({ days }: { days: DayBucket[] }) {
  const visible = days.slice(-24);
  const [hovered, setHovered] = useState<{ day: DayBucket; x: number; y: number } | null>(null);
  const max = Math.max(1, ...visible.map((day) => Math.abs(day.pnl)));

  if (!visible.length) return <EmptyChart />;

  return (
    <div className="relative h-72 overflow-hidden rounded-lg border border-slate-800/70 bg-slate-950/10">
      <div className="absolute left-4 right-4 top-1/2 border-t border-slate-700" />
      <div className="absolute inset-0 flex items-stretch gap-1 px-4 py-4">
        {visible.map((day) => {
          const height = (Math.abs(day.pnl) / max) * 42;
          const positive = day.pnl >= 0;
          return (
            <button
              key={day.dateKey}
              type="button"
              className="relative min-w-0 flex-1 cursor-default outline-none"
              aria-label={`${day.dateKey}: ${formatters.usd.format(day.pnl)}`}
              onMouseEnter={(event) => {
                const bounds = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                if (!bounds) return;
                const own = event.currentTarget.getBoundingClientRect();
                setHovered({ day, x: own.left - bounds.left + own.width / 2, y: positive ? bounds.height * 0.34 : bounds.height * 0.56 });
              }}
              onMouseLeave={() => setHovered(null)}
              onFocus={(event) => {
                const bounds = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                if (!bounds) return;
                const own = event.currentTarget.getBoundingClientRect();
                setHovered({ day, x: own.left - bounds.left + own.width / 2, y: positive ? bounds.height * 0.34 : bounds.height * 0.56 });
              }}
              onBlur={() => setHovered(null)}
            >
              {positive ? (
                <div className="absolute bottom-1/2 left-[14%] right-[14%] rounded-t-md bg-emerald-500 transition hover:bg-emerald-400" style={{ height: `${Math.max(day.pnl ? 5 : 0, height)}%` }} />
              ) : (
                <div className="absolute left-[14%] right-[14%] top-1/2 rounded-b-md bg-red-400 transition hover:bg-red-300" style={{ height: `${Math.max(day.pnl ? 5 : 0, height)}%` }} />
              )}
            </button>
          );
        })}
      </div>

      {hovered ? (
        <div
          className="pointer-events-none absolute z-20 w-[280px] max-w-[calc(100%-24px)] rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur"
          style={{
            left: `clamp(12px, calc(${hovered.x}px - 140px), calc(100% - 292px))`,
            top: Math.max(12, Math.min(hovered.y, 150)),
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-100">{hovered.day.label}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{hovered.day.trades} operação(ões) · {hovered.day.wins} ganho(s) · {hovered.day.losses} perda(s)</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${hovered.day.pnl > 0 ? "bg-emerald-500/15 text-emerald-300" : hovered.day.pnl < 0 ? "bg-red-500/15 text-red-300" : "bg-slate-700 text-slate-300"}`}>{hovered.day.pnl > 0 ? "POSITIVO" : hovered.day.pnl < 0 ? "NEGATIVO" : "NEUTRO"}</span>
          </div>
          <p className={`mt-2 font-semibold ${hovered.day.pnl > 0 ? "text-emerald-300" : hovered.day.pnl < 0 ? "text-red-300" : "text-slate-200"}`}>Resultado do dia: {formatters.usd.format(hovered.day.pnl)}</p>
          <div className="mt-3 max-h-32 space-y-2 overflow-hidden border-t border-slate-700 pt-2">
            {hovered.day.details.slice(0, 4).map((detail) => (
              <div key={detail.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-2">
                <span className="tabular text-[10px] text-slate-400">{detail.timeLabel}</span>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold text-slate-200">{detail.symbol} · {detail.resultLabel}</p>
                  <p className="truncate text-[10px] text-slate-500" title={detail.reason}>{detail.reason}</p>
                </div>
                <span className={`tabular text-[10px] font-semibold ${detail.pnl > 0 ? "text-emerald-300" : detail.pnl < 0 ? "text-red-300" : "text-slate-400"}`}>{formatters.usd.format(detail.pnl)}</span>
              </div>
            ))}
            {hovered.day.details.length > 4 ? <p className="text-[10px] text-slate-500">+ {hovered.day.details.length - 4} operação(ões) no dia</p> : null}
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-1 left-4 right-4 flex justify-between text-[9px] text-slate-500"><span>{visible[0]?.label}</span><span>{visible.at(-1)?.label}</span></div>
    </div>
  );
}

function MiniCalendar({ month }: { month: ReturnType<typeof buildMonthlyReport> }) {
  const weekDays = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
  return <div className="p-3"><div className="grid grid-cols-7">{weekDays.map((day) => <div key={day} className="py-2 text-center text-[8px] font-semibold text-slate-400">{day}</div>)}</div><div className="grid grid-cols-7 gap-1">{month.days.map((day) => <Link key={day.dateKey} href={`/dashboard/reports/${day.dateKey}`} className={`min-h-[62px] rounded-md border p-1.5 transition hover:border-slate-300 ${!day.inMonth ? "border-transparent bg-slate-50/50 text-slate-300" : day.netPnl > 0 ? "border-emerald-100 bg-emerald-50" : day.netPnl < 0 ? "border-red-100 bg-red-50" : "border-slate-100 bg-white"}`}><div className="text-[9px] text-slate-500">{day.dayNumber}</div>{day.tradeCount ? <div className={`mt-2 truncate text-center text-[9px] font-semibold ${toneClass(day.netPnl)}`}>{formatters.usd.format(day.netPnl)}</div> : null}</Link>)}</div><div className="mt-3 flex items-center justify-between text-[10px] text-slate-400"><span>{month.activeDays} dias operados</span><span className={toneClass(month.netPnl)}>{formatters.usd.format(month.netPnl)}</span></div></div>;
}

function buildDailyBuckets(trades: readonly TradeRecord[], timeZone: string): DayBucket[] {
  const buckets = new Map<string, DayBucket>();
  const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
  for (const trade of trades) {
    const date = trade.closedAt ?? trade.openedAt;
    const dateKey = localDateKey(date, timeZone);
    const bucket = buckets.get(dateKey) ?? { dateKey, label: formatShortDate(date), pnl: 0, wins: 0, losses: 0, trades: 0, details: [] };
    const pnl = trade.netPnl ?? 0;
    bucket.pnl += pnl;
    bucket.trades += 1;
    if (trade.result === "WIN") bucket.wins += 1;
    if (trade.result === "LOSS") bucket.losses += 1;
    bucket.details.push({
      id: trade.id,
      symbol: trade.symbol,
      timeLabel: timeFormatter.format(new Date(date)),
      pnl,
      reason: extractTradeReason(trade),
      resultLabel: trade.result ? labelTradeResult(trade.result) : "FECHADA",
    });
    buckets.set(dateKey, bucket);
  }
  return [...buckets.values()]
    .map((bucket) => ({ ...bucket, details: bucket.details.sort((a, b) => a.timeLabel.localeCompare(b.timeLabel)) }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function formatShortDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function formatDuration(ms: number) { const minutes = Math.max(0, Math.round(ms / 60000)); if (minutes < 60) return `${minutes}m`; const hours = Math.floor(minutes / 60); const rest = minutes % 60; return rest ? `${hours}h ${rest}m` : `${hours}h`; }
function toneClass(value: number | null) { if (value == null || value === 0) return "text-slate-500"; return value > 0 ? "text-emerald-700" : "text-red-600"; }
function EmptyChart() { return <div className="grid h-72 w-full place-items-center text-xs text-slate-400">Sem dados suficientes no período.</div>; }
