import type { RecentTrade } from "@/lib/types/trading";
import { labelDirection, labelTradeResult } from "@/lib/i18n/pt-br";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";

export function RecentTrades({ trades }: { trades: RecentTrade[] }) {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header"><div><p className="eyebrow">Histórico de execução</p><h2 className="mt-1 text-sm font-semibold">Operações Recentes</h2></div><StatusPill tone="info">Dados demonstrativos</StatusPill></div>
      {trades.length === 0 ? <div className="p-4"><EmptyState icon={BookOpen} title="Nenhuma operação registrada" description="As operações fechadas e abertas aparecerão aqui depois de serem registradas no Planejador ou no Diário." /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.16em] text-slate-600"><th className="px-4 py-2.5">Ativo</th><th>Direção</th><th className="text-right">Entrada</th><th className="text-right">R</th><th className="text-right">P&amp;L</th><th className="pl-5">Estratégia</th><th className="pr-4 text-right">Resultado</th></tr></thead><tbody>{trades.map((trade) => (
        <tr key={trade.id} className="border-b border-slate-900/90 last:border-0 hover:bg-slate-900/45"><td className="px-4 py-3 font-semibold text-slate-200">{trade.symbol}</td><td className={trade.direction === "LONG" ? "text-emerald-300" : "text-red-300"}>{labelDirection(trade.direction)}</td><td className="tabular text-right text-slate-400">{trade.entry.toLocaleString("pt-BR")}</td><td className={`tabular text-right font-medium ${trade.rMultiple > 0 ? "text-emerald-300" : trade.rMultiple < 0 ? "text-red-300" : "text-slate-400"}`}>{trade.rMultiple > 0 ? "+" : ""}{trade.rMultiple.toFixed(1)}R</td><td className={`tabular text-right font-medium ${trade.pnl > 0 ? "text-emerald-300" : trade.pnl < 0 ? "text-red-300" : "text-slate-400"}`}>{trade.pnl >= 0 ? "+" : "-"}US$ {Math.abs(trade.pnl).toFixed(0)}</td><td className="max-w-[220px] truncate pl-5 text-slate-400">{trade.setup}</td><td className="pr-4 text-right"><StatusPill tone={trade.result === "WIN" ? "positive" : trade.result === "LOSS" ? "negative" : "neutral"}>{labelTradeResult(trade.result)}</StatusPill></td></tr>
      ))}</tbody></table></div>}
    </section>
  );
}
