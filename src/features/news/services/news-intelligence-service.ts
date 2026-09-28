import type { EconomicEvent, EconomicImpact, MacroRiskSummary } from "@/lib/types/market-terminal";

const symbolCurrencies: Record<string, string[]> = {
  EURUSD: ["EUR", "USD"],
  GBPUSD: ["GBP", "USD"],
  USDJPY: ["USD", "JPY"],
  XAUUSD: ["USD"],
  XAGUSD: ["USD"],
  NAS100: ["USD"],
  US30: ["USD"],
  SPX500: ["USD"],
  BTCUSD: ["USD"],
  ETHUSD: ["USD"],
};

export function currenciesForSymbol(symbol: string): string[] {
  return symbolCurrencies[symbol] ?? ["USD"];
}

export function normalizeImpact(value: unknown): EconomicImpact {
  if (value === "High" || value === "Medium" || value === "Low" || value === "Holiday") return value;
  return "Unknown";
}

export function filterEventsForSymbol(events: EconomicEvent[], symbol: string) {
  const currencies = new Set(currenciesForSymbol(symbol));
  return events.filter((event) => currencies.has(event.currency));
}

export function evaluateMacroRisk(events: EconomicEvent[], now = new Date()): MacroRiskSummary {
  const upcoming = events
    .map((event) => ({ event, minutes: Math.round((new Date(event.date).getTime() - now.getTime()) / 60000) }))
    .filter(({ minutes }) => minutes >= -15)
    .sort((a, b) => Math.abs(a.minutes) - Math.abs(b.minutes));

  const critical = upcoming.find(({ event, minutes }) => event.impact === "High" && minutes >= -15 && minutes <= 20);
  if (critical) {
    return { level: "CRITICAL", label: "Janela crítica", detail: "Evento de alto impacto dentro da janela operacional de ±20 minutos.", event: critical.event, minutesToEvent: critical.minutes };
  }

  const high = upcoming.find(({ event, minutes }) => event.impact === "High" && minutes >= 0 && minutes <= 120);
  if (high) {
    return { level: "HIGH", label: "Risco macro alto", detail: "Evento de alto impacto relevante para o ativo nas próximas 2 horas.", event: high.event, minutesToEvent: high.minutes };
  }

  const medium = upcoming.find(({ event, minutes }) => event.impact === "Medium" && minutes >= 0 && minutes <= 90);
  if (medium) {
    return { level: "MODERATE", label: "Risco macro moderado", detail: "Evento de impacto médio relevante para o ativo nos próximos 90 minutos.", event: medium.event, minutesToEvent: medium.minutes };
  }

  return { level: "NORMAL", label: "Sem janela crítica", detail: "Nenhum evento de impacto alto/médio está próximo segundo a agenda carregada." };
}

export function eventId(title: string, currency: string, date: string) {
  return `${currency}-${date}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
