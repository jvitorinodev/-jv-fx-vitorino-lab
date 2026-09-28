import fs from "node:fs";
import path from "node:path";

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  return Object.fromEntries(
    raw.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
}

const root = process.cwd();
const appEnv = parseEnv(path.join(root, ".env.local"));
const bridgeEnv = parseEnv(path.join(root, "bridge", ".env"));
const appSecret = String(appEnv.MT5_BRIDGE_SHARED_SECRET || "").trim();
const bridgeSecret = String(bridgeEnv.JVFX_BRIDGE_SHARED_SECRET || "").trim();

const checks = [
  ["MARKET_DATA_PROVIDER=mt5", String(appEnv.MARKET_DATA_PROVIDER || "").toLowerCase() === "mt5"],
  ["MT5_BRIDGE_HTTP_URL", String(appEnv.MT5_BRIDGE_HTTP_URL || "").startsWith("http://127.0.0.1:8765")],
  ["Segredo do app configurado", appSecret.length >= 24],
  ["Segredo do Bridge configurado", bridgeSecret.length >= 24],
  ["Segredos sincronizados", Boolean(appSecret) && appSecret === bridgeSecret],
];

console.log("\nJV FX · verificação da configuração MT5/Bridge v1.2.10\n");
let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error("\nConfiguração do Bridge incompleta. Execute INICIAR_TUDO.ps1, que corrige e sincroniza esses valores automaticamente.");
  process.exitCode = 1;
} else {
  console.log("\nConfiguração local do Bridge consistente.");
  process.exitCode = 0;
}
