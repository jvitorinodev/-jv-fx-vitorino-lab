import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getTradePlannerData, listTrades } from "@/features/journal/services/trade-service";
import { TradeJournal } from "@/features/journal/components/trade-journal";

export default async function JournalPage() {
  const actor = await requirePermission(PERMISSIONS.JOURNAL_VIEW);
  const [trades, planner] = await Promise.all([listTrades(actor), getTradePlannerData(actor)]);
  const source = process.env.NEXT_PUBLIC_APP_MODE === "production" ? "MANUAL" as const : "DEMO" as const;

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Operações</h1><p className="mt-1 text-sm text-slate-500">Histórico consolidado para revisar resultados, custos e comportamento operacional.</p></div>
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/journal/import-mt5" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"><Download className="size-4" />Importar Exness / MT5</Link>
        <Link href="/dashboard/trade-planner" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"><Plus className="size-4" />Adicionar manualmente</Link>
      </div>
    </div>
    <TradeJournal initialTrades={trades} source={source} initialAccountId={planner.selectedAccountId} />
  </div>;
}
