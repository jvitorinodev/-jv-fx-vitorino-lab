import type { TradeRecord } from "@/lib/types/journal";
import { SESSION_LABELS, type BreakdownRow, type CalendarDay, type DailyReport, type MonthlyReport } from "@/lib/types/reports";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function localDateKey(value: string | Date, timeZone: string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function monthKeyFromDateKey(dateKey: string): string {
  if (!isDateKey(dateKey)) throw new Error("Chave de data inválida.");
  return dateKey.slice(0, 7);
}

export function currentMonthKey(timeZone: string, now = new Date()): string {
  return localDateKey(now, timeZone).slice(0, 7);
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error("Chave de mês inválida.");
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function listAvailableDateKeys(trades: readonly TradeRecord[], timeZone: string): string[] {
  return [...new Set(trades.map((trade) => localDateKey(trade.openedAt, timeZone)))].sort().reverse();
}

function closedTrades(trades: readonly TradeRecord[]): TradeRecord[] {
  return trades.filter((trade) => trade.status === "CLOSED");
}

function winRateFor(trades: readonly TradeRecord[]): number {
  const decisive = trades.filter((trade) => trade.result === "WIN" || trade.result === "LOSS");
  if (!decisive.length) return 0;
  return (decisive.filter((trade) => trade.result === "WIN").length / decisive.length) * 100;
}

function breakdown(trades: readonly TradeRecord[], keyOf: (trade: TradeRecord) => string, labelOf?: (key: string) => string): BreakdownRow[] {
  const groups = new Map<string, TradeRecord[]>();
  for (const trade of trades) {
    const key = keyOf(trade);
    const current = groups.get(key) ?? [];
    current.push(trade);
    groups.set(key, current);
  }

  return [...groups.entries()].map(([key, values]) => {
    const closed = closedTrades(values);
    return {
      key,
      label: labelOf?.(key) ?? key,
      trades: values.length,
      wins: closed.filter((trade) => trade.result === "WIN").length,
      losses: closed.filter((trade) => trade.result === "LOSS").length,
      breakEvens: closed.filter((trade) => trade.result === "BE").length,
      winRate: winRateFor(closed),
      netPnl: closed.reduce((sum, trade) => sum + (trade.netPnl ?? 0), 0),
      totalR: closed.reduce((sum, trade) => sum + (trade.realizedR ?? 0), 0),
    };
  }).sort((a, b) => b.netPnl - a.netPnl || b.totalR - a.totalR || b.trades - a.trades);
}

function drawdownSequence(values: readonly number[]): number {
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const value of values) {
    cumulative += value;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
  }
  return maxDrawdown;
}

export function buildDailyReport(trades: readonly TradeRecord[], dateKey: string, timeZone: string): DailyReport {
  if (!isDateKey(dateKey)) throw new Error("Data do relatório inválida.");
  const dayTrades = trades
    .filter((trade) => localDateKey(trade.openedAt, timeZone) === dateKey)
    .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
  const closed = closedTrades(dayTrades);
  const wins = closed.filter((trade) => trade.result === "WIN").length;
  const losses = closed.filter((trade) => trade.result === "LOSS").length;
  const breakEvens = closed.filter((trade) => trade.result === "BE").length;
  const grossProfit = closed.reduce((sum, trade) => sum + Math.max(0, trade.netPnl ?? 0), 0);
  const grossLoss = closed.reduce((sum, trade) => sum + Math.abs(Math.min(0, trade.netPnl ?? 0)), 0);
  const netPnl = closed.reduce((sum, trade) => sum + (trade.netPnl ?? 0), 0);
  const rTrades = closed.filter((trade) => trade.realizedR != null);
  const totalR = rTrades.reduce((sum, trade) => sum + (trade.realizedR ?? 0), 0);
  const realizedRValues = rTrades.map((trade) => trade.realizedR ?? 0);
  const expectedValues = dayTrades.filter((trade) => trade.expectedRr != null).map((trade) => trade.expectedRr ?? 0);
  const ranked = [...closed].sort((a, b) => (b.realizedR ?? 0) - (a.realizedR ?? 0));

  return {
    dateKey,
    trades: dayTrades,
    tradeCount: dayTrades.length,
    closedCount: closed.length,
    openCount: dayTrades.filter((trade) => trade.status === "OPEN").length,
    wins,
    losses,
    breakEvens,
    winRate: winRateFor(closed),
    grossProfit,
    grossLoss,
    netPnl,
    totalR,
    averageR: rTrades.length ? totalR / rTrades.length : 0,
    averageExpectedRr: expectedValues.length ? expectedValues.reduce((sum, value) => sum + value, 0) / expectedValues.length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
    maxDrawdownPnl: drawdownSequence(closed.map((trade) => trade.netPnl ?? 0)),
    maxDrawdownR: drawdownSequence(realizedRValues),
    bestTrade: ranked[0] ?? null,
    worstTrade: ranked.length ? ranked[ranked.length - 1] : null,
    sessionBreakdown: breakdown(dayTrades, (trade) => trade.session, (key) => SESSION_LABELS[key as keyof typeof SESSION_LABELS] ?? key),
    assetBreakdown: breakdown(dayTrades, (trade) => trade.symbol),
    accountBreakdown: breakdown(dayTrades, (trade) => trade.accountName),
  };
}

function monthLabel(monthKey: string, timeZone: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone, month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 15, 12)));
}

