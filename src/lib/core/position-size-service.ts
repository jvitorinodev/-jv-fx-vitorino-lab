import type { BrokerInstrumentSpecification } from "@/features/brokers/data/exness-instruments";

export type PositionSizeInput = {
  capitalBase: number;
  accountCurrency: string;
  riskPct: number;
  maxRiskPct: number;
  entryPrice: number;
  stopPrice: number;
  targetPrice?: number | null;
  specification: BrokerInstrumentSpecification;
  profitCurrencyToAccountRate?: number | null;
};

export type PositionSizeResult = {
  riskBudget: number;
  priceDistance: number;
  pipDistance: number;
  conversionRate: number;
  valuePerPipPerLot: number;
  riskPerLot: number;
  rawLots: number;
  recommendedLots: number;
  actualRisk: number;
  actualRiskPct: number;
  notionalValue: number;
  rewardRiskRatio: number | null;
  potentialProfit: number | null;
  minimumLotRisk: number;
  warnings: string[];
};

const inputLabels: Record<string, string> = {
  capitalBase: "Capital-base",
  riskPct: "Percentual de risco",
  maxRiskPct: "Risco máximo permitido",
  entryPrice: "Preço de entrada",
  stopPrice: "Preço de stop",
};

function assertPositive(label: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${inputLabels[label] ?? label} deve ser maior que zero.`);
}

function decimalPlaces(value: number) {
  const text = value.toString();
  if (!text.includes(".")) return 0;
  return text.split(".")[1]?.length ?? 0;
}

function floorToStep(value: number, step: number) {
  const floored = Math.floor((value + Number.EPSILON) / step) * step;
  return Number(floored.toFixed(decimalPlaces(step)));
}

function resolveConversionRate(input: PositionSizeInput): number {
  const { specification, accountCurrency, stopPrice } = input;
  if (specification.profitCurrency === accountCurrency) return 1;

  if (
    specification.marketType === "FOREX" &&
    specification.baseCurrency === accountCurrency &&
    specification.quoteCurrency === specification.profitCurrency
  ) {
    return 1 / stopPrice;
  }

  const provided = input.profitCurrencyToAccountRate;
  if (provided && Number.isFinite(provided) && provided > 0) return provided;

  throw new Error(`É necessária uma taxa de conversão ${specification.profitCurrency}→${accountCurrency} para ${specification.internalSymbol}.`);
}

export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  assertPositive("capitalBase", input.capitalBase);
  assertPositive("riskPct", input.riskPct);
  assertPositive("maxRiskPct", input.maxRiskPct);
  assertPositive("entryPrice", input.entryPrice);
  assertPositive("stopPrice", input.stopPrice);

  if (input.riskPct > input.maxRiskPct) {
    throw new Error(`O risco por operação não pode ultrapassar o máximo configurado de ${input.maxRiskPct.toFixed(2)}%.`);
  }
  if (input.entryPrice === input.stopPrice) throw new Error("Os preços de entrada e stop precisam ser diferentes.");

  const spec = input.specification;
  const conversionRate = resolveConversionRate(input);
  const riskBudget = input.capitalBase * (input.riskPct / 100);
  const priceDistance = Math.abs(input.entryPrice - input.stopPrice);
  const pipDistance = priceDistance / spec.pipSize;
  const valuePerPipPerLot = spec.pipSize * spec.contractSize * conversionRate;
  const riskPerLot = priceDistance * spec.contractSize * conversionRate;
  const rawLots = riskBudget / riskPerLot;
  const warnings: string[] = [];

  let recommendedLots = floorToStep(rawLots, spec.lotStep);
  if (recommendedLots > spec.maxLot) {
    recommendedLots = floorToStep(spec.maxLot, spec.lotStep);
    warnings.push(`O lote calculado ultrapassa o limite conservador configurado de ${spec.maxLot} lotes para ${spec.brokerSymbol}.`);
  }

  const minimumLotRisk = spec.minLot * riskPerLot;
  if (recommendedLots < spec.minLot) {
    recommendedLots = 0;
    warnings.push(`O orçamento de risco não comporta o volume mínimo da corretora de ${spec.minLot} lote sem ultrapassar o risco selecionado.`);
  }

  const actualRisk = recommendedLots * riskPerLot;
  const actualRiskPct = input.capitalBase === 0 ? 0 : (actualRisk / input.capitalBase) * 100;
  const notionalValue = input.entryPrice * spec.contractSize * recommendedLots * conversionRate;

  let rewardRiskRatio: number | null = null;
  let potentialProfit: number | null = null;
  if (input.targetPrice && Number.isFinite(input.targetPrice) && input.targetPrice > 0) {
    const targetDistance = Math.abs(input.targetPrice - input.entryPrice);
    rewardRiskRatio = targetDistance / priceDistance;
    potentialProfit = targetDistance * spec.contractSize * recommendedLots * conversionRate;
  }

  if (input.riskPct >= 100) warnings.push("100% de risco significa que um stop completo pode consumir todo o capital-base considerado no cálculo. O JV FX permite essa configuração conforme solicitado, mas não a apresenta como recomendação.");
  else if (input.riskPct >= 50) warnings.push("Risco igual ou superior a 50% pode produzir perda severa de capital em uma única operação.");
  else if (input.riskPct >= 25) warnings.push("Risco igual ou superior a 25% é extremamente agressivo e pode comprometer rapidamente o capital.");
  else if (input.riskPct >= 5) warnings.push("Este dimensionamento utiliza um percentual elevado do capital por operação; perdas consecutivas podem ampliar rapidamente o recuo do capital.");
  if (spec.maxLotDay && spec.maxLotNight && spec.maxLotDay !== spec.maxLotNight) warnings.push("O volume máximo na Exness pode variar conforme o horário de negociação; confirme a especificação ao vivo do símbolo antes de enviar a ordem.");

  return {
    riskBudget,
    priceDistance,
    pipDistance,
    conversionRate,
    valuePerPipPerLot,
    riskPerLot,
    rawLots,
    recommendedLots,
    actualRisk,
    actualRiskPct,
    notionalValue,
    rewardRiskRatio,
    potentialProfit,
    minimumLotRisk,
    warnings,
  };
}
