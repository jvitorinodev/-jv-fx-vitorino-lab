import type { RiskPolicy } from "@/lib/core/risk-service";

export const DEFAULT_RISK_POLICY: RiskPolicy = {
  defaultRiskPerTradePct: 5,
  maxRiskPerTradePct: 100,
  maxDailyLossPct: 25,
  maxWeeklyLossPct: 50,
  maxTradesPerDay: 3,
  cautionConsecutiveLosses: 2,
  lockOnDailyLossLimit: true,
  lockOnWeeklyLossLimit: true,
  lockOnTradeLimit: true,
};

export const RISK_PROFILE_LABEL = "Perfil personalizado de alto risco";