export function buildMonthlyReport(trades: readonly TradeRecord[], monthKey: string, timeZone: string, now = new Date()): MonthlyReport {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error("Chave de mês inválida.");
  const [year, month] = monthKey.split("-").map(Number);
  if (month < 1 || month > 12) throw new Error("Chave de mês inválida.");

  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekdayMondayZero = (first.getUTCDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - firstWeekdayMondayZero);
  const todayKey = localDateKey(now, timeZone);
  const days: CalendarDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    const daily = buildDailyReport(trades, dateKey, timeZone);
    days.push({
      dateKey,
      dayNumber: date.getUTCDate(),
      inMonth: date.getUTCFullYear() === year && date.getUTCMonth() === month - 1,
      isToday: dateKey === todayKey,
      tradeCount: daily.tradeCount,
      wins: daily.wins,
      losses: daily.losses,
      breakEvens: daily.breakEvens,
      netPnl: daily.netPnl,
      totalR: daily.totalR,
    });
  }

  const monthTrades = trades.filter((trade) => localDateKey(trade.openedAt, timeZone).startsWith(`${monthKey}-`));
  const closed = closedTrades(monthTrades);
  const wins = closed.filter((trade) => trade.result === "WIN").length;
  const losses = closed.filter((trade) => trade.result === "LOSS").length;
  const breakEvens = closed.filter((trade) => trade.result === "BE").length;
  const grossProfit = closed.reduce((sum, trade) => sum + Math.max(0, trade.netPnl ?? 0), 0);
  const grossLoss = closed.reduce((sum, trade) => sum + Math.abs(Math.min(0, trade.netPnl ?? 0)), 0);
  const netPnl = closed.reduce((sum, trade) => sum + (trade.netPnl ?? 0), 0);
  const monthRTrades = closed.filter((trade) => trade.realizedR != null);
  const totalR = monthRTrades.reduce((sum, trade) => sum + (trade.realizedR ?? 0), 0);
  const activeDays = days.filter((day) => day.inMonth && day.tradeCount > 0);

  return {
    monthKey,
    monthLabel: monthLabel(monthKey, timeZone),
    days,
    tradeCount: monthTrades.length,
    wins,
    losses,
    breakEvens,
    winRate: winRateFor(closed),
    netPnl,
    totalR,
    averageR: monthRTrades.length ? totalR / monthRTrades.length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
    activeDays: activeDays.length,
    positiveDays: activeDays.filter((day) => day.netPnl > 0).length,
    negativeDays: activeDays.filter((day) => day.netPnl < 0).length,
  };
}
