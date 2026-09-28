import type { DataSource, Direction, MarketType } from "@/lib/types/trading";

export type TerminalTimeframe = "1M" | "5M" | "15M" | "30M" | "1H" | "4H" | "D";
export type TerminalProviderId = "DEMO" | "MT5_BRIDGE" | "EXNESS_API";

export type MarketCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  realVolume?: number;
  spread?: number;
};

export type MarketQuote = {
  symbol: string;
  brokerSymbol: string;
  bid: number;
  ask: number;
  last: number;
  mid: number;
  spread: number;
  time: number;
  timeMs: number;
  source: DataSource;
};

export type TerminalAccountSnapshot = {
  login: string;
  broker: string;
  server: string;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number | null;
  leverage: number;
  profit: number;
  source: DataSource;
};

export type TerminalPosition = {
  ticket: string;
  symbol: string;
  direction: Direction;
  volume: number;
  priceOpen: number;
  priceCurrent: number;
  stopLoss: number | null;
  takeProfit: number | null;
  profit: number;
  swap: number;
  magic: number;
  openedAt: number;
  source: DataSource;
};

export type TerminalSymbol = {
  symbol: string;
  marketType: MarketType;
  brokerSymbol: string;
  label: string;
};

export type TerminalFeedStatus = {
  provider: TerminalProviderId;
  source: DataSource;
  connected: boolean;
  label: string;
  detail: string;
  lastUpdate?: string;
  latencyMs?: number | null;
  websocketAvailable?: boolean;
};

export type MarketDataResponse = {
  symbol: string;
  brokerSymbol: string;
  timeframe: TerminalTimeframe;
  candles: MarketCandle[];
  status: TerminalFeedStatus;
};

export type MarketStreamMessage =
  | { type: "ready"; provider: TerminalProviderId; symbols: string[]; timestamp: number }
  | { type: "quote"; quote: MarketQuote }
  | { type: "heartbeat"; timestamp: number }
  | { type: "error"; message: string };

export type TerminalSymbolSpecification = {
  symbol: string;
  brokerSymbol: string;
  digits: number;
  point: number;
  tickSize: number;
  tickValue: number;
  contractSize: number;
  volumeMin: number;
  volumeMax: number;
  volumeStep: number;
  currencyBase: string;
  currencyProfit: string;
  currencyMargin: string;
  swapLong: number;
  swapShort: number;
  tradeMode: number;
  source: DataSource;
};

export type TerminalExecutionEstimate = {
  symbol: string;
  brokerSymbol: string;
  direction: Direction;
  volume: number;
  bid: number;
  ask: number;
  entryPrice: number;
  spread: number;
  spreadPoints: number;
  estimatedSpreadCost: number;
  commissionEstimate: number | null;
  marginRequired: number;
  capitalCommittedPct: number;
  accountEquity: number;
  accountFreeMargin: number | null;
  accountCurrency: string;
  leverage: number;
  notionalValue: number;
  specification: TerminalSymbolSpecification;
  source: DataSource;
  note: string;
};

export type EconomicImpact = "High" | "Medium" | "Low" | "Holiday" | "Unknown";

export type EconomicEvent = {
  id: string;
  title: string;
  currency: string;
  date: string;
  impact: EconomicImpact;
  forecast: string;
  previous: string;
  actual?: string;
  source: "FOREX_FACTORY";
};

export type EconomicCalendarPayload = {
  ok: boolean;
  symbol: string;
  currencies: string[];
  events: EconomicEvent[];
  source: "FOREX_FACTORY";
  sourceUrl: string;
  fetchedAt: string;
  error?: string;
};

export type MacroRiskLevel = "NORMAL" | "MODERATE" | "HIGH" | "CRITICAL";

export type MacroRiskSummary = {
  level: MacroRiskLevel;
  label: string;
  detail: string;
  event?: EconomicEvent;
  minutesToEvent?: number;
};

export type AutoEvidenceDirection = "BULLISH" | "BEARISH" | "NEUTRAL";
export type AutoEvidenceConfidence = "LOW" | "MEDIUM" | "HIGH";

export type AutoEvidenceZone = {
  low: number;
  high: number;
  detectedIndex: number;
  invalidatedIndex?: number | null;
};

export type AutoEvidence = {
  key: string;
  label: string;
  category: string;
  direction: AutoEvidenceDirection;
  confidence: AutoEvidenceConfidence;
  detail: string;
  confluenceKey?: string;
  zone?: AutoEvidenceZone;
};

export type AutoAnalysisSnapshot = {
  symbol: string;
  timeframe: TerminalTimeframe;
  evaluatedAt: string;
  candleCount: number;
  context: AutoEvidenceDirection;
  evidenceScore: number;
  evidenceMax: number;
  rsi14: number | null;
  ema9: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  fibRetracement: number | null;
  evidence: AutoEvidence[];
  notes: string[];
};

export type MtfAutoAnalysisSnapshot = {
  symbol: string;
  evaluatedAt: string;
  source: DataSource;
  dominantContext: AutoEvidenceDirection;
  alignmentPct: number;
  bullishFrames: number;
  bearishFrames: number;
  neutralFrames: number;
  frames: AutoAnalysisSnapshot[];
};

export type EvidenceSnapshotRecord = {
  id: string;
  userId: string;
  setupId: string;
  symbol: string;
  source: DataSource;
  evaluatedAt: string;
  primary: AutoAnalysisSnapshot;
  mtf: MtfAutoAnalysisSnapshot | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveEvidenceSnapshotInput = {
  setupId: string;
  symbol: string;
  primary: AutoAnalysisSnapshot;
  mtf?: MtfAutoAnalysisSnapshot | null;
};

export type Mt5ClosedTrade = {
  positionId: string;
  entryDealId: string | null;
  exitDealId: string | null;
  brokerSymbol: string;
  symbol: string;
  supported: boolean;
  direction: Direction;
  volume: number;
  contractSize: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  grossPnl: number;
  commission: number;
  swap: number;
  fee: number;
  netPnl: number;
  magic: number;
  comment: string;
  openedAt: number;
  closedAt: number;
  source: "BROKER";
};

export type Mt5HistoryPayload = {
  provider: "DEMO" | "MT5_BRIDGE";
  accountLogin: string | null;
  currency: string;
  days: number;
  offset: number;
  total: number;
  hasMore: boolean;
  trades: Mt5ClosedTrade[];
  fetchedAt: string;
};
