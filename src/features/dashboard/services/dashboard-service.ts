import { evaluateRisk } from "@/lib/core/risk-service";
import { DEFAULT_RISK_POLICY } from "@/features/risk/config/default-risk-policy";
import { demoAccounts, demoMarketWatch, demoSetups, demoTrades } from "../data/demo-dashboard";

export async function getTradingDeskData() {
  const account = demoAccounts[0];
  const todayPnl = 420;
  const openRiskPct = 5;
  const currentDrawdownPct = 3.5;

  return {
    source: "DEMO" as const,
    accounts: demoAccounts,
    account,
    metrics: {
      balance: account.balance,
      equity: account.equity,
      todayPnl,
      todayPnlPct: (todayPnl / account.balance) * 100,
      openRiskPct,
      currentDrawdownPct,
    },
    risk: evaluateRisk({
      policy: DEFAULT_RISK_POLICY,
      dailyLossPct: 3.5,
      weeklyLossPct: 8.5,
      openRiskPct,
      tradesToday: 1,
      consecutiveLosses: 1,
    }),
    marketWatch: demoMarketWatch,
    setups: demoSetups,
    recentTrades: demoTrades,
  };
}
