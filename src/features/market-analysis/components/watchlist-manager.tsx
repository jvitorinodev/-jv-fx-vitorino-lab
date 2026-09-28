"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pin, PinOff, ArrowRight } from "lucide-react";
import { BRAND } from "@/config/brand";
import type { MarketWatchItem } from "@/lib/types/trading";
import { labelBias, labelMarketType } from "@/lib/i18n/pt-br";
import { StatusPill } from "@/components/ui/status-pill";

const KEY = `${BRAND.storageNamespace}.watchlist.v1`;
const defaultSymbols = ["EURUSD", "XAUUSD", "NAS100", "BTCUSD"];

export function WatchlistManager({ items }: { items: MarketWatchItem[] }) {
  const [symbols, setSymbols] = useState<string[]>(defaultSymbols);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) setSymbols(parsed);
      }
    } catch { /* mantém padrão */ }
  }, []);

  function toggle(symbol: string) {
    setSymbols((current) => {
      const next = current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol];
      window.localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }

  const selected = items.filter((item) => symbols.includes(item.symbol));
  return <div className="space-y-5"><section className="panel overflow-hidden"><div className="panel-header"><div><p className="eyebrow">Lista pessoal</p><h2 className="mt-1 text-sm font-semibold">Ativos fixados</h2></div><StatusPill tone="info">{selected.length} ativos</StatusPill></div>{selected.length ? <div className="grid gap-3 p-4 lg:grid-cols-2 2xl:grid-cols-3">{selected.map((item) => <article key={item.symbol} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-100">{item.symbol}</p><p className="mt-1 text-[10px] text-slate-600">{labelMarketType(item.market)}</p></div><button onClick={() => toggle(item.symbol)} className="grid size-8 place-items-center rounded-lg border border-slate-800 text-slate-500 hover:text-red-300" aria-label={`Remover ${item.symbol} da lista`}><PinOff className="size-3.5" /></button></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div><p className="text-[9px] uppercase tracking-wider text-slate-600">Viés</p><p className="mt-1 text-slate-300">{labelBias(item.bias)}</p></div><div><p className="text-[9px] uppercase tracking-wider text-slate-600">Pontuação</p><p className="tabular mt-1 text-slate-300">{item.confluenceScore.value}/{item.confluenceScore.max}</p></div></div><Link href={`/dashboard/analysis?symbol=${encodeURIComponent(item.symbol)}`} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-200">Abrir análise <ArrowRight className="size-3" /></Link></article>)}</div> : <p className="p-5 text-sm text-slate-500">Nenhum ativo fixado. Use a lista abaixo para adicionar ativos.</p>}</section><section className="panel overflow-hidden"><div className="panel-header"><div><p className="eyebrow">Catálogo</p><h2 className="mt-1 text-sm font-semibold">Adicionar à Lista de Observação</h2></div><span className="text-[10px] text-slate-600">Salvo neste navegador em modo demonstração</span></div><div className="divide-y divide-slate-900">{items.map((item) => { const active = symbols.includes(item.symbol); return <div key={item.symbol} className="flex items-center justify-between gap-4 px-4 py-3"><div><p className="text-xs font-semibold text-slate-200">{item.symbol}</p><p className="mt-0.5 text-[10px] text-slate-600">{labelMarketType(item.market)} · {labelBias(item.bias)}</p></div><button onClick={() => toggle(item.symbol)} className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[10px] font-semibold ${active ? "border-sky-400/20 bg-sky-400/[0.05] text-sky-200" : "border-slate-800 text-slate-500 hover:text-slate-200"}`}>{active ? <PinOff className="size-3" /> : <Pin className="size-3" />}{active ? "Fixado" : "Fixar"}</button></div>; })}</div></section></div>;
}
