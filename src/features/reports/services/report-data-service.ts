import "server-only";

import type { Actor } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DailyReview, ReportWorkspaceData } from "@/lib/types/reports";
import { listTrades } from "@/features/journal/services/trade-service";
import { demoDailyReviews } from "@/features/reports/data/demo-daily-reviews";

export async function getReportWorkspaceData(actor: Actor): Promise<ReportWorkspaceData> {
  const trades = await listTrades(actor);
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    return { trades, timeZone: "America/Sao_Paulo", source: "DEMO" };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("timezone").eq("id", actor.id).maybeSingle();
  return { trades, timeZone: String(data?.timezone ?? "America/Sao_Paulo"), source: "MANUAL" };
}

export async function getDailyReview(actor: Actor, dateKey: string): Promise<DailyReview | null> {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return demoDailyReviews[dateKey] ?? null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("daily_reviews")
    .select("review_date,notes,lessons,updated_at")
    .eq("user_id", actor.id)
    .eq("review_date", dateKey)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a revisão diária: ${error.message}`);
  if (!data) return null;
  return {
    dateKey: String(data.review_date),
    notes: String(data.notes ?? ""),
    lessons: String(data.lessons ?? ""),
    updatedAt: data.updated_at ? String(data.updated_at) : null,
  };
}
