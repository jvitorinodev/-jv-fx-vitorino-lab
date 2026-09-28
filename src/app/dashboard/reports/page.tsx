import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getReportWorkspaceData } from "@/features/reports/services/report-data-service";
import { ReportsWorkspace } from "@/features/reports/components/reports-workspace";

export default async function ReportsPage() {
  const actor = await requirePermission(PERMISSIONS.REPORTS_VIEW);
  const data = await getReportWorkspaceData(actor);
  return <ReportsWorkspace initialTrades={data.trades} timeZone={data.timeZone} source={data.source} />;
}
