import { NextResponse } from "next/server";
import { getTerminalExecutionEstimate, isSupportedTerminalSymbol } from "@/features/market-terminal/services/market-data-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") || "XAUUSD").trim().toUpperCase();
  const direction = (url.searchParams.get("direction") || "LONG").trim().toUpperCase();
  const volume = Number(url.searchParams.get("volume") || "0.01");
  if (!isSupportedTerminalSymbol(symbol)) return NextResponse.json({ error: "Ativo não permitido." }, { status: 400 });
  if (direction !== "LONG" && direction !== "SHORT") return NextResponse.json({ error: "Direção inválida." }, { status: 400 });
  if (!Number.isFinite(volume) || volume <= 0) return NextResponse.json({ error: "Volume inválido." }, { status: 400 });

  try {
    return NextResponse.json(await getTerminalExecutionEstimate(symbol, direction, volume));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível calcular margem e custos." }, { status: 503 });
  }
}
