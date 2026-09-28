import type { MarketWatchItem, RecentTrade, SetupWatch, TradingAccount } from "@/lib/types/trading";

export const demoAccounts: TradingAccount[] = [
  { id: "acc-exness", name: "Exness Standard", broker: "Exness", type: "PERSONAL", currency: "USD", balance: 10000, equity: 10420, source: "DEMO" },
  { id: "acc-funded", name: "Conta Financiada 100K", broker: "Conta Prop", type: "FUNDED", currency: "USD", balance: 101420, equity: 101612.45, source: "DEMO" },
  { id: "acc-demo", name: "Conta Demonstração", broker: "Simulação", type: "DEMO", currency: "USD", balance: 25000, equity: 25000, source: "DEMO" },
];

export const demoMarketWatch: MarketWatchItem[] = [
  { symbol: "EURUSD", market: "FOREX", price: 1.18142, changePct: 0.18, bias: "BULLISH", structure: "HH / HL", confluenceScore: { value: 7, max: 12 }, source: "DEMO" },
  { symbol: "GBPUSD", market: "FOREX", price: 1.3421, changePct: -0.12, bias: "NEUTRAL", structure: "RANGE", confluenceScore: { value: 5, max: 12 }, source: "DEMO" },
  { symbol: "USDJPY", market: "FOREX", price: 146.82, changePct: 0.31, bias: "BULLISH", structure: "BOS", confluenceScore: { value: 6, max: 12 }, source: "DEMO" },
  { symbol: "XAUUSD", market: "COMMODITY", price: 3679.4, changePct: 0.47, bias: "STRONG_BULLISH", structure: "MSS", confluenceScore: { value: 9, max: 12 }, source: "DEMO" },
  { symbol: "XAGUSD", market: "COMMODITY", price: 43.2, changePct: 0.61, bias: "BULLISH", structure: "BOS", confluenceScore: { value: 7, max: 12 }, source: "DEMO" },
  { symbol: "NAS100", market: "INDEX", price: 24118.6, changePct: -0.28, bias: "BEARISH", structure: "LH / LL", confluenceScore: { value: 8, max: 12 }, source: "DEMO" },
  { symbol: "US30", market: "INDEX", price: 46302, changePct: 0.08, bias: "NEUTRAL", structure: "RANGE", confluenceScore: { value: 4, max: 12 }, source: "DEMO" },
  { symbol: "SPX500", market: "INDEX", price: 6710, changePct: -0.09, bias: "BEARISH", structure: "CHOCH", confluenceScore: { value: 6, max: 12 }, source: "DEMO" },
  { symbol: "BTCUSD", market: "CRYPTO", price: 114860, changePct: 1.14, bias: "BULLISH", structure: "BOS", confluenceScore: { value: 7, max: 12 }, source: "DEMO" },
  { symbol: "ETHUSD", market: "CRYPTO", price: 4550, changePct: 0.88, bias: "BULLISH", structure: "HH / HL", confluenceScore: { value: 6, max: 12 }, source: "DEMO" },
];

export const demoSetups: SetupWatch[] = [
  { id: "XAUUSD-20260921-001", symbol: "XAUUSD", direction: "LONG_WATCH", higherTimeframe: "4H", executionTimeframe: "15M", zoneLow: 3658.2, zoneHigh: 3664.8, bias: "BULLISH", structure: "MSS", confluenceScore: { value: 9, max: 12 }, status: "APPROACHING", source: "DEMO" },
  { id: "NAS100-20260921-002", symbol: "NAS100", direction: "SHORT_WATCH", higherTimeframe: "1H", executionTimeframe: "5M", zoneLow: 24248, zoneHigh: 24296, bias: "BEARISH", structure: "LIQUIDITY SWEEP", confluenceScore: { value: 8, max: 12 }, status: "WAITING", source: "DEMO" },
  { id: "EURUSD-20260921-003", symbol: "EURUSD", direction: "LONG_WATCH", higherTimeframe: "4H", executionTimeframe: "15M", zoneLow: 1.1782, zoneHigh: 1.1791, bias: "BULLISH", structure: "BOS", confluenceScore: { value: 7, max: 12 }, status: "INSIDE_ZONE", source: "DEMO" },
];

export const demoTrades: RecentTrade[] = [
  { id: "TR-0184", symbol: "XAUUSD", direction: "LONG", entry: 3642.1, result: "WIN", rMultiple: 2.4, pnl: 240, setup: "Varredura + FVG + MSS", closedAt: "2026-09-21T13:42:00Z", source: "DEMO" },
  { id: "TR-0183", symbol: "EURUSD", direction: "SHORT", entry: 1.1834, result: "LOSS", rMultiple: -1, pnl: -100, setup: "OB + FVG", closedAt: "2026-09-21T11:18:00Z", source: "DEMO" },
  { id: "TR-0182", symbol: "NAS100", direction: "LONG", entry: 24088, result: "BE", rMultiple: 0, pnl: 0, setup: "MSS + FVG", closedAt: "2026-09-20T19:06:00Z", source: "DEMO" },
  { id: "TR-0181", symbol: "GBPUSD", direction: "LONG", entry: 1.3381, result: "WIN", rMultiple: 1.7, pnl: 170, setup: "Varredura + OTE", closedAt: "2026-09-20T14:22:00Z", source: "DEMO" },
];
