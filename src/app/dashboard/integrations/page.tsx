import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getMt5SyncOverview } from "@/features/sync/services/mt5-sync-service";
import { IntegrationControlCenter } from "@/features/integrations/components/integration-control-center";
import { buildIntegrationReadiness } from "@/features/integrations/services/integration-readiness-service";
import { getTradingAccountSchemaStatus, listActiveTradingAccounts } from "@/features/accounts/services/trading-account-service";

export default async function IntegrationsPage() {
  const actor = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
  const [overview, accounts, schemaStatus] = await Promise.all([
    actor.permissions.includes(PERMISSIONS.TERMINAL_VIEW) ? getMt5SyncOverview(actor) : Promise.resolve(null),
    listActiveTradingAccounts(actor),
    getTradingAccountSchemaStatus(actor),
  ]);
  const readiness = buildIntegrationReadiness(actor, overview, schemaStatus);

  return <IntegrationControlCenter readiness={readiness} overview={overview} accounts={accounts} />;
}
