import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const fileEnv = Object.fromEntries(
  raw.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);
const env = { ...fileEnv, ...process.env };
const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const siteUrl = String(env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const supabaseUrl = String(env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const provider = String(env.MARKET_DATA_PROVIDER || "demo").toLowerCase();

async function main() {
  const checks = [
    ["Modo production", env.NEXT_PUBLIC_APP_MODE === "production"],
    ["Supabase URL", Boolean(supabaseUrl)],
    ["Supabase Publishable Key", Boolean(publicKey)],
    ["Site URL", Boolean(siteUrl)],
    ["REGISTRATION_OPEN", ["true", "false"].includes(String(env.REGISTRATION_OPEN))],
  ];

  console.log("\nJV FX · verificação de prontidão beta v1.2.10\n");
  let failed = false;
  for (const [label, ok] of checks) {
    console.log(`${ok ? "✓" : "✗"} ${label}`);
    if (!ok) failed = true;
  }

  console.log("\nGoogle OAuth (configuração manual):");
  console.log(`• Origem: ${siteUrl}`);
  console.log(`• Callback Google/Supabase: ${supabaseUrl ? `${supabaseUrl}/auth/v1/callback` : "Supabase URL ausente"}`);
  console.log(`• Redirect JV FX: ${siteUrl}/auth/callback`);

  console.log("\nMarket data:");
  console.log(`• MARKET_DATA_PROVIDER=${provider}`);

  if (provider === "mt5") {
    const bridgeUrl = String(env.MT5_BRIDGE_HTTP_URL || "http://127.0.0.1:8765").replace(/\/$/, "");
    const secret = String(env.MT5_BRIDGE_SHARED_SECRET || "").trim();
    if (!secret) {
      console.log("✗ MT5_BRIDGE_SHARED_SECRET não configurado");
      failed = true;
    } else {
      console.log("✓ MT5_BRIDGE_SHARED_SECRET configurado");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      try {
        const response = await fetch(`${bridgeUrl}/health`, {
          headers: { Accept: "application/json", "x-jvfx-key": secret },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const health = await response.json();
        const connected = Boolean(health?.connected);
        console.log(`${connected ? "✓" : "!"} Bridge MT5 ${connected ? "conectado ao terminal" : "HTTP ativo, mas sem conta MT5 conectada"}`);
        if (!connected) console.log(`  ${String(health?.detail || "Abra/logue o MetaTrader 5.")}`);
      } catch (error) {
        console.log(`✗ Bridge MT5 indisponível em ${bridgeUrl}: ${error instanceof Error ? error.message : "erro de conexão"}`);
        failed = true;
      } finally {
        clearTimeout(timeout);
      }
    }
  } else {
    console.log("ℹ Bridge MT5 não é testado enquanto MARKET_DATA_PROVIDER não for mt5.");
  }

  if (!fs.existsSync(envPath)) {
    console.log("\n✗ .env.local não encontrado");
    failed = true;
  }

  if (failed) {
    console.error("\nBeta ainda possui itens obrigatórios pendentes. Execute INICIAR_TUDO.ps1 e repita o teste.");
    return 1;
  }

  console.log("\n✓ Ambiente pronto para os testes controlados de autenticação e integração.");
  return 0;
}

process.exitCode = await main();
