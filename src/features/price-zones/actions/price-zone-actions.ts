"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { validateConfluenceWeights } from "@/lib/core/confluence-service";
import type { ConfluenceWeightMap, ConfluenceWeightsActionResult, CreatePriceZoneInput, PriceZoneActionResult, PriceZoneStatus } from "@/lib/types/price-zones";
import { saveConfluenceWeights, savePriceZone, updatePriceZoneStatus } from "@/features/price-zones/services/price-zone-service";

export async function savePriceZoneAction(input: CreatePriceZoneInput): Promise<PriceZoneActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.PRICE_ZONES_VIEW);
    const zone = await savePriceZone(actor, input);
    revalidatePath("/dashboard/price-zones");
    revalidatePath("/dashboard/confluence");
    return { ok: true, zone, message: `${zone.setupId} · zona ${zone.zoneType} salva com ${zone.score.points} pontos de confluência.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível salvar a zona." };
  }
}

export async function updatePriceZoneStatusAction(zoneId: string, status: PriceZoneStatus) {
  try {
    const actor = await requirePermission(PERMISSIONS.PRICE_ZONES_VIEW);
    await updatePriceZoneStatus(actor, zoneId, status);
    revalidatePath("/dashboard/price-zones");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Não foi possível atualizar o status." };
  }
}

export async function saveConfluenceWeightsAction(weights: ConfluenceWeightMap): Promise<ConfluenceWeightsActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.CONFLUENCE_VIEW);
    const errors = validateConfluenceWeights(weights);
    if (errors.length) return { ok: false, message: errors[0] };
    const saved = await saveConfluenceWeights(actor, weights);
    revalidatePath("/dashboard/confluence");
    revalidatePath("/dashboard/price-zones");
    return { ok: true, weights: saved, message: "Pesos das confluências atualizados." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível salvar os pesos." };
  }
}
