"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { SyncMt5Input, SyncMt5Result } from "@/lib/types/broker-sync";
import { syncConnectedMt5Account, syncMt5History } from "@/features/sync/services/mt5-sync-service";
import { REALTIME_SYNC_WINDOW_DAYS } from "@/config/history-windows";

function revalidateMt5Views() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/performance");
  revalidatePath("/dashboard/journal/import-mt5");
}

export async function syncMt5HistoryAction(input: SyncMt5Input): Promise<SyncMt5Result> {
  try {
    const actor = await requirePermission(PERMISSIONS.JOURNAL_VIEW);
    if (!actor.permissions.includes(PERMISSIONS.TERMINAL_VIEW)) {
      return { ok: false, message: "Seu perfil não possui acesso à sincronização MT5." };
    }
    const result = await syncMt5History(actor, input);
    if (result.ok) revalidateMt5Views();
    return result;
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível sincronizar o MT5." };
  }
}


export async function syncConnectedMt5AccountAction() {
  try {
    const actor = await requirePermission(PERMISSIONS.JOURNAL_VIEW);
    if (!actor.permissions.includes(PERMISSIONS.TERMINAL_VIEW)) {
      return { ok: false as const, message: "Seu perfil não possui acesso à sincronização MT5." };
    }
    const result = await syncConnectedMt5Account(actor, REALTIME_SYNC_WINDOW_DAYS);
    if (result.ok) revalidateMt5Views();
    return result;
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Não foi possível atualizar o Journal pelo MT5." };
  }
}
