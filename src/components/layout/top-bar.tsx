"use client";

import Link from "next/link";
import { ChevronDown, Download, LogOut, Menu, ShieldCheck } from "lucide-react";
import type { Actor } from "@/lib/auth/guards";
import type { TradingAccount } from "@/lib/types/trading";
import { signOut } from "@/app/login/actions";
import { TradingAccountSelector } from "@/components/dashboard/trading-account-selector";
import { ThemeToggle, type ThemeMode } from "@/components/layout/theme-toggle";
import { Mt5LiveJournalSync } from "@/features/sync/components/mt5-live-journal-sync";

function UserAvatar({ label }: { label: string }) {
  return (
    <span className="grid size-9 place-items-center rounded-full bg-[#0f2742] text-base font-black text-[#36E6D5] shadow-[0_8px_18px_rgba(15,39,66,0.24)]">
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function TopBar({
  actor,
  accounts,
  selectedAccountId,
  onOpenMobile,
  theme,
  onToggleTheme,
}: {
  actor: Actor;
  accounts: TradingAccount[];
  selectedAccountId: string;
  onOpenMobile: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur-xl sm:px-4 lg:px-5">
      <button onClick={onOpenMobile} className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 lg:hidden" aria-label="Abrir menu"><Menu className="size-4" /></button>
      <div className="hidden min-w-0 md:block">
        <p className="text-xs font-semibold text-slate-900">Painel de desempenho</p>
        <p className="text-[10px] text-slate-400">Journal · Exness / MT5 · Performance</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Mt5LiveJournalSync />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <TradingAccountSelector accounts={accounts} selectedAccountId={selectedAccountId} />
        <Link href="/dashboard/journal/import-mt5" className="hidden h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 xl:inline-flex"><Download className="size-3.5" />Sincronizar MT5</Link>

        <details className="group relative">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50 [&::-webkit-details-marker]:hidden" aria-label={`Abrir menu da conta de ${actor.displayName}`}>
            <UserAvatar label={actor.displayName} />
            <span className="hidden max-w-[130px] truncate text-xs font-semibold text-slate-700 sm:block">{actor.displayName}</span>
            <ChevronDown className="size-3.5 text-slate-400 transition group-open:rotate-180" />
          </summary>

          <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
            <div className="border-b border-slate-100 p-4">
              <div className="flex items-start gap-3">
                <UserAvatar label={actor.displayName} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{actor.displayName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{actor.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-600"><ShieldCheck className="size-3" />{actor.role}</span>
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">{actor.status}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-2">
              <form action={signOut}>
                <button type="submit" className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50" title="Sair da conta">
                  <LogOut className="size-4" />
                  Sair da conta
                </button>
              </form>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
