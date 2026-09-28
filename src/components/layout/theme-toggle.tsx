"use client";

import { MonitorCog, MoonStar, SunMedium } from "lucide-react";

export type ThemeMode = "light" | "dark";

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: ThemeMode;
  onToggle: () => void;
}) {
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={dark ? "Tema escuro ativo" : "Tema claro ativo"}
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
    >
      <span className="grid size-5 place-items-center rounded-full bg-slate-100 text-slate-700">
        {dark ? <MoonStar className="size-3.5" /> : <SunMedium className="size-3.5" />}
      </span>
      <span className="hidden sm:inline">{dark ? "Modo escuro" : "Modo claro"}</span>
      <MonitorCog className="hidden size-3.5 opacity-60 lg:block" />
    </button>
  );
}
