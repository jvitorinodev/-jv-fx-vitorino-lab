export const HISTORY_WINDOWS = [
  { value: 7, label: "1 semana", compactLabel: "7 dias" },
  { value: 14, label: "14 dias", compactLabel: "14 dias" },
  { value: 30, label: "1 mês", compactLabel: "30 dias" },
  { value: 90, label: "3 meses", compactLabel: "90 dias" },
  { value: 180, label: "6 meses", compactLabel: "180 dias" },
  { value: 365, label: "1 ano", compactLabel: "1 ano" },
  { value: 1095, label: "3 anos", compactLabel: "3 anos" },
  { value: 3650, label: "Tudo (até 10 anos)", compactLabel: "Tudo" },
] as const;

export const DEFAULT_HISTORY_WINDOW_DAYS = 30;
export const REALTIME_SYNC_WINDOW_DAYS = 7;
export const REALTIME_SYNC_INTERVAL_MS = 15_000;

export function isHistoryWindowDays(value: number): boolean {
  return HISTORY_WINDOWS.some((item) => item.value === value);
}

export function normalizeHistoryWindowDays(value: number | undefined, fallback = DEFAULT_HISTORY_WINDOW_DAYS): number {
  const normalized = Math.trunc(value ?? fallback);
  return isHistoryWindowDays(normalized) ? normalized : fallback;
}
