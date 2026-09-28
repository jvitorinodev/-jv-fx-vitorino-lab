import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth/guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { isSupportedTerminalSymbol, toBrokerSymbol } from "@/features/market-terminal/services/market-data-server";
import { marketDataMode } from "@/config/runtime";

function base64urlBytes(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlText(value: string) {
  return base64urlBytes(new TextEncoder().encode(value));
}

async function sign(body: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return base64urlBytes(new Uint8Array(signature));
}

export async function GET(request: NextRequest) {
  const actor = await getActor();
  if (!actor || actor.status !== "ACTIVE" || !hasPermission(actor.permissions, PERMISSIONS.TERMINAL_VIEW)) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  }
  if (marketDataMode() !== "mt5") return NextResponse.json({ enabled: false, reason: "WebSocket disponível somente no modo MT5." });

  const secret = process.env.MT5_BRIDGE_SHARED_SECRET?.trim();
  const wsUrl = process.env.MT5_BRIDGE_WS_URL?.trim();
  if (!secret || !wsUrl) return NextResponse.json({ enabled: false, reason: "Bridge WebSocket não configurado." }, { status: 503 });

  const requested = (request.nextUrl.searchParams.get("symbols") || "XAUUSD")
    .split(",")
    .map((item: string) => item.trim().toUpperCase())
    .filter(isSupportedTerminalSymbol)
    .slice(0, 10);
  if (!requested.length) return NextResponse.json({ error: "Nenhum ativo válido." }, { status: 400 });

  const brokerSymbols = requested.map(toBrokerSymbol);
  const payload = {
    sub: actor.id,
    exp: Math.floor(Date.now() / 1000) + 60,
    symbols: brokerSymbols,
    nonce: crypto.randomUUID(),
  };
  const body = base64urlText(JSON.stringify(payload));
  const signature = await sign(body, secret);
  return NextResponse.json({ enabled: true, wsUrl, token: `${body}.${signature}`, symbols: requested, brokerSymbols });
}
