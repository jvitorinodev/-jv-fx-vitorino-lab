import type { TradeRecord } from "@/lib/types/journal";

export type TradePeriod = "ALL" | "7D" | "14D" | "30D" | "90D" | "180D" | "365D" | "YTD" | "CUSTOM";
export type TradeFilterState = {
  query: string;
  status: string;
  direction: string;
  session: string;
  result: string;
  symbol: string;
  accountId: string;
  source: string;
  tag: string;
  period: TradePeriod;
  fromDate: string;
  toDate: string;
};

export const DEFAULT_TRADE_FILTERS: TradeFilterState = {
  query: "", status: "ALL", direction: "ALL", session: "ALL", result: "ALL", symbol: "ALL", accountId: "ALL", source: "ALL", tag: "ALL", period: "ALL", fromDate: "", toDate: "",
};

function dayStart(date: Date) { const value = new Date(date); value.setHours(0,0,0,0); return value; }
function periodStart(period: TradePeriod, now = new Date()): Date | null {
  const start = dayStart(now);
  if (period === "7D") start.setDate(start.getDate()-6);
  else if (period === "14D") start.setDate(start.getDate()-13);
  else if (period === "30D") start.setDate(start.getDate()-29);
  else if (period === "90D") start.setDate(start.getDate()-89);
  else if (period === "180D") start.setDate(start.getDate()-179);
  else if (period === "365D") start.setDate(start.getDate()-364);
  else if (period === "YTD") { start.setMonth(0,1); }
  else return null;
  return start;
}

export function filterTrades(trades: readonly TradeRecord[], filters: TradeFilterState, now = new Date()): TradeRecord[] {
  const presetStart = periodStart(filters.period, now);
  const customStart = filters.period === "CUSTOM" && filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
  const customEnd = filters.period === "CUSTOM" && filters.toDate ? new Date(`${filters.toDate}T23:59:59.999`) : null;
  const term = filters.query.trim().toLowerCase();
  return trades.filter((trade) => {
    const tags = trade.tags ?? [];
    const haystack = `${trade.setupId} ${trade.symbol} ${trade.strategy} ${trade.setupName} ${trade.accountName} ${trade.quickNote ?? ""} ${tags.join(" ")}`.toLowerCase();
    if (term && !haystack.includes(term)) return false;
    if (filters.status !== "ALL" && trade.status !== filters.status) return false;
    if (filters.direction !== "ALL" && trade.direction !== filters.direction) return false;
    if (filters.session !== "ALL" && trade.session !== filters.session) return false;
    if (filters.result !== "ALL" && (trade.result ?? "OPEN") !== filters.result) return false;
    if (filters.symbol !== "ALL" && trade.symbol !== filters.symbol) return false;
    if (filters.accountId !== "ALL" && trade.accountId !== filters.accountId) return false;
    if (filters.source !== "ALL") {
      const source = trade.brokerProvider === "MT5" ? "BROKER" : trade.source;
      if (source !== filters.source) return false;
    }
    if (filters.tag !== "ALL" && !tags.includes(filters.tag)) return false;
    const date = new Date(trade.closedAt ?? trade.openedAt);
    if (presetStart && date < presetStart) return false;
    if (customStart && date < customStart) return false;
    if (customEnd && date > customEnd) return false;
    return true;
  });
}
