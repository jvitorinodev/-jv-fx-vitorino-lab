export type RiskStatus = "SAFE" | "CAUTION" | "CRITICAL" | "LOCKED";

export type RiskPolicy = {
  defaultRiskPerTradePct: number;
  maxRiskPerTradePct: number;
  maxDailyLossPct: number;
  maxWeeklyLossPct: number;
  maxTradesPerDay: number;
  cautionConsecutiveLosses: number;
  lockOnDailyLossLimit: boolean;
  lockOnWeeklyLossLimit: boolean;
  lockOnTradeLimit: boolean;
};

export type RiskSnapshotInput = {
  policy: RiskPolicy;
  dailyLossPct: number;
  weeklyLossPct: number;
  openRiskPct: number;
  tradesToday: number;
  consecutiveLosses: number;
};

export type RiskSnapshot = RiskSnapshotInput & {
  committedDailyRiskPct: number;
  committedWeeklyRiskPct: number;
  remainingDailyLossPct: number;
  remainingWeeklyLossPct: number;
  dailyUtilizationPct: number;
  weeklyUtilizationPct: number;
  maxAllowedNextTradeRiskPct: number;
  executionAllowed: boolean;
  status: RiskStatus;
  lockReason: string | null;
  reasons: string[];
};

const validationLabels: Record<string, string> = {
  defaultRiskPerTradePct: "Risco padrão por operação",
  maxRiskPerTradePct: "Risco máximo por operação",
  maxDailyLossPct: "Perda diária máxima",
  maxWeeklyLossPct: "Perda semanal máxima",
  maxTradesPerDay: "Máximo de operações por dia",
  cautionConsecutiveLosses: "Quantidade de perdas consecutivas para atenção",
  dailyLossPct: "Perda diária",
  weeklyLossPct: "Perda semanal",
  openRiskPct: "Risco aberto",
  tradesToday: "Operações de hoje",
  consecutiveLosses: "Perdas consecutivas",
};

function assertFiniteNonNegative(label: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${validationLabels[label] ?? label} deve ser um número finito e não negativo.`);
  }
}

function validatePolicy(policy: RiskPolicy) {
  assertFiniteNonNegative("defaultRiskPerTradePct", policy.defaultRiskPerTradePct);
  assertFiniteNonNegative("maxRiskPerTradePct", policy.maxRiskPerTradePct);
  assertFiniteNonNegative("maxDailyLossPct", policy.maxDailyLossPct);
  assertFiniteNonNegative("maxWeeklyLossPct", policy.maxWeeklyLossPct);
  assertFiniteNonNegative("maxTradesPerDay", policy.maxTradesPerDay);
  assertFiniteNonNegative("cautionConsecutiveLosses", policy.cautionConsecutiveLosses);

  if (policy.defaultRiskPerTradePct > 100 || policy.maxRiskPerTradePct > 100) {
    throw new Error("O risco por operação deve permanecer entre 0% e 100% do capital-base.");
  }
  if (policy.maxDailyLossPct > 100 || policy.maxWeeklyLossPct > 100) {
    throw new Error("Os limites percentuais diário e semanal devem permanecer entre 0% e 100%.");
  }
  if (policy.defaultRiskPerTradePct > policy.maxRiskPerTradePct) {
    throw new Error("O risco padrão por operação não pode ser maior que o risco máximo por operação.");
  }
}

export function evaluateRisk(input: RiskSnapshotInput): RiskSnapshot {
  validatePolicy(input.policy);
  assertFiniteNonNegative("dailyLossPct", input.dailyLossPct);
  assertFiniteNonNegative("weeklyLossPct", input.weeklyLossPct);
  assertFiniteNonNegative("openRiskPct", input.openRiskPct);
  assertFiniteNonNegative("tradesToday", input.tradesToday);
  assertFiniteNonNegative("consecutiveLosses", input.consecutiveLosses);

  const { policy } = input;
  const committedDailyRiskPct = input.dailyLossPct + input.openRiskPct;
  const committedWeeklyRiskPct = input.weeklyLossPct + input.openRiskPct;
  const remainingDailyLossPct = Math.max(0, policy.maxDailyLossPct - committedDailyRiskPct);
  const remainingWeeklyLossPct = Math.max(0, policy.maxWeeklyLossPct - committedWeeklyRiskPct);
  const dailyUtilizationPct = policy.maxDailyLossPct === 0 ? 100 : Math.min(100, (committedDailyRiskPct / policy.maxDailyLossPct) * 100);
  const weeklyUtilizationPct = policy.maxWeeklyLossPct === 0 ? 100 : Math.min(100, (committedWeeklyRiskPct / policy.maxWeeklyLossPct) * 100);

  const dailyLimitReached = policy.maxDailyLossPct > 0 && committedDailyRiskPct >= policy.maxDailyLossPct;
  const weeklyLimitReached = policy.maxWeeklyLossPct > 0 && committedWeeklyRiskPct >= policy.maxWeeklyLossPct;
  const tradeLimitReached = policy.maxTradesPerDay > 0 && input.tradesToday >= policy.maxTradesPerDay;
  const lossStreakCaution = policy.cautionConsecutiveLosses > 0 && input.consecutiveLosses >= policy.cautionConsecutiveLosses;

  const reasons: string[] = [];
  if (lossStreakCaution) reasons.push(`${input.consecutiveLosses} perdas consecutivas`);
  if (dailyUtilizationPct >= 60) reasons.push(`${dailyUtilizationPct.toFixed(0)}% do limite diário de perda utilizado`);
  if (weeklyUtilizationPct >= 60) reasons.push(`${weeklyUtilizationPct.toFixed(0)}% do limite semanal de perda utilizado`);
  if (tradeLimitReached) reasons.push("Limite diário de operações atingido");

  let lockReason: string | null = null;
  if (dailyLimitReached && policy.lockOnDailyLossLimit) lockReason = "Limite diário de perda atingido";
  else if (weeklyLimitReached && policy.lockOnWeeklyLossLimit) lockReason = "Limite semanal de perda atingido";
  else if (tradeLimitReached && policy.lockOnTradeLimit) lockReason = "Limite diário de operações atingido";

  const executionAllowed = lockReason === null;
  const remainingRiskBudget = Math.min(remainingDailyLossPct, remainingWeeklyLossPct);
  const maxAllowedNextTradeRiskPct = executionAllowed ? Math.max(0, Math.min(policy.maxRiskPerTradePct, remainingRiskBudget)) : 0;

  if (lockReason) {
    return {
      ...input,
      committedDailyRiskPct,
      committedWeeklyRiskPct,
      remainingDailyLossPct,
      remainingWeeklyLossPct,
      dailyUtilizationPct,
      weeklyUtilizationPct,
      maxAllowedNextTradeRiskPct,
      executionAllowed,
      status: "LOCKED",
      lockReason,
      reasons,
    };
  }

  const critical = dailyUtilizationPct >= 85 || weeklyUtilizationPct >= 85;
  const caution = lossStreakCaution || dailyUtilizationPct >= 60 || weeklyUtilizationPct >= 60;
  const status: RiskStatus = critical ? "CRITICAL" : caution ? "CAUTION" : "SAFE";

  return {
    ...input,
    committedDailyRiskPct,
    committedWeeklyRiskPct,
    remainingDailyLossPct,
    remainingWeeklyLossPct,
    dailyUtilizationPct,
    weeklyUtilizationPct,
    maxAllowedNextTradeRiskPct,
    executionAllowed,
    status,
    lockReason: null,
    reasons,
  };
}
