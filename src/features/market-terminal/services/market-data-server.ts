import "server-only";

import { marketDataMode } from "@/config/runtime";
import { generateDemoCandles, TERMINAL_SYMBOLS } from "@/features/market-terminal/data/demo-terminal";
import { demoMt5History, findDemoMt5Trade } from "@/features/market-terminal/data/demo-mt5-history";
import { getExnessInstrument } from "@/features/brokers/data/exness-instruments";
import type {
  MarketCandle,
  MarketDataResponse,
  MarketQuote,
  TerminalAccountSnapshot,
  TerminalFeedStatus,
  TerminalPosition,
  TerminalTimeframe,
  Mt5ClosedTrade,
  Mt5HistoryPayload,
  TerminalExecutionEstimate,
  TerminalSymbolSpecification,
} from "@/lib/types/market-terminal";

const DEFAULT_BRIDGE_HTTP = "http://127.0.0.1:8765";

function bridgeHttpUrl() {
  return (process.env.MT5_BRIDGE_HTTP_URL || DEFAULT_BRIDGE_HTTP).replace(/\/$/, "");
}

function bridgeSecret() {
  return process.env.MT5_BRIDGE_SHARED_SECRET?.trim() ?? "";
}

function terminalSymbol(symbol: string) {
  return TERMINAL_SYMBOLS.find((item) => item.symbol === symbol);
}

export function isSupportedTerminalSymbol(symbol: string): boolean {
  return Boolean(terminalSymbol(symbol));
}

export function toBrokerSymbol(symbol: string): string {
  return terminalSymbol(symbol)?.brokerSymbol ?? symbol;
}

export function fromBrokerSymbol(brokerSymbol: string): string | null {
  const normalized = brokerSymbol.trim().toUpperCase();
  const exact = TERMINAL_SYMBOLS.find((item) => item.brokerSymbol.toUpperCase() === normalized);
  if (exact) return exact.symbol;

  // Algumas contas podem exibir sufixos no símbolo. O fallback só aceita prefixos
  // de ativos já autorizados no terminal para não importar instrumentos inesperados.
  const prefixed = [...TERMINAL_SYMBOLS]
    .sort((a, b) => b.brokerSymbol.length - a.brokerSymbol.length)
    .find((item) => normalized.startsWith(item.brokerSymbol.toUpperCase()));
  return prefixed?.symbol ?? null;
}

async function bridgeFetch<T>(path: string, init?: RequestInit, timeoutMs = 4500): Promise<T> {
  const secret = bridgeSecret();
  if (!secret) throw new Error("MT5_BRIDGE_SHARED_SECRET não configurado. Inicie pela raiz com INICIAR_TUDO.ps1 para sincronizar o Bridge antes do Next.js.");

  const url = `${bridgeHttpUrl()}${path}`;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "x-jvfx-key": secret,
          ...(init?.headers ?? {}),
        },
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Bridge MT5 respondeu ${response.status}${text ? `: ${text.slice(0, 240)}` : ""}`);
      }
      return await response.json() as T;
    } catch (error) {
      lastError = error;
      const connectionFailure = error instanceof TypeError && error.message.toLowerCase().includes("fetch failed");
      if (connectionFailure && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`O Bridge MT5 excedeu o tempo limite de ${Math.round(timeoutMs / 1000)}s ao consultar ${path}.`);
      }
      if (connectionFailure) {
        throw new Error(`Não foi possível acessar o Bridge MT5 em ${url}. Inicie o projeto com INICIAR_TUDO.ps1 e mantenha a janela do Bridge aberta.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Não foi possível acessar o Bridge MT5.");
}


function demoStatus(): TerminalFeedStatus {
  return {
    provider: "DEMO",
    source: "DEMO",
    connected: true,
    label: "Demonstração",
    detail: "Candles simulados. Nenhuma cotação real é usada neste modo.",
    lastUpdate: new Date().toISOString(),
    latencyMs: 0,
    websocketAvailable: false,
  };
}

