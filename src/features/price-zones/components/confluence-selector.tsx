"use client";

import { CONFLUENCE_CATALOG, CONFLUENCE_CATEGORIES, selectionFromKeys, toggleConfluenceKey } from "@/lib/core/confluence-service";
import { labelConfluenceCategory } from "@/lib/i18n/pt-br";
import type { ConfluenceSelection, ConfluenceWeightMap } from "@/lib/types/price-zones";

export function ConfluenceSelector({
  selected,
  weights,
  timeframe,
  onChange,
}: {
  selected: ConfluenceSelection[];
  weights: ConfluenceWeightMap;
  timeframe: string;
  onChange: (next: ConfluenceSelection[]) => void;
}) {
  const selectedKeys = new Set(selected.map((item) => item.key));

  function toggle(key: string) {
    const nextKeys = toggleConfluenceKey([...selectedKeys], key);
    onChange(selectionFromKeys(nextKeys, weights, timeframe));
  }

  return (
    <div className="space-y-4">
      {CONFLUENCE_CATEGORIES.map((category) => {
        const items = CONFLUENCE_CATALOG.filter((item) => item.category === category);
        if (!items.length) return null;
        return (
          <section key={category}>
            <div className="mb-2 flex items-center justify-between">
              <p className="eyebrow">{labelConfluenceCategory(category)}</p>
              <span className="text-[10px] text-slate-600">{items.filter((item) => selectedKeys.has(item.key)).length}/{items.length}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const active = selectedKeys.has(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    title={item.description}
                    onClick={() => toggle(item.key)}
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs transition ${active ? "border-sky-400/30 bg-sky-400/[0.06] text-sky-100" : "border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-700"}`}
                  >
                    <span>{item.label}</span>
                    <span className="tabular shrink-0 text-[10px] text-slate-500">+{weights[item.key] ?? item.defaultWeight}</span>
                  </button>
                );
              })}
            </div>
            {category === "FIBONACCI" ? <p className="mt-2 text-[10px] leading-4 text-slate-600">Use uma leitura de retração por swing. Ao escolher outro nível Fibonacci, o anterior é substituído para evitar dupla pontuação do mesmo movimento.</p> : null}
            {category === "MOMENTUM" ? <p className="mt-2 text-[10px] leading-4 text-slate-600">Selecione apenas a divergência RSI observada na leitura atual; divergências conflitantes são substituídas automaticamente.</p> : null}
          </section>
        );
      })}
    </div>
  );
}
