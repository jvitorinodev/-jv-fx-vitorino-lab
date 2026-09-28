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
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const checks = [
  ["NEXT_PUBLIC_APP_MODE=production", env.NEXT_PUBLIC_APP_MODE === "production"],
  ["NEXT_PUBLIC_SUPABASE_URL", Boolean(env.NEXT_PUBLIC_SUPABASE_URL)],
  ["Supabase publishable/anon key", Boolean(key)],
  ["NEXT_PUBLIC_SITE_URL", Boolean(env.NEXT_PUBLIC_SITE_URL)],
  ["REGISTRATION_OPEN", ["true", "false"].includes(String(env.REGISTRATION_OPEN))],
];

console.log("\nJV FX · verificação de ambiente beta v1.2.10\n");
let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed = true;
}
if (!fs.existsSync(envPath)) {
  console.log("✗ .env.local não encontrado");
  failed = true;
}
if (failed) {
  console.error("\nAmbiente incompleto. Corrija os itens acima antes de testar autenticação real.");
  process.exitCode = 1;
} else {
  console.log("\nAmbiente mínimo pronto para testar Supabase Auth.");
  process.exitCode = 0;
}
