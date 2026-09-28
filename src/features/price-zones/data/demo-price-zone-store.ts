import { BRAND } from "@/config/brand";
import { calculateConfluenceScore, defaultConfluenceWeights } from "@/lib/core/confluence-service";
import type { ConfluenceSelection, ConfluenceWeightMap, PriceZoneRecord } from "@/lib/types/price-zones";

const ZONES_KEY = `${BRAND.storageNamespace}.demo.price-zones.v1`;
const WEIGHTS_KEY = `${BRAND.storageNamespace}.demo.confluence-weights.v1`;

function sanitizeZone(zone: PriceZoneRecord): PriceZoneRecord {
  const confluences = (zone.confluences ?? []).filter((item: ConfluenceSelection) => item.key !== "smt");
  return { ...zone, confluences, score: calculateConfluenceScore(confluences) };
}

export function loadDemoPriceZones(): PriceZoneRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ZONES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const sanitized = (parsed as PriceZoneRecord[]).map(sanitizeZone);
    window.localStorage.setItem(ZONES_KEY, JSON.stringify(sanitized));
    return sanitized;
  } catch {
    return [];
  }
}

export function replaceDemoPriceZones(zones: PriceZoneRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ZONES_KEY, JSON.stringify(zones.map(sanitizeZone).slice(0, 250)));
}

export function upsertDemoPriceZone(zone: PriceZoneRecord): void {
  const current = loadDemoPriceZones();
  replaceDemoPriceZones([zone, ...current.filter((item) => item.id !== zone.id)]);
}

export function removeDemoPriceZone(id: string): void {
  replaceDemoPriceZones(loadDemoPriceZones().filter((item) => item.id !== id));
}

export function loadDemoConfluenceWeights(): ConfluenceWeightMap {
  if (typeof window === "undefined") return defaultConfluenceWeights();
  try {
    const raw = window.localStorage.getItem(WEIGHTS_KEY);
    if (!raw) return defaultConfluenceWeights();
    const parsed = JSON.parse(raw) as ConfluenceWeightMap;
    delete parsed.smt;
    const sanitized = { ...defaultConfluenceWeights(), ...parsed };
    window.localStorage.setItem(WEIGHTS_KEY, JSON.stringify(sanitized));
    return sanitized;
  } catch {
    return defaultConfluenceWeights();
  }
}

export function saveDemoConfluenceWeights(weights: ConfluenceWeightMap): void {
  if (typeof window === "undefined") return;
  const sanitized = { ...weights };
  delete sanitized.smt;
  window.localStorage.setItem(WEIGHTS_KEY, JSON.stringify(sanitized));
}
