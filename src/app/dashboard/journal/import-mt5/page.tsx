import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getTradePlannerData } from "@/features/journal/services/trade-service";
import { listMt5ImportCandidates } from "@/features/journal/services/mt5-import-service";
import { Mt5HistoryImporter } from "@/features/journal/components/mt5-history-importer";
import { DEFAULT_HISTORY_WINDOW_DAYS, isHistoryWindowDays } from "@/config/history-windows";
import { marketDataMode } from "@/config/runtime";

export default async function ImportMt5Page({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const actor = await requirePermission(PERMISSIONS.JOURNAL_VIEW);
  await requirePermission(PERMISSIONS.TERMINAL_VIEW);
  const params = await searchParams;
  const requestedDays = Number(params.days ?? DEFAULT_HISTORY_WINDOW_DAYS);
  const days = isHistoryWindowDays(requestedDays) ? requestedDays : DEFAULT_HISTORY_WINDOW_DAYS;
  const planner = await getTradePlannerData(actor);

  try {
    const data = await listMt5ImportCandidates(actor, days);
    return (
      <Mt5HistoryImporter
        history={data.history}
        importedPositionIds={data.importedPositionIds}
        accounts={planner.accounts}
        defaultAccountId={planner.defaultAccountId}
        days={days}
        demoMode={process.env.NEXT_PUBLIC_APP_MODE !== "production"}
        providerMode={marketDataMode()}
      />
    );
  } catch (error) {
    return (
      <Mt5HistoryImporter
        history={null}
        importedPositionIds={[]}
        accounts={planner.accounts}
        defaultAccountId={planner.defaultAccountId}
        days={days}
        demoMode={process.env.NEXT_PUBLIC_APP_MODE !== "production"}
        providerMode={marketDataMode()}
        loadError={error instanceof Error ? error.message : "Não foi possível carregar o histórico do MT5."}
      />
    );
  }
}
