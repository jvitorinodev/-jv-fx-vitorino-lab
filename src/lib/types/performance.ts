export type SampleQuality = "INSUFFICIENT" | "EARLY" | "MODERATE" | "ROBUST";

export type PerformanceMetrics = {
  trades: number;
  wins: number;
  losses: number;
  breakEven: number;
  winRatePct: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  totalFees: number;
  averageWinnerPnl: number;
  averageLoserPnl: number;
  expectancyPnl: number;
  totalR: number;
  averageR: number;
  averageWinnerR: number;
  averageLoserR: number;
  profitFactor: number | null;
  expectancyR: number;
  maxDrawdownR: number;
  maxDrawdownPnl: number;
  maxWinStreak: number;
  maxLossStreak: number;
  currentWinStreak: number;
  currentLossStreak: number;
};

export type PerformanceBreakdownRow = PerformanceMetrics & { key: string; label: string };
export type EquityPoint = { label: string; cumulativePnl: number; cumulativeR: number };
export type HistoricalProbability = { available: boolean; probabilityPct: number | null; sampleSize: number; quality: SampleQuality; label: string };
export type PerformanceSnapshot = {
  summary: PerformanceMetrics;
  equityCurve: EquityPoint[];
  byStrategy: PerformanceBreakdownRow[];
  byAsset: PerformanceBreakdownRow[];
  byAccount: PerformanceBreakdownRow[];
  bySession: PerformanceBreakdownRow[];
  byTimeframe: PerformanceBreakdownRow[];
  byTag: PerformanceBreakdownRow[];
  byConfluence: PerformanceBreakdownRow[];
  byCombination: PerformanceBreakdownRow[];
};
