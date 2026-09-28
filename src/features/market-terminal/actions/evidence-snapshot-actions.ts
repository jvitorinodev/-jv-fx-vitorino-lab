"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { SaveEvidenceSnapshotInput } from "@/lib/types/market-terminal";
import { saveEvidenceSnapshot } from "@/features/market-terminal/services/evidence-snapshot-service";

export async function saveEvidenceSnapshotAction(input: SaveEvidenceSnapshotInput) {
  try {
    const actor = await requirePermission(PERMISSIONS.TERMINAL_VIEW);
    const snapshot = await saveEvidenceSnapshot(actor, input);
    revalidatePath("/dashboard/terminal");
    revalidatePath("/dashboard/confluence");
    return { ok: true as const, snapshot, message: `Snapshot técnico vinculado ao ${snapshot.setupId}.` };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Não foi possível salvar o snapshot técnico." };
  }
}
