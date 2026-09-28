import type { MarketType } from "@/lib/types/trading";
import { BRAND } from "@/config/brand";

export type BrokerInstrumentSpecification = {
  broker: "EXNESS";
  accountType: "STANDARD";
  platform: "MT5";
  internalSymbol: string;
  brokerSymbol: string;
  displayName: string;
  marketType: MarketType;
  baseCurrency: string | null;
  quoteCurrency: string;
  profitCurrency: string;
  contractSize: number;
  pipSize: number;
  minLot: number;
  lotStep: number;
  maxLot: number;
  maxLotDay?: number;
  maxLotNight?: number;
  commissionPerLotPerSide: number;
  sourceLabel: string;
  checkedAt: string;
  notes: string[];
};

const common = {
  broker: "EXNESS" as const,
  accountType: "STANDARD" as const,
  platform: "MT5" as const,
  commissionPerLotPerSide: 0,
  sourceLabel: "Especificações oficiais de contrato da Exness",
  checkedAt: "2026-09-21",
};

export const EXNESS_STANDARD_MT5_INSTRUMENTS: BrokerInstrumentSpecification[] = [
  {
    ...common,
    internalSymbol: "EURUSD",
    brokerSymbol: "EURUSD",
    displayName: "Euro / Dólar Americano",
    marketType: "FOREX",
    baseCurrency: "EUR",
    quoteCurrency: "USD",
    profitCurrency: "USD",
    contractSize: 100_000,
    pipSize: 0.0001,
    minLot: 0.01,
    lotStep: 0.01,
    maxLot: 200,
    maxLotDay: 200,
    maxLotNight: 200,
    notes: ["Símbolos de contas Standard podem incluir um sufixo específico no terminal; confirme o símbolo exato no MT5."],
  },
  {
    ...common,
    internalSymbol: "GBPUSD",
    brokerSymbol: "GBPUSD",
    displayName: "Libra Esterlina / Dólar Americano",
    marketType: "FOREX",
    baseCurrency: "GBP",
    quoteCurrency: "USD",
    profitCurrency: "USD",
    contractSize: 100_000,
    pipSize: 0.0001,
    minLot: 0.01,
    lotStep: 0.01,
    maxLot: 200,
    maxLotDay: 200,
    maxLotNight: 200,
    notes: ["Símbolos de contas Standard podem incluir um sufixo específico no terminal; confirme o símbolo exato no MT5."],
  },
  {
    ...common,
    internalSymbol: "USDJPY",
    brokerSymbol: "USDJPY",
    displayName: "Dólar Americano / Iene Japonês",
    marketType: "FOREX",
    baseCurrency: "USD",
    quoteCurrency: "JPY",
    profitCurrency: "JPY",
    contractSize: 100_000,
    pipSize: 0.01,
    minLot: 0.01,
    lotStep: 0.01,
    maxLot: 200,
    maxLotDay: 300,
    maxLotNight: 200,
    notes: ["Em contas em USD, o P&L em JPY é convertido para USD usando a taxa de conversão do dimensionamento."],
  },
  {
    ...common,
    internalSymbol: "XAUUSD",
    brokerSymbol: "XAUUSD",
    displayName: "Ouro / Dólar Americano",
    marketType: "COMMODITY",
    baseCurrency: "XAU",
    quoteCurrency: "USD",
    profitCurrency: "USD",
    contractSize: 100,
    pipSize: 0.01,
    minLot: 0.01,
    lotStep: 0.01,
    maxLot: 200,
    maxLotDay: 200,
    maxLotNight: 200,
    notes: ["1 lote representa 100 onças troy conforme a especificação de referência da Exness."],
  },
  {
    ...common,
    internalSymbol: "XAGUSD",
    brokerSymbol: "XAGUSD",
    displayName: "Prata / Dólar Americano",
    marketType: "COMMODITY",
    baseCurrency: "XAG",
    quoteCurrency: "USD",
    profitCurrency: "USD",
    contractSize: 5_000,
    pipSize: 0.01,
    minLot: 0.01,
    lotStep: 0.01,
    maxLot: 20,
    maxLotDay: 200,
    maxLotNight: 20,
    notes: ["O volume máximo depende do horário; a calculadora usa por padrão o limite noturno mais conservador."],
  },
  {
    ...common,
    internalSymbol: "NAS100",
    brokerSymbol: "USTEC",
    displayName: "NASDAQ-100",
    marketType: "INDEX",
    baseCurrency: null,
    quoteCurrency: "USD",
    profitCurrency: "USD",
    contractSize: 1,
    pipSize: 0.1,
    minLot: 0.05,
    lotStep: 0.01,
    maxLot: 200,
    maxLotDay: 500,
    maxLotNight: 200,
    notes: [`O alias NAS100 na ${BRAND.primaryName} corresponde ao USTEC da Exness.`, "O volume máximo depende da plataforma e do horário; confirme a especificação ao vivo no MT5."],
  },
  {
    ...common,
    internalSymbol: "US30",
    brokerSymbol: "US30",
    displayName: "Wall Street 30 dos EUA",
    marketType: "INDEX",
    baseCurrency: null,
    quoteCurrency: "USD",
    profitCurrency: "USD",
    contractSize: 1,
    pipSize: 1,
    minLot: 0.05,
    lotStep: 0.01,
    maxLot: 100,
    maxLotDay: 500,
    maxLotNight: 100,
    notes: ["O volume máximo depende da plataforma e do horário; a calculadora usa por padrão o limite noturno mais conservador."],
  },
  {
    ...common,
    internalSymbol: "SPX500",
    brokerSymbol: "US500",
    displayName: "S&P 500",
    marketType: "INDEX",
    baseCurrency: null,
    quoteCurrency: "USD",
    profitCurrency: "USD",
    contractSize: 1,
    pipSize: 0.1,
    minLot: 0.14,
    lotStep: 0.01,
    maxLot: 300,
    maxLotDay: 1_000,
    maxLotNight: 300,
    notes: [`O alias SPX500 na ${BRAND.primaryName} corresponde ao US500 da Exness.`, "Confirme o volume mínimo atual na especificação do símbolo no MT5 antes da execução."],
  },
  {
    ...common,
    internalSymbol: "BTCUSD",
    brokerSymbol: "BTCUSD",
    displayName: "Bitcoin / Dólar Americano",
    marketType: "CRYPTO",
    baseCurrency: "BTC",
    quoteCurrency: "USD",
    profitCurrency: "USD",
    contractSize: 1,
    pipSize: 0.1,
    minLot: 0.01,
    lotStep: 0.01,
    maxLot: 200,
    maxLotDay: 200,
    maxLotNight: 200,
    notes: ["1 lote representa 1 BTC conforme a especificação BTCUSD de referência."],
  },
  {
    ...common,
    internalSymbol: "ETHUSD",
    brokerSymbol: "ETHUSD",
    displayName: "Ethereum / Dólar Americano",
    marketType: "CRYPTO",
    baseCurrency: "ETH",
    quoteCurrency: "USD",
    profitCurrency: "USD",
    contractSize: 1,
    pipSize: 0.1,
    minLot: 0.1,
    lotStep: 0.01,
    maxLot: 2_000,
    maxLotDay: 2_000,
    maxLotNight: 2_000,
    notes: ["A Exness documenta um mínimo efetivo de 0,1 lote para ETHUSD, mesmo que algumas telas da plataforma possam exibir 0,01."],
  },
];

export function getExnessInstrument(symbol: string): BrokerInstrumentSpecification {
  const specification = EXNESS_STANDARD_MT5_INSTRUMENTS.find((item) => item.internalSymbol === symbol);
  if (!specification) throw new Error(`Instrumento da Exness não suportado: ${symbol}`);
  return specification;
}