export async function getTerminalStatus(): Promise<TerminalFeedStatus> {
  const mode = marketDataMode();
  if (mode === "demo") return demoStatus();

  if (mode === "exness") {
    return {
      provider: "EXNESS_API",
      source: "REALTIME",
      connected: false,
      label: "Exness API direta · aguardando adaptador",
      detail: "Use MARKET_DATA_PROVIDER=mt5 para a conexão real disponível na v1.1.0.",
      websocketAvailable: false,
    };
  }

  try {
    const started = Date.now();
    const result = await bridgeFetch<{ connected: boolean; terminal?: string; detail?: string; updatedAt?: string }>("/health");
    return {
      provider: "MT5_BRIDGE",
      source: "REALTIME",
      connected: Boolean(result.connected),
      label: result.connected ? "MT5 conectado" : "MT5 indisponível",
      detail: result.detail || result.terminal || "Bridge MT5 local.",
      lastUpdate: result.updatedAt ?? new Date().toISOString(),
      latencyMs: Date.now() - started,
      websocketAvailable: Boolean(result.connected),
    };
  } catch (error) {
    return {
      provider: "MT5_BRIDGE",
      source: "REALTIME",
      connected: false,
      label: "MT5 desconectado",
      detail: error instanceof Error ? error.message : "Não foi possível acessar o Bridge MT5.",
      lastUpdate: new Date().toISOString(),
      websocketAvailable: false,
    };
  }
}

export async function getTerminalCandles(symbol: string, timeframe: TerminalTimeframe, limit = 260): Promise<MarketDataResponse> {
  if (!isSupportedTerminalSymbol(symbol)) throw new Error("Ativo não permitido no terminal.");
  const safeLimit = Math.min(1000, Math.max(50, Math.trunc(limit)));
  const mode = marketDataMode();
  const brokerSymbol = toBrokerSymbol(symbol);

  if (mode === "demo") {
    return {
      symbol,
      brokerSymbol,
      timeframe,
      candles: generateDemoCandles(symbol, timeframe, safeLimit),
      status: demoStatus(),
    };
  }

  if (mode !== "mt5") throw new Error("O adaptador Exness direto ainda não está habilitado. Use MT5 nesta versão.");

  const payload = await bridgeFetch<{
    symbol: string;
    timeframe: TerminalTimeframe;
    candles: Array<{ time: number; open: number; high: number; low: number; close: number; tick_volume?: number; real_volume?: number; spread?: number }>;
  }>(`/candles/${encodeURIComponent(brokerSymbol)}?timeframe=${encodeURIComponent(timeframe)}&limit=${safeLimit}`);

  const candles: MarketCandle[] = payload.candles.map((row) => ({
    time: Number(row.time),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.tick_volume ?? row.real_volume ?? 0),
    realVolume: Number(row.real_volume ?? 0),
    spread: Number(row.spread ?? 0),
  }));

  return {
    symbol,
    brokerSymbol,
    timeframe,
    candles,
    status: await getTerminalStatus(),
  };
}

export async function getTerminalQuote(symbol: string): Promise<MarketQuote> {
  if (!isSupportedTerminalSymbol(symbol)) throw new Error("Ativo não permitido no terminal.");
  const brokerSymbol = toBrokerSymbol(symbol);
  const mode = marketDataMode();

  if (mode === "demo") {
    const candle = generateDemoCandles(symbol, "1M", 2).at(-1)!;
    const spread = Math.max((candle.high - candle.low) * 0.08, candle.close * 0.00001);
    return {
      symbol,
      brokerSymbol,
      bid: candle.close - spread / 2,
      ask: candle.close + spread / 2,
      last: candle.close,
      mid: candle.close,
      spread,
      time: candle.time,
      timeMs: candle.time * 1000,
      source: "DEMO",
    };
  }

  if (mode !== "mt5") throw new Error("Cotação Exness direta ainda não está habilitada nesta versão.");
  const quote = await bridgeFetch<{ symbol: string; bid: number; ask: number; last: number; time: number; time_msc: number }>(`/quote/${encodeURIComponent(brokerSymbol)}`);
  const bid = Number(quote.bid || quote.last || 0);
  const ask = Number(quote.ask || quote.last || bid);
  const last = Number(quote.last || (bid + ask) / 2);
  return {
    symbol,
    brokerSymbol,
    bid,
    ask,
    last,
    mid: (bid + ask) / 2,
    spread: Math.max(0, ask - bid),
    time: Number(quote.time),
    timeMs: Number(quote.time_msc || quote.time * 1000),
    source: "REALTIME",
  };
}

