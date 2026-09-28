import type { TradeChecklist, TradeRecord, TradingSession } from "@/lib/types/journal";
import type { Direction, MarketType } from "@/lib/types/trading";

const baseChecklist: TradeChecklist = {
  htfAligned: true,
  liquidityTaken: true,
  poiIdentified: true,
  fvgPresent: true,
  structureShift: true,
  priceActionConfirmation: true,
  riskCalculated: true,
  dailyLimitChecked: true,
  newsChecked: true,
};

type HistoricTradeInput = {
  id: string;
  setupId: string;
  symbol: string;
  brokerSymbol?: string;
  marketType: MarketType;
  direction: Direction;
  session: TradingSession;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  exitPrice: number;
  positionSize: number;
  contractSize: number;
  riskAmount: number;
  riskPercent?: number;
  expectedRr: number;
  realizedR: number;
  netPnl: number;
  openedAt: string;
  closedAt: string;
  strategy: string;
  setupName: string;
  timeframe?: string;
  higherTimeframe?: string;
  mistakes?: string;
  lessons?: string;
};

function historic(input: HistoricTradeInput): TradeRecord {
  return {
    id: input.id,
    userId: "demo-ceo",
    accountId: "acc-exness",
    accountName: "Exness Standard",
    setupId: input.setupId,
    symbol: input.symbol,
    brokerSymbol: input.brokerSymbol ?? input.symbol,
    marketType: input.marketType,
    direction: input.direction,
    status: "CLOSED",
    result: input.netPnl > 0.000001 ? "WIN" : input.netPnl < -0.000001 ? "LOSS" : "BE",
    session: input.session,
    higherTimeframe: input.higherTimeframe ?? "4H",
    timeframe: input.timeframe ?? "15M",
    strategy: input.strategy,
    setupName: input.setupName,
    entryPrice: input.entryPrice,
    stopPrice: input.stopPrice,
    targetPrice: input.targetPrice,
    exitPrice: input.exitPrice,
    positionSize: input.positionSize,
    riskPercent: input.riskPercent ?? 1,
    riskAmount: input.riskAmount,
    expectedRr: input.expectedRr,
    realizedR: input.realizedR,
    grossPnl: input.netPnl,
    netPnl: input.netPnl,
    commission: 0,
    swap: 0,
    contractSize: input.contractSize,
    conversionRate: 1,
    checklist: baseChecklist,
    notes: "Operação demonstrativa usada para testar relatórios e análises do calendário.",
    mistakes: input.mistakes ?? "",
    lessons: input.lessons ?? "",
    confluences: [
      { key: "liquidity_sweep", label: "Varredura de Liquidez", weight: 2, timeframe: input.timeframe ?? "15M" },
      { key: "fvg", label: "FVG · Lacuna de Valor Justo", weight: 1, timeframe: input.timeframe ?? "15M" },
    ],
    source: "DEMO",
    openedAt: input.openedAt,
    closedAt: input.closedAt,
    createdAt: input.openedAt,
    updatedAt: input.closedAt,
  };
}

