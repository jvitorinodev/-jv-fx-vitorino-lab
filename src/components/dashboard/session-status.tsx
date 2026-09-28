"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { getAllSessionSnapshots, type SessionSnapshot } from "@/lib/core/clock";
import { labelSessionState } from "@/lib/i18n/pt-br";

function tone(state: SessionSnapshot["state"]) {
  if (state === "OPEN") return "text-emerald-300";
  if (state === "OPENING_SOON") return "text-amber-300";
  return "text-slate-500";
}

export function SessionStatus() {
  const [sessions, setSessions] = useState<SessionSnapshot[]>(() => getAllSessionSnapshots());

  useEffect(() => {
    const id = window.setInterval(() => setSessions(getAllSessionSnapshots()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="hidden items-center gap-1 xl:flex" aria-label="Sessões de mercado">
      {sessions.map((session) => (
        <div key={session.key} className="min-w-[118px] rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{session.label}</span>
            <span className={`text-[9px] font-semibold ${tone(session.state)}`}>{labelSessionState(session.state)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400"><Clock3 className="size-3" aria-hidden="true" /><span className="tabular">{session.detail}</span></div>
        </div>
      ))}
    </div>
  );
}
