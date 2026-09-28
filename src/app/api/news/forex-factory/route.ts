import { MARKET_SOURCES } from "@/config/market-sources";
import { currenciesForSymbol, eventId, normalizeImpact } from "@/features/news/services/news-intelligence-service";
import type { EconomicCalendarPayload, EconomicEvent } from "@/lib/types/market-terminal";

export const dynamic = "force-dynamic";

const supportedSymbols = new Set(["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "XAGUSD", "NAS100", "US30", "SPX500", "BTCUSD", "ETHUSD"]);

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedSymbol = (url.searchParams.get("symbol") || "XAUUSD").trim().toUpperCase();
  const symbol = supportedSymbols.has(requestedSymbol) ? requestedSymbol : "XAUUSD";
  const currencies = currenciesForSymbol(symbol);

  try {
    const response = await fetch(MARKET_SOURCES.forexFactoryWeeklyJson, {
      headers: { "User-Agent": "JV-FX-Vitorino-LAB/1.0.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) throw new Error(`Forex Factory respondeu HTTP ${response.status}`);
    const raw: unknown = await response.json();
    if (!Array.isArray(raw)) throw new Error("Formato inesperado do calendário Forex Factory.");

    const events: EconomicEvent[] = raw
      .map((item): EconomicEvent | null => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const title = asString(row.title);
        const currency = asString(row.country).toUpperCase();
        const date = asString(row.date);
        if (!title || !currency || !date) return null;
        return {
          id: eventId(title, currency, date),
          title,
          currency,
          date,
          impact: normalizeImpact(row.impact),
          forecast: asString(row.forecast),
          previous: asString(row.previous),
          actual: asString(row.actual) || undefined,
          source: "FOREX_FACTORY",
        };
      })
      .filter((event): event is EconomicEvent => Boolean(event))
      .filter((event) => currencies.includes(event.currency))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const payload: EconomicCalendarPayload = {
      ok: true,
      symbol,
      currencies,
      events,
      source: "FOREX_FACTORY",
      sourceUrl: MARKET_SOURCES.forexFactoryCalendar,
      fetchedAt: new Date().toISOString(),
    };
    return Response.json(payload, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=30" } });
  } catch (error) {
    const payload: EconomicCalendarPayload = {
      ok: false,
      symbol,
      currencies,
      events: [],
      source: "FOREX_FACTORY",
      sourceUrl: MARKET_SOURCES.forexFactoryCalendar,
      fetchedAt: new Date().toISOString(),
      error: process.env.NODE_ENV === "production" ? "Não foi possível atualizar o calendário econômico." : error instanceof Error ? error.message : "Falha ao consultar o calendário.",
    };
    return Response.json(payload, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