export async function getTerminalAccount(): Promise<TerminalAccountSnapshot | null> {
  if (marketDataMode() !== "mt5") return null;
  const row = await bridgeFetch<{
    login: string | number;
    company?: string;
    server?: string;
    currency?: string;
    balance: number;
    equity: number;
    margin: number;
    margin_free: number;
    margin_level?: number;
    leverage: number;
    profit: number;
  }>("/account");
  return {
    login: String(row.login),
    broker: row.company || "MetaTrader 5",
    server: row.server || "",
    currency: row.currency || "USD",
    balance: Number(row.balance),
    equity: Number(row.equity),
    margin: Number(row.margin),
    freeMargin: Number(row.margin_free),
    marginLevel: Number.isFinite(Number(row.margin_level)) ? Number(row.margin_level) : null,
    leverage: Number(row.leverage),
    profit: Number(row.profit),
    source: "REALTIME",
  };
}


export async function getTerminalPositions(): Promise<TerminalPosition[]> {
  if (marketDataMode() !== "mt5") return [];
  const rows = await bridgeFetch<Array<{
    ticket: string | number; symbol: string; type: number; volume: number; price_open: number; price_current: number; sl?: number; tp?: number; profit: number; swap?: number; magic?: number; time: number;
  }>>("/positions");
  return rows.map((row) => ({
    ticket: String(row.ticket),
    symbol: row.symbol,
    direction: row.type === 0 ? "LONG" : "SHORT",
    volume: Number(row.volume),
    priceOpen: Number(row.price_open),
    priceCurrent: Number(row.price_current),
    stopLoss: Number(row.sl || 0) || null,
    takeProfit: Number(row.tp || 0) || null,
    profit: Number(row.profit),
    swap: Number(row.swap || 0),
    magic: Number(row.magic || 0),
    openedAt: Number(row.time),
    source: "REALTIME",
  }));
}


function mapBridgeHistoryTrade(row: {
  position_id: string | number;
  entry_deal_id?: string | number | null;
  exit_deal_id?: string | number | null;
  symbol: string;
  direction: "LONG" | "SHORT";
  volume: number;
  contract_size?: number;
  entry_price: number;
  exit_price: number;
  sl?: number | null;
  tp?: number | null;
  gross_pnl: number;
  commission?: number;
  swap?: number;
  fee?: number;
  net_pnl: number;
  magic?: number;
  comment?: string;
  opened_at: number;
  closed_at: number;
}): Mt5ClosedTrade {
  const internalSymbol = fromBrokerSymbol(row.symbol);
  return {
    positionId: String(row.position_id),
    entryDealId: row.entry_deal_id == null ? null : String(row.entry_deal_id),
    exitDealId: row.exit_deal_id == null ? null : String(row.exit_deal_id),
    brokerSymbol: String(row.symbol),
    symbol: internalSymbol ?? String(row.symbol).toUpperCase(),
    supported: Boolean(internalSymbol),
    direction: row.direction,
    volume: Number(row.volume),
    contractSize: Number(row.contract_size ?? 0),
    entryPrice: Number(row.entry_price),
    exitPrice: Number(row.exit_price),
    stopLoss: row.sl == null ? null : Number(row.sl),
    takeProfit: row.tp == null ? null : Number(row.tp),
    grossPnl: Number(row.gross_pnl),
    commission: Number(row.commission ?? 0),
    swap: Number(row.swap ?? 0),
    fee: Number(row.fee ?? 0),
    netPnl: Number(row.net_pnl),
    magic: Number(row.magic ?? 0),
    comment: String(row.comment ?? ""),
    openedAt: Number(row.opened_at),
    closedAt: Number(row.closed_at),
    source: "BROKER",
  };
}

