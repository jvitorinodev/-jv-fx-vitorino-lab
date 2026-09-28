import type { TradeRecord } from "@/lib/types/journal";
import type { HistoricalProbability, PerformanceBreakdownRow, PerformanceMetrics, PerformanceSnapshot, SampleQuality } from "@/lib/types/performance";

const CLOSED = (trade: TradeRecord) => trade.status === "CLOSED" && trade.result !== null;
const finite = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const orderedClosed = (input: readonly TradeRecord[]) => [...input.filter(CLOSED)].sort((a,b) => +new Date(a.closedAt ?? a.openedAt) - +new Date(b.closedAt ?? b.openedAt));

export function calculatePerformanceMetrics(input: readonly TradeRecord[]): PerformanceMetrics {
  const trades = orderedClosed(input);
  const wins = trades.filter((trade) => trade.result === "WIN");
  const losses = trades.filter((trade) => trade.result === "LOSS");
  const breakEven = trades.filter((trade) => trade.result === "BE").length;
  const decisive = wins.length + losses.length;
  const netPnl = trades.reduce((sum, trade) => sum + finite(trade.netPnl), 0);
  const grossProfit = wins.reduce((sum, trade) => sum + Math.max(0, finite(trade.netPnl)), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + Math.min(0, finite(trade.netPnl)), 0));
  const totalFees = trades.reduce((sum, trade) => sum + Math.abs(finite(trade.commission)) + Math.abs(finite(trade.swap)), 0);
  const averageWinnerPnl = wins.length ? wins.reduce((sum, trade) => sum + finite(trade.netPnl), 0) / wins.length : 0;
  const averageLoserPnl = losses.length ? losses.reduce((sum, trade) => sum + finite(trade.netPnl), 0) / losses.length : 0;
  const expectancyPnl = trades.length ? netPnl / trades.length : 0;
  const rTrades = trades.filter((trade) => trade.realizedR != null && Number.isFinite(trade.realizedR));
  const totalR = rTrades.reduce((sum, trade) => sum + finite(trade.realizedR), 0);
  const rWinners = rTrades.filter((trade) => finite(trade.realizedR) > 0);
  const rLosers = rTrades.filter((trade) => finite(trade.realizedR) < 0);
  const averageR = rTrades.length ? totalR / rTrades.length : 0;
  const averageWinnerR = rWinners.length ? rWinners.reduce((sum, trade) => sum + finite(trade.realizedR), 0) / rWinners.length : 0;
  const averageLoserR = rLosers.length ? rLosers.reduce((sum, trade) => sum + finite(trade.realizedR), 0) / rLosers.length : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0;

  let cumulativeR = 0, peakR = 0, maxDrawdownR = 0;
  let cumulativePnl = 0, peakPnl = 0, maxDrawdownPnl = 0;
  let winRun = 0, lossRun = 0, maxWinStreak = 0, maxLossStreak = 0;
  for (const trade of trades) {
    if (trade.realizedR != null && Number.isFinite(trade.realizedR)) {
      cumulativeR += finite(trade.realizedR); peakR = Math.max(peakR, cumulativeR); maxDrawdownR = Math.max(maxDrawdownR, peakR - cumulativeR);
    }
    cumulativePnl += finite(trade.netPnl); peakPnl = Math.max(peakPnl, cumulativePnl); maxDrawdownPnl = Math.max(maxDrawdownPnl, peakPnl - cumulativePnl);
    if (trade.result === "WIN") { winRun += 1; lossRun = 0; maxWinStreak = Math.max(maxWinStreak, winRun); }
    else if (trade.result === "LOSS") { lossRun += 1; winRun = 0; maxLossStreak = Math.max(maxLossStreak, lossRun); }
    else { winRun = 0; lossRun = 0; }
  }

  return {
    trades: trades.length, wins: wins.length, losses: losses.length, breakEven,
    winRatePct: Number((decisive ? wins.length / decisive * 100 : 0).toFixed(2)),
    netPnl: Number(netPnl.toFixed(2)), grossProfit: Number(grossProfit.toFixed(2)), grossLoss: Number(grossLoss.toFixed(2)), totalFees: Number(totalFees.toFixed(2)),
    averageWinnerPnl: Number(averageWinnerPnl.toFixed(2)), averageLoserPnl: Number(averageLoserPnl.toFixed(2)), expectancyPnl: Number(expectancyPnl.toFixed(2)),
    totalR: Number(totalR.toFixed(2)), averageR: Number(averageR.toFixed(3)), averageWinnerR: Number(averageWinnerR.toFixed(3)), averageLoserR: Number(averageLoserR.toFixed(3)),
    profitFactor: profitFactor == null ? null : Number(profitFactor.toFixed(3)), expectancyR: Number(averageR.toFixed(3)), maxDrawdownR: Number(maxDrawdownR.toFixed(3)), maxDrawdownPnl: Number(maxDrawdownPnl.toFixed(2)),
    maxWinStreak, maxLossStreak, currentWinStreak: winRun, currentLossStreak: lossRun,
  };
}

