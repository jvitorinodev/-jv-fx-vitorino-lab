import { ArrowDownRight, ArrowUpRight, Crosshair } from "lucide-react";
import type { SetupWatch } from "@/lib/types/trading";
import { labelBias, labelSetupDirection, labelSetupStatus, labelStructure } from "@/lib/i18n/pt-br";
import { StatusPill } from "@/components/ui/status-pill";

function statusTone(status: SetupWatch["status"]): "info" | "warning" | "positive" | "negative" | "neutral" {
  if (status === "INSIDE_ZONE" || status === "REACTION") return "positive";
  if (status === "APPROACHING") return "warning";
  if (status === "INVALIDATED") return "negative";
  return "neutral";
}

export function SetupCard({ setup }: { setup: SetupWatch }) {
  const long = setup.direction === "LONG_WATCH";
  const DirectionIcon = long ? ArrowUpRight : ArrowDownRight;
  const decimals = setup.symbol.includes("USD") && !setup.symbol.startsWith("BTC") && !setup.symbol.startsWith("XAU") ? 5 : setup.symbol === "XAUUSD" ? 2 : 0;
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-slate-700 hover:bg-slate-900/45">
      <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="font-semibold text-slate-100">{setup.symbol}</span><span className={`flex items-center gap-1 text-[10px] font-semibold ${long ? "text-emerald-300" : "text-red-300"}`}><DirectionIcon className="size-3" />{labelSetupDirection(setup.direction)}</span></div><p className="mt-1 text-[10px] text-slate-600">{setup.id}</p></div><StatusPill tone={statusTone(setup.status)}>{labelSetupStatus(setup.status)}</StatusPill></div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Crosshair className="size-3.5 text-slate-600" /><span>{setup.higherTimeframe} → {setup.executionTimeframe}</span><span className="text-slate-700">•</span><span className="tabular">{setup.zoneLow.toFixed(decimals)} — {setup.zoneHigh.toFixed(decimals)}</span></div>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-800/80 pt-3 text-xs"><div><p className="text-[9px] uppercase tracking-wider text-slate-600">Viés HTF</p><p className="mt-1 text-slate-300">{labelBias(setup.bias)}</p></div><div><p className="text-[9px] uppercase tracking-wider text-slate-600">Estrutura</p><p className="mt-1 text-slate-300">{labelStructure(setup.structure)}</p></div><div className="text-right"><p className="text-[9px] uppercase tracking-wider text-slate-600">Confluência</p><p className="tabular mt-1 font-medium text-slate-200">{setup.confluenceScore.value} / {setup.confluenceScore.max}</p></div></div>
    </article>
  );
}
