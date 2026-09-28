import { Radio } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getTradePlannerData } from "@/features/journal/services/trade-service";
import { getConfluenceWeights } from "@/features/price-zones/services/price-zone-service";
import { TradePlanner, type TradePlannerInitialContext } from "@/features/journal/components/trade-planner";
import { StatusPill } from "@/components/ui/status-pill";
import type { Direction } from "@/lib/types/trading";

function directionFromParam(value?: string): Direction | undefined {
  return value === "LONG" || value === "SHORT" ? value : undefined;
}

export default async function TradePlannerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePermission(PERMISSIONS.TRADE_PLANNER_VIEW);
  const [data, confluenceWeights] = await Promise.all([getTradePlannerData(actor), getConfluenceWeights(actor)]);
  const params = await searchParams;
  const one = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  const numberParam = (key: string) => { const value = one(key); if (!value) return undefined; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; };
  const initialContext: TradePlannerInitialContext = {
    symbol: one("symbol"),
    setupId: one("setupId"),
    direction: directionFromParam(one("direction")),
    higherTimeframe: one("htf"),
    timeframe: one("tf"),
    strategy: one("strategy"),
    setupName: one("name"),
    entryPrice: numberParam("entry"),
    stopPrice: numberParam("stop"),
    targetPrice: numberParam("target"),
    confluenceKeys: one("confluences")?.split(",").map((item) => item.trim()).filter(Boolean),
  };

  return <div className="space-y-5">
    <div>
      <div className="mb-2 flex items-center gap-2"><StatusPill tone="info"><Radio className="mr-1 size-3" />Ambiente de execução</StatusPill><span className="text-[10px] text-slate-600">As ordens ainda não são enviadas para a Exness.</span></div>
      <h1 className="text-2xl font-semibold tracking-tight">Planejador de Operações</h1>
      <p className="mt-1 text-sm text-slate-500">Transforme um setup em um plano de operação validado pelo risco e pronto para o diário.</p>
    </div>
    <TradePlanner accounts={data.accounts} defaultAccountId={data.defaultAccountId} source={data.source} initialContext={initialContext} confluenceWeights={confluenceWeights} />
  </div>;
}
