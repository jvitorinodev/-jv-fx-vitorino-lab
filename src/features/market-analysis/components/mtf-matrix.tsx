import type { Bias } from "@/lib/types/trading";
import type { AlignmentState, LiquidityFocus, MarketStructure, PriceLocation, TimeframeAnalysis } from "@/lib/types/market-analysis";
import { labelBias } from "@/lib/i18n/pt-br";
import { StatusPill } from "@/components/ui/status-pill";

const biases: Bias[] = ["STRONG_BULLISH", "BULLISH", "NEUTRAL", "BEARISH", "STRONG_BEARISH"];
const structures: MarketStructure[] = ["UNDEFINED", "HH_HL", "LH_LL", "BOS", "CHOCH", "MSS", "RANGE", "EXPANSION", "CONSOLIDATION"];
const priceLocations: PriceLocation[] = ["NONE", "PREMIUM", "DISCOUNT", "EQUILIBRIUM"];
const liquidityOptions: LiquidityFocus[] = ["NONE", "BSL", "SSL", "BOTH", "INTERNAL", "EXTERNAL", "TAKEN"];

const structureLabels: Record<MarketStructure, string> = {
  HH_HL: "HH / HL", LH_LL: "LH / LL", BOS: "BOS", CHOCH: "CHoCH", MSS: "MSS", RANGE: "Lateralização",
  EXPANSION: "Expansão", CONSOLIDATION: "Consolidação", UNDEFINED: "Não definida",
};
const priceLocationLabels: Record<PriceLocation, string> = { PREMIUM: "Premium", DISCOUNT: "Discount", EQUILIBRIUM: "Equilíbrio", NONE: "—" };
const liquidityLabels: Record<LiquidityFocus, string> = { BSL: "BSL", SSL: "SSL", BOTH: "BSL + SSL", INTERNAL: "Interna", EXTERNAL: "Externa", TAKEN: "Capturada", NONE: "—" };
const alignmentLabels: Record<AlignmentState, string> = { ALIGNED: "ALINHADO", COUNTER: "CONTRA", NEUTRAL: "NEUTRO", WAITING: "AGUARDANDO" };

function alignmentTone(state: AlignmentState): "positive" | "negative" | "neutral" | "warning" {
  if (state === "ALIGNED") return "positive";
  if (state === "COUNTER") return "negative";
  if (state === "WAITING") return "warning";
  return "neutral";
}

const selectClass = "h-8 min-w-[124px] rounded-md border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-300 outline-none focus:border-sky-500";

export function MtfMatrix({ frames, alignment, onChange }: {
  frames: TimeframeAnalysis[];
  alignment: Record<TimeframeAnalysis["timeframe"], AlignmentState>;
  onChange: (timeframe: TimeframeAnalysis["timeframe"], patch: Partial<TimeframeAnalysis>) => void;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="panel-header"><div><p className="eyebrow">Leitura estruturada</p><h2 className="mt-1 text-sm font-semibold">Matriz Multi-Timeframe</h2></div><span className="text-[10px] text-slate-600">Edite cada período de forma independente</span></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead><tr className="border-b border-slate-800 text-[9px] uppercase tracking-[0.14em] text-slate-600"><th className="px-4 py-2.5">TF</th><th>Viés</th><th>Estrutura</th><th>Preço</th><th>Liquidez</th><th>Status</th><th className="pr-4">Nota rápida</th></tr></thead>
          <tbody>{frames.map((frame) => (
            <tr key={frame.timeframe} className="border-b border-slate-900/90 last:border-0">
              <td className="px-4 py-2.5 font-semibold text-slate-200">{frame.timeframe}</td>
              <td><select className={selectClass} value={frame.bias} onChange={(e) => onChange(frame.timeframe, { bias: e.target.value as Bias })}>{biases.map((value) => <option key={value} value={value}>{labelBias(value)}</option>)}</select></td>
              <td><select className={selectClass} value={frame.structure} onChange={(e) => onChange(frame.timeframe, { structure: e.target.value as MarketStructure })}>{structures.map((value) => <option key={value} value={value}>{structureLabels[value]}</option>)}</select></td>
              <td><select className={selectClass} value={frame.priceLocation} onChange={(e) => onChange(frame.timeframe, { priceLocation: e.target.value as PriceLocation })}>{priceLocations.map((value) => <option key={value} value={value}>{priceLocationLabels[value]}</option>)}</select></td>
              <td><select className={selectClass} value={frame.liquidity} onChange={(e) => onChange(frame.timeframe, { liquidity: e.target.value as LiquidityFocus })}>{liquidityOptions.map((value) => <option key={value} value={value}>{liquidityLabels[value]}</option>)}</select></td>
              <td><StatusPill tone={alignmentTone(alignment[frame.timeframe])}>{alignmentLabels[alignment[frame.timeframe]]}</StatusPill></td>
              <td className="pr-4"><input className="h-8 w-full min-w-[180px] rounded-md border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-300 outline-none focus:border-sky-500" value={frame.note} onChange={(e) => onChange(frame.timeframe, { note: e.target.value })} placeholder="Observação..." /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
