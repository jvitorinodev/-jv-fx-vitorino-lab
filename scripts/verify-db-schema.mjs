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
const url = String(env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = String(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

async function verifyDatabase() {
  console.log("\nJV FX · verificação do schema Supabase v1.2.10\n");
  if (!url || !key) {
    console.error("✗ URL/Publishable Key do Supabase ausentes. Rode npm run verify:env primeiro.");
    return 1;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${url}/rest/v1/trading_accounts?select=id,is_primary,broker_account_login,broker_server,last_synced_at&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: controller.signal,
    });
    const body = await response.text();

    if (response.ok) {
      console.log("✓ trading_accounts.is_primary disponível");
      console.log("✓ Campos de vínculo MT5 disponíveis");
      console.log("\nSchema compatível com JV FX v1.2.10.");
      return 0;
    }

    const lower = body.toLowerCase();
    if (lower.includes("is_primary") || (lower.includes("column") && lower.includes("does not exist"))) {
      console.error("✗ O banco ainda está em uma versão anterior à v1.2.9.");
      console.error("Execute SUPABASE_1_2_9.sql no SQL Editor do Supabase e rode novamente npm run verify:db.");
      return 2;
    }

    console.error(`✗ Supabase respondeu HTTP ${response.status}.`);
    if (body) console.error(body.slice(0, 500));
    return 1;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("✗ A verificação do Supabase excedeu 8 segundos.");
    } else {
      console.error(`✗ Não foi possível consultar o Supabase: ${error instanceof Error ? error.message : String(error)}`);
    }
    return 1;
  } finally {
    clearTimeout(timeout);
  }
}

process.exitCode = await verifyDatabase();
