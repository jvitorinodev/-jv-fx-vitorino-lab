import { getDemoQuote } from "@/features/market-analysis/data/demo-market-analysis";
import type { MarketCandle, TerminalSymbol, TerminalTimeframe } from "@/lib/types/market-terminal";

export const TERMINAL_SYMBOLS: TerminalSymbol[] = [
  { symbol: "EURUSD", brokerSymbol: "EURUSD", label: "Euro / Dólar", marketType: "FOREX" },
  { symbol: "GBPUSD", brokerSymbol: "GBPUSD", label: "Libra / Dólar", marketType: "FOREX" },
  { symbol: "USDJPY", brokerSymbol: "USDJPY", label: "Dólar / Iene", marketType: "FOREX" },
  { symbol: "XAUUSD", brokerSymbol: "XAUUSD", label: "Ouro / Dólar", marketType: "COMMODITY" },
  { symbol: "XAGUSD", brokerSymbol: "XAGUSD", label: "Prata / Dólar", marketType: "COMMODITY" },
  { symbol: "NAS100", brokerSymbol: "USTEC", label: "Nasdaq 100", marketType: "INDEX" },
  { symbol: "US30", brokerSymbol: "US30", label: "Dow Jones 30", marketType: "INDEX" },
  { symbol: "SPX500", brokerSymbol: "US500", label: "S&P 500", marketType: "INDEX" },
  { symbol: "BTCUSD", brokerSymbol: "BTCUSD", label: "Bitcoin / Dólar", marketType: "CRYPTO" },
  { symbol: "ETHUSD", brokerSymbol: "ETHUSD", label: "Ethereum / Dólar", marketType: "CRYPTO" },
];

export const TERMINAL_TIMEFRAMES: TerminalTimeframe[] = ["1M", "5M", "15M", "30M", "1H", "4H", "D"];

const timeframeSeconds: Record<TerminalTimeframe, number> = {
  "1M": 60,
  "5M": 300,
  "15M": 900,
  "30M": 1800,
  "1H": 3600,
  "4H": 14400,
  D: 86400,
};

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function volatility(symbol: string, base: number) {
  if (symbol.includes("BTC") || symbol.includes("ETH")) return base * 0.004;
  if (["NAS100", "US30", "SPX500"].includes(symbol)) return base * 0.0015;
  if (symbol.startsWith("XAU")) return base * 0.0012;
  if (symbol.startsWith("XAG")) return base * 0.0018;
  return base * 0.00045;
}

export function generateDemoCandles(symbol: string, timeframe: TerminalTimeframe, limit = 220): MarketCandle[] {
  const quote = getDemoQuote(symbol);
  const random = rng(hash(`${symbol}-${timeframe}-JVFX`));
  const step = timeframeSeconds[timeframe];
  const end = Math.floor(Date.now() / step) * step;
  const vol = volatility(symbol, quote.price);
  const drift = (random() - 0.48) * vol * 0.07;
  let close = quote.price * (0.97 + random() * 0.05);
  const rows: MarketCandle[] = [];

  for (let i = limit - 1; i >= 0; i -= 1) {
    const time = end - i * step;
    const open = close;
    const impulse = (random() - 0.5) * vol * 1.6 + drift;
    close = Math.max(0.00001, open + impulse);
    const upper = Math.abs(random() * vol * 0.8);
    const lower = Math.abs(random() * vol * 0.8);
    rows.push({
      time,
      open,
      high: Math.max(open, close) + upper,
      low: Math.max(0.00001, Math.min(open, close) - lower),
      close,
      volume: Math.round(450 + random() * 1500 + Math.abs(impulse / Math.max(vol, 0.00001)) * 1200),
    });
  }

  const correction = quote.price - rows[rows.length - 1].close;
  return rows.map((row, index) => {
    const weight = index / Math.max(rows.length - 1, 1);
    const shift = correction * weight;
    return { ...row, open: row.open + shift, high: row.high + shift, low: row.low + shift, close: row.close + shift };
  });
}
