import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { isDateKey } from "@/lib/core/report-service";
import { DailyReportView } from "@/features/reports/components/daily-report-view";
import { getDailyReview, getReportWorkspaceData } from "@/features/reports/services/report-data-service";

export default async function DailyReportPage({ params }: { params: Promise<{ date: string }> }) {
  const actor = await requirePermission(PERMISSIONS.REPORTS_VIEW);
  const { date } = await params;
  if (!isDateKey(date)) notFound();
  const [data, review] = await Promise.all([getReportWorkspaceData(actor), getDailyReview(actor, date)]);
  return <DailyReportView dateKey={date} initialTrades={data.trades} initialReview={review} timeZone={data.timeZone} source={data.source} />;
}
