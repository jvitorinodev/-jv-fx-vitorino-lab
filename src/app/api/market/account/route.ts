import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth/guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { getTerminalAccount } from "@/features/market-terminal/services/market-data-server";

export async function GET() {
  const actor = await getActor();
  if (!actor || actor.status !== "ACTIVE" || !hasPermission(actor.permissions, PERMISSIONS.TERMINAL_VIEW)) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }
  try {
    const account = await getTerminalAccount();
    return NextResponse.json({ account }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao obter conta MT5." }, { status: 503 });
  }
}
