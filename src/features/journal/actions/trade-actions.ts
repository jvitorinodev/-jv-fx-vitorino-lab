"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { CloseTradeInput, CreateTradeInput, ImportMt5TradeInput, ImportMt5TradeResult, TradeActionResult, UpdateTradeAnnotationsInput } from "@/lib/types/journal";
import { closeTradeRecord, createTradeRecord, getServerRiskSnapshot, updateTradeAnnotations } from "@/features/journal/services/trade-service";
import { importMt5ClosedTrade } from "@/features/journal/services/mt5-import-service";

export async function createTradeAction(input: CreateTradeInput): Promise<TradeActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.TRADE_PLANNER_VIEW);
    const trade = await createTradeRecord(actor, input);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/journal");
    return { ok: true, trade, message: `${trade.setupId} aberta com ${trade.positionSize.toFixed(2)} lote.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível abrir a operação." };
  }
}

export async function closeTradeAction(input: CloseTradeInput): Promise<TradeActionResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.JOURNAL_VIEW);
    const trade = await closeTradeRecord(actor, input);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/journal");
    revalidatePath(`/dashboard/journal/${trade.id}`);
    return { ok: true, trade, message: `${trade.setupId} fechada em ${trade.realizedR?.toFixed(2) ?? "0.00"}R.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível encerrar a operação." };
  }
}

export async function getRiskGateAction(accountId: string) {
  try {
    const actor = await requirePermission(PERMISSIONS.RISK_VIEW);
    const data = await getServerRiskSnapshot(actor, accountId);
    return { ok: true as const, ...data };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Não foi possível verificar a trava de risco." };
  }
}


export async function importMt5TradeAction(input: ImportMt5TradeInput): Promise<ImportMt5TradeResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.JOURNAL_VIEW);
    if (!actor.permissions.includes(PERMISSIONS.TERMINAL_VIEW)) {
      return { ok: false, message: "Seu perfil não possui acesso ao Terminal de Mercado." };
    }
    const result = await importMt5ClosedTrade(actor, input);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/journal");
    revalidatePath("/dashboard/reports");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/performance");
    return {
      ok: true,
      trade: result.trade,
      duplicate: result.duplicate,
      message: result.duplicate
        ? `O ticket ${input.positionId} já estava no Diário.`
        : `Ticket ${input.positionId} importado para o Diário.`,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível importar a operação do MT5." };
  }
}


export async function updateTradeAnnotationsAction(input: UpdateTradeAnnotationsInput) {
  try {
    const actor = await requirePermission(PERMISSIONS.JOURNAL_VIEW);
    const trade = await updateTradeAnnotations(actor, input);
    revalidatePath("/dashboard/journal");
    revalidatePath(`/dashboard/journal/${trade.id}`);
    revalidatePath("/dashboard/performance");
    return { ok: true as const, trade, message: "Organização da operação atualizada." };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Não foi possível atualizar a operação." };
  }
}
