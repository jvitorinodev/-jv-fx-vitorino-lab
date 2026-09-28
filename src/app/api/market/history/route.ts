import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth/guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { getTerminalClosedTrade, getTerminalClosedTrades } from "@/features/market-terminal/services/market-data-server";

export async function GET(request: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.status !== "ACTIVE" || !hasPermission(actor.permissions, PERMISSIONS.JOURNAL_VIEW) || !hasPermission(actor.permissions, PERMISSIONS.TERMINAL_VIEW)) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }

  const ticket = request.nextUrl.searchParams.get("ticket")?.trim();
  try {
    if (ticket) {
      if (!/^\d+$/.test(ticket)) return NextResponse.json({ error: "Ticket inválido." }, { status: 400 });
      return NextResponse.json(await getTerminalClosedTrade(ticket), { headers: { "Cache-Control": "no-store" } });
    }

    const days = Number(request.nextUrl.searchParams.get("days") || 90);
    const limit = Number(request.nextUrl.searchParams.get("limit") || 100);
    return NextResponse.json(await getTerminalClosedTrades(days, limit), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao obter histórico MT5." }, { status: 503 });
  }
}