function breakdown(trades: readonly TradeRecord[], getter: (trade: TradeRecord) => { key: string; label: string }[]): PerformanceBreakdownRow[] {
  const buckets = new Map<string, { label: string; trades: TradeRecord[] }>();
  for (const trade of trades.filter(CLOSED)) for (const item of getter(trade)) { const bucket = buckets.get(item.key) ?? { label: item.label, trades: [] }; bucket.trades.push(trade); buckets.set(item.key, bucket); }
  return [...buckets.entries()].map(([key,value]) => ({ key, label: value.label, ...calculatePerformanceMetrics(value.trades) })).sort((a,b) => b.trades - a.trades || b.netPnl - a.netPnl);
}
function combinationKey(trade: TradeRecord) { const unique = [...new Set(trade.confluences.map((item)=>item.key))].sort(); return unique.length >= 2 ? unique.join("+") : unique[0] ?? "sem_confluencia"; }
function combinationLabel(trade: TradeRecord) { const byKey = new Map(trade.confluences.map((item)=>[item.key,item.label])); return combinationKey(trade).split("+").map((key)=>byKey.get(key) ?? key).join(" + "); }

export function buildPerformanceSnapshot(input: readonly TradeRecord[]): PerformanceSnapshot {
  const trades = orderedClosed(input); let cumulativePnl = 0, cumulativeR = 0;
  const equityCurve = trades.map((trade) => ({ label: new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit"}).format(new Date(trade.closedAt ?? trade.openedAt)), cumulativePnl: Number((cumulativePnl += finite(trade.netPnl)).toFixed(2)), cumulativeR: Number((cumulativeR += finite(trade.realizedR)).toFixed(2)) }));
  return {
    summary: calculatePerformanceMetrics(trades), equityCurve,
    byStrategy: breakdown(trades, trade => [{key: trade.strategy || "sem-estrategia", label: trade.strategy || "Sem estratégia"}]),
    byAsset: breakdown(trades, trade => [{key: trade.symbol, label: trade.symbol}]),
    byAccount: breakdown(trades, trade => [{key: trade.accountId, label: trade.accountName}]),
    bySession: breakdown(trades, trade => [{key: trade.session, label: trade.session.replace("_"," ")}]),
    byTimeframe: breakdown(trades, trade => [{key: trade.timeframe, label: trade.timeframe}]),
    byTag: breakdown(trades, trade => (trade.tags ?? []).map(tag => ({key: tag, label: tag}))),
    byConfluence: breakdown(trades, trade => trade.confluences.map(item => ({key:item.key,label:item.label}))),
    byCombination: breakdown(trades, trade => [{key:combinationKey(trade),label:combinationLabel(trade)}]),
  };
}
export function filterTradesByConfluences(trades: readonly TradeRecord[], selectedKeys: readonly string[]): TradeRecord[] { const required = new Set(selectedKeys); if (!required.size) return trades.filter(CLOSED); return trades.filter((trade)=> { if (!CLOSED(trade)) return false; const keys = new Set(trade.confluences.map((item)=>item.key)); return [...required].every((key)=>keys.has(key)); }); }
function sampleQuality(size:number):SampleQuality { if (size<20) return "INSUFFICIENT"; if(size<50)return "EARLY"; if(size<100)return "MODERATE"; return "ROBUST"; }
export function estimateHistoricalProbability(trades: readonly TradeRecord[]): HistoricalProbability { const closed=trades.filter(CLOSED); const wins=closed.filter(t=>t.result==="WIN").length; const losses=closed.filter(t=>t.result==="LOSS").length; const decisive=wins+losses; const quality=sampleQuality(decisive); if(decisive<20) return {available:false,probabilityPct:null,sampleSize:decisive,quality,label:"Amostra insuficiente · mínimo de 20 operações decisivas"}; return {available:true,probabilityPct:Number((((wins+1)/(decisive+2))*100).toFixed(1)),sampleSize:decisive,quality,label:`Estimativa histórica baseada em ${decisive} operações decisivas`}; }
