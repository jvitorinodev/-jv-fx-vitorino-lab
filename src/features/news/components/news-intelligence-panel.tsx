"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, Radio, ShieldAlert } from "lucide-react";
import { MARKET_SOURCES } from "@/config/market-sources";
import { DEMO_ECONOMIC_EVENTS } from "@/features/news/data/demo-news";
import { currenciesForSymbol, evaluateMacroRisk, filterEventsForSymbol } from "@/features/news/services/news-intelligence-service";
import type { EconomicCalendarPayload, EconomicEvent, MacroRiskLevel } from "@/lib/types/market-terminal";
import { StatusPill } from "@/components/ui/status-pill";

const impactStyle = {
  High: "border-red-400/25 bg-red-400/[0.06] text-red-200",
  Medium: "border-amber-400/20 bg-amber-400/[0.05] text-amber-100",
  Low: "border-sky-400/15 bg-sky-400/[0.04] text-sky-200",
  Holiday: "border-slate-700 bg-slate-900/60 text-slate-400",
  Unknown: "border-slate-800 bg-slate-950 text-slate-500",
} as const;

const riskTone: Record<MacroRiskLevel, "positive" | "warning" | "negative" | "neutral"> = {
  NORMAL: "positive",
  MODERATE: "warning",
  HIGH: "negative",
  CRITICAL: "negative",
};

function eventTime(date: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
  } catch {
    return date;
  }
}

function countdown(date: string, now: number) {
  const minutes = Math.round((new Date(date).getTime() - now) / 60000);
  if (minutes < -15) return "divulgado";
  if (minutes < 0) return "agora";
  if (minutes < 60) return `em ${minutes} min`;
  if (minutes < 1440) return `em ${Math.floor(minutes / 60)}h ${minutes % 60}min`;
  return `em ${Math.floor(minutes / 1440)}d`;
}

