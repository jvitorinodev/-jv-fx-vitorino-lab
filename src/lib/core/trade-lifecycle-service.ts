import type { Direction, MarketType } from "@/lib/types/trading";
import type { TradeResult } from "@/lib/types/journal";

export type TradeGeometryInput = {
  direction: Direction;
  entryPrice: number;
  stopPrice: number;
  targetPrice?: number | null;
};

export type TradeOutcomeInput = {
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  contractSize: number;
  conversionRate: number;
  riskAmount: number;
  commission?: number;
  swap?: number;
};

export type TradeOutcome = {
  grossPnl: number;
  netPnl: number;
  realizedR: number;
  result: Exclude<TradeResult, null>;
};

const positiveLabels: Record<string, string> = {
  entryPrice: "Preço de entrada",
  stopPrice: "Preço do Stop Loss",
  targetPrice: "Preço do Take Profit",
  exitPrice: "Preço de saída",
  positionSize: "Tamanho da posição",
  contractSize: "Tamanho do contrato",
  conversionRate: "Taxa de conversão",
  riskAmount: "Valor de risco",
};

function assertPositive(label: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${positiveLabels[label] ?? label} deve ser maior que zero.`);
}

export function validateTradeGeometry(input: TradeGeometryInput): string[] {
  assertPositive("entryPrice", input.entryPrice);
  assertPositive("stopPrice", input.stopPrice);
  if (input.targetPrice != null) assertPositive("targetPrice", input.targetPrice);

  const errors: string[] = [];
  if (input.direction === "LONG" && input.stopPrice >= input.entryPrice) errors.push("Operações de compra exigem Stop Loss abaixo da entrada.");
  if (input.direction === "SHORT" && input.stopPrice <= input.entryPrice) errors.push("Operações de venda exigem Stop Loss acima da entrada.");
  if (input.targetPrice != null && input.direction === "LONG" && input.targetPrice <= input.entryPrice) errors.push("Em operações de compra, o Take Profit deve ficar acima da entrada.");
  if (input.targetPrice != null && input.direction === "SHORT" && input.targetPrice >= input.entryPrice) errors.push("Em operações de venda, o Take Profit deve ficar abaixo da entrada.");
  return errors;
}

export function calculateTradeOutcome(input: TradeOutcomeInput): TradeOutcome {
  assertPositive("entryPrice", input.entryPrice);
  assertPositive("exitPrice", input.exitPrice);
  assertPositive("positionSize", input.positionSize);
  assertPositive("contractSize", input.contractSize);
  assertPositive("conversionRate", input.conversionRate);
  assertPositive("riskAmount", input.riskAmount);

  const signedMove = input.direction === "LONG"
    ? input.exitPrice - input.entryPrice
    : input.entryPrice - input.exitPrice;
  const grossPnl = signedMove * input.contractSize * input.positionSize * input.conversionRate;
  const commission = Math.abs(input.commission ?? 0);
  const swap = input.swap ?? 0;
  const netPnl = grossPnl - commission + swap;
  const realizedR = netPnl / input.riskAmount;
  const epsilon = 0.000001;
  const result: "WIN" | "LOSS" | "BE" = netPnl > epsilon ? "WIN" : netPnl < -epsilon ? "LOSS" : "BE";

  return { grossPnl, netPnl, realizedR, result };
}

export function generateSetupId(symbol: string, date: Date, sequence: number): string {
  const safeSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "TRADE";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const seq = String(Math.max(1, sequence)).padStart(3, "0");
  return `${safeSymbol}-${y}${m}${d}-${seq}`;
}

export function resolveMarketType(symbol: string): MarketType {
  if (["XAUUSD", "XAGUSD"].includes(symbol)) return "COMMODITY";
  if (["NAS100", "US30", "SPX500"].includes(symbol)) return "INDEX";
  if (["BTCUSD", "ETHUSD"].includes(symbol)) return "CRYPTO";
  return "FOREX";
}
