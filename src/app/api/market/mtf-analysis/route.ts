import { NextResponse } from "next/server";
import { analyzeMarketCandles } from "@/lib/core/auto-analysis-service";
import { buildMtfAutoAnalysisSnapshot } from "@/lib/core/mtf-auto-analysis-service";
import { getTerminalCandles, isSupportedTerminalSymbol } from "@/features/market-terminal/services/market-data-server";
import type { TerminalTimeframe } from "@/lib/types/market-terminal";

const MTF_FRAMES: TerminalTimeframe[] = ["5M", "15M", "1H", "4H", "D"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") || "XAUUSD").trim().toUpperCase();
  if (!isSupportedTerminalSymbol(symbol)) return NextResponse.json({ error: "Ativo não permitido." }, { status: 400 });

  try {
    const payloads = await Promise.all(MTF_FRAMES.map((timeframe) => getTerminalCandles(symbol, timeframe, timeframe === "D" ? 260 : 320)));
    const frames = payloads.map((payload) => analyzeMarketCandles(symbol, payload.timeframe, payload.candles));
    const source = payloads[0]?.status.source ?? "DEMO";
    return NextResponse.json(buildMtfAutoAnalysisSnapshot(symbol, frames, source));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível gerar a estrutura multi-timeframe." }, { status: 503 });
  }
}
