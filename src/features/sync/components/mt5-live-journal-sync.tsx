"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, RadioTower, RefreshCw } from "lucide-react";
import { syncConnectedMt5AccountAction } from "@/features/sync/actions/mt5-sync-actions";
import { REALTIME_SYNC_INTERVAL_MS } from "@/config/history-windows";

type LiveState = "waiting" | "syncing" | "ok" | "unlinked" | "error";

export function Mt5LiveJournalSync() {
  const router = useRouter();
  const [state, setState] = useState<LiveState>("waiting");
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureCountRef = useRef(0);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return;
    let cancelled = false;

    async function cycle() {
      if (cancelled) return;
      if (document.visibilityState !== "visible" || !navigator.onLine || runningRef.current) {
        timerRef.current = setTimeout(cycle, REALTIME_SYNC_INTERVAL_MS);
        return;
      }

      runningRef.current = true;
      setState("syncing");
      let nextDelay = REALTIME_SYNC_INTERVAL_MS;
      try {
        const result = await syncConnectedMt5AccountAction();
        if (cancelled) return;
        if (result.ok) {
          failureCountRef.current = 0;
          setState("ok");
          setLastUpdate(new Date().toISOString());
          router.refresh();
        } else if (result.message.toLowerCase().includes("ainda não está vinculado")) {
          failureCountRef.current = 0;
          setState("unlinked");
          nextDelay = Math.max(REALTIME_SYNC_INTERVAL_MS, 30_000);
        } else {
          failureCountRef.current += 1;
          setState("error");
          nextDelay = Math.min(60_000, REALTIME_SYNC_INTERVAL_MS * (failureCountRef.current + 1));
        }
      } catch {
        failureCountRef.current += 1;
        nextDelay = Math.min(60_000, REALTIME_SYNC_INTERVAL_MS * (failureCountRef.current + 1));
        if (!cancelled) setState("error");
      } finally {
        runningRef.current = false;
        if (!cancelled) timerRef.current = setTimeout(cycle, nextDelay);
      }
    }

    const kick = () => {
      if (document.visibilityState === "visible" && !runningRef.current) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(cycle, 400);
      }
    };

    timerRef.current = setTimeout(cycle, 2500);
    window.addEventListener("focus", kick);
    window.addEventListener("online", kick);
    document.addEventListener("visibilitychange", kick);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("focus", kick);
      window.removeEventListener("online", kick);
      document.removeEventListener("visibilitychange", kick);
    };
  }, [router]);

  const label = state === "syncing"
    ? "Atualizando Journal"
    : state === "ok"
      ? "Journal MT5 ao vivo"
      : state === "unlinked"
        ? "MT5 sem vínculo"
        : state === "error"
          ? "MT5 sync indisponível"
          : "Journal MT5 automático";

  const Icon = state === "syncing" ? RefreshCw : state === "error" || state === "unlinked" ? CircleAlert : RadioTower;
  const tone = state === "ok"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : state === "error" || state === "unlinked"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-white text-slate-500";

  return (
    <div
      className={`hidden h-9 items-center gap-2 rounded-xl border px-3 text-[10px] font-semibold xl:inline-flex ${tone}`}
      title={lastUpdate ? `Última atualização: ${new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium" }).format(new Date(lastUpdate))}` : "O JV FX verifica novas operações fechadas do MT5 automaticamente."}
    >
      <Icon className={`size-3.5 ${state === "syncing" ? "animate-spin" : ""}`} />
      <span>{label}</span>
      <span className="opacity-60">~15s</span>
    </div>
  );
}
