"use client";

import Link from "next/link";
import { Activity, ArrowRight, BrainCircuit, Gauge, Sigma } from "lucide-react";
import type { AutoAnalysisSnapshot, AutoEvidenceDirection } from "@/lib/types/market-terminal";
import { StatusPill } from "@/components/ui/status-pill";

const contextLabel: Record<AutoEvidenceDirection, string> = {
  BULLISH: "Contexto altista",
  BEARISH: "Contexto baixista",
  NEUTRAL: "Contexto neutro",
};

function contextTone(context: AutoEvidenceDirection) {
  if (context === "BULLISH") return "positive" as const;
  if (context === "BEARISH") return "negative" as const;
  return "neutral" as const;
}

export function AutoEvidencePanel({ analysis }: { analysis: AutoAnalysisSnapshot | null }) {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-violet-300" />
          <div><p className="eyebrow">Motor automático</p><h2 className="text-sm font-semibold">Evidências Técnicas</h2></div>
        </div>
        {analysis ? <StatusPill tone={contextTone(analysis.context)}>{contextLabel[analysis.context]}</StatusPill> : <StatusPill>AGUARDANDO</StatusPill>}
      </div>

      {!analysis ? (
        <div className="px-4 py-8 text-center text-xs text-slate-500">Carregue um gráfico para gerar a leitura automática descritiva.</div>
      ) : (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 2xl:grid-cols-2">
            <Metric icon={Gauge} label="Evidências" value={`${analysis.evidenceScore.toFixed(1)} / ${analysis.evidenceMax}`} />
            <Metric icon={Sigma} label="RSI 14" value={analysis.rsi14 == null ? "—" : analysis.rsi14.toFixed(1)} />
            <Metric icon={Activity} label="Fibonacci" value={analysis.fibRetracement == null ? "—" : `${analysis.fibRetracement.toFixed(1)}%`} />
            <Metric icon={Activity} label="Candles" value={String(analysis.candleCount)} />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Leituras detectadas</span>
              <span className="text-[10px] text-slate-600">{analysis.symbol} · {analysis.timeframe}</span>
            </div>
            <div className="max-h-[330px] space-y-2 overflow-y-auto pr-1">
              {analysis.evidence.length ? analysis.evidence.map((item) => (
                <article key={item.key} className="rounded-lg border border-slate-800/80 bg-slate-900/35 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0"><p className="text-xs font-semibold text-slate-200">{item.label}</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-600">{item.category} · confiança {item.confidence === "HIGH" ? "alta" : item.confidence === "MEDIUM" ? "média" : "baixa"}</p></div>
                    <StatusPill tone={contextTone(item.direction)}>{item.direction === "BULLISH" ? "ALTISTA" : item.direction === "BEARISH" ? "BAIXISTA" : "NEUTRO"}</StatusPill>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{item.detail}</p>{item.zone ? <p className="mt-1.5 text-[10px] tabular text-slate-600">Zona: {item.zone.low.toFixed(5)} – {item.zone.high.toFixed(5)}</p> : null}
                </article>
              )) : <p className="py-5 text-center text-xs text-slate-600">Nenhuma evidência automática relevante detectada nesta janela.</p>}
            </div>
          </div>

          {analysis.evidence.some((item) => item.confluenceKey) ? (
            <Link href={`/dashboard/confluence?keys=${encodeURIComponent(Array.from(new Set(analysis.evidence.map((item) => item.confluenceKey).filter(Boolean))).join(","))}`} className="flex items-center justify-between rounded-lg border border-sky-400/15 bg-sky-400/[0.04] px-3 py-2.5 text-xs text-sky-200 hover:border-sky-400/30">
              <span>Levar evidências detectadas ao Motor de Confluências</span><ArrowRight className="size-3.5" />
            </Link>
          ) : null}
          <div className="rounded-lg border border-amber-400/10 bg-amber-400/[0.04] px-3 py-2.5 text-[10px] leading-relaxed text-amber-100/65">
            Esta leitura é descritiva e não produz sinal, recomendação de compra/venda ou probabilidade de ganho. Probabilidade histórica continua sendo calculada somente no Laboratório de Desempenho com amostra suficiente.
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-2.5"><div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-600"><Icon className="size-3" />{label}</div><p className="mt-1.5 text-sm font-semibold tabular text-slate-200">{value}</p></div>;
}
