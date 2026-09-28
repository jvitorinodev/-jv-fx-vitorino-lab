import type { EconomicEvent } from "@/lib/types/market-terminal";

function at(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

export const DEMO_ECONOMIC_EVENTS: EconomicEvent[] = [
  { id: "demo-usd-1", title: "Evento USD de alto impacto", currency: "USD", date: at(1.5), impact: "High", forecast: "—", previous: "—", source: "FOREX_FACTORY" },
  { id: "demo-eur-1", title: "Indicador de atividade EUR", currency: "EUR", date: at(4), impact: "Medium", forecast: "—", previous: "—", source: "FOREX_FACTORY" },
  { id: "demo-gbp-1", title: "Discurso de autoridade GBP", currency: "GBP", date: at(7), impact: "Low", forecast: "—", previous: "—", source: "FOREX_FACTORY" },
  { id: "demo-jpy-1", title: "Indicador de inflação JPY", currency: "JPY", date: at(10), impact: "Medium", forecast: "—", previous: "—", source: "FOREX_FACTORY" },
];
