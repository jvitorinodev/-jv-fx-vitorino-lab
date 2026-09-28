import type { AnalysisTimeframe, PriceLocation } from "@/lib/types/market-analysis";
import type { DataSource, Direction, MarketType } from "@/lib/types/trading";

export type PriceZoneType =
  | "FVG"
  | "IFVG"
  | "BPR"
  | "ORDER_BLOCK"
  | "BREAKER_BLOCK"
  | "MITIGATION_BLOCK"
  | "OTE"
  | "SUPPORT"
  | "RESISTANCE"
  | "CUSTOM";

export type PriceZoneStatus =
  | "WAITING"
  | "APPROACHING"
  | "INSIDE_ZONE"
  | "REACTION"
  | "INVALIDATED"
  | "COMPLETED"
  | "ARCHIVED";

export type ConfluenceCategory =
  | "HTF_CONTEXT"
  | "STRUCTURE"
  | "LIQUIDITY"
  | "ICT"
  | "FIBONACCI"
  | "MOMENTUM"
  | "VOLUME"
  | "MOVING_AVERAGES"
  | "PRICE_ACTION"
  | "SESSION"
  | "MACRO";

export type ConfluenceDefinition = {
  key: string;
  category: ConfluenceCategory;
  label: string;
  description: string;
  defaultWeight: number;
  /** Confluências do mesmo grupo são mutuamente exclusivas no seletor. */
  exclusiveGroup?: string;
};

export type ConfluenceSelection = {
  key: string;
  category: ConfluenceCategory;
  label: string;
  weight: number;
  timeframe?: string | null;
  note?: string;
};

export type ConfluenceScoreLevel = "LOW" | "DEVELOPING" | "STRONG" | "HIGH";

export type ConfluenceCategoryScore = {
  category: ConfluenceCategory;
  points: number;
  selectedCount: number;
};

export type ConfluenceScore = {
  points: number;
  selectedCount: number;
  level: ConfluenceScoreLevel;
  byCategory: ConfluenceCategoryScore[];
};

export type PriceZoneRecord = {
  id: string;
  userId: string;
  analysisId: string | null;
  setupId: string;
  symbol: string;
  marketType: MarketType;
  direction: Direction;
  timeframe: AnalysisTimeframe;
  zoneType: PriceZoneType;
  lowerPrice: number;
  upperPrice: number;
  invalidationPrice: number | null;
  priceLocation: PriceLocation;
  status: PriceZoneStatus;
  confluences: ConfluenceSelection[];
  score: ConfluenceScore;
  alertEnabled: boolean;
  notes: string;
  source: DataSource;
  createdAt: string;
  updatedAt: string;
};

export type CreatePriceZoneInput = {
  zoneId?: string;
  analysisId?: string | null;
  setupId: string;
  symbol: string;
  direction: Direction;
  timeframe: AnalysisTimeframe;
  zoneType: PriceZoneType;
  lowerPrice: number;
  upperPrice: number;
  invalidationPrice?: number | null;
  priceLocation: PriceLocation;
  status?: PriceZoneStatus;
  confluences: ConfluenceSelection[];
  alertEnabled?: boolean;
  notes?: string;
  source?: DataSource;
};

export type ConfluenceWeightMap = Record<string, number>;

export type PriceZoneActionResult =
  | { ok: true; zone: PriceZoneRecord; message: string }
  | { ok: false; message: string; field?: string };

export type ConfluenceWeightsActionResult =
  | { ok: true; weights: ConfluenceWeightMap; message: string }
  | { ok: false; message: string };