export const demoJournalTrades: TradeRecord[] = [
  {
    id: "TR-0184",
    userId: "demo-ceo",
    accountId: "acc-exness",
    accountName: "Exness Standard",
    setupId: "XAUUSD-20260921-001",
    symbol: "XAUUSD",
    brokerSymbol: "XAUUSD",
    marketType: "COMMODITY",
    direction: "LONG",
    status: "CLOSED",
    result: "WIN",
    session: "NEW_YORK",
    higherTimeframe: "4H",
    timeframe: "15M",
    strategy: "ICT + Ação do Preço",
    setupName: "Varredura + FVG + MSS",
    entryPrice: 3642.1,
    stopPrice: 3632.1,
    targetPrice: 3666.1,
    exitPrice: 3666.1,
    positionSize: 0.1,
    riskPercent: 1,
    riskAmount: 100,
    expectedRr: 2.4,
    realizedR: 2.4,
    grossPnl: 240,
    netPnl: 240,
    commission: 0,
    swap: 0,
    contractSize: 100,
    conversionRate: 1,
    checklist: baseChecklist,
    notes: "Aguardou o deslocamento de Nova York após a varredura de liquidez do lado vendedor.",
    mistakes: "",
    lessons: "A confirmação mais limpa foi o MSS depois da captura de liquidez.",
    confluences: [
      { key: "liquidity_sweep", label: "Varredura de Liquidez", weight: 2, timeframe: "15M" },
      { key: "fvg", label: "FVG · Lacuna de Valor Justo", weight: 1, timeframe: "15M" },
      { key: "mss", label: "Mudança de Estrutura de Mercado", weight: 2, timeframe: "15M" },
    ],
    source: "DEMO",
    openedAt: "2026-09-21T12:15:00Z",
    closedAt: "2026-09-21T13:42:00Z",
    createdAt: "2026-09-21T12:14:00Z",
    updatedAt: "2026-09-21T13:42:00Z",
  },
  {
    id: "TR-0185",
    userId: "demo-ceo",
    accountId: "acc-exness",
    accountName: "Exness Standard",
    setupId: "NAS100-20260921-002",
    symbol: "NAS100",
    brokerSymbol: "USTEC",
    marketType: "INDEX",
    direction: "SHORT",
    status: "OPEN",
    result: null,
    session: "NEW_YORK",
    higherTimeframe: "1H",
    timeframe: "5M",
    strategy: "ICT",
    setupName: "Varredura + FVG + MSS",
    entryPrice: 24270,
    stopPrice: 24350,
    targetPrice: 24110,
    exitPrice: null,
    positionSize: 6.25,
    riskPercent: 5,
    riskAmount: 500,
    expectedRr: 2,
    realizedR: null,
    grossPnl: null,
    netPnl: null,
    commission: 0,
    swap: 0,
    contractSize: 1,
    conversionRate: 1,
    checklist: { ...baseChecklist, structureShift: true },
    notes: "Observando a reação após a varredura de liquidez do lado comprador.",
    mistakes: "",
    lessons: "",
    confluences: [
      { key: "mss", label: "Mudança de Estrutura de Mercado", weight: 2, timeframe: "5M" },
      { key: "fvg", label: "FVG · Lacuna de Valor Justo", weight: 1, timeframe: "5M" },
    ],
    source: "DEMO",
    openedAt: "2026-09-21T14:15:00Z",
    closedAt: null,
    createdAt: "2026-09-21T14:14:00Z",
    updatedAt: "2026-09-21T14:15:00Z",
  },
  {
    id: "TR-0183",
    userId: "demo-ceo",
    accountId: "acc-exness",
    accountName: "Exness Standard",
    setupId: "EURUSD-20260921-003",
    symbol: "EURUSD",
    brokerSymbol: "EURUSD",
    marketType: "FOREX",
    direction: "SHORT",
    status: "CLOSED",
    result: "LOSS",
    session: "LONDON",
    higherTimeframe: "4H",
    timeframe: "15M",
    strategy: "ICT + Fibonacci",
    setupName: "OB + Fibonacci 61,8%",
    entryPrice: 1.1834,
    stopPrice: 1.1844,
    targetPrice: 1.1814,
    exitPrice: 1.1844,
    positionSize: 1,
    riskPercent: 1,
    riskAmount: 100,
    expectedRr: 2,
    realizedR: -1,
    grossPnl: -100,
    netPnl: -100,
    commission: 0,
    swap: 0,
    contractSize: 100000,
    conversionRate: 1,
    checklist: { ...baseChecklist, priceActionConfirmation: false },
    notes: "Entrada realizada antes de a confirmação ser concluída.",
    mistakes: "Entrada antecipada antes da confirmação pela Ação do Preço.",
    lessons: "Não antecipar a confirmação do MSS.",
    confluences: [{ key: "order_block", label: "Order Block", weight: 1, timeframe: "15M" }, { key: "fib_618", label: "Fibonacci 61,8%", weight: 2, timeframe: "15M" }],
    source: "DEMO",
    openedAt: "2026-09-21T10:32:00Z",
    closedAt: "2026-09-21T11:18:00Z",
    createdAt: "2026-09-21T10:31:00Z",
    updatedAt: "2026-09-21T11:18:00Z",
  },
  historic({ id: "TR-0182", setupId: "NAS100-20260918-001", symbol: "NAS100", brokerSymbol: "USTEC", marketType: "INDEX", direction: "LONG", session: "NEW_YORK", entryPrice: 24088, stopPrice: 24038, targetPrice: 24188, exitPrice: 24088, positionSize: 2, contractSize: 1, riskAmount: 100, expectedRr: 2, realizedR: 0, netPnl: 0, openedAt: "2026-09-18T14:05:00Z", closedAt: "2026-09-18T15:06:00Z", strategy: "ICT", setupName: "MSS + FVG" }),
  historic({ id: "TR-0181", setupId: "GBPUSD-20260918-002", symbol: "GBPUSD", marketType: "FOREX", direction: "LONG", session: "LONDON", entryPrice: 1.3381, stopPrice: 1.3371, targetPrice: 1.3401, exitPrice: 1.3398, positionSize: 1, contractSize: 100000, riskAmount: 100, expectedRr: 2, realizedR: 1.7, netPnl: 170, openedAt: "2026-09-18T09:22:00Z", closedAt: "2026-09-18T10:22:00Z", strategy: "ICT", setupName: "Varredura + OTE" }),
  historic({ id: "TR-0180", setupId: "XAUUSD-20260917-001", symbol: "XAUUSD", marketType: "COMMODITY", direction: "SHORT", session: "NEW_YORK", entryPrice: 3635, stopPrice: 3645, targetPrice: 3615, exitPrice: 3645, positionSize: 0.1, contractSize: 100, riskAmount: 100, expectedRr: 2, realizedR: -1, netPnl: -100, openedAt: "2026-09-17T13:18:00Z", closedAt: "2026-09-17T14:01:00Z", strategy: "Ação do Preço", setupName: "Rompimento falso", mistakes: "Entrada contra a tendência.", lessons: "Exigir alinhamento do timeframe superior antes de operar a reversão." }),
  historic({ id: "TR-0179", setupId: "EURUSD-20260916-001", symbol: "EURUSD", marketType: "FOREX", direction: "LONG", session: "LONDON", entryPrice: 1.176, stopPrice: 1.175, targetPrice: 1.1785, exitPrice: 1.1782, positionSize: 1, contractSize: 100000, riskAmount: 100, expectedRr: 2.5, realizedR: 2.2, netPnl: 220, openedAt: "2026-09-16T08:40:00Z", closedAt: "2026-09-16T10:05:00Z", strategy: "ICT + Fibonacci", setupName: "Varredura + FVG + MSS" }),
  historic({ id: "TR-0178", setupId: "US30-20260915-001", symbol: "US30", marketType: "INDEX", direction: "SHORT", session: "NEW_YORK", entryPrice: 46240, stopPrice: 46290, targetPrice: 46140, exitPrice: 46165, positionSize: 2, contractSize: 1, riskAmount: 100, expectedRr: 2, realizedR: 1.5, netPnl: 150, openedAt: "2026-09-15T14:35:00Z", closedAt: "2026-09-15T15:42:00Z", strategy: "ICT", setupName: "Varredura de BSL + FVG" }),
  historic({ id: "TR-0177", setupId: "XAUUSD-20260915-002", symbol: "XAUUSD", marketType: "COMMODITY", direction: "LONG", session: "NEW_YORK", entryPrice: 3618, stopPrice: 3608, targetPrice: 3638, exitPrice: 3608, positionSize: 0.1, contractSize: 100, riskAmount: 100, expectedRr: 2, realizedR: -1, netPnl: -100, openedAt: "2026-09-15T16:05:00Z", closedAt: "2026-09-15T16:28:00Z", strategy: "ICT", setupName: "Reteste de OB", mistakes: "A segunda operação tinha qualidade inferior.", lessons: "Não reduzir o padrão mínimo do setup depois de uma operação vencedora." }),
  historic({ id: "TR-0176", setupId: "BTCUSD-20260914-001", symbol: "BTCUSD", marketType: "CRYPTO", direction: "LONG", session: "OTHER", entryPrice: 113200, stopPrice: 112700, targetPrice: 114450, exitPrice: 114200, positionSize: 0.2, contractSize: 1, riskAmount: 100, expectedRr: 2.5, realizedR: 2, netPnl: 200, openedAt: "2026-09-14T18:10:00Z", closedAt: "2026-09-14T20:15:00Z", strategy: "Ação do Preço", setupName: "Varredura da lateralização + rompimento" }),
];
