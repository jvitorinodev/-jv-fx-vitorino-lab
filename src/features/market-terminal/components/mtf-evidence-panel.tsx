"use client";

import { useEffect, useState } from "react";
import { Layers3, RefreshCw } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { MtfAutoAnalysisSnapshot } from "@/lib/types/market-terminal";

function tone(context: MtfAutoAnalysisSnapshot["dominantContext"]) {
  if (context === "BULLISH") return "positive" as const;
  if (context === "BEARISH") return "negative" as const;
  return "neutral" as const;
}

function label(context: MtfAutoAnalysisSnapshot["dominantContext"]) {
  if (context === "BULLISH") return "CONTEXTO ALTISTA";
  if (context === "BEARISH") return "CONTEXTO BAIXISTA";
  return "CONTEXTO NEUTRO";
}

export function MtfEvidencePanel({ symbol, onChange }: { symbol: string; onChange?: (snapshot: MtfAutoAnalysisSnapshot | null) => void }) {
  const [data, setData] = useState<MtfAutoAnalysisSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/market/mtf-analysis?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" });
      const payload = await response.json() as MtfAutoAnalysisSnapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Falha na leitura multi-timeframe.");
      setData(payload);
      onChange?.(payload);
    } catch (reason) {
      setData(null);
      onChange?.(null);
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar a leitura multi-timeframe.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2"><Layers3 className="size-4 text-violet-300" /><div><p className="eyebrow">Estrutura persistível</p><h2 className="text-sm font-semibold">Leitura Multi-Timeframe</h2></div></div>
        <button type="button" className="action" onClick={() => void load()} disabled={loading}><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />Atualizar</button>
      </div>
      <div className="p-4">
        {error ? <div className="rounded-lg border border-red-400/15 bg-red-400/[0.04] p-3 text-xs text-red-200">{error}</div> : null}
        {data ? <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><StatusPill tone={tone(data.dominantContext)}>{label(data.dominantContext)}</StatusPill><span className="text-[10px] text-slate-600">Alinhamento descritivo: {data.alignmentPct.toFixed(1)}%</span></div>
          <div className="overflow-hidden rounded-lg border border-slate-800">
            {data.frames.map((frame, index) => (
              <div key={frame.timeframe} className={`grid grid-cols-[48px_1fr_64px_54px] items-center gap-2 px-3 py-2.5 text-xs ${index ? "border-t border-slate-800/80" : ""}`}>
                <span className="font-semibold text-slate-300">{frame.timeframe}</span>
                <span className={frame.context === "BULLISH" ? "text-emerald-300" : frame.context === "BEARISH" ? "text-red-300" : "text-slate-500"}>{frame.context === "BULLISH" ? "Altista" : frame.context === "BEARISH" ? "Baixista" : "Neutro"}</span>
                <span className="tabular text-right text-slate-400">{frame.evidenceScore.toFixed(1)}/10</span>
                <span className="tabular text-right text-slate-600">{frame.evidence.length} ev.</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-4 text-slate-600">O percentual acima mede quantos timeframes compartilham o mesmo contexto descritivo. Não representa chance de ganho, direção recomendada ou sinal.</p>
        </> : <p className="py-5 text-center text-xs text-slate-600">{loading ? "Gerando leitura multi-timeframe…" : "Sem leitura disponível."}</p>}
      </div>
    </section>
  );
}
