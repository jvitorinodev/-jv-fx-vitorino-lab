"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Calculator, RefreshCw, ShieldAlert } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { TerminalExecutionEstimate } from "@/lib/types/market-terminal";

const fieldClass = "h-9 rounded-lg border border-slate-800 bg-slate-950 px-2.5 text-xs text-slate-100 outline-none focus:border-sky-500";

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function ExecutionMetricsCard({ symbol }: { symbol: string }) {
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [volume, setVolume] = useState(0.01);
  const [data, setData] = useState<TerminalExecutionEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/market/execution-estimate?symbol=${encodeURIComponent(symbol)}&direction=${direction}&volume=${encodeURIComponent(String(volume))}`, { cache: "no-store" });
      const payload = await response.json() as TerminalExecutionEstimate & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Falha ao calcular custos da operação.");
      setData(payload);
      if (Math.abs(payload.volume - volume) > 1e-9) setVolume(payload.volume);
    } catch (reason) {
      setData(null);
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os dados de execução.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, direction, volume]);

  const capitalTone = useMemo(() => {
    if (!data) return "neutral" as const;
    if (data.capitalCommittedPct >= 100) return "negative" as const;
    if (data.capitalCommittedPct >= 70) return "warning" as const;
    return "positive" as const;
  }, [data]);

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2"><Calculator className="size-4 text-sky-300" /><div><p className="eyebrow">Exness / MT5</p><h2 className="text-sm font-semibold">Custos e Margem da Operação</h2></div></div>
        <div className="flex items-center gap-2"><StatusPill tone={data?.source === "REALTIME" ? "positive" : "info"}>{data?.source === "REALTIME" ? "DADOS MT5" : "DEMONSTRAÇÃO"}</StatusPill><button type="button" className="action" onClick={() => void load()} disabled={loading}><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /></button></div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Direção informada
            <select className={`${fieldClass} mt-1.5 w-full`} value={direction} onChange={(event) => setDirection(event.target.value as "LONG" | "SHORT")}>
              <option value="LONG">COMPRA</option><option value="SHORT">VENDA</option>
            </select>
          </label>
          <label className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Volume
            <input className={`${fieldClass} mt-1.5 w-full tabular`} type="number" min="0.01" step="0.01" value={volume} onChange={(event) => setVolume(Math.max(0.0001, Number(event.target.value)))} />
          </label>
        </div>

        {error ? <div className="rounded-lg border border-red-400/15 bg-red-400/[0.04] px-3 py-2 text-xs text-red-200">{error}</div> : null}

        {data ? <>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Venda / Bid" value={data.bid.toFixed(data.specification.digits || 2)} />
            <Metric label="Compra / Ask" value={data.ask.toFixed(data.specification.digits || 2)} />
            <Metric label="Taxa estimada (spread)" value={money(data.estimatedSpreadCost, data.accountCurrency)} />
            <Metric label="Spread" value={`${data.spreadPoints.toFixed(1)} pts`} />
            <Metric label="Alavancagem" value={data.leverage > 0 ? `1:${data.leverage}` : "—"} />
            <Metric label="Margem necessária" value={money(data.marginRequired, data.accountCurrency)} />
            <Metric label="Capital comprometido" value={`${data.capitalCommittedPct.toFixed(2)}%`} />
            <Metric label="Exposição nocional" value={money(data.notionalValue, data.accountCurrency)} />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3">
            <div className="mb-2 flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Capital comprometido</span><StatusPill tone={capitalTone}>{data.capitalCommittedPct.toFixed(1)}%</StatusPill></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full ${data.capitalCommittedPct >= 100 ? "bg-red-400" : data.capitalCommittedPct >= 70 ? "bg-amber-400" : "bg-sky-400"}`} style={{ width: `${Math.min(100, data.capitalCommittedPct)}%` }} /></div>
            <p className="mt-2 text-[10px] leading-4 text-slate-600">A interface aceita até 100% de capital comprometido como limite visual. Margem real, alavancagem e disponibilidade continuam sendo determinadas pela conta e pelo terminal conectado.</p>
          </div>

          <div className="rounded-lg border border-amber-400/10 bg-amber-400/[0.03] p-3 text-[10px] leading-4 text-amber-100/70">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-amber-100/80"><ShieldAlert className="size-3.5" />Estimativa, não ordem</div>
            {data.note} A tela é somente leitura e não envia ordens ao MT5.
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600">
            <span>Contrato <b className="tabular text-slate-400">{data.specification.contractSize}</b></span>
            <span>Lote mín. <b className="tabular text-slate-400">{data.specification.volumeMin}</b></span>
            <span>Passo <b className="tabular text-slate-400">{data.specification.volumeStep}</b></span>
          </div>
        </> : <div className="flex items-center gap-2 py-6 text-xs text-slate-600"><Activity className="size-4" />{loading ? "Calculando dados de execução…" : "Aguardando dados."}</div>}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-2.5"><p className="text-[9px] uppercase tracking-[0.12em] text-slate-600">{label}</p><p className="tabular mt-1.5 text-sm font-semibold text-slate-200">{value}</p></div>;
}
