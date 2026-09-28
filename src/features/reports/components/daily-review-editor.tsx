"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Save } from "lucide-react";
import { saveDailyReviewAction } from "@/features/reports/actions/report-actions";
import { loadDemoReview, saveDemoReview } from "@/features/reports/data/demo-review-store";
import type { DailyReview } from "@/lib/types/reports";

export function DailyReviewEditor({ dateKey, source, initialReview }: { dateKey: string; source: "DEMO" | "MANUAL"; initialReview: DailyReview | null }) {
  const [review, setReview] = useState<DailyReview>(initialReview ?? { dateKey, notes: "", lessons: "", updatedAt: null });
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (source !== "DEMO") return;
    const local = loadDemoReview(dateKey);
    if (local) setReview(local);
  }, [dateKey, source]);

  function save() {
    setMessage("");
    startTransition(async () => {
      const result = await saveDailyReviewAction({ dateKey, notes: review.notes, lessons: review.lessons });
      if (!result.ok) { setMessage(result.message); return; }
      setReview(result.review);
      if (source === "DEMO") saveDemoReview(result.review);
      setMessage(result.message);
    });
  }

  const isError = message.toLowerCase().includes("não foi possível") || message.toLowerCase().includes("inválid");

  return <section className="panel overflow-hidden">
    <div className="panel-header"><div><p className="eyebrow">Fim do dia</p><h2 className="mt-1 text-sm font-semibold">Revisão Diária</h2></div>{review.updatedAt ? <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400"><Check className="size-3" />Salvo</span> : null}</div>
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">O que aconteceu hoje?</span><textarea value={review.notes} onChange={(event) => setReview((current) => ({ ...current, notes: event.target.value }))} rows={6} maxLength={8000} className="w-full resize-y rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm leading-6 text-slate-200 outline-none transition focus:border-sky-500" placeholder="Qualidade da execução, contexto, disciplina, erros…" /></label>
      <label className="block"><span className="mb-2 block text-xs font-medium text-slate-400">O que você vai levar para as próximas operações?</span><textarea value={review.lessons} onChange={(event) => setReview((current) => ({ ...current, lessons: event.target.value }))} rows={6} maxLength={8000} className="w-full resize-y rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm leading-6 text-slate-200 outline-none transition focus:border-sky-500" placeholder="Regras, aprendizados e melhorias de processo…" /></label>
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-slate-800/80 px-4 py-3"><p className={`text-xs ${isError ? "text-red-300" : "text-slate-500"}`}>{message || (source === "DEMO" ? "As notas de demonstração ficam salvas neste navegador." : "Armazenado de forma privada na sua conta.")}</p><button type="button" onClick={save} disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"><Save className="size-4" />{pending ? "Salvando…" : "Salvar revisão"}</button></div>
  </section>;
}
