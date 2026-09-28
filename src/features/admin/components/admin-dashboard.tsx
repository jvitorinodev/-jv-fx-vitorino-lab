"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, ShieldCheck, UserCheck, UserPlus, Users, UserX } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { AdminDashboardData, AdminUser, AdminAuditLog } from "@/lib/types/admin";
import { loadDemoAdminLogs, loadDemoAdminUsers } from "@/features/admin/data/demo-admin-store";

const roleTone = (role: AdminUser["role"]): "accent" | "neutral" | "positive" => role === "ADMIN" ? "accent" : role === "TRADER" ? "positive" : "neutral";

const roleLabel: Record<AdminUser["role"], string> = { FREE: "Gratuito", TRADER: "Trader", ADMIN: "Administrador" };

function formatDate(value: string | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function actionLabel(action: string) {
  if (action === "USER_ROLE_CHANGED") return "Função alterada";
  if (action === "USER_STATUS_CHANGED") return "Status alterado";
  if (action === "USER_APPROVED") return "Acesso aprovado";
  return action.replaceAll("_", " ");
}

function recalculate(users: AdminUser[], logs: AdminAuditLog[], fallback: AdminDashboardData["stats"]) {
  const now = Date.now();
  const within = (value: string | null, days: number) => value ? now - new Date(value).getTime() <= days * 86_400_000 : false;
  return {
    ...fallback,
    totalUsers: users.length,
    activeUsers30d: users.filter((user) => user.status === "ACTIVE" && within(user.lastSignInAt, 30)).length,
    newUsers30d: users.filter((user) => within(user.createdAt, 30)).length,
    pendingUsers: users.filter((user) => user.status === "PENDING").length,
    suspendedUsers: users.filter((user) => user.status === "SUSPENDED").length,
    adminUsers: users.filter((user) => user.role === "ADMIN").length,
    auditEvents24h: logs.filter((log) => within(log.createdAt, 1)).length,
  };
}

export function AdminDashboard({ data, demo }: { data: AdminDashboardData; demo: boolean }) {
  const [users, setUsers] = useState(data.users);
  const [logs, setLogs] = useState(data.logs);

  useEffect(() => {
    if (!demo) return;
    setUsers(loadDemoAdminUsers(data.users));
    setLogs(loadDemoAdminLogs(data.logs));
  }, [demo, data.users, data.logs]);

  const stats = useMemo(() => recalculate(users, logs, data.stats), [users, logs, data.stats]);
  const roleCounts = useMemo(() => ({
    ADMIN: users.filter((u) => u.role === "ADMIN").length,
    TRADER: users.filter((u) => u.role === "TRADER").length,
    FREE: users.filter((u) => u.role === "FREE").length,
  }), [users]);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="eyebrow">Governança</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Central Administrativa</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Visão executiva de usuários, atividade, funções, status e eventos administrativos do JV FX · Vitorino LAB.</p></div>
        {demo ? <StatusPill tone="warning">DADOS DEMONSTRATIVOS</StatusPill> : <StatusPill tone="positive">PRODUÇÃO</StatusPill>}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <AdminMetric icon={Users} label="Usuários" value={stats.totalUsers} sub="Total cadastrado" />
        <AdminMetric icon={UserCheck} label="Ativos 30d" value={stats.activeUsers30d} sub="Com acesso recente" />
        <AdminMetric icon={UserPlus} label="Novos 30d" value={stats.newUsers30d} sub="Cadastros recentes" />
        <AdminMetric icon={Clock3} label="Pendentes" value={stats.pendingUsers} sub="Aguardando aprovação" />
        <AdminMetric icon={UserX} label="Suspensos" value={stats.suspendedUsers} sub="Acesso bloqueado" />
        <AdminMetric icon={ShieldCheck} label="Administradores" value={stats.adminUsers} sub="Controle total" />
        <AdminMetric icon={Activity} label="Auditoria 24h" value={stats.auditEvents24h} sub="Eventos registrados" />
      </section>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
        <section className="panel overflow-hidden">
          <div className="panel-header"><div><p className="eyebrow">Base de usuários</p><h2 className="mt-1 text-sm font-semibold">Distribuição por função</h2></div><Users className="size-4 text-slate-600" /></div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {(["ADMIN", "TRADER", "FREE"] as const).map((role) => {
              const count = roleCounts[role];
              const pct = users.length ? Math.round((count / users.length) * 100) : 0;
              return <div key={role} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4"><div className="flex items-center justify-between"><StatusPill tone={roleTone(role)}>{roleLabel[role]}</StatusPill><span className="tabular text-xl font-semibold">{count}</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-slate-500" style={{ width: `${pct}%` }} /></div><p className="mt-2 text-[11px] text-slate-500">{pct}% da base atual</p></div>;
            })}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-header"><div><p className="eyebrow">Atividade administrativa</p><h2 className="mt-1 text-sm font-semibold">Eventos recentes</h2></div><Activity className="size-4 text-slate-600" /></div>
          <div className="divide-y divide-slate-800/80">
            {logs.slice(0, 6).map((log) => <div key={log.id} className="px-4 py-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-200">{actionLabel(log.action)}</p><span className="text-[10px] text-slate-600">{formatDate(log.createdAt)}</span></div><p className="mt-1 truncate text-xs text-slate-500">{log.actorDisplayName} · {String(log.metadata.targetEmail ?? log.targetId ?? "registro")}</p></div>)}
            {logs.length === 0 ? <p className="p-5 text-sm text-slate-500">Nenhum evento administrativo registrado.</p> : null}
          </div>
        </section>
      </div>

      <section className="panel overflow-hidden">
        <div className="panel-header"><div><p className="eyebrow">Usuários recentes</p><h2 className="mt-1 text-sm font-semibold">Últimos cadastros</h2></div></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase tracking-[.14em] text-slate-600"><tr><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Função</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Último acesso</th><th className="px-4 py-3">Cadastro</th></tr></thead><tbody className="divide-y divide-slate-800/70">{[...users].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,7).map((user) => <tr key={user.id} className="hover:bg-slate-900/35"><td className="px-4 py-3"><p className="font-medium text-slate-200">{user.displayName}</p><p className="mt-0.5 text-xs text-slate-600">{user.email}</p></td><td className="px-4 py-3"><StatusPill tone={roleTone(user.role)}>{roleLabel[user.role]}</StatusPill></td><td className="px-4 py-3"><StatusPill tone={user.status === "ACTIVE" ? "positive" : user.status === "PENDING" ? "warning" : "negative"}>{user.status === "ACTIVE" ? "ATIVO" : user.status === "PENDING" ? "PENDENTE" : "SUSPENSO"}</StatusPill></td><td className="px-4 py-3 text-xs text-slate-400">{formatDate(user.lastSignInAt)}</td><td className="px-4 py-3 text-xs text-slate-400">{formatDate(user.createdAt)}</td></tr>)}</tbody></table>
        </div>
      </section>
    </div>
  );
}

function AdminMetric({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number; sub: string }) {
  return <div className="panel p-4"><div className="flex items-center justify-between"><p className="eyebrow">{label}</p><Icon className="size-4 text-slate-600" /></div><p className="tabular mt-3 text-2xl font-semibold">{value}</p><p className="mt-1 text-[11px] text-slate-600">{sub}</p></div>;
}
