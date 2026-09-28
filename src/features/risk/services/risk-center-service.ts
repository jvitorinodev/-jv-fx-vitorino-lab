import { evaluateRisk } from "@/lib/core/risk-service";
import { DEFAULT_RISK_POLICY } from "@/features/risk/config/default-risk-policy";

export async function getRiskCenterData() {
  const snapshot = evaluateRisk({
    policy: DEFAULT_RISK_POLICY,
    dailyLossPct: 3.5,
    weeklyLossPct: 8.5,
    openRiskPct: 5,
    tradesToday: 1,
    consecutiveLosses: 1,
  });

  return {
    source: "DEMO" as const,
    snapshot,
    policy: DEFAULT_RISK_POLICY,
  };
}
