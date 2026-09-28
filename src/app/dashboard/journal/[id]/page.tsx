import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getTradeById } from "@/features/journal/services/trade-service";
import { TradeDetail } from "@/features/journal/components/trade-detail";

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission(PERMISSIONS.JOURNAL_VIEW);
  const { id } = await params;
  const trade = await getTradeById(actor, id);
  const demoMode = process.env.NEXT_PUBLIC_APP_MODE !== "production";
  return <TradeDetail initialTrade={trade} requestedId={id} demoMode={demoMode} />;
}
