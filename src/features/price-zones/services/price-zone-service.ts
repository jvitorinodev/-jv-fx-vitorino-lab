import "server-only";

import type { Actor } from "@/lib/auth/guards";
import { calculateConfluenceScore, defaultConfluenceWeights } from "@/lib/core/confluence-service";
import { buildPriceZoneRecord } from "@/lib/core/price-zone-service";
import { resolveMarketType } from "@/lib/core/trade-lifecycle-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ConfluenceSelection,
  ConfluenceWeightMap,
  CreatePriceZoneInput,
  PriceZoneRecord,
  PriceZoneStatus,
} from "@/lib/types/price-zones";

function mapConfluence(row: Record<string, unknown>): ConfluenceSelection {
  return {
    key: String(row.confluence_key),
    category: row.category as ConfluenceSelection["category"],
    label: String(row.label ?? row.confluence_key),
    weight: Number(row.weight ?? 0),
    timeframe: row.timeframe == null ? null : String(row.timeframe),
    note: String(row.note ?? ""),
  };
}

function mapZone(row: Record<string, unknown>): PriceZoneRecord {
  const confluences = Array.isArray(row.price_zone_confluences)
    ? (row.price_zone_confluences as Record<string, unknown>[]).map(mapConfluence)
    : [];
  return {
    id: String(row.id),
    userId: String(row.user_id),
    analysisId: row.analysis_id == null ? null : String(row.analysis_id),
    setupId: String(row.setup_id),
    symbol: String(row.symbol),
    marketType: row.market_type as PriceZoneRecord["marketType"],
    direction: row.direction as PriceZoneRecord["direction"],
    timeframe: row.timeframe as PriceZoneRecord["timeframe"],
    zoneType: row.zone_type as PriceZoneRecord["zoneType"],
    lowerPrice: Number(row.lower_price),
    upperPrice: Number(row.upper_price),
    invalidationPrice: row.invalidation_price == null ? null : Number(row.invalidation_price),
    priceLocation: row.price_location as PriceZoneRecord["priceLocation"],
    status: row.status as PriceZoneRecord["status"],
    confluences,
    score: calculateConfluenceScore(confluences),
    alertEnabled: Boolean(row.alert_enabled),
    notes: String(row.notes ?? ""),
    source: row.source as PriceZoneRecord["source"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function savePriceZone(actor: Actor, input: CreatePriceZoneInput): Promise<PriceZoneRecord> {
  const marketType = resolveMarketType(input.symbol);
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    return buildPriceZoneRecord({ actorId: actor.id, input, marketType });
  }

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const draft = buildPriceZoneRecord({ actorId: actor.id, input, marketType, now: new Date(now) });
  const payload = {
    user_id: actor.id,
    analysis_id: input.analysisId ?? null,
    setup_id: draft.setupId,
    symbol: draft.symbol,
    market_type: draft.marketType,
    direction: draft.direction,
    timeframe: draft.timeframe,
    zone_type: draft.zoneType,
    lower_price: draft.lowerPrice,
    upper_price: draft.upperPrice,
    invalidation_price: draft.invalidationPrice,
    price_location: draft.priceLocation,
    status: draft.status,
    confluence_score: draft.score.points,
    selected_confluences: draft.score.selectedCount,
    alert_enabled: draft.alertEnabled,
    notes: draft.notes,
    source: draft.source,
    updated_at: now,
  };

  let row: Record<string, unknown>;
  if (input.zoneId) {
    const { data, error } = await supabase.from("price_zones").update(payload).eq("id", input.zoneId).eq("user_id", actor.id).select("*").single();
    if (error || !data) throw new Error(`Não foi possível atualizar a zona: ${error?.message ?? "erro desconhecido"}`);
    row = data as Record<string, unknown>;
    const { error: deleteError } = await supabase.from("price_zone_confluences").delete().eq("zone_id", input.zoneId);
    if (deleteError) throw new Error(`A zona foi atualizada, mas as confluências antigas não puderam ser substituídas: ${deleteError.message}`);
  } else {
    const { data, error } = await supabase.from("price_zones").insert(payload).select("*").single();
    if (error || !data) throw new Error(`Não foi possível salvar a zona: ${error?.message ?? "erro desconhecido"}`);
    row = data as Record<string, unknown>;
  }

  const zoneId = String(row.id);
  const { error: confluenceError } = await supabase.from("price_zone_confluences").insert(draft.confluences.map((item) => ({
    zone_id: zoneId,
    confluence_key: item.key,
    category: item.category,
    label: item.label,
    weight: item.weight,
    timeframe: item.timeframe ?? null,
    note: item.note ?? "",
  })));
  if (confluenceError) throw new Error(`A zona foi salva, mas as confluências não puderam ser persistidas: ${confluenceError.message}`);

  return { ...draft, id: zoneId, createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

export async function getPriceZones(actor: Actor, limit = 100): Promise<PriceZoneRecord[]> {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("price_zones")
    .select("*,price_zone_confluences(*)")
    .eq("user_id", actor.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Não foi possível carregar as zonas: ${error.message}`);
  return (data ?? []).map((row: unknown) => mapZone(row as Record<string, unknown>));
}

export async function updatePriceZoneStatus(actor: Actor, zoneId: string, status: PriceZoneStatus): Promise<void> {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("price_zones").update({ status, updated_at: new Date().toISOString() }).eq("id", zoneId).eq("user_id", actor.id);
  if (error) throw new Error(`Não foi possível atualizar o status da zona: ${error.message}`);
}

export async function getConfluenceWeights(actor: Actor): Promise<ConfluenceWeightMap> {
  const defaults = defaultConfluenceWeights();
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return defaults;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("user_confluence_weights").select("confluence_key,weight").eq("user_id", actor.id);
  if (error) throw new Error(`Não foi possível carregar os pesos: ${error.message}`);
  for (const row of data ?? []) defaults[String(row.confluence_key)] = Number(row.weight);
  return defaults;
}

export async function saveConfluenceWeights(actor: Actor, weights: ConfluenceWeightMap): Promise<ConfluenceWeightMap> {
  const normalized = Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, Math.min(5, Math.max(0, value))]));
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return normalized;
  const supabase = await createSupabaseServerClient();
  const rows = Object.entries(normalized).map(([key, weight]) => ({ user_id: actor.id, confluence_key: key, weight, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from("user_confluence_weights").upsert(rows, { onConflict: "user_id,confluence_key" });
  if (error) throw new Error(`Não foi possível salvar os pesos: ${error.message}`);
  return normalized;
}
