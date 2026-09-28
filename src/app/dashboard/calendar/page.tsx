import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TradingCalendar } from "@/features/reports/components/trading-calendar";
import { getReportWorkspaceData } from "@/features/reports/services/report-data-service";

export default async function CalendarPage() {
  const actor = await requirePermission(PERMISSIONS.REPORTS_VIEW);
  const data = await getReportWorkspaceData(actor);
  return <TradingCalendar initialTrades={data.trades} timeZone={data.timeZone} source={data.source} />;
}
