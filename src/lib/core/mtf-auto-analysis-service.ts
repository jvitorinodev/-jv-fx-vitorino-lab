import type { AutoAnalysisSnapshot, AutoEvidenceDirection, MtfAutoAnalysisSnapshot } from "@/lib/types/market-terminal";
import type { DataSource } from "@/lib/types/trading";

export function buildMtfAutoAnalysisSnapshot(
  symbol: string,
  frames: AutoAnalysisSnapshot[],
  source: DataSource,
): MtfAutoAnalysisSnapshot {
  const bullishFrames = frames.filter((frame) => frame.context === "BULLISH").length;
  const bearishFrames = frames.filter((frame) => frame.context === "BEARISH").length;
  const neutralFrames = frames.length - bullishFrames - bearishFrames;
  let dominantContext: AutoEvidenceDirection = "NEUTRAL";
  if (bullishFrames > bearishFrames && bullishFrames > neutralFrames) dominantContext = "BULLISH";
  else if (bearishFrames > bullishFrames && bearishFrames > neutralFrames) dominantContext = "BEARISH";
  const dominantCount = Math.max(bullishFrames, bearishFrames, neutralFrames);
  const alignmentPct = frames.length ? Number(((dominantCount / frames.length) * 100).toFixed(1)) : 0;

  return {
    symbol,
    evaluatedAt: new Date().toISOString(),
    source,
    dominantContext,
    alignmentPct,
    bullishFrames,
    bearishFrames,
    neutralFrames,
    frames,
  };
}
