import type { AnalysisTimeframe, LiquidityMap, MarketQuoteSnapshot, MovingAverageContext, PriceActionContext, TimeframeAnalysis, VolumeContext } from "@/lib/types/market-analysis";
import type { MarketType } from "@/lib/types/trading";

export const ANALYSIS_TIMEFRAMES: AnalysisTimeframe[] = ["M", "W", "D", "4H", "1H", "30M", "15M", "5M", "1M"];

const marketTypes: Record<string, MarketType> = {
  EURUSD: "FOREX", GBPUSD: "FOREX", USDJPY: "FOREX", XAUUSD: "COMMODITY", XAGUSD: "COMMODITY",
  NAS100: "INDEX", US30: "INDEX", SPX500: "INDEX", BTCUSD: "CRYPTO", ETHUSD: "CRYPTO",
};

const priceSeries: Record<string, number[]> = {
  EURUSD: [1.1768, 1.1781, 1.1774, 1.1796, 1.1804, 1.1799, 1.1812, 1.18142],
  GBPUSD: [1.346, 1.3441, 1.3435, 1.3452, 1.3418, 1.3404, 1.3411, 1.3421],
  USDJPY: [145.9, 146.1, 146.0, 146.35, 146.22, 146.55, 146.7, 146.82],
  XAUUSD: [3638, 3649, 3642, 3660, 3655, 3671, 3664, 3679.4],
  XAGUSD: [42.58, 42.76, 42.7, 42.93, 43.02, 42.96, 43.14, 43.2],
  NAS100: [24340, 24290, 24318, 24260, 24222, 24184, 24155, 24118.6],
  US30: [46214, 46288, 46260, 46310, 46274, 46296, 46330, 46302],
  SPX500: [6726, 6720, 6716, 6722, 6711, 6707, 6713, 6710],
  BTCUSD: [112400, 113020, 112780, 113650, 114120, 113880, 114340, 114860],
  ETHUSD: [4460, 4490, 4478, 4512, 4525, 4518, 4542, 4550],
};

const lastChange: Record<string, number> = {
  EURUSD: 0.18, GBPUSD: -0.12, USDJPY: 0.31, XAUUSD: 0.47, XAGUSD: 0.61,
  NAS100: -0.28, US30: 0.08, SPX500: -0.09, BTCUSD: 1.14, ETHUSD: 0.88,
};

export const ANALYSIS_SYMBOLS = Object.keys(marketTypes);

export function getDemoQuote(symbol: string): MarketQuoteSnapshot {
  const series = priceSeries[symbol] ?? priceSeries.XAUUSD;
  return { symbol, marketType: marketTypes[symbol] ?? "FOREX", price: series[series.length - 1], changePct: lastChange[symbol] ?? 0, source: "DEMO", updatedAt: new Date().toISOString(), series };
}

const frameTemplates: Record<string, Partial<Record<AnalysisTimeframe, Pick<TimeframeAnalysis, "bias" | "structure" | "priceLocation" | "liquidity">>>> = {
  XAUUSD: {
    W: { bias: "BULLISH", structure: "HH_HL", priceLocation: "DISCOUNT", liquidity: "BSL" },
    D: { bias: "BULLISH", structure: "BOS", priceLocation: "DISCOUNT", liquidity: "EXTERNAL" },
    "4H": { bias: "STRONG_BULLISH", structure: "MSS", priceLocation: "DISCOUNT", liquidity: "TAKEN" },
    "1H": { bias: "NEUTRAL", structure: "RANGE", priceLocation: "EQUILIBRIUM", liquidity: "INTERNAL" },
    "15M": { bias: "BULLISH", structure: "CHOCH", priceLocation: "DISCOUNT", liquidity: "SSL" },
    "5M": { bias: "BULLISH", structure: "BOS", priceLocation: "DISCOUNT", liquidity: "TAKEN" },
  },
  NAS100: {
    W: { bias: "BULLISH", structure: "HH_HL", priceLocation: "PREMIUM", liquidity: "BSL" },
    D: { bias: "NEUTRAL", structure: "RANGE", priceLocation: "PREMIUM", liquidity: "EXTERNAL" },
    "4H": { bias: "BEARISH", structure: "CHOCH", priceLocation: "PREMIUM", liquidity: "BSL" },
    "1H": { bias: "BEARISH", structure: "MSS", priceLocation: "PREMIUM", liquidity: "TAKEN" },
    "15M": { bias: "STRONG_BEARISH", structure: "BOS", priceLocation: "PREMIUM", liquidity: "SSL" },
  },
};

export function createDemoTimeframes(symbol: string): TimeframeAnalysis[] {
  const template = frameTemplates[symbol] ?? {};
  const bearish = ["NAS100", "SPX500"].includes(symbol);
  return ANALYSIS_TIMEFRAMES.map((timeframe) => {
    const configured = template[timeframe];
    return {
      timeframe,
      bias: configured?.bias ?? (bearish ? "BEARISH" : "NEUTRAL"),
      structure: configured?.structure ?? "UNDEFINED",
      priceLocation: configured?.priceLocation ?? "NONE",
      liquidity: configured?.liquidity ?? "NONE",
      note: "",
    };
  });
}

export const DEFAULT_LIQUIDITY_MAP: LiquidityMap = {
  previousDayHigh: true, previousDayLow: true, previousWeekHigh: false, previousWeekLow: false,
  asiaHigh: true, asiaLow: true, buySideLiquidity: true, sellSideLiquidity: true, internalLiquidity: false, externalLiquidity: true,
};

export const DEFAULT_VOLUME_CONTEXT: VolumeContext = {
  mode: "TICK", relativeVolumePct: 124, vwapPosition: "ABOVE",
  note: "Volume demonstrativo. Em Forex, tratar como volume de ticks quando a fonte for a corretora.",
};

export const DEFAULT_MOVING_AVERAGE_CONTEXT: MovingAverageContext = {
  ema9Above20: true, priceAboveEma50: true, priceAboveEma200: true,
  note: "Alinhamento manual para contexto; valores reais entram quando houver provedor de mercado.",
};

export const DEFAULT_PRICE_ACTION_CONTEXT: PriceActionContext = {
  marketPhase: "TREND", signal: "REJECTION", confirmed: true,
  note: "Confirmação demonstrativa. Edite conforme a leitura atual do gráfico.",
};
