import { BRAND } from "@/config/brand";
import { productionEnvironmentStatus } from "@/config/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = productionEnvironmentStatus();
  const productionReady = status.mode !== "production" || status.authConfigured;
  const marketData = status.marketDataMode === "mt5"
    ? status.mt5Configured ? "mt5-configured" : "mt5-not-configured"
    : status.marketDataMode === "exness"
      ? status.exnessConfigured ? "exness-configured" : "exness-not-configured"
      : "demo-provider";

  return Response.json(
    {
      ok: productionReady,
      application: BRAND.fullName,
      version: BRAND.version,
      mode: status.mode,
      authentication: status.authConfigured ? "configured" : "not-configured",
      marketData,
      timestamp: new Date().toISOString(),
    },
    {
      status: productionReady ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
