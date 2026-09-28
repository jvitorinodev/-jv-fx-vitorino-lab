import type { RiskStatus } from "@/lib/core/risk-service";
import type { SessionState } from "@/lib/core/clock";
import type { TradeResult, TradeStatus, TradingSession } from "@/lib/types/journal";
import type { Bias, DataSource, Direction, MarketType, SetupWatch, TradingAccount } from "@/lib/types/trading";
import type { ConfluenceCategory, ConfluenceScoreLevel, PriceZoneStatus, PriceZoneType } from "@/lib/types/price-zones";

export const ptBR = {
  dataSource: {
    DEMO: "DADOS DEMONSTRATIVOS",
    MANUAL: "DADOS MANUAIS",
    BROKER: "DADOS DA CORRETORA",
    REALTIME: "TEMPO REAL",
    DELAYED: "DADOS COM ATRASO",
  } satisfies Record<DataSource, string>,
  marketType: {
    FOREX: "Forex",
    COMMODITY: "Commodities",
    INDEX: "Índices",
    CRYPTO: "Cripto",
  } satisfies Record<MarketType, string>,
  direction: {
    LONG: "COMPRA",
    SHORT: "VENDA",
  } satisfies Record<Direction, string>,
  bias: {
    STRONG_BULLISH: "FORTEMENTE ALTISTA",
    BULLISH: "ALTISTA",
    NEUTRAL: "NEUTRO",
    BEARISH: "BAIXISTA",
    STRONG_BEARISH: "FORTEMENTE BAIXISTA",
  } satisfies Record<Bias, string>,
  setupStatus: {
    WAITING: "AGUARDANDO",
    APPROACHING: "APROXIMANDO",
    INSIDE_ZONE: "DENTRO DA ZONA",
    REACTION: "REAÇÃO",
    INVALIDATED: "INVALIDADA",
    COMPLETED: "CONCLUÍDA",
  } satisfies Record<SetupWatch["status"], string>,
  tradeResult: {
    WIN: "GANHO",
    LOSS: "PERDA",
    BE: "ZERO A ZERO",
  } satisfies Record<Exclude<TradeResult, null>, string>,
  tradeStatus: {
    OPEN: "ABERTA",
    CLOSED: "FECHADA",
    CANCELLED: "CANCELADA",
  } satisfies Record<TradeStatus, string>,
  session: {
    ASIA: "ÁSIA",
    LONDON: "LONDRES",
    NEW_YORK: "NOVA YORK",
    OTHER: "OUTRA",
  } satisfies Record<TradingSession, string>,
  sessionState: {
    OPEN: "ABERTA",
    CLOSED: "FECHADA",
    OPENING_SOON: "ABRE EM BREVE",
  } satisfies Record<SessionState, string>,
  riskStatus: {
    SAFE: "SEGURO",
    CAUTION: "ATENÇÃO",
    CRITICAL: "CRÍTICO",
    LOCKED: "BLOQUEADO",
  } satisfies Record<RiskStatus, string>,

  priceZoneType: {
    FVG: "FVG · Lacuna de Valor Justo",
    IFVG: "IFVG · FVG Invertido",
    BPR: "BPR · Faixa de Preço Balanceada",
    ORDER_BLOCK: "Bloco de Ordens",
    BREAKER_BLOCK: "Breaker Block",
    MITIGATION_BLOCK: "Mitigation Block",
    OTE: "OTE",
    SUPPORT: "Suporte",
    RESISTANCE: "Resistência",
    CUSTOM: "Zona Personalizada",
  } satisfies Record<PriceZoneType, string>,
  priceZoneStatus: {
    WAITING: "AGUARDANDO",
    APPROACHING: "APROXIMANDO",
    INSIDE_ZONE: "DENTRO DA ZONA",
    REACTION: "REAÇÃO",
    INVALIDATED: "INVALIDADA",
    COMPLETED: "CONCLUÍDA",
    ARCHIVED: "ARQUIVADA",
  } satisfies Record<PriceZoneStatus, string>,
  confluenceLevel: {
    LOW: "BAIXA CONFLUÊNCIA",
    DEVELOPING: "EM DESENVOLVIMENTO",
    STRONG: "FORTE CONFLUÊNCIA",
    HIGH: "ALTA CONFLUÊNCIA",
  } satisfies Record<ConfluenceScoreLevel, string>,
  confluenceCategory: {
    HTF_CONTEXT: "CONTEXTO HTF",
    STRUCTURE: "ESTRUTURA",
    LIQUIDITY: "LIQUIDEZ",
    ICT: "ICT",
    FIBONACCI: "FIBONACCI",
    MOMENTUM: "RSI / MOMENTUM",
    VOLUME: "VOLUME",
    MOVING_AVERAGES: "MÉDIAS MÓVEIS",
    PRICE_ACTION: "AÇÃO DO PREÇO",
    SESSION: "SESSÃO",
    MACRO: "NOTÍCIAS / MACRO",
  } satisfies Record<ConfluenceCategory, string>,
  accountType: {
    PERSONAL: "PESSOAL",
    PROP: "MESA PROPRIETÁRIA",
    EVALUATION: "AVALIAÇÃO",
    FUNDED: "FINANCIADA",
    DEMO: "DEMONSTRAÇÃO",
  } satisfies Record<TradingAccount["type"], string>,
} as const;

const structureLabels: Record<string, string> = {
  RANGE: "LATERALIZAÇÃO",
  "LIQUIDITY SWEEP": "VARREDURA DE LIQUIDEZ",
  "HH / HL": "HH / HL",
  "LH / LL": "LH / LL",
  BOS: "BOS",
  CHOCH: "CHoCH",
  MSS: "MSS",
};

export function labelDataSource(source: DataSource) {
  return ptBR.dataSource[source];
}

export function labelMarketType(type: MarketType) {
  return ptBR.marketType[type];
}

export function labelDirection(direction: Direction) {
  return ptBR.direction[direction];
}

export function labelBias(bias: Bias) {
  return ptBR.bias[bias];
}

export function labelSetupDirection(direction: SetupWatch["direction"]) {
  return direction === "LONG_WATCH" ? "CONTEXTO ALTISTA" : "CONTEXTO BAIXISTA";
}

export function labelSetupStatus(status: SetupWatch["status"]) {
  return ptBR.setupStatus[status];
}

export function labelTradeResult(result: TradeResult) {
  return result ? ptBR.tradeResult[result] : "—";
}

export function labelTradeStatus(status: TradeStatus) {
  return ptBR.tradeStatus[status];
}

export function labelTradingSession(session: TradingSession) {
  return ptBR.session[session];
}

export function labelSessionState(state: SessionState) {
  return ptBR.sessionState[state];
}

export function labelRiskStatus(status: RiskStatus) {
  return ptBR.riskStatus[status];
}

export function labelAccountType(type: TradingAccount["type"]) {
  return ptBR.accountType[type];
}

export function labelStructure(value: string) {
  return structureLabels[value] ?? value;
}


export function labelPriceZoneType(type: PriceZoneType) {
  return ptBR.priceZoneType[type];
}

export function labelPriceZoneStatus(status: PriceZoneStatus) {
  return ptBR.priceZoneStatus[status];
}

export function labelConfluenceLevel(level: ConfluenceScoreLevel) {
  return ptBR.confluenceLevel[level];
}

export function labelConfluenceCategory(category: ConfluenceCategory) {
  return ptBR.confluenceCategory[category];
}

export const formatters = {
  usd: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }),
  number: new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }),
  compact: new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 2 }),
  dateFullUTC: new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" }),
};
