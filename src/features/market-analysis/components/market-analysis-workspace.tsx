"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, Database, RefreshCw, Save, ShieldAlert, Target } from "lucide-react";
import { BRAND } from "@/config/brand";
import { saveMarketAnalysisAction } from "@/features/market-analysis/actions/analysis-actions";
import { countDemoAnalysesForDay, loadDemoAnalyses, upsertDemoAnalysis } from "@/features/market-analysis/data/demo-analysis-store";
import {
  ANALYSIS_SYMBOLS,
  ANALYSIS_TIMEFRAMES,
  createDemoTimeframes,
  DEFAULT_LIQUIDITY_MAP,
  DEFAULT_MOVING_AVERAGE_CONTEXT,
  DEFAULT_PRICE_ACTION_CONTEXT,
  DEFAULT_VOLUME_CONTEXT,
  getDemoQuote,
} from "@/features/market-analysis/data/demo-market-analysis";
import { LiquidityPanel, MovingAveragePanel, PriceActionPanel, VolumePanel } from "@/features/market-analysis/components/analysis-context-panels";
import { MiniPriceChart } from "@/features/market-analysis/components/mini-price-chart";
import { MtfMatrix } from "@/features/market-analysis/components/mtf-matrix";
import { calculateMarketConsensus } from "@/lib/core/market-analysis-service";
import { generateSetupId } from "@/lib/core/trade-lifecycle-service";
import type { AnalysisTimeframe, MarketAnalysisRecord, TimeframeAnalysis } from "@/lib/types/market-analysis";
import type { DataSource } from "@/lib/types/trading";
import { labelBias, labelDataSource } from "@/lib/i18n/pt-br";
import { StatusPill } from "@/components/ui/status-pill";

const fieldClass = "h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-sky-500";
const areaClass = "mt-1.5 min-h-24 w-full resize-y rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500";