export async function getTerminalClosedTrades(days = 30, limit = 100, offset = 0): Promise<Mt5HistoryPayload> {
  const safeDays = Math.min(3650, Math.max(1, Math.trunc(days)));
  const safeLimit = Math.min(500, Math.max(1, Math.trunc(limit)));
  const safeOffset = Math.min(10000, Math.max(0, Math.trunc(offset)));
  const mode = marketDataMode();

  if (mode === "demo") return demoMt5History(safeDays, safeLimit, safeOffset);
  if (mode !== "mt5") throw new Error("Histórico da corretora está disponível pelo Bridge MT5 nesta versão.");

  const payload = await bridgeFetch<{
    account_login?: string | null;
    currency?: string;
    days: number;
    offset?: number;
    total?: number;
    has_more?: boolean;
    trades: Array<{
      position_id: string | number; entry_deal_id?: string | number | null; exit_deal_id?: string | number | null; symbol: string;
      direction: "LONG" | "SHORT"; volume: number; contract_size?: number; entry_price: number; exit_price: number; sl?: number | null; tp?: number | null;
      gross_pnl: number; commission?: number; swap?: number; fee?: number; net_pnl: number; magic?: number; comment?: string; opened_at: number; closed_at: number;
    }>;
  }>(`/history/closed?days=${safeDays}&limit=${safeLimit}&offset=${safeOffset}`, undefined, 45_000);

  return {
    provider: "MT5_BRIDGE",
    accountLogin: payload.account_login == null ? null : String(payload.account_login),
    currency: String(payload.currency ?? "USD"),
    days: Number(payload.days || safeDays),
    offset: Number(payload.offset ?? safeOffset),
    total: Number(payload.total ?? payload.trades.length),
    hasMore: Boolean(payload.has_more),
    trades: payload.trades.map(mapBridgeHistoryTrade),
    fetchedAt: new Date().toISOString(),
  };
}

export async function getTerminalClosedTrade(positionId: string): Promise<{ accountLogin: string | null; currency: string; trade: Mt5ClosedTrade }> {
  const safeId = positionId.trim();
  if (!/^\d+$/.test(safeId)) throw new Error("Ticket/position_id inválido.");
  const mode = marketDataMode();

  if (mode === "demo") {
    const trade = findDemoMt5Trade(safeId);
    if (!trade) throw new Error("Operação demonstrativa não encontrada.");
    return { accountLogin: "12345678", currency: "USD", trade };
  }
  if (mode !== "mt5") throw new Error("Importação de histórico está disponível pelo Bridge MT5 nesta versão.");

  const payload = await bridgeFetch<{
    account_login?: string | null;
    currency?: string;
    trade: {
      position_id: string | number; entry_deal_id?: string | number | null; exit_deal_id?: string | number | null; symbol: string;
      direction: "LONG" | "SHORT"; volume: number; contract_size?: number; entry_price: number; exit_price: number; sl?: number | null; tp?: number | null;
      gross_pnl: number; commission?: number; swap?: number; fee?: number; net_pnl: number; magic?: number; comment?: string; opened_at: number; closed_at: number;
    };
  }>(`/history/closed/${encodeURIComponent(safeId)}`, undefined, 20_000);

  return {
    accountLogin: payload.account_login == null ? null : String(payload.account_login),
    currency: String(payload.currency ?? "USD"),
    trade: mapBridgeHistoryTrade(payload.trade),
  };
}


function demoSymbolSpecification(symbol: string): TerminalSymbolSpecification {
  const spec = getExnessInstrument(symbol);
  return {
    symbol,
    brokerSymbol: spec.brokerSymbol,
    digits: spec.pipSize >= 1 ? 0 : Math.max(0, Math.round(-Math.log10(spec.pipSize)) + (spec.marketType === "FOREX" ? 1 : 0)),
    point: spec.pipSize / (spec.marketType === "FOREX" ? 10 : 1),
    tickSize: spec.pipSize,
    tickValue: spec.pipSize * spec.contractSize,
    contractSize: spec.contractSize,
    volumeMin: spec.minLot,
    volumeMax: spec.maxLot,
    volumeStep: spec.lotStep,
    currencyBase: spec.baseCurrency ?? "",
    currencyProfit: spec.profitCurrency,
    currencyMargin: spec.quoteCurrency,
    swapLong: 0,
    swapShort: 0,
    tradeMode: 0,
    source: "DEMO",
  };
}

