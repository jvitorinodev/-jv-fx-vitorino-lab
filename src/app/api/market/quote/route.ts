import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth/guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { getTerminalQuote, isSupportedTerminalSymbol } from "@/features/market-terminal/services/market-data-server";

export async function GET(request: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.status !== "ACTIVE" || !hasPermission(actor.permissions, PERMISSIONS.TERMINAL_VIEW)) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }
  const symbol = (request.nextUrl.searchParams.get("symbol") || "XAUUSD").toUpperCase();
  if (!isSupportedTerminalSymbol(symbol)) return NextResponse.json({ error: "Ativo não permitido." }, { status: 400 });
  try {
    return NextResponse.json(await getTerminalQuote(symbol), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao obter cotação." }, { status: 503 });
  }
}