export function MarketAnalysisWorkspace({ initialSymbol = "XAUUSD", source = "DEMO", initialRecent = [] }: { initialSymbol?: string; source?: DataSource; initialRecent?: MarketAnalysisRecord[] }) {
  const [symbol, setSymbol] = useState(ANALYSIS_SYMBOLS.includes(initialSymbol) ? initialSymbol : "XAUUSD");
  const [higherTimeframe, setHigherTimeframe] = useState<AnalysisTimeframe>("4H");
  const [executionTimeframe, setExecutionTimeframe] = useState<AnalysisTimeframe>("15M");
  const [frames, setFrames] = useState<TimeframeAnalysis[]>(() => createDemoTimeframes(symbol));
  const [liquidity, setLiquidity] = useState({ ...DEFAULT_LIQUIDITY_MAP });
  const [volume, setVolume] = useState({ ...DEFAULT_VOLUME_CONTEXT });
  const [movingAverages, setMovingAverages] = useState({ ...DEFAULT_MOVING_AVERAGE_CONTEXT });
  const [priceAction, setPriceAction] = useState({ ...DEFAULT_PRICE_ACTION_CONTEXT });
  const [thesis, setThesis] = useState("Contexto multi-timeframe em construção; aguardar confirmação no período de execução antes de transformar a ideia em plano operacional.");
  const [invalidation, setInvalidation] = useState("A ideia perde validade se a estrutura do período superior mudar contra o viés definido.");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<MarketAnalysisRecord | null>(null);
  const [recent, setRecent] = useState<MarketAnalysisRecord[]>(initialRecent);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const quote = useMemo(() => getDemoQuote(symbol), [symbol]);
  const consensus = useMemo(() => calculateMarketConsensus(frames, higherTimeframe), [frames, higherTimeframe]);
  const directionLabel = consensus.direction === "LONG" ? "CONTEXTO ALTISTA" : consensus.direction === "SHORT" ? "CONTEXTO BAIXISTA" : "SEM DIREÇÃO DEFINIDA";

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_MODE !== "production") setRecent(loadDemoAnalyses().slice(0, 5));
  }, []);

  function changeSymbol(nextSymbol: string) {
    setSymbol(nextSymbol);
    setFrames(createDemoTimeframes(nextSymbol));
    setLiquidity({ ...DEFAULT_LIQUIDITY_MAP });
    setVolume({
      ...DEFAULT_VOLUME_CONTEXT,
      mode: ["EURUSD", "GBPUSD", "USDJPY"].includes(nextSymbol) ? "TICK" : "BROKER",
      note: ["EURUSD", "GBPUSD", "USDJPY"].includes(nextSymbol)
        ? "Volume demonstrativo. Em Forex spot, tratar como volume de ticks quando a fonte for a corretora."
        : "Volume demonstrativo de referência até a conexão com um provedor de mercado real.",
    });
    setMovingAverages({ ...DEFAULT_MOVING_AVERAGE_CONTEXT });
    setPriceAction({ ...DEFAULT_PRICE_ACTION_CONTEXT });
    setSaved(null);
    setMessage(null);
  }

  function updateFrame(timeframe: AnalysisTimeframe, patch: Partial<TimeframeAnalysis>) {
    setFrames((current) => current.map((frame) => frame.timeframe === timeframe ? { ...frame, ...patch } : frame));
    setSaved(null);
  }

  function resetAnalysis() {
    setFrames(createDemoTimeframes(symbol));
    setLiquidity({ ...DEFAULT_LIQUIDITY_MAP });
    setVolume({ ...DEFAULT_VOLUME_CONTEXT });
    setMovingAverages({ ...DEFAULT_MOVING_AVERAGE_CONTEXT });
    setPriceAction({ ...DEFAULT_PRICE_ACTION_CONTEXT });
    setThesis("Contexto multi-timeframe em construção; aguardar confirmação no período de execução antes de transformar a ideia em plano operacional.");
    setInvalidation("A ideia perde validade se a estrutura do período superior mudar contra o viés definido.");
    setNotes("");
    setSaved(null);
    setMessage(null);
  }

  function save() {
    setMessage(null);
    const now = new Date();
    const demoSequence = process.env.NEXT_PUBLIC_APP_MODE !== "production" ? countDemoAnalysesForDay(symbol, now) + 1 : 1;
    const setupId = process.env.NEXT_PUBLIC_APP_MODE !== "production" ? generateSetupId(symbol, now, demoSequence) : undefined;

    startTransition(async () => {
      const result = await saveMarketAnalysisAction({
        analysisId: saved?.id,
        setupId: saved?.setupId ?? setupId,
        symbol,
        higherTimeframe,
        executionTimeframe,
        timeframes: frames,
        liquidity,
        volume,
        movingAverages,
        priceAction,
        thesis,
        invalidation,
        notes,
        source,
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      if (process.env.NEXT_PUBLIC_APP_MODE !== "production") upsertDemoAnalysis(result.analysis);
      setSaved(result.analysis);
      setRecent((current) => [result.analysis, ...current.filter((item) => item.id !== result.analysis.id)].slice(0, 5));
      setMessage({ tone: "success", text: result.message });
    });
  }

  const plannerHref = saved ? `/dashboard/trade-planner?symbol=${encodeURIComponent(saved.symbol)}&setupId=${encodeURIComponent(saved.setupId)}&direction=${saved.consensus.direction ?? "LONG"}&htf=${encodeURIComponent(saved.higherTimeframe)}&tf=${encodeURIComponent(saved.executionTimeframe)}&strategy=${encodeURIComponent("Análise Multi-Timeframe")}&name=${encodeURIComponent(`Contexto ${labelBias(saved.consensus.bias)}`)}` : null;

  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div><p className="eyebrow">Ativo</p><select className={`${fieldClass} mt-1.5 min-w-36`} value={symbol} onChange={(e) => changeSymbol(e.target.value)}>{ANALYSIS_SYMBOLS.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><p className="eyebrow">Período superior</p><select className={`${fieldClass} mt-1.5 min-w-28`} value={higherTimeframe} onChange={(e) => setHigherTimeframe(e.target.value as AnalysisTimeframe)}>{ANALYSIS_TIMEFRAMES.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><p className="eyebrow">Execução</p><select className={`${fieldClass} mt-1.5 min-w-28`} value={executionTimeframe} onChange={(e) => setExecutionTimeframe(e.target.value as AnalysisTimeframe)}>{ANALYSIS_TIMEFRAMES.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="self-end pb-1"><StatusPill tone="info">{labelDataSource(source)}</StatusPill></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={resetAnalysis} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-800 px-3 text-xs text-slate-400 hover:bg-slate-900 hover:text-slate-200"><RefreshCw className="size-3.5" />Redefinir</button>
            <button type="button" onClick={save} disabled={isPending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-100 px-4 text-xs font-semibold text-slate-950 hover:bg-white disabled:opacity-50"><Save className="size-3.5" />{isPending ? "Salvando…" : saved ? "Atualizar análise" : "Salvar análise"}</button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.65fr)]">
        <div className="space-y-5">
          <MiniPriceChart quote={quote} />
          <MtfMatrix frames={frames} alignment={consensus.stateByTimeframe} onChange={updateFrame} />
          <div className="grid gap-5 xl:grid-cols-2"><LiquidityPanel value={liquidity} onChange={setLiquidity} /><VolumePanel value={volume} onChange={setVolume} /></div>
          <div className="grid gap-5 xl:grid-cols-2"><MovingAveragePanel value={movingAverages} onChange={setMovingAverages} /><PriceActionPanel value={priceAction} onChange={setPriceAction} /></div>
          <section className="panel overflow-hidden"><div className="panel-header"><div><p className="eyebrow">Tese operacional</p><h2 className="mt-1 text-sm font-semibold">Plano de leitura antes do risco</h2></div></div><div className="grid gap-4 p-4 xl:grid-cols-2"><label className="text-xs text-slate-500">Tese<textarea className={areaClass} value={thesis} onChange={(e) => setThesis(e.target.value)} /></label><label className="text-xs text-slate-500">Invalidação<textarea className={areaClass} value={invalidation} onChange={(e) => setInvalidation(e.target.value)} /></label><label className="text-xs text-slate-500 xl:col-span-2">Notas adicionais<textarea className={areaClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contexto macro, notícia, observação de sessão, comportamento do preço..." /></label></div></section>
        </div>

        <aside className="space-y-5">
          <section className="panel overflow-hidden">
            <div className="panel-header"><div><p className="eyebrow">Síntese</p><h2 className="mt-1 text-sm font-semibold">Consenso Multi-Timeframe</h2></div><Database className="size-4 text-slate-600" /></div>
            <div className="space-y-3 p-4">
              <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.04] p-4"><p className="eyebrow">Viés agregado</p><p className="mt-2 text-xl font-semibold">{labelBias(consensus.bias)}</p><p className="mt-1 text-xs text-slate-500">Direção de contexto: <span className="font-medium text-slate-300">{directionLabel}</span></p></div>
              <div className="grid grid-cols-2 gap-2"><Metric label="Timeframes alinhados" value={`${consensus.alignedFrames}/${consensus.consideredFrames}`} /><Metric label="Alinhamento" value={`${consensus.alignmentPct.toFixed(0)}%`} /><Metric label="HTF" value={higherTimeframe} /><Metric label="Execução" value={executionTimeframe} /></div>
              <p className="text-[10px] leading-4 text-slate-600">O consenso resume apenas os parâmetros que você registrou na matriz. Ele não representa probabilidade de ganho nem recomendação automática de entrada.</p>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-header"><div><p className="eyebrow">Continuidade do fluxo</p><h2 className="mt-1 text-sm font-semibold">ID da Configuração</h2></div><Target className="size-4 text-slate-600" /></div>
            <div className="p-4">
              {saved ? <><div className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.035] p-3"><div className="flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="size-4" />Análise salva</div><p className="tabular mt-2 text-sm font-semibold text-slate-100">{saved.setupId}</p></div><div className="mt-3 grid gap-2"><Link href={`/dashboard/price-zones?setupId=${encodeURIComponent(saved.setupId)}`} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] text-xs font-semibold text-emerald-200 hover:bg-emerald-400/[0.08]">Criar Zona de Preço <ArrowRight className="size-3.5" /></Link>{plannerHref ? <Link href={plannerHref} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-sky-400/20 bg-sky-400/[0.05] text-xs font-semibold text-sky-200 hover:bg-sky-400/[0.09]">Enviar direto ao Planejador <ArrowRight className="size-3.5" /></Link> : null}</div></> : <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3 text-xs leading-5 text-slate-500">Salve a análise para gerar um ID e enviá-la ao Planejador de Operações sem perder o vínculo entre contexto e execução.</div>}
              {message ? <p className={`mt-3 rounded-lg border p-2.5 text-xs ${message.tone === "success" ? "border-emerald-400/15 bg-emerald-400/[0.03] text-emerald-200" : "border-red-400/20 bg-red-400/[0.04] text-red-200"}`}>{message.text}</p> : null}
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-header"><div><p className="eyebrow">Histórico recente</p><h2 className="mt-1 text-sm font-semibold">Últimas análises</h2></div></div>
            <div className="divide-y divide-slate-900">{recent.length ? recent.map((item) => <div key={item.id} className="px-4 py-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-200">{item.symbol}</span><span className="text-[10px] text-slate-600">{item.higherTimeframe} → {item.executionTimeframe}</span></div><p className="mt-1 truncate text-[10px] text-slate-500">{item.setupId}</p><p className="mt-1 text-[10px] text-slate-600">{labelBias(item.consensus.bias)} · {item.consensus.alignmentPct.toFixed(0)}% alinhado</p></div>) : <p className="px-4 py-5 text-xs text-slate-600">Nenhuma análise salva neste navegador ainda.</p>}</div>
          </section>

          <div className="flex gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.035] p-4 text-xs leading-5 text-amber-100/80"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><span>Dados de preço desta etapa são demonstrativos. {BRAND.primaryName} ainda não está conectado a um feed da Exness/MT5. Use o módulo para estruturar a leitura, não para executar com base na cotação exibida.</span></div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3"><p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">{label}</p><p className="tabular mt-1.5 text-sm font-medium text-slate-200">{value}</p></div>;
}
