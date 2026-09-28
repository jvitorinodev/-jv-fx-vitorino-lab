import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getTradePlannerData, listTrades } from "@/features/journal/services/trade-service";
import { PerformanceLab } from "@/features/performance/components/performance-lab";

export default async function PerformancePage() {
  const actor = await requirePermission(PERMISSIONS.PERFORMANCE_VIEW);
  const [trades, planner] = await Promise.all([listTrades(actor), getTradePlannerData(actor)]);
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Desempenho</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Curva de capital, estatísticas e quebras do seu histórico de operações.</p></div>
      <PerformanceLab initialTrades={trades} initialAccountId={planner.selectedAccountId} />
    </div>
  );
}
