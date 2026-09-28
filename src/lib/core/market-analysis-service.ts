import type { Bias } from "@/lib/types/trading";
import type { AlignmentState, AnalysisTimeframe, MarketConsensus, TimeframeAnalysis } from "@/lib/types/market-analysis";

const biasScore: Record<Bias, number> = {
  STRONG_BULLISH: 2,
  BULLISH: 1,
  NEUTRAL: 0,
  BEARISH: -1,
  STRONG_BEARISH: -2,
};

const higherTimeframes: AnalysisTimeframe[] = ["M", "W", "D", "4H", "1H"];

function biasFromScore(score: number, frameCount: number): Bias {
  const normalized = frameCount > 0 ? score / frameCount : 0;
  if (normalized >= 1.35) return "STRONG_BULLISH";
  if (normalized >= 0.35) return "BULLISH";
  if (normalized <= -1.35) return "STRONG_BEARISH";
  if (normalized <= -0.35) return "BEARISH";
  return "NEUTRAL";
}

function sameDirection(bias: Bias, consensus: Bias): boolean {
  if (consensus === "NEUTRAL") return bias === "NEUTRAL";
  if (consensus === "BULLISH" || consensus === "STRONG_BULLISH") {
    return bias === "BULLISH" || bias === "STRONG_BULLISH";
  }
  return bias === "BEARISH" || bias === "STRONG_BEARISH";
}

export function calculateMarketConsensus(timeframes: TimeframeAnalysis[], selectedHigherTimeframe: AnalysisTimeframe): MarketConsensus {
  const selectedIndex = higherTimeframes.indexOf(selectedHigherTimeframe);
  const consideredKeys: AnalysisTimeframe[] = selectedIndex >= 0
    ? higherTimeframes.slice(Math.max(0, selectedIndex - 2), selectedIndex + 1)
    : ["W", "D", "4H"];
  const considered = timeframes.filter((frame) => consideredKeys.includes(frame.timeframe));
  const score = considered.reduce((total, frame) => total + biasScore[frame.bias], 0);
  const bias = biasFromScore(score, considered.length);
  const alignedFrames = considered.filter((frame) => sameDirection(frame.bias, bias)).length;
  const stateByTimeframe = {} as Record<AnalysisTimeframe, AlignmentState>;

  for (const frame of timeframes) {
    if (frame.bias === "NEUTRAL") stateByTimeframe[frame.timeframe] = "NEUTRAL";
    else if (bias === "NEUTRAL") stateByTimeframe[frame.timeframe] = "WAITING";
    else stateByTimeframe[frame.timeframe] = sameDirection(frame.bias, bias) ? "ALIGNED" : "COUNTER";
  }

  return {
    bias,
    direction: bias === "BULLISH" || bias === "STRONG_BULLISH" ? "LONG" : bias === "BEARISH" || bias === "STRONG_BEARISH" ? "SHORT" : null,
    alignedFrames,
    consideredFrames: considered.length,
    alignmentPct: considered.length ? (alignedFrames / considered.length) * 100 : 0,
    score,
    stateByTimeframe,
  };
}

export function validateMarketAnalysis(input: {
  symbol: string;
  higherTimeframe: AnalysisTimeframe;
  executionTimeframe: AnalysisTimeframe;
  timeframes: TimeframeAnalysis[];
  thesis: string;
  invalidation: string;
}): string[] {
  const errors: string[] = [];
  if (!input.symbol.trim()) errors.push("Selecione um ativo para a análise.");
  if (input.timeframes.length < 3) errors.push("A análise deve conter pelo menos três períodos gráficos.");
  if (!input.timeframes.some((frame) => frame.timeframe === input.higherTimeframe)) errors.push("O período superior selecionado não existe na matriz.");
  if (!input.timeframes.some((frame) => frame.timeframe === input.executionTimeframe)) errors.push("O período de execução selecionado não existe na matriz.");
  if (input.thesis.trim().length < 8) errors.push("Descreva a tese da análise com pelo menos 8 caracteres.");
  if (input.invalidation.trim().length < 5) errors.push("Descreva o que invalida a análise.");
  return errors;
}
