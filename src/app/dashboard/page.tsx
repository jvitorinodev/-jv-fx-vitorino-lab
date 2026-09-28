import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getTradePlannerData, listTrades } from "@/features/journal/services/trade-service";
import { getMt5SyncOverview } from "@/features/sync/services/mt5-sync-service";
import { PerformanceOverview } from "@/features/overview/components/performance-overview";

export default async function DashboardPage() {
  const actor = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
  const [trades, planner, syncOverview] = await Promise.all([
    listTrades(actor),
    getTradePlannerData(actor),
    getMt5SyncOverview(actor),
  ]);
  const source = process.env.NEXT_PUBLIC_APP_MODE === "production" ? "MANUAL" as const : "DEMO" as const;
  return (
    <PerformanceOverview
      initialTrades={trades}
      accounts={planner.accounts}
      initialAccountId={planner.selectedAccountId}
      syncOverview={syncOverview}
      timeZone="America/Sao_Paulo"
      source={source}
    />
  );
}
