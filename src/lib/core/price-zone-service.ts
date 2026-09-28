import { calculateConfluenceScore } from "@/lib/core/confluence-service";
import type { CreatePriceZoneInput, PriceZoneRecord, PriceZoneStatus } from "@/lib/types/price-zones";

export function validatePriceZone(input: CreatePriceZoneInput): string[] {
  const errors: string[] = [];
  if (!input.setupId.trim()) errors.push("Informe o ID da Configuração vinculado à zona.");
  if (!input.symbol.trim()) errors.push("Informe o ativo da zona.");
  if (!Number.isFinite(input.lowerPrice) || input.lowerPrice <= 0) errors.push("O preço inferior da zona deve ser maior que zero.");
  if (!Number.isFinite(input.upperPrice) || input.upperPrice <= 0) errors.push("O preço superior da zona deve ser maior que zero.");
  if (input.lowerPrice >= input.upperPrice) errors.push("O preço inferior deve ser menor que o preço superior.");
  if (input.invalidationPrice != null && (!Number.isFinite(input.invalidationPrice) || input.invalidationPrice <= 0)) errors.push("O preço de invalidação deve ser maior que zero.");
  if (!input.confluences.length) errors.push("Selecione pelo menos uma confluência para documentar a zona.");
  if (input.confluences.some((item) => item.weight < 0 || item.weight > 5)) errors.push("Os pesos das confluências devem ficar entre 0 e 5.");
  return errors;
}

export function inferPriceZoneStatus(currentPrice: number, lowerPrice: number, upperPrice: number, previousStatus: PriceZoneStatus = "WAITING"): PriceZoneStatus {
  if (["INVALIDATED", "COMPLETED", "ARCHIVED"].includes(previousStatus)) return previousStatus;
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return previousStatus;
  if (currentPrice >= lowerPrice && currentPrice <= upperPrice) return "INSIDE_ZONE";
  const midpoint = (lowerPrice + upperPrice) / 2;
  const distance = currentPrice < lowerPrice ? lowerPrice - currentPrice : currentPrice - upperPrice;
  const proximityPct = midpoint > 0 ? (distance / midpoint) * 100 : Number.POSITIVE_INFINITY;
  return proximityPct <= 0.35 ? "APPROACHING" : "WAITING";
}

export function zoneMidpoint(zone: Pick<PriceZoneRecord, "lowerPrice" | "upperPrice">): number {
  return (zone.lowerPrice + zone.upperPrice) / 2;
}

export function buildPriceZoneRecord(params: {
  actorId: string;
  input: CreatePriceZoneInput;
  marketType: PriceZoneRecord["marketType"];
  now?: Date;
  existing?: Pick<PriceZoneRecord, "id" | "createdAt"> | null;
}): PriceZoneRecord {
  const { actorId, input, marketType, existing } = params;
  const now = params.now ?? new Date();
  const errors = validatePriceZone(input);
  if (errors.length) throw new Error(errors[0]);
  const confluences = input.confluences.map((item) => ({ ...item, weight: Math.min(5, Math.max(0, item.weight)) }));
  return {
    id: existing?.id ?? input.zoneId ?? crypto.randomUUID(),
    userId: actorId,
    analysisId: input.analysisId ?? null,
    setupId: input.setupId.trim(),
    symbol: input.symbol.trim().toUpperCase(),
    marketType,
    direction: input.direction,
    timeframe: input.timeframe,
    zoneType: input.zoneType,
    lowerPrice: input.lowerPrice,
    upperPrice: input.upperPrice,
    invalidationPrice: input.invalidationPrice ?? null,
    priceLocation: input.priceLocation,
    status: input.status ?? "WAITING",
    confluences,
    score: calculateConfluenceScore(confluences),
    alertEnabled: Boolean(input.alertEnabled),
    notes: input.notes?.trim() ?? "",
    source: input.source ?? (process.env.NEXT_PUBLIC_APP_MODE === "production" ? "MANUAL" : "DEMO"),
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
