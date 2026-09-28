import type { MarketQuoteSnapshot } from "@/lib/types/market-analysis";
import { getDemoQuote } from "@/features/market-analysis/data/demo-market-analysis";

export interface MarketDataProvider {
  readonly name: string;
  getQuote(symbol: string): Promise<MarketQuoteSnapshot>;
}

export class DemoMarketDataProvider implements MarketDataProvider {
  readonly name = "JV FX Demo Market Data";
  async getQuote(symbol: string): Promise<MarketQuoteSnapshot> { return getDemoQuote(symbol); }
}
