import "server-only";

import { generateSetupId, resolveMarketType } from "@/lib/core/trade-lifecycle-service";
import { calculateMarketConsensus, validateMarketAnalysis } from "@/lib/core/market-analysis-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Actor } from "@/lib/auth/guards";
import type { CreateMarketAnalysisInput, MarketAnalysisRecord, TimeframeAnalysis } from "@/lib/types/market-analysis";

function mapTimeframe(row: Record<string, unknown>): TimeframeAnalysis {
  return {
    timeframe: row.timeframe as TimeframeAnalysis["timeframe"],
    bias: row.bias as TimeframeAnalysis["bias"],
    structure: row.structure as TimeframeAnalysis["structure"],
    priceLocation: row.price_location as TimeframeAnalysis["priceLocation"],
    liquidity: row.liquidity_context as TimeframeAnalysis["liquidity"],
    note: String(row.note ?? ""),
  };
}

function analysisPayload(actor: Actor, input: CreateMarketAnalysisInput, setupId: string, consensus: ReturnType<typeof calculateMarketConsensus>, source: MarketAnalysisRecord["source"]) {
  return {
    user_id: actor.id,
    setup_id: setupId,
    symbol: input.symbol,
    market_type: resolveMarketType(input.symbol),
    higher_timeframe: input.higherTimeframe,
    execution_timeframe: input.executionTimeframe,
    consensus_bias: consensus.bias,
    consensus_direction: consensus.direction,
    alignment_pct: consensus.alignmentPct,
    liquidity_map: input.liquidity,
    volume_context: input.volume,
    moving_average_context: input.movingAverages,
    price_action_context: input.priceAction,
    thesis: input.thesis.trim(),
    invalidation: input.invalidation.trim(),
    notes: input.notes.trim(),
    source,
    updated_at: new Date().toISOString(),
  };
}

export async function createMarketAnalysis(actor: Actor, input: CreateMarketAnalysisInput): Promise<MarketAnalysisRecord> {
  const errors = validateMarketAnalysis(input);
  if (errors.length) throw new Error(errors[0]);

  const now = new Date();
  const consensus = calculateMarketConsensus(input.timeframes, input.higherTimeframe);
  const source = input.source ?? (process.env.NEXT_PUBLIC_APP_MODE === "production" ? "MANUAL" : "DEMO");

  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    const setupId = input.setupId?.trim() || generateSetupId(input.symbol, now, 1);
    return {
      ...input,
      id: input.analysisId ?? crypto.randomUUID(),
      userId: actor.id,
      setupId,
      marketType: resolveMarketType(input.symbol),
      source,
      consensus,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  const supabase = await createSupabaseServerClient();
  let setupId = input.setupId?.trim();
  if (!setupId) {
    const day = now.toISOString().slice(0, 10);
    const { count } = await supabase
      .from("market_analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actor.id)
      .eq("symbol", input.symbol)
      .gte("created_at", `${day}T00:00:00.000Z`)
      .lt("created_at", `${day}T23:59:59.999Z`);
    setupId = generateSetupId(input.symbol, now, (count ?? 0) + 1);
  }

  const payload = analysisPayload(actor, input, setupId, consensus, source);
  let row: Record<string, unknown>;

  if (input.analysisId) {
    const { data, error } = await supabase
      .from("market_analyses")
      .update(payload)
      .eq("id", input.analysisId)
      .eq("user_id", actor.id)
      .select("id,created_at,updated_at")
      .single();
    if (error || !data) throw new Error(`Não foi possível atualizar a análise: ${error?.message ?? "erro desconhecido"}`);
    row = data as Record<string, unknown>;
    const { error: deleteError } = await supabase.from("market_analysis_timeframes").delete().eq("analysis_id", input.analysisId);
    if (deleteError) throw new Error(`A análise foi atualizada, mas a matriz anterior não pôde ser substituída: ${deleteError.message}`);
  } else {
    const { data, error } = await supabase.from("market_analyses").insert(payload).select("id,created_at,updated_at").single();
    if (error || !data) throw new Error(`Não foi possível salvar a análise: ${error?.message ?? "erro desconhecido"}`);
    row = data as Record<string, unknown>;
  }

  const analysisId = String(row.id);
  const { error: frameError } = await supabase.from("market_analysis_timeframes").insert(input.timeframes.map((frame) => ({
    analysis_id: analysisId,
    timeframe: frame.timeframe,
    bias: frame.bias,
    structure: frame.structure,
    price_location: frame.priceLocation,
    liquidity_context: frame.liquidity,
    note: frame.note,
  })));
  if (frameError) throw new Error(`A análise foi salva, mas a matriz multi-timeframe não pôde ser persistida: ${frameError.message}`);

  return {
    ...input,
    id: analysisId,
    userId: actor.id,
    setupId,
    marketType: resolveMarketType(input.symbol),
    source,
    consensus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getLatestMarketAnalyses(actor: Actor, limit = 20): Promise<MarketAnalysisRecord[]> {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("market_analyses")
    .select("*,market_analysis_timeframes(*)")
    .eq("user_id", actor.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Não foi possível carregar as análises: ${error.message}`);

  return (data ?? []).map((row: unknown) => {
    const record = row as Record<string, unknown>;
    const timeframes = Array.isArray(record.market_analysis_timeframes)
      ? (record.market_analysis_timeframes as Record<string, unknown>[]).map(mapTimeframe)
      : [];
    return {
      id: String(record.id),
      userId: String(record.user_id),
      setupId: String(record.setup_id),
      symbol: String(record.symbol),
      marketType: record.market_type as MarketAnalysisRecord["marketType"],
      source: record.source as MarketAnalysisRecord["source"],
      higherTimeframe: record.higher_timeframe as MarketAnalysisRecord["higherTimeframe"],
      executionTimeframe: record.execution_timeframe as MarketAnalysisRecord["executionTimeframe"],
      timeframes,
      liquidity: record.liquidity_map as MarketAnalysisRecord["liquidity"],
      volume: record.volume_context as MarketAnalysisRecord["volume"],
      movingAverages: record.moving_average_context as MarketAnalysisRecord["movingAverages"],
      priceAction: record.price_action_context as MarketAnalysisRecord["priceAction"],
      consensus: calculateMarketConsensus(timeframes, record.higher_timeframe as MarketAnalysisRecord["higherTimeframe"]),
      thesis: String(record.thesis ?? ""),
      invalidation: String(record.invalidation ?? ""),
      notes: String(record.notes ?? ""),
      createdAt: String(record.created_at),
      updatedAt: String(record.updated_at),
    };
  });
}
