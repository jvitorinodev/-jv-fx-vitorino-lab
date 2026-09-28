import type { DataSource, Direction, MarketType, TradingAccount } from "@/lib/types/trading";

export type TradeStatus = "OPEN" | "CLOSED" | "CANCELLED";
export type TradeResult = "WIN" | "LOSS" | "BE" | null;
export type TradingSession = "ASIA" | "LONDON" | "NEW_YORK" | "OTHER";

export type TradeChecklist = {
  htfAligned: boolean;
  liquidityTaken: boolean;
  poiIdentified: boolean;
  fvgPresent: boolean;
  structureShift: boolean;
  priceActionConfirmation: boolean;
  riskCalculated: boolean;
  dailyLimitChecked: boolean;
  newsChecked: boolean;
};

export type TradeConfluenceInput = {
  key: string;
  label: string;
  weight: number;
  timeframe?: string | null;
};

export type TradeRecord = {
  id: string;
  userId: string;
  accountId: string;
  accountName: string;
  setupId: string;
  symbol: string;
  brokerSymbol: string;
  marketType: MarketType;
  direction: Direction;
  status: TradeStatus;
  result: TradeResult;
  session: TradingSession;
  higherTimeframe: string | null;
  timeframe: string;
  strategy: string;
  setupName: string;
  entryPrice: number;
  stopPrice: number | null;
  targetPrice: number | null;
  exitPrice: number | null;
  positionSize: number;
  riskPercent: number | null;
  riskAmount: number | null;
  expectedRr: number | null;
  realizedR: number | null;
  grossPnl: number | null;
  netPnl: number | null;
  commission: number;
  swap: number;
  contractSize: number;
  conversionRate: number;
  checklist: TradeChecklist;
  notes: string;
  mistakes: string;
  lessons: string;
  tags?: string[];
  quickNote?: string;
  confluences: TradeConfluenceInput[];
  source: DataSource;
  brokerProvider?: "MT5" | null;
  brokerAccountLogin?: string | null;
  brokerPositionId?: string | null;
  brokerEntryDealId?: string | null;
  brokerExitDealId?: string | null;
  importedAt?: string | null;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTradeInput = {
  accountId: string;
  setupId?: string;
  symbol: string;
  direction: Direction;
  session: TradingSession;
  higherTimeframe?: string | null;
  timeframe: string;
  strategy: string;
  setupName: string;
  entryPrice: number;
  stopPrice: number;
  targetPrice?: number | null;
  riskPercent: number;
  checklist: TradeChecklist;
  notes?: string;
  confluences?: TradeConfluenceInput[];
};

export type CloseTradeInput = {
  tradeId: string;
  exitPrice: number;
  commission?: number;
  swap?: number;
  mistakes?: string;
  lessons?: string;
};

export type TradeActionResult =
  | { ok: true; trade: TradeRecord; message: string }
  | { ok: false; message: string; field?: string };

export type TradePlannerData = {
  accounts: TradingAccount[];
  defaultAccountId: string;
  selectedAccountId: string;
  source: DataSource;
};

export const EMPTY_TRADE_CHECKLIST: TradeChecklist = {
  htfAligned: false,
  liquidityTaken: false,
  poiIdentified: false,
  fvgPresent: false,
  structureShift: false,
  priceActionConfirmation: false,
  riskCalculated: false,
  dailyLimitChecked: false,
  newsChecked: false,
};

export type UpdateTradeAnnotationsInput = {
  tradeId: string;
  tags: string[];
  quickNote: string;
};

export type ImportMt5TradeInput = {
  accountId: string;
  positionId: string;
};

export type ImportMt5TradeResult =
  | { ok: true; trade: TradeRecord; message: string; duplicate: boolean }
  | { ok: false; message: string };
