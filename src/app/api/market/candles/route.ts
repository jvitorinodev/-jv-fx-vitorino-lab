import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth/guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { getTerminalCandles, isSupportedTerminalSymbol } from "@/features/market-terminal/services/market-data-server";
import type { TerminalTimeframe } from "@/lib/types/market-terminal";

const timeframes = new Set<TerminalTimeframe>(["1M", "5M", "15M", "30M", "1H", "4H", "D"]);

export async function GET(request: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.status !== "ACTIVE" || !hasPermission(actor.permissions, PERMISSIONS.TERMINAL_VIEW)) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const symbol = (request.nextUrl.searchParams.get("symbol") || "XAUUSD").toUpperCase();
  const rawTimeframe = request.nextUrl.searchParams.get("timeframe") || "15M";
  const limit = Number(request.nextUrl.searchParams.get("limit") || 260);
  if (!isSupportedTerminalSymbol(symbol)) return NextResponse.json({ error: "Ativo não permitido." }, { status: 400 });
  if (!timeframes.has(rawTimeframe as TerminalTimeframe)) return NextResponse.json({ error: "Timeframe inválido." }, { status: 400 });

  try {
    const payload = await getTerminalCandles(symbol, rawTimeframe as TerminalTimeframe, limit);
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao obter candles." }, { status: 503 });
  }
}