export async function getTerminalExecutionEstimate(symbol: string, direction: "LONG" | "SHORT", volume: number): Promise<TerminalExecutionEstimate> {
  if (!isSupportedTerminalSymbol(symbol)) throw new Error("Ativo não permitido no terminal.");
  if (!Number.isFinite(volume) || volume <= 0) throw new Error("Volume deve ser maior que zero.");
  const brokerSymbol = toBrokerSymbol(symbol);
  const mode = marketDataMode();

  if (mode === "demo") {
    const spec = getExnessInstrument(symbol);
    const specification = demoSymbolSpecification(symbol);
    const quote = await getTerminalQuote(symbol);
    const leverage = 2000;
    const equity = 10_000;
    const boundedVolume = Math.min(spec.maxLot, Math.max(spec.minLot, Math.floor(volume / spec.lotStep + Number.EPSILON) * spec.lotStep));
    const entryPrice = direction === "LONG" ? quote.ask : quote.bid;
    const notionalValue = entryPrice * spec.contractSize * boundedVolume;
    const conversion = spec.profitCurrency === "USD" ? 1 : spec.baseCurrency === "USD" ? 1 / Math.max(entryPrice, Number.EPSILON) : 1;
    const estimatedSpreadCost = quote.spread * spec.contractSize * boundedVolume * conversion;
    const marginRequired = notionalValue / leverage;
    return {
      symbol, brokerSymbol, direction, volume: boundedVolume,
      bid: quote.bid, ask: quote.ask, entryPrice, spread: quote.spread,
      spreadPoints: specification.point > 0 ? quote.spread / specification.point : 0,
      estimatedSpreadCost, commissionEstimate: spec.commissionPerLotPerSide * boundedVolume,
      marginRequired, capitalCommittedPct: equity > 0 ? marginRequired / equity * 100 : 0,
      accountEquity: equity, accountFreeMargin: equity, accountCurrency: "USD", leverage, notionalValue, specification, source: "DEMO",
      note: "Estimativa demonstrativa. No modo MT5, margem, alavancagem e custo imediato do spread vêm do terminal conectado.",
    };
  }

  if (mode !== "mt5") throw new Error("Estimativa de execução real está disponível pelo Bridge MT5 nesta versão.");
  const row = await bridgeFetch<{
    symbol: string; direction: "LONG" | "SHORT"; volume: number; bid: number; ask: number; entry_price: number; spread: number; spread_points: number; estimated_spread_cost: number; commission_estimate: number | null; margin_required: number; capital_committed_pct: number; account_equity: number; account_free_margin: number | null; account_currency: string; leverage: number; notional_value: number; note: string;
    specification: { symbol: string; digits: number; point: number; trade_tick_size: number; trade_tick_value: number; trade_contract_size: number; volume_min: number; volume_max: number; volume_step: number; currency_base: string; currency_profit: string; currency_margin: string; swap_long: number; swap_short: number; trade_mode: number };
  }>(`/execution/estimate/${encodeURIComponent(brokerSymbol)}?direction=${direction}&volume=${encodeURIComponent(String(volume))}`);

  return {
    symbol, brokerSymbol, direction: row.direction, volume: Number(row.volume), bid: Number(row.bid), ask: Number(row.ask), entryPrice: Number(row.entry_price), spread: Number(row.spread), spreadPoints: Number(row.spread_points), estimatedSpreadCost: Number(row.estimated_spread_cost), commissionEstimate: row.commission_estimate == null ? null : Number(row.commission_estimate), marginRequired: Number(row.margin_required), capitalCommittedPct: Number(row.capital_committed_pct), accountEquity: Number(row.account_equity), accountFreeMargin: row.account_free_margin == null ? null : Number(row.account_free_margin), accountCurrency: String(row.account_currency || "USD"), leverage: Number(row.leverage), notionalValue: Number(row.notional_value),
    specification: {
      symbol, brokerSymbol, digits: Number(row.specification.digits), point: Number(row.specification.point), tickSize: Number(row.specification.trade_tick_size), tickValue: Number(row.specification.trade_tick_value), contractSize: Number(row.specification.trade_contract_size), volumeMin: Number(row.specification.volume_min), volumeMax: Number(row.specification.volume_max), volumeStep: Number(row.specification.volume_step), currencyBase: String(row.specification.currency_base || ""), currencyProfit: String(row.specification.currency_profit || ""), currencyMargin: String(row.specification.currency_margin || ""), swapLong: Number(row.specification.swap_long), swapShort: Number(row.specification.swap_short), tradeMode: Number(row.specification.trade_mode), source: "REALTIME",
    },
    source: "REALTIME", note: String(row.note || "Dados calculados pelo terminal MT5 conectado."),
  };
}
