"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Cable,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  LayoutDashboard,
  Calculator,
  ShieldCheck,
  Users,
  Activity,
  X,
} from "lucide-react";
import { hasPermission, PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import type { Actor } from "@/lib/auth/guards";
import { BrandIdentity, BrandMark } from "@/components/brand/brand-identity";

const sections = [
  {
    label: "PRINCIPAL",
    items: [
      { label: "Visão geral", href: "/dashboard", icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW },
      { label: "Operações", href: "/dashboard/journal", icon: ClipboardList, permission: PERMISSIONS.JOURNAL_VIEW },
      { label: "Calendário", href: "/dashboard/calendar", icon: CalendarDays, permission: PERMISSIONS.REPORTS_VIEW },
      { label: "Calculadora de lote", href: "/dashboard/position-size", icon: Calculator, permission: PERMISSIONS.DASHBOARD_VIEW },
      { label: "Sincronização Exness / MT5", href: "/dashboard/journal/import-mt5", icon: Download, permission: PERMISSIONS.JOURNAL_VIEW },
      { label: "Integrações", href: "/dashboard/integrations", icon: Cable, permission: PERMISSIONS.DASHBOARD_VIEW },
    ],
  },
  {
    label: "ANÁLISE DE DESEMPENHO",
    items: [
      { label: "Relatórios", href: "/dashboard/reports", icon: BookOpen, permission: PERMISSIONS.REPORTS_VIEW },
      { label: "Desempenho", href: "/dashboard/performance", icon: BarChart3, permission: PERMISSIONS.PERFORMANCE_VIEW },
    ],
  },
  {
    label: "ADMINISTRAÇÃO",
    items: [
      { label: "Painel administrativo", href: "/dashboard/admin", icon: ShieldCheck, permission: PERMISSIONS.ADMIN_ACCESS },
      { label: "Usuários", href: "/dashboard/admin/users", icon: Users, permission: PERMISSIONS.ADMIN_USERS },
      { label: "Auditoria", href: "/dashboard/admin/audit", icon: Activity, permission: PERMISSIONS.ADMIN_AUDIT },
    ],
  },
] as const;

function SidebarAvatar({ label }: { label: string }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0f2742] text-base font-black text-[#36E6D5] shadow-[0_8px_18px_rgba(15,39,66,0.22)]">
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function AppSidebar({
  actor,
  permissions,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: {
  actor: Actor;
  permissions: readonly Permission[];
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen ? <button aria-label="Fechar menu" className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px] lg:hidden" onClick={onCloseMobile} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:sticky lg:top-0 lg:h-screen ${collapsed ? "lg:w-[88px]" : "lg:w-[272px]"} ${mobileOpen ? "w-[272px] translate-x-0" : "w-[272px] -translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-4">
          <Link href="/dashboard" className="min-w-0" onClick={onCloseMobile} aria-label="Ir para a visão geral">
            <div className="hidden lg:block">{collapsed ? <BrandMark compact /> : <BrandIdentity compact />}</div>
            <div className="lg:hidden"><BrandIdentity compact /></div>
          </Link>
          <button className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden" onClick={onCloseMobile} aria-label="Fechar menu lateral"><X className="size-4" /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegação principal">
          <div className="space-y-5">
            {sections.map((section) => {
              const items = section.items.filter((item) => hasPermission(permissions, item.permission));
              if (!items.length) return null;
              return (
                <section key={section.label}>
                  {!collapsed ? <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">{section.label}</p> : <div className="mb-2 border-t border-slate-200" />}
                  <div className="space-y-1">
                    {items.map((item) => {
                      const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                      const Icon = item.icon;
                      return (
                        <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} onClick={onCloseMobile} className={`group flex min-h-10 items-center gap-3 rounded-xl px-2.5 text-sm transition ${active ? "bg-slate-100 font-semibold text-slate-950" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>
                          <Icon className={`size-4 shrink-0 ${active ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700"}`} aria-hidden="true" />
                          {!collapsed ? <span className="hidden truncate lg:block">{item.label}</span> : null}
                          <span className="truncate lg:hidden">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </nav>

        {!collapsed ? (
          <div className="border-t border-slate-200 px-4 py-3 text-[10px] leading-4 text-slate-400">
            <p className="font-medium text-slate-600">JV FX · Performance Journal</p>
            <p>Exness / MT5 preparado para sincronização.</p>
          </div>
        ) : null}

        <div className="border-t border-slate-200 p-3">
          <div className={`flex items-center ${collapsed ? "justify-center gap-0" : "justify-between gap-3"}`}>
            <div className={`flex min-w-0 items-center gap-3 ${collapsed ? "hidden lg:flex" : "flex"}`}>
              <SidebarAvatar label={actor.displayName} />
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900">{actor.displayName}</p>
                  <p className="truncate text-[10px] uppercase tracking-[0.14em] text-slate-400">{actor.role}</p>
                </div>
              ) : null}
            </div>
            <button onClick={onToggleCollapse} className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-800" aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}>
              {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
