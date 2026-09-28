export type SessionKey = "ASIA" | "LONDON" | "NEW_YORK";
export type SessionState = "OPEN" | "CLOSED" | "OPENING_SOON";

export type MarketSession = {
  key: SessionKey;
  label: string;
  timezone: string;
  openHour: number;
  closeHour: number;
};

export type SessionSnapshot = MarketSession & {
  state: SessionState;
  localTime: string;
  detail: string;
};

export const MARKET_SESSIONS: readonly MarketSession[] = [
  { key: "ASIA", label: "Ásia", timezone: "Asia/Tokyo", openHour: 9, closeHour: 18 },
  { key: "LONDON", label: "Londres", timezone: "Europe/London", openHour: 8, closeHour: 17 },
  { key: "NEW_YORK", label: "Nova York", timezone: "America/New_York", openHour: 8, closeHour: 17 },
] as const;

function partsFor(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { weekday: value("weekday"), hour: Number(value("hour")), minute: Number(value("minute")), time: `${value("hour")}:${value("minute")}` };
}

function formatDuration(totalMinutes: number) {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return hours > 0 ? `${hours}h ${minutes.toString().padStart(2, "0")}min` : `${minutes}min`;
}

export function getSessionSnapshot(session: MarketSession, now = new Date()): SessionSnapshot {
  const local = partsFor(now, session.timezone);
  const minuteOfDay = local.hour * 60 + local.minute;
  const open = session.openHour * 60;
  const close = session.closeHour * 60;
  const weekend = local.weekday === "Sat" || local.weekday === "Sun";

  if (weekend) return { ...session, state: "CLOSED", localTime: local.time, detail: "Fim de semana" };

  if (minuteOfDay >= open && minuteOfDay < close) {
    return { ...session, state: "OPEN", localTime: local.time, detail: `${formatDuration(close - minuteOfDay)} restantes` };
  }

  const minutesUntilOpen = minuteOfDay < open ? open - minuteOfDay : 24 * 60 - minuteOfDay + open;
  const state: SessionState = minutesUntilOpen <= 90 ? "OPENING_SOON" : "CLOSED";
  return { ...session, state, localTime: local.time, detail: state === "OPENING_SOON" ? `Abre em ${formatDuration(minutesUntilOpen)}` : "Fechada" };
}

export function getAllSessionSnapshots(now = new Date()): SessionSnapshot[] {
  return MARKET_SESSIONS.map((session) => getSessionSnapshot(session, now));
}
