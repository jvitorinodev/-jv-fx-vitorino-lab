import { BRAND } from "@/config/brand";
import type { TradeChecklist, TradeRecord } from "@/lib/types/journal";

const KEY = `${BRAND.storageNamespace}.demo.trades.v1`;
const LEGACY_KEY = "axiom.demo.trades.v1";

function migrateLegacyTrades(): string | null {
  const current = window.localStorage.getItem(KEY);
  if (current) return current;

  const legacy = window.localStorage.getItem(LEGACY_KEY);
  if (!legacy) return null;

  window.localStorage.setItem(KEY, legacy);
  window.localStorage.removeItem(LEGACY_KEY);
  return legacy;
}

function sanitizeLegacyTrade(value: unknown): TradeRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const checklistRaw = row.checklist && typeof row.checklist === "object" && !Array.isArray(row.checklist)
    ? row.checklist as Record<string, unknown>
    : {};
  const checklist: TradeChecklist = {
    htfAligned: Boolean(checklistRaw.htfAligned),
    liquidityTaken: Boolean(checklistRaw.liquidityTaken),
    poiIdentified: Boolean(checklistRaw.poiIdentified),
    fvgPresent: Boolean(checklistRaw.fvgPresent),
    structureShift: Boolean(checklistRaw.structureShift),
    priceActionConfirmation: Boolean(checklistRaw.priceActionConfirmation),
    riskCalculated: Boolean(checklistRaw.riskCalculated),
    dailyLimitChecked: Boolean(checklistRaw.dailyLimitChecked),
    newsChecked: Boolean(checklistRaw.newsChecked),
  };
  const confluences = Array.isArray(row.confluences)
    ? row.confluences.filter((item) => item && typeof item === "object" && (item as Record<string, unknown>).key !== "smt")
    : [];

  const strategy = String(row.strategy ?? "").replace(/\bSMT\b\s*\+?\s*/gi, "").trim() || "Estratégia registrada";
  const setupName = String(row.setupName ?? "").replace(/\bSMT\b\s*\+?\s*/gi, "").replace(/\+\s*$/g, "").trim() || "Setup registrado";
  return { ...(row as unknown as TradeRecord), strategy, setupName, checklist, tags: Array.isArray(row.tags) ? row.tags.map(String) : [], quickNote: String(row.quickNote ?? ""), confluences: confluences as TradeRecord["confluences"] };
}

export function loadDemoTrades(): TradeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const value = migrateLegacyTrades();
    if (!value) return [];
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    const sanitized = parsed.map(sanitizeLegacyTrade).filter((item): item is TradeRecord => Boolean(item));
    window.localStorage.setItem(KEY, JSON.stringify(sanitized));
    return sanitized;
  } catch {
    return [];
  }
}

export function upsertDemoTrade(trade: TradeRecord) {
  if (typeof window === "undefined") return;
  const existing = loadDemoTrades();
  const next = [trade, ...existing.filter((item) => item.id !== trade.id)].slice(0, 100);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function findDemoTrade(id: string): TradeRecord | null {
  return loadDemoTrades().find((trade) => trade.id === id) ?? null;
}
