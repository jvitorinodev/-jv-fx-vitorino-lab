"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AnalysisActionResult, CreateMarketAnalysisInput } from "@/lib/types/market-analysis";
import { createMarketAnalysis } from "@/features/market-analysis/services/analysis-service";

export async function saveMarketAnalysisAction(input: CreateMarketAnalysisInput): Promise<AnalysisActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.ANALYSIS_VIEW);
    const analysis = await createMarketAnalysis(actor, input);
    revalidatePath("/dashboard/analysis");
    return { ok: true, analysis, message: `${analysis.setupId} salva com sucesso.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível salvar a análise." };
  }
}