export function NewsIntelligencePanel({ symbol, full = false }: { symbol: string; full?: boolean }) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [sourceMode, setSourceMode] = useState<"LIVE" | "DEMO">("DEMO");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [investingConfirmed, setInvestingConfirmed] = useState(false);
  const investingWidgetUrl = process.env.NEXT_PUBLIC_INVESTING_ECONOMIC_CALENDAR_WIDGET_URL ?? "";

  useEffect(() => {
    const key = `jvfx.investing-confirmed.${symbol}`;
    setInvestingConfirmed(localStorage.getItem(key) === "1");
  }, [symbol]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(`/api/news/forex-factory?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
        const payload = await response.json() as EconomicCalendarPayload;
        if (!alive) return;
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Falha ao carregar Forex Factory.");
        setEvents(payload.events);
        setSourceMode("LIVE");
        setError(null);
      } catch (err) {
        if (!alive) return;
        setEvents(filterEventsForSymbol(DEMO_ECONOMIC_EVENTS, symbol));
        setSourceMode("DEMO");
        setError(err instanceof Error ? err.message : "Falha ao carregar calendário ao vivo.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const refresh = window.setInterval(load, 60_000);
    return () => { alive = false; window.clearInterval(refresh); };
  }, [symbol]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const relevantEvents = useMemo(() => events
    .filter((event) => new Date(event.date).getTime() >= now - 15 * 60_000)
    .slice(0, full ? 12 : 6), [events, now, full]);
  const macroRisk = useMemo(() => evaluateMacroRisk(events, new Date(now)), [events, now]);
  const currencies = currenciesForSymbol(symbol);

  function toggleInvestingConfirmation() {
    const next = !investingConfirmed;
    setInvestingConfirmed(next);
    localStorage.setItem(`jvfx.investing-confirmed.${symbol}`, next ? "1" : "0");
  }

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div><p className="eyebrow">Inteligência macro</p><h2 className="mt-1 text-sm font-semibold">Notícias & Calendário</h2></div>
        <div className="flex items-center gap-2"><StatusPill tone={sourceMode === "LIVE" ? "positive" : "warning"}>{sourceMode === "LIVE" ? "Forex Factory ao vivo" : "Fallback DEMO"}</StatusPill>{loading ? <RefreshCw className="size-3.5 animate-spin text-slate-600" /> : <Radio className="size-3.5 text-slate-600" />}</div>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">Ativo monitorado</p><p className="mt-1 text-sm font-semibold text-slate-200">{symbol}</p><p className="mt-1 text-[10px] text-slate-600">Moedas relevantes: {currencies.join(" · ")}</p></div>
            <StatusPill tone={riskTone[macroRisk.level]}>{macroRisk.label}</StatusPill>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">{macroRisk.detail}</p>
          {macroRisk.event ? <p className="mt-2 text-[11px] font-medium text-slate-300">{macroRisk.event.currency} · {macroRisk.event.title} · {countdown(macroRisk.event.date, now)}</p> : null}
        </div>

        {error ? <div className="flex gap-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.035] p-3 text-[10px] leading-4 text-amber-100/75"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{error} A interface caiu para eventos demonstrativos e não os apresenta como dados reais.</div> : null}

        <div className="divide-y divide-slate-900 rounded-xl border border-slate-800/80 bg-slate-950/25">
          {relevantEvents.length ? relevantEvents.map((event) => (
            <div key={event.id} className="grid grid-cols-[auto_1fr_auto] gap-3 px-3 py-3">
              <div className={`mt-0.5 rounded-md border px-1.5 py-1 text-[9px] font-bold ${impactStyle[event.impact]}`}>{event.currency}</div>
              <div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-300">{event.title}</p><p className="mt-1 text-[9px] text-slate-600">{eventTime(event.date)} · {event.impact === "High" ? "alto impacto" : event.impact === "Medium" ? "médio impacto" : event.impact === "Low" ? "baixo impacto" : event.impact === "Holiday" ? "feriado" : "impacto não classificado"}</p>{full && (event.forecast || event.previous) ? <p className="mt-1 text-[9px] text-slate-600">Projeção: {event.forecast || "—"} · Anterior: {event.previous || "—"}{event.actual ? ` · Atual: ${event.actual}` : ""}</p> : null}</div>
              <span className="whitespace-nowrap text-[9px] font-medium text-slate-500">{countdown(event.date, now)}</span>
            </div>
          )) : <p className="px-3 py-6 text-center text-xs text-slate-600">Nenhum evento relevante restante na agenda carregada para {symbol}.</p>}
        </div>

        <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.025] p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] uppercase tracking-[0.16em] text-violet-300/70">Validação secundária</p><p className="mt-1 text-xs font-semibold text-slate-200">Investing.com</p></div>
            <button type="button" onClick={toggleInvestingConfirmation} className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] ${investingConfirmed ? "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-200" : "border-slate-700 text-slate-500 hover:text-slate-300"}`}>{investingConfirmed ? <CheckCircle2 className="size-3.5" /> : <ShieldAlert className="size-3.5" />}{investingConfirmed ? "Conferido" : "Marcar como conferido"}</button>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">O JV FX não raspa o Investing.com. A confirmação entre fontes é manual nesta versão; o widget oficial pode ser ativado abaixo/na tela de Notícias.</p>
          <div className="mt-2 flex flex-wrap gap-2"><a href={MARKET_SOURCES.investingEconomicCalendar} target="_blank" rel="noreferrer" className="action">Abrir calendário Investing.com <ExternalLink className="size-3" /></a><a href={MARKET_SOURCES.forexFactoryCalendar} target="_blank" rel="noreferrer" className="action">Abrir Forex Factory <ExternalLink className="size-3" /></a></div>
        </div>

        {full ? <InvestingWidget widgetUrl={investingWidgetUrl} /> : null}

        <p className="text-[9px] leading-4 text-slate-700">O risco macro indica proximidade/impacto de eventos e não prevê direção do preço. Notícias não são tratadas como sinal automático de compra ou venda.</p>
      </div>
    </section>
  );
}

function InvestingWidget({ widgetUrl }: { widgetUrl: string }) {
  if (!widgetUrl) {
    return <div className="rounded-xl border border-dashed border-slate-800 p-4"><p className="text-xs font-semibold text-slate-300">Widget oficial Investing.com preparado</p><p className="mt-2 text-[10px] leading-5 text-slate-600">Gere o widget no Webmaster Tools oficial, aceite os termos do provedor e copie apenas a URL do <code className="text-slate-500">src</code> do iframe para <code className="text-slate-500">NEXT_PUBLIC_INVESTING_ECONOMIC_CALENDAR_WIDGET_URL</code> no seu <code className="text-slate-500">.env.local</code>.</p><a href={MARKET_SOURCES.investingWidgetBuilder} target="_blank" rel="noreferrer" className="action mt-3">Gerar widget oficial <ExternalLink className="size-3" /></a></div>;
  }
  return <div className="overflow-hidden rounded-xl border border-slate-800 bg-white"><iframe src={widgetUrl} title="Calendário Econômico Investing.com" className="h-[540px] w-full" loading="lazy" /></div>;
}
