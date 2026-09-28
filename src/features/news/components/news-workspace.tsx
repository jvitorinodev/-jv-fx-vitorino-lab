"use client";

import { useState } from "react";
import { Newspaper } from "lucide-react";
import { TERMINAL_SYMBOLS } from "@/features/market-terminal/data/demo-terminal";
import { NewsIntelligencePanel } from "@/features/news/components/news-intelligence-panel";

export function NewsWorkspace() {
  const [symbol, setSymbol] = useState("XAUUSD");
  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl border border-slate-800 bg-slate-950"><Newspaper className="size-4 text-sky-300" /></div><div><p className="eyebrow">Contexto fundamental</p><h1 className="mt-1 text-xl font-semibold">Notícias & Calendário Econômico</h1><p className="mt-1 text-xs text-slate-500">Forex Factory como agenda principal; Investing.com como validação secundária.</p></div></div>
          <label className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Ativo<select value={symbol} onChange={(event) => setSymbol(event.target.value)} className="ml-2 h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs font-semibold normal-case tracking-normal text-slate-200">{TERMINAL_SYMBOLS.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol} · {item.label}</option>)}</select></label>
        </div>
      </section>
      <div className="mx-auto max-w-5xl"><NewsIntelligencePanel symbol={symbol} full /></div>
    </div>
  );
}
