"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import type { TerminalPosition } from "@/lib/types/market-terminal";
import { StatusPill } from "@/components/ui/status-pill";

export function TerminalOpenPositions() {
  const [positions, setPositions] = useState<TerminalPosition[]>([]);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const response = await fetch("/api/market/positions", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as { positions?: TerminalPosition[] };
        if (!disposed) {
          setPositions(payload.positions ?? []);
          setAvailable(true);
        }
      } catch { /* modo demo ou bridge offline */ }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, []);

  if (!available || positions.length === 0) return null;

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header"><div className="flex items-center gap-2"><BriefcaseBusiness className="size-4 text-sky-300" /><div><p className="eyebrow">MetaTrader 5</p><h2 className="text-sm font-semibold">Posições Abertas</h2></div></div><StatusPill tone="info">{positions.length}</StatusPill></div>
      <div className="max-h-64 overflow-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="sticky top-0 bg-slate-950/95 text-[9px] uppercase tracking-[0.12em] text-slate-600"><tr><th className="px-3 py-2">Ativo</th><th className="px-3 py-2">Lado</th><th className="px-3 py-2">Lote</th><th className="px-3 py-2">Entrada</th><th className="px-3 py-2">Atual</th><th className="px-3 py-2 text-right">P&L</th></tr></thead>
          <tbody className="divide-y divide-slate-900">{positions.map((row) => <tr key={row.ticket} className="text-slate-400"><td className="px-3 py-2.5 font-semibold text-slate-200">{row.symbol}</td><td className="px-3 py-2.5"><StatusPill tone={row.direction === "LONG" ? "positive" : "negative"}>{row.direction === "LONG" ? "COMPRA" : "VENDA"}</StatusPill></td><td className="px-3 py-2.5 tabular">{row.volume.toFixed(2)}</td><td className="px-3 py-2.5 tabular">{row.priceOpen}</td><td className="px-3 py-2.5 tabular">{row.priceCurrent}</td><td className={`px-3 py-2.5 text-right font-semibold tabular ${row.profit >= 0 ? "text-emerald-300" : "text-red-300"}`}>{row.profit >= 0 ? "+" : ""}{row.profit.toFixed(2)}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
