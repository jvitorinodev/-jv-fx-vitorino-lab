"use client";

import type { BrokerSyncState } from "@/lib/types/broker-sync";

const KEY = "jvfx.demo.mt5-sync.v1";

export function loadDemoSyncStates(): BrokerSyncState[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as BrokerSyncState[] : [];
  } catch {
    return [];
  }
}

export function saveDemoSyncState(state: BrokerSyncState) {
  if (typeof window === "undefined") return;
  const current = loadDemoSyncStates();
  const next = [state, ...current.filter((item) => item.accountId !== state.accountId)];
  window.localStorage.setItem(KEY, JSON.stringify(next));
}
