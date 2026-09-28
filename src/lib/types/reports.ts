import type { TradeRecord, TradingSession } from "@/lib/types/journal";

export type DailyReview = {
  dateKey: string;
  notes: string;
  lessons: string;
  updatedAt: string | null;
};

export type BreakdownRow = {
  key: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  breakEvens: number;
  winRate: number;
  netPnl: number;
  totalR: number;
};

export type DailyReport = {
  dateKey: string;
  trades: TradeRecord[];
  tradeCount: number;
  closedCount: number;
  openCount: number;
  wins: number;
  losses: number;
  breakEvens: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  netPnl: number;
  totalR: number;
  averageR: number;
  averageExpectedRr: number;
  profitFactor: number | null;
  maxDrawdownPnl: number;
  maxDrawdownR: number;
  bestTrade: TradeRecord | null;
  worstTrade: TradeRecord | null;
  sessionBreakdown: BreakdownRow[];
  assetBreakdown: BreakdownRow[];
  accountBreakdown: BreakdownRow[];
};

export type CalendarDay = {
  dateKey: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  tradeCount: number;
  wins: number;
  losses: number;
  breakEvens: number;
  netPnl: number;
  totalR: number;
};

export type MonthlyReport = {
  monthKey: string;
  monthLabel: string;
  days: CalendarDay[];
  tradeCount: number;
  wins: number;
  losses: number;
  breakEvens: number;
  winRate: number;
  netPnl: number;
  totalR: number;
  averageR: number;
  profitFactor: number | null;
  activeDays: number;
  positiveDays: number;
  negativeDays: number;
};

export type ReportWorkspaceData = {
  trades: TradeRecord[];
  timeZone: string;
  source: "DEMO" | "MANUAL";
};

export type SaveDailyReviewInput = {
  dateKey: string;
  notes: string;
  lessons: string;
};

export type SaveDailyReviewResult =
  | { ok: true; review: DailyReview; message: string }
  | { ok: false; message: string };

export const SESSION_LABELS: Record<TradingSession, string> = {
  ASIA: "Ásia",
  LONDON: "Londres",
  NEW_YORK: "Nova York",
  OTHER: "Outra",
};
