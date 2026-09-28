import type { Bias, DataSource, Direction, MarketType } from "@/lib/types/trading";

export type AnalysisTimeframe = "M" | "W" | "D" | "4H" | "1H" | "30M" | "15M" | "5M" | "1M";
export type MarketStructure = "HH_HL" | "LH_LL" | "BOS" | "CHOCH" | "MSS" | "RANGE" | "EXPANSION" | "CONSOLIDATION" | "UNDEFINED";
export type PriceLocation = "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM" | "NONE";
export type LiquidityFocus = "BSL" | "SSL" | "BOTH" | "INTERNAL" | "EXTERNAL" | "TAKEN" | "NONE";
export type AlignmentState = "ALIGNED" | "COUNTER" | "NEUTRAL" | "WAITING";
export type VwapPosition = "ABOVE" | "BELOW" | "AT" | "UNAVAILABLE";
export type VolumeMode = "TICK" | "CENTRALIZED" | "BROKER" | "UNAVAILABLE";
export type PriceActionSignal = "ENGULFING" | "PIN_BAR" | "INSIDE_BAR" | "BREAKOUT" | "RETEST" | "REJECTION" | "STRONG_CLOSE" | "FAILED_BREAKOUT" | "NONE";
export type MarketPhase = "TREND" | "RANGE" | "EXPANSION" | "CONSOLIDATION" | "TRANSITION";

export type TimeframeAnalysis = {
  timeframe: AnalysisTimeframe;
  bias: Bias;
  structure: MarketStructure;
  priceLocation: PriceLocation;
  liquidity: LiquidityFocus;
  note: string;
};

export type LiquidityMap = {
  previousDayHigh: boolean;
  previousDayLow: boolean;
  previousWeekHigh: boolean;
  previousWeekLow: boolean;
  asiaHigh: boolean;
  asiaLow: boolean;
  buySideLiquidity: boolean;
  sellSideLiquidity: boolean;
  internalLiquidity: boolean;
  externalLiquidity: boolean;
};

export type VolumeContext = {
  mode: VolumeMode;
  relativeVolumePct: number | null;
  vwapPosition: VwapPosition;
  note: string;
};

export type MovingAverageContext = {
  ema9Above20: boolean | null;
  priceAboveEma50: boolean | null;
  priceAboveEma200: boolean | null;
  note: string;
};

export type PriceActionContext = {
  marketPhase: MarketPhase;
  signal: PriceActionSignal;
  confirmed: boolean;
  note: string;
};

export type MarketQuoteSnapshot = {
  symbol: string;
  marketType: MarketType;
  price: number;
  changePct: number;
  source: DataSource;
  updatedAt: string;
  series: number[];
};

export type MarketConsensus = {
  bias: Bias;
  direction: Direction | null;
  alignedFrames: number;
  consideredFrames: number;
  alignmentPct: number;
  score: number;
  stateByTimeframe: Record<AnalysisTimeframe, AlignmentState>;
};

export type MarketAnalysisRecord = {
  id: string;
  userId: string;
  setupId: string;
  symbol: string;
  marketType: MarketType;
  source: DataSource;
  higherTimeframe: AnalysisTimeframe;
  executionTimeframe: AnalysisTimeframe;
  timeframes: TimeframeAnalysis[];
  liquidity: LiquidityMap;
  volume: VolumeContext;
  movingAverages: MovingAverageContext;
  priceAction: PriceActionContext;
  consensus: MarketConsensus;
  thesis: string;
  invalidation: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateMarketAnalysisInput = Omit<MarketAnalysisRecord, "id" | "userId" | "setupId" | "marketType" | "createdAt" | "updatedAt" | "consensus" | "source"> & {
  analysisId?: string;
  setupId?: string;
  source?: DataSource;
};

export type AnalysisActionResult =
  | { ok: true; analysis: MarketAnalysisRecord; message: string }
  | { ok: false; message: string; field?: string };
