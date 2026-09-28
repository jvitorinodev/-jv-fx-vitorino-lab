import { BRAND } from "@/config/brand";
import type { MarketAnalysisRecord } from "@/lib/types/market-analysis";

const KEY = `${BRAND.storageNamespace}.demo.market-analyses.v1`;

export function loadDemoAnalyses(): MarketAnalysisRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as MarketAnalysisRecord[] : [];
  } catch {
    return [];
  }
}

export function upsertDemoAnalysis(analysis: MarketAnalysisRecord): void {
  if (typeof window === "undefined") return;
  const current = loadDemoAnalyses();
  const next = [analysis, ...current.filter((item) => item.id !== analysis.id)].slice(0, 100);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function countDemoAnalysesForDay(symbol: string, date = new Date()): number {
  if (typeof window === "undefined") return 0;
  const day = date.toISOString().slice(0, 10);
  return loadDemoAnalyses().filter((item) => item.symbol === symbol && item.createdAt.slice(0, 10) === day).length;
}
