import type { Mt5ClosedTrade, Mt5HistoryPayload } from "@/lib/types/market-terminal";

const now = Date.now();
const day = 86_400_000;

const rows: Mt5ClosedTrade[] = [
  {
    positionId: "92011001",
    entryDealId: "93011001",
    exitDealId: "93011044",
    brokerSymbol: "XAUUSD",
    symbol: "XAUUSD",
    supported: true,
    direction: "LONG",
    volume: 0.25,
    contractSize: 100,
    entryPrice: 3679.2,
    exitPrice: 3716.4,
    stopLoss: 3659.2,
    takeProfit: 3719.2,
    grossPnl: 930,
    commission: -7,
    swap: -2.5,
    fee: 0,
    netPnl: 920.5,
    magic: 0,
    comment: "Demonstração MT5 · fechamento manual",
    openedAt: Math.floor((now - day * 2 - 4 * 3_600_000) / 1000),
    closedAt: Math.floor((now - day * 2 - 2 * 3_600_000) / 1000),
    source: "BROKER",
  },
  {
    positionId: "92011002",
    entryDealId: "93011055",
    exitDealId: "93011077",
    brokerSymbol: "EURUSD",
    symbol: "EURUSD",
    supported: true,
    direction: "SHORT",
    volume: 0.5,
    contractSize: 100000,
    entryPrice: 1.1824,
    exitPrice: 1.1798,
    stopLoss: 1.1844,
    takeProfit: 1.1784,
    grossPnl: 130,
    commission: -3.5,
    swap: 0,
    fee: 0,
    netPnl: 126.5,
    magic: 0,
    comment: "Demonstração MT5",
    openedAt: Math.floor((now - day * 4 - 2 * 3_600_000) / 1000),
    closedAt: Math.floor((now - day * 4 - 1 * 3_600_000) / 1000),
    source: "BROKER",
  },
  {
    positionId: "92011003",
    entryDealId: "93011088",
    exitDealId: "93011102",
    brokerSymbol: "BTCUSD",
    symbol: "BTCUSD",
    supported: true,
    direction: "LONG",
    volume: 0.05,
    contractSize: 1,
    entryPrice: 114250,
    exitPrice: 113710,
    stopLoss: null,
    takeProfit: null,
    grossPnl: -27,
    commission: -0.8,
    swap: 0,
    fee: 0,
    netPnl: -27.8,
    magic: 0,
    comment: "Demonstração sem SL histórico recuperável",
    openedAt: Math.floor((now - day * 8 - 6 * 3_600_000) / 1000),
    closedAt: Math.floor((now - day * 8 - 4 * 3_600_000) / 1000),
    source: "BROKER",
  },
];

export function demoMt5History(days = 30, limit = 500, offset = 0): Mt5HistoryPayload {
  const threshold = Date.now() / 1000 - Math.max(1, days) * 86_400;
  const filtered = rows.filter((trade) => trade.closedAt >= threshold);
  const page = filtered.slice(offset, offset + limit);
  return {
    provider: "DEMO",
    accountLogin: "12345678",
    currency: "USD",
    days,
    offset,
    total: filtered.length,
    hasMore: offset + page.length < filtered.length,
    trades: page,
    fetchedAt: new Date().toISOString(),
  };
}

export function findDemoMt5Trade(positionId: string): Mt5ClosedTrade | null {
  return rows.find((trade) => trade.positionId === positionId) ?? null;
}
