import type { MarketQuoteSnapshot } from "@/lib/types/market-analysis";
import { StatusPill } from "@/components/ui/status-pill";
import { labelDataSource, labelMarketType } from "@/lib/i18n/pt-br";

function pathFromSeries(series: number[], width = 640, height = 180): string {
  if (series.length < 2) return "";
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  return series.map((value, index) => {
    const x = (index / (series.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 20) - 10;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function MiniPriceChart({ quote }: { quote: MarketQuoteSnapshot }) {
  const path = pathFromSeries(quote.series);
  const digits = quote.symbol === "USDJPY" ? 2 : quote.marketType === "FOREX" ? 5 : quote.symbol.startsWith("XAU") || quote.symbol.startsWith("XAG") ? 2 : 0;
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Contexto de preço</p>
          <div className="mt-1 flex items-center gap-2"><h2 className="text-sm font-semibold">{quote.symbol}</h2><span className="text-[10px] text-slate-600">{labelMarketType(quote.marketType)}</span></div>
        </div>
        <StatusPill tone="info">{labelDataSource(quote.source)}</StatusPill>
      </div>
      <div className="p-4">
        <div className="flex items-end justify-between gap-4">
          <div><p className="tabular text-3xl font-semibold text-slate-100">{quote.price.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}</p><p className={`tabular mt-1 text-xs font-medium ${quote.changePct >= 0 ? "text-emerald-300" : "text-red-300"}`}>{quote.changePct >= 0 ? "+" : ""}{quote.changePct.toFixed(2)}%</p></div>
          <p className="max-w-sm text-right text-[10px] leading-4 text-slate-600">Série visual demonstrativa. Não representa feed de mercado em tempo real e não deve ser usada como cotação de execução.</p>
        </div>
        <div className="mt-5 h-[180px] w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40 p-2">
          <svg viewBox="0 0 640 180" className="h-full w-full" preserveAspectRatio="none" role="img" aria-label={`Série demonstrativa de ${quote.symbol}`}>
            <defs><linearGradient id={`fill-${quote.symbol}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.16"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
            <path d={`${path} L640,180 L0,180 Z`} fill={`url(#fill-${quote.symbol})`} className="text-sky-400" />
            <path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className="text-sky-300" />
          </svg>
        </div>
      </div>
    </section>
  );
}
