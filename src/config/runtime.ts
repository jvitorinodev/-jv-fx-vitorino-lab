export type RuntimeMode = "demo" | "production";
export type MarketDataMode = "demo" | "mt5" | "exness";

export function runtimeMode(): RuntimeMode {
  return process.env.NEXT_PUBLIC_APP_MODE === "production" ? "production" : "demo";
}

export function marketDataMode(): MarketDataMode {
  const raw = process.env.MARKET_DATA_PROVIDER?.trim().toLowerCase();
  if (raw === "mt5") return "mt5";
  if (raw === "exness") return "exness";
  return "demo";
}

export function productionEnvironmentStatus() {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return {
    mode: runtimeMode(),
    marketDataMode: marketDataMode(),
    authConfigured: missing.length === 0,
    missing,
    mt5Configured: Boolean(process.env.MT5_BRIDGE_HTTP_URL?.trim() && process.env.MT5_BRIDGE_SHARED_SECRET?.trim()),
    exnessConfigured: Boolean(process.env.EXNESS_API_BASE_URL?.trim() && process.env.EXNESS_API_TOKEN?.trim()),
  };
}
