import { BRAND } from "@/config/brand";
import type { DailyReview } from "@/lib/types/reports";

const PREFIX = `${BRAND.storageNamespace}.demo.daily-review.v1.`;
const LEGACY_PREFIX = "axiom.demo.daily-review.v1.";

function readWithMigration(dateKey: string): string | null {
  const key = `${PREFIX}${dateKey}`;
  const current = window.localStorage.getItem(key);
  if (current) return current;

  const legacyKey = `${LEGACY_PREFIX}${dateKey}`;
  const legacy = window.localStorage.getItem(legacyKey);
  if (!legacy) return null;

  window.localStorage.setItem(key, legacy);
  window.localStorage.removeItem(legacyKey);
  return legacy;
}

export function loadDemoReview(dateKey: string): DailyReview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readWithMigration(dateKey);
    return raw ? JSON.parse(raw) as DailyReview : null;
  } catch {
    return null;
  }
}

export function saveDemoReview(review: DailyReview): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${PREFIX}${review.dateKey}`, JSON.stringify(review));
}
