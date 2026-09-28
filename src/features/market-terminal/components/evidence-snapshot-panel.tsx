"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Archive, ArrowRight, Save } from "lucide-react";
import type { AutoAnalysisSnapshot, MtfAutoAnalysisSnapshot } from "@/lib/types/market-terminal";
import { saveEvidenceSnapshotAction } from "@/features/market-terminal/actions/evidence-snapshot-actions";
import { saveDemoEvidenceSnapshot } from "@/features/market-terminal/data/demo-evidence-snapshot-store";

function defaultSetupId(symbol: string) {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `${symbol}-${stamp}-AUTO`;
}

export function EvidenceSnapshotPanel({ symbol, primary, mtf }: { symbol: string; primary: AutoAnalysisSnapshot | null; mtf: MtfAutoAnalysisSnapshot | null }) {
  const [setupId, setSetupId] = useState(() => defaultSetupId(symbol));
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [savedSetupId, setSavedSetupId] = useState<string | null>(null);

  useEffect(() => {
    setSetupId(defaultSetupId(symbol));
    setSavedSetupId(null);
  }, [symbol]);

  const keys = useMemo(() => {
    const rows = [...(primary?.evidence ?? []), ...(mtf?.frames.flatMap((frame) => frame.evidence) ?? [])];
    return Array.from(new Set(rows.map((item) => item.confluenceKey).filter((item): item is string => Boolean(item))));
  }, [primary, mtf]);

  function save() {
    if (!primary) {
      setMessage({ tone: "error", text: "Carregue a leitura principal antes de salvar o snapshot." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await saveEvidenceSnapshotAction({ setupId, symbol, primary, mtf });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      if (process.env.NEXT_PUBLIC_APP_MODE !== "production") saveDemoEvidenceSnapshot(result.snapshot);
      setSavedSetupId(result.snapshot.setupId);
      setMessage({ tone: "success", text: result.message });
    });
  }

  const confluenceHref = `/dashboard/confluence?keys=${encodeURIComponent(keys.join(","))}&setupId=${encodeURIComponent(savedSetupId || setupId)}`;

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header"><div className="flex items-center gap-2"><Archive className="size-4 text-sky-300" /><div><p className="eyebrow">Setup ID</p><h2 className="text-sm font-semibold">Snapshot das Evidências</h2></div></div></div>
      <div className="space-y-3 p-4">
        <label className="text-xs text-slate-400">ID da Configuração
          <input className="mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-sky-500" value={setupId} maxLength={120} onChange={(event) => setSetupId(event.target.value.toUpperCase())} />
        </label>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600"><span>Ativo <b className="text-slate-400">{symbol}</b></span><span>Confluências detectadas <b className="text-slate-400">{keys.length}</b></span></div>
        <button type="button" onClick={save} disabled={isPending || !primary || !setupId.trim()} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-950 hover:bg-white disabled:opacity-40"><Save className="size-4" />{isPending ? "Salvando snapshot…" : "Salvar snapshot no Setup"}</button>
        {message ? <div className={`rounded-lg border p-3 text-xs ${message.tone === "success" ? "border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-200" : "border-red-400/15 bg-red-400/[0.04] text-red-200"}`}>{message.text}</div> : null}
        {keys.length ? <Link href={confluenceHref} className="flex items-center justify-between rounded-lg border border-sky-400/15 bg-sky-400/[0.04] px-3 py-2.5 text-xs text-sky-200 hover:border-sky-400/30"><span>Levar snapshot ao Motor de Confluências</span><ArrowRight className="size-3.5" /></Link> : null}
        <p className="text-[10px] leading-4 text-slate-600">Salvar um snapshot congela a leitura técnica daquele momento e a vincula ao Setup ID. Atualizações futuras do mercado não alteram retroativamente o snapshot salvo.</p>
      </div>
    </section>
  );
}
