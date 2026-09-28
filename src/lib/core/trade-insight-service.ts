import type { TradeRecord } from "@/lib/types/journal";
import { labelTradeResult } from "@/lib/i18n/pt-br";

export type TradeTimelinePoint = {
  id: string;
  dateLabel: string;
  timeLabel: string;
  axisLabel: string;
  cumulativePnl: number;
  tradePnl: number;
  symbol: string;
  resultLabel: string;
  tone: "positive" | "negative" | "neutral";
  reason: string;
};

export function orderClosedTrades(input: readonly TradeRecord[]) {
  return [...input]
    .filter((trade) => trade.status === "CLOSED")
    .sort((a, b) => new Date(a.closedAt ?? a.openedAt).getTime() - new Date(b.closedAt ?? b.openedAt).getTime());
}

export function getLastWinningTrade(input: readonly TradeRecord[]) {
  return [...input]
    .filter((trade) => trade.status === "CLOSED" && trade.result === "WIN")
    .sort((a, b) => new Date(b.closedAt ?? b.openedAt).getTime() - new Date(a.closedAt ?? a.openedAt).getTime())[0] ?? null;
}

export function getLastLosingTrade(input: readonly TradeRecord[]) {
  return [...input]
    .filter((trade) => trade.status === "CLOSED" && trade.result === "LOSS")
    .sort((a, b) => new Date(b.closedAt ?? b.openedAt).getTime() - new Date(a.closedAt ?? a.openedAt).getTime())[0] ?? null;
}

export function extractTradeReason(trade: TradeRecord) {
  const candidates = [trade.quickNote, trade.notes, trade.setupName, trade.strategy]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  return candidates[0] ?? "Sem observação registrada";
}

export function buildTradeTimelinePoints(input: readonly TradeRecord[], timeZone: string): TradeTimelinePoint[] {
  let cumulative = 0;
  const formatterDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone });
  const formatterTime = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
  return orderClosedTrades(input).map((trade) => {
    const net = trade.netPnl ?? 0;
    cumulative = Number((cumulative + net).toFixed(2));
    const date = new Date(trade.closedAt ?? trade.openedAt);
    const tone = net > 0 ? "positive" : net < 0 ? "negative" : "neutral";
    return {
      id: trade.id,
      dateLabel: formatterDate.format(date),
      timeLabel: formatterTime.format(date),
      axisLabel: formatterDate.format(date),
      cumulativePnl: cumulative,
      tradePnl: net,
      symbol: trade.symbol,
      resultLabel: labelTradeResult(trade.result),
      tone,
      reason: extractTradeReason(trade),
    };
  });
}
