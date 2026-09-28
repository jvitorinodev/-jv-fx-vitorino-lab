import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { getTerminalStatus } from "@/features/market-terminal/services/market-data-server";

export async function GET() {
  const actor = await getActor();
  if (!actor || actor.status !== "ACTIVE" || !hasPermission(actor.permissions, PERMISSIONS.TERMINAL_VIEW)) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }
  return NextResponse.json(await getTerminalStatus(), { headers: { "Cache-Control": "no-store" } });
}
