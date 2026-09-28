export type DataSource = "DEMO" | "MANUAL" | "BROKER" | "REALTIME" | "DELAYED";
export type MarketType = "FOREX" | "COMMODITY" | "INDEX" | "CRYPTO";
export type Direction = "LONG" | "SHORT";
export type Bias = "STRONG_BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONG_BEARISH";

export type TradingAccount = {
  id: string;
  name: string;
  broker: string;
  type: "PERSONAL" | "PROP" | "EVALUATION" | "FUNDED" | "DEMO";
  currency: string;
  balance: number;
  equity: number;
  source: DataSource;
  brokerAccountLogin?: string | null;
  brokerServer?: string | null;
  lastSyncedAt?: string | null;
  active?: boolean;
  isPrimary?: boolean;
};

export type MarketWatchItem = {
  symbol: string;
  market: MarketType;
  price: number;
  changePct: number;
  bias: Bias;
  structure: string;
  confluenceScore: { value: number; max: number };
  source: DataSource;
};

export type SetupWatch = {
  id: string;
  symbol: string;
  direction: `${Direction}_WATCH`;
  higherTimeframe: string;
  executionTimeframe: string;
  zoneLow: number;
  zoneHigh: number;
  bias: Bias;
  structure: string;
  confluenceScore: { value: number; max: number };
  status: "WAITING" | "APPROACHING" | "INSIDE_ZONE" | "REACTION" | "INVALIDATED" | "COMPLETED";
  source: DataSource;
};

export type RecentTrade = {
  id: string;
  symbol: string;
  direction: Direction;
  entry: number;
  result: "WIN" | "LOSS" | "BE";
  rMultiple: number;
  pnl: number;
  setup: string;
  closedAt: string;
  source: DataSource;
};
