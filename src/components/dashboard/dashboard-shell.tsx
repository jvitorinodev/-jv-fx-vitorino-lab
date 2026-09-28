"use client";

import { useEffect, useState } from "react";
import type { Actor } from "@/lib/auth/guards";
import type { TradingAccount } from "@/lib/types/trading";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import type { ThemeMode } from "@/components/layout/theme-toggle";

const THEME_STORAGE_KEY = "jvfx-theme-mode";

export function DashboardShell({
  actor,
  accounts,
  selectedAccountId,
  children,
}: {
  actor: Actor;
  accounts: TradingAccount[];
  selectedAccountId: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <div className={`${theme === "dark" ? "app-dark bg-slate-950" : "app-light bg-slate-50"} min-h-screen lg:flex`}>
      <AppSidebar actor={actor} permissions={actor.permissions} collapsed={collapsed} mobileOpen={mobileOpen} onToggleCollapse={() => setCollapsed((value) => !value)} onCloseMobile={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <TopBar actor={actor} accounts={accounts} selectedAccountId={selectedAccountId} onOpenMobile={() => setMobileOpen(true)} theme={theme} onToggleTheme={() => setTheme((value) => (value === "dark" ? "light" : "dark"))} />
        <main className="mx-auto w-full max-w-[1900px] p-3 sm:p-4 lg:p-5">{children}</main>
      </div>
    </div>
  );
}
