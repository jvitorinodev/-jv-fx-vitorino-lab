import { requireActor } from "@/lib/auth/guards";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSelectedTradingAccountId, listActiveTradingAccounts } from "@/features/accounts/services/trading-account-service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  const accounts = await listActiveTradingAccounts(actor);
  const selectedAccountId = await getSelectedTradingAccountId(actor, accounts);
  return <DashboardShell actor={actor} accounts={accounts} selectedAccountId={selectedAccountId}>{children}</DashboardShell>;
}
