import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Actor } from "@/lib/auth/guards";
import type { EvidenceSnapshotRecord, SaveEvidenceSnapshotInput } from "@/lib/types/market-terminal";

function validate(input: SaveEvidenceSnapshotInput) {
  const setupId = input.setupId.trim();
  if (!setupId) throw new Error("Informe um Setup ID para vincular o snapshot.");
  if (setupId.length > 120) throw new Error("Setup ID muito longo.");
  if (!input.symbol.trim()) throw new Error("Ativo inválido.");
  if (input.primary.symbol !== input.symbol) throw new Error("O ativo do snapshot não corresponde ao ativo informado.");
  return setupId;
}

function buildRecord(actor: Actor, input: SaveEvidenceSnapshotInput, id: string, createdAt: string, updatedAt: string): EvidenceSnapshotRecord {
  const source = input.mtf?.source ?? (process.env.NEXT_PUBLIC_APP_MODE === "production" ? "REALTIME" : "DEMO");
  return {
    id,
    userId: actor.id,
    setupId: input.setupId.trim(),
    symbol: input.symbol,
    source,
    evaluatedAt: input.primary.evaluatedAt,
    primary: input.primary,
    mtf: input.mtf ?? null,
    createdAt,
    updatedAt,
  };
}

export async function saveEvidenceSnapshot(actor: Actor, input: SaveEvidenceSnapshotInput): Promise<EvidenceSnapshotRecord> {
  const setupId = validate(input);
  const now = new Date().toISOString();

  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    return buildRecord(actor, { ...input, setupId }, crypto.randomUUID(), now, now);
  }

  const supabase = await createSupabaseServerClient();
  const source = input.mtf?.source ?? "REALTIME";
  const payload = {
    user_id: actor.id,
    setup_id: setupId,
    symbol: input.symbol,
    source,
    evaluated_at: input.primary.evaluatedAt,
    primary_timeframe: input.primary.timeframe,
    primary_context: input.primary.context,
    evidence_score: input.primary.evidenceScore,
    evidence_max: input.primary.evidenceMax,
    primary_snapshot: input.primary,
    mtf_snapshot: input.mtf ?? null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("automatic_evidence_snapshots")
    .upsert(payload, { onConflict: "user_id,setup_id" })
    .select("id,created_at,updated_at")
    .single();
  if (error || !data) throw new Error(`Não foi possível salvar o snapshot: ${error?.message ?? "erro desconhecido"}`);

  const snapshotId = String(data.id);
  const { error: deleteError } = await supabase.from("automatic_evidence_timeframes").delete().eq("snapshot_id", snapshotId);
  if (deleteError) throw new Error(`Snapshot salvo, mas a matriz anterior não pôde ser substituída: ${deleteError.message}`);

  const frames = input.mtf?.frames ?? [input.primary];
  if (frames.length) {
    const { error: frameError } = await supabase.from("automatic_evidence_timeframes").insert(frames.map((frame) => ({
      snapshot_id: snapshotId,
      timeframe: frame.timeframe,
      context: frame.context,
      evidence_score: frame.evidenceScore,
      evidence_count: frame.evidence.length,
      structure_evidence: frame.evidence.filter((item) => item.category === "ESTRUTURA"),
      evidence: frame.evidence,
      evaluated_at: frame.evaluatedAt,
    })));
    if (frameError) throw new Error(`Snapshot salvo, mas os timeframes não puderam ser persistidos: ${frameError.message}`);
  }

  return buildRecord(actor, { ...input, setupId }, snapshotId, String(data.created_at), String(data.updated_at));
}
