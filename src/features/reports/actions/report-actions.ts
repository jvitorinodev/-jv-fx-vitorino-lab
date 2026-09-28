"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { isDateKey } from "@/lib/core/report-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SaveDailyReviewInput, SaveDailyReviewResult } from "@/lib/types/reports";

export async function saveDailyReviewAction(input: SaveDailyReviewInput): Promise<SaveDailyReviewResult> {
  try {
    const actor = await requirePermission(PERMISSIONS.REPORTS_VIEW);
    if (!isDateKey(input.dateKey)) return { ok: false, message: "Data de revisão inválida." };
    const notes = input.notes.trim().slice(0, 8000);
    const lessons = input.lessons.trim().slice(0, 8000);
    const updatedAt = new Date().toISOString();

    if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
      return { ok: true, review: { dateKey: input.dateKey, notes, lessons, updatedAt }, message: "Revisão de demonstração salva neste navegador." };
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("daily_reviews")
      .upsert({ user_id: actor.id, review_date: input.dateKey, notes, lessons, updated_at: updatedAt }, { onConflict: "user_id,review_date" })
      .select("review_date,notes,lessons,updated_at")
      .single();
    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/reports/${input.dateKey}`);
    return {
      ok: true,
      review: {
        dateKey: String(data.review_date),
        notes: String(data.notes ?? ""),
        lessons: String(data.lessons ?? ""),
        updatedAt: String(data.updated_at ?? updatedAt),
      },
      message: "Revisão diária salva.",
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível salvar a revisão diária." };
  }
}
