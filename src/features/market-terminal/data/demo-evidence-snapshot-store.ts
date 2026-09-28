"use client";

import { BRAND } from "@/config/brand";
import type { EvidenceSnapshotRecord } from "@/lib/types/market-terminal";

const KEY = `${BRAND.storageNamespace}.demo.evidence-snapshots.v1`;

export function saveDemoEvidenceSnapshot(snapshot: EvidenceSnapshotRecord) {
  if (typeof window === "undefined") return;
  const current = loadDemoEvidenceSnapshots().filter((item) => item.setupId !== snapshot.setupId);
  window.localStorage.setItem(KEY, JSON.stringify([snapshot, ...current].slice(0, 100)));
}

export function loadDemoEvidenceSnapshots(): EvidenceSnapshotRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as EvidenceSnapshotRecord[] : [];
  } catch {
    return [];
  }
}
