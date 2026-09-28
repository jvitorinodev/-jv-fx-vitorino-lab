"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRight, BarChart3, RotateCcw, Save, SlidersHorizontal, Sparkles } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CONFLUENCE_CATALOG,
  CONFLUENCE_CATEGORIES,
  calculateConfluenceScore,
  defaultConfluenceWeights,
  normalizeWeight,
  selectionFromKeys,
  toggleConfluenceKey,
} from "@/lib/core/confluence-service";
import { labelConfluenceCategory, labelConfluenceLevel, labelDataSource } from "@/lib/i18n/pt-br";
import type { ConfluenceWeightMap, PriceZoneRecord } from "@/lib/types/price-zones";
import type { DataSource } from "@/lib/types/trading";
import { saveConfluenceWeightsAction } from "@/features/price-zones/actions/price-zone-actions";
import { createDemoPriceZones } from "@/features/price-zones/data/demo-price-zones";
import { loadDemoConfluenceWeights, loadDemoPriceZones, saveDemoConfluenceWeights } from "@/features/price-zones/data/demo-price-zone-store";

export function ConfluenceEngineWorkspace({ initialWeights, initialZones, source, initialSelectedKeys = [], setupId }: { initialWeights: ConfluenceWeightMap; initialZones: PriceZoneRecord[]; source: DataSource; initialSelectedKeys?: string[]; setupId?: string }) {
  const [weights, setWeights] = useState<ConfluenceWeightMap>(initialWeights);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialSelectedKeys.length ? initialSelectedKeys : ["htf_alignment", "liquidity_sweep", "fvg", "mss", "price_action_confirmation"]);
  const [zones, setZones] = useState<PriceZoneRecord[]>(initialZones);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_MODE === "production") return;
    setWeights(loadDemoConfluenceWeights());
    const stored = loadDemoPriceZones();
    setZones(stored.length ? stored : createDemoPriceZones());
  }, []);

  const selections = useMemo(() => selectionFromKeys(selectedKeys, weights, "15M"), [selectedKeys, weights]);
  const score = useMemo(() => calculateConfluenceScore(selections), [selections]);
  const strongestZones = useMemo(() => [...zones].filter((item) => item.status !== "ARCHIVED").sort((a, b) => b.score.points - a.score.points).slice(0, 6), [zones]);

  function changeWeight(key: string, value: number) {
    setWeights((current) => ({ ...current, [key]: normalizeWeight(value) }));
  }

  function toggle(key: string) {
    setSelectedKeys((current) => toggleConfluenceKey(current, key));
  }

  function resetWeights() {
    const defaults = defaultConfluenceWeights();
    setWeights(defaults);
    setMessage({ tone: "success", text: "Pesos restaurados para os valores padrão. Salve para persistir a alteração." });
  }

  function saveWeights() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveConfluenceWeightsAction(weights);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      if (process.env.NEXT_PUBLIC_APP_MODE !== "production") saveDemoConfluenceWeights(result.weights);
      setWeights(result.weights);
      setMessage({ tone: "success", text: result.message });
    });
  }

  return (
    <div className="space-y-5">
      {setupId ? <section className="rounded-xl border border-sky-400/15 bg-sky-400/[0.04] px-4 py-3"><p className="eyebrow">Snapshot vinculado</p><div className="mt-1 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-sky-100">{setupId}</p><span className="text-[10px] text-slate-500">As evidências recebidas vieram do snapshot salvo no Terminal.</span></div></section> : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pontuação simulada" value={score.points.toFixed(1)} sub={labelConfluenceLevel(score.level)} icon={<Sparkles className="size-4" />} />
        <MetricCard label="Confluências selecionadas" value={score.selectedCount.toString()} sub={`${score.byCategory.length} categorias`} icon={<BarChart3 className="size-4" />} />
        <MetricCard label="Zonas registradas" value={zones.length.toString()} sub="Ligadas aos setups" icon={<SlidersHorizontal className="size-4" />} />
        <MetricCard label="Origem" value={labelDataSource(source)} sub="Motor configurável" icon={<Save className="size-4" />} />
      </section>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
        <section className="panel overflow-hidden">
          <div className="panel-header">
            <div><p className="eyebrow">Configuração pessoal</p><h2 className="mt-1 text-sm font-semibold">Pesos das Confluências</h2></div>
            <div className="flex gap-2"><button type="button" onClick={resetWeights} className="action"><RotateCcw className="size-3.5" />Restaurar</button><button type="button" onClick={saveWeights} disabled={isPending} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-[11px] font-semibold text-slate-950 hover:bg-white disabled:opacity-40"><Save className="size-3.5" />{isPending ? "Salvando…" : "Salvar pesos"}</button></div>
          </div>
          <div className="space-y-5 p-4">
            {CONFLUENCE_CATEGORIES.map((category) => {
              const items = CONFLUENCE_CATALOG.filter((item) => item.category === category);
              if (!items.length) return null;
              return (
                <section key={category}>
                  <p className="eyebrow mb-2">{labelConfluenceCategory(category)}</p>
                  <div className="overflow-hidden rounded-lg border border-slate-800">
                    {items.map((item, index) => (
                      <div key={item.key} className={`grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_110px] md:items-center ${index ? "border-t border-slate-800/80" : ""}`}>
                        <div><p className="text-xs font-medium text-slate-200">{item.label}</p><p className="mt-1 text-[10px] leading-4 text-slate-600">{item.description}</p></div>
                        <label className="flex items-center gap-2"><input aria-label={`Peso de ${item.label}`} className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950 px-2 text-center text-xs tabular text-slate-100 outline-none focus:border-sky-500" type="number" min="0" max="5" step="0.5" value={weights[item.key] ?? item.defaultWeight} onChange={(event) => changeWeight(item.key, Number(event.target.value))} /><span className="text-[10px] text-slate-600">/5</span></label>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
            {message ? <p className={`rounded-lg border p-3 text-xs ${message.tone === "success" ? "border-emerald-400/15 bg-emerald-400/[0.03] text-emerald-200" : "border-red-400/20 bg-red-400/[0.04] text-red-200"}`}>{message.text}</p> : null}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="panel overflow-hidden">
            <div className="panel-header"><div><p className="eyebrow">Simulador</p><h2 className="mt-1 text-sm font-semibold">Pontuação do Setup</h2></div><StatusPill tone={score.points >= 10 ? "positive" : score.points >= 7 ? "info" : score.points >= 4 ? "warning" : "neutral"}>{labelConfluenceLevel(score.level)}</StatusPill></div>
            <div className="p-4">
              <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.04] p-4 text-center"><p className="eyebrow">Pontuação configurada</p><p className="tabular mt-2 text-5xl font-semibold text-slate-100">{score.points.toFixed(1)}</p><p className="mt-2 text-xs text-slate-500">{score.selectedCount} evidências selecionadas</p></div>
              <p className="mt-3 rounded-lg border border-slate-800 bg-slate-950/30 p-3 text-[10px] leading-4 text-slate-500">Fibonacci aceita uma leitura por swing entre 23,6% e 72% (incluindo a zona 61,8%–72%). Divergências RSI também são mutuamente exclusivas por leitura. As EMAs 9, 20, 50 e 200 podem ser avaliadas individualmente ou pelo alinhamento conjunto.</p>
              <div className="mt-4 space-y-2">
                {CONFLUENCE_CATALOG.map((item) => {
                  const active = selectedKeys.includes(item.key);
                  return <button type="button" key={item.key} onClick={() => toggle(item.key)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs transition ${active ? "border-sky-400/30 bg-sky-400/[0.06] text-sky-100" : "border-slate-800 bg-slate-950/30 text-slate-500 hover:border-slate-700"}`}><span>{item.label}</span><span className="tabular text-[10px] text-slate-500">+{weights[item.key] ?? item.defaultWeight}</span></button>;
                })}
              </div>
              <p className="mt-4 text-[10px] leading-4 text-slate-600">0–3 = baixa · 4–6 = em desenvolvimento · 7–9 = forte · 10+ = alta confluência. A escala não é uma probabilidade de sucesso.</p>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-header"><div><p className="eyebrow">Zonas</p><h2 className="mt-1 text-sm font-semibold">Maiores Pontuações</h2></div><Link href="/dashboard/price-zones" className="text-[10px] text-sky-300 hover:text-sky-200">Abrir zonas</Link></div>
            <div className="divide-y divide-slate-900">
              {strongestZones.length ? strongestZones.map((zone) => <div key={zone.id} className="flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="text-xs font-semibold text-slate-200">{zone.symbol} · {zone.timeframe}</p><p className="mt-1 truncate text-[10px] text-slate-600">{zone.setupId}</p></div><div className="shrink-0 text-right"><p className="tabular text-sm font-semibold text-slate-200">{zone.score.points.toFixed(1)}</p><p className="text-[9px] text-slate-600">{labelConfluenceLevel(zone.score.level)}</p></div></div>) : <p className="px-4 py-6 text-xs text-slate-600">Nenhuma zona registrada ainda.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return <div className="panel p-4"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{label}</p><p className="tabular mt-2 text-xl font-semibold text-slate-100">{value}</p><p className="mt-1 text-[10px] text-slate-600">{sub}</p></div><div className="grid size-8 place-items-center rounded-lg border border-slate-800 bg-slate-950/40 text-slate-500">{icon}</div></div></div>;
}
