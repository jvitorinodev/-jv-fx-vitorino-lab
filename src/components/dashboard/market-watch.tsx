import type { MarketWatchItem } from "@/lib/types/trading";
import { labelBias, labelMarketType, labelStructure } from "@/lib/i18n/pt-br";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { ListChecks } from "lucide-react";

const priceDigits: Record<string, number> = { EURUSD: 5, GBPUSD: 5, USDJPY: 2, XAUUSD: 2, NAS100: 1, US30: 0, BTCUSD: 0 };

export function MarketWatch({ items }: { items: MarketWatchItem[] }) {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header"><div><p className="eyebrow">Contexto de mercado</p><h2 className="mt-1 text-sm font-semibold">Observação de Mercado</h2></div><StatusPill tone="info">Dados demonstrativos</StatusPill></div>
      {items.length === 0 ? <div className="p-4"><EmptyState icon={ListChecks} title="Nenhum ativo na observação" description="Adicione ativos à sua lista para acompanhar contexto, estrutura e pontuação de confluências." /></div> : <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead><tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.16em] text-slate-600"><th className="px-4 py-2.5">Ativo</th><th>Mercado</th><th className="text-right">Preço</th><th className="text-right">Variação</th><th className="pl-5">Viés</th><th>Estrutura</th><th className="pr-4 text-right">Pontuação</th></tr></thead>
          <tbody>{items.map((item) => (
            <tr key={item.symbol} className="border-b border-slate-900/90 transition last:border-0 hover:bg-slate-900/45">
              <td className="px-4 py-3 font-semibold text-slate-200">{item.symbol}</td><td className="text-slate-500">{labelMarketType(item.market)}</td><td className="tabular text-right text-slate-300">{item.price.toLocaleString("pt-BR", { minimumFractionDigits: priceDigits[item.symbol] ?? 2, maximumFractionDigits: priceDigits[item.symbol] ?? 2 })}</td><td className={`tabular text-right font-medium ${item.changePct >= 0 ? "text-emerald-300" : "text-red-300"}`}>{item.changePct >= 0 ? "+" : ""}{item.changePct.toFixed(2)}%</td><td className="pl-5 text-slate-400">{labelBias(item.bias)}</td><td className="text-slate-400">{labelStructure(item.structure)}</td><td className="tabular pr-4 text-right font-medium text-slate-300">{item.confluenceScore.value}<span className="text-slate-600">/{item.confluenceScore.max}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>}
    </section>
  );
}
