export type Mt5AccountKind = "DEMO" | "REAL" | "UNKNOWN";

const DEMO_SERVER_PATTERN = /(demo|trial|practice|contest)/i;
const REAL_SERVER_PATTERN = /(real|live)/i;

export function detectMt5AccountKind(server: string | null | undefined): Mt5AccountKind {
  const value = String(server ?? "").trim();
  if (!value) return "UNKNOWN";
  if (DEMO_SERVER_PATTERN.test(value)) return "DEMO";
  if (REAL_SERVER_PATTERN.test(value)) return "REAL";
  return "UNKNOWN";
}

export function isMt5CompatibleWithTradingAccount(accountType: string, server: string | null | undefined): boolean {
  const kind = detectMt5AccountKind(server);
  if (kind === "UNKNOWN") return true;
  return accountType === "DEMO" ? kind === "DEMO" : kind === "REAL";
}

export function mt5CompatibilityMessage(accountType: string, server: string | null | undefined): string | null {
  const kind = detectMt5AccountKind(server);
  if (kind === "UNKNOWN") return null;
  if (accountType === "DEMO" && kind === "REAL") {
    return "O MT5 atual parece ser uma conta real. Selecione uma conta REAL do JV FX para evitar mistura de históricos.";
  }
  if (accountType !== "DEMO" && kind === "DEMO") {
    return "O MT5 atual parece ser uma conta Demo/Trial. Selecione a Conta Demonstração do JV FX para evitar mistura de históricos.";
  }
  return null;
}

export function mt5AccountKindLabel(server: string | null | undefined): string {
  const kind = detectMt5AccountKind(server);
  if (kind === "DEMO") return "Demo / Trial";
  if (kind === "REAL") return "Real";
  return "Tipo não identificado";
}
