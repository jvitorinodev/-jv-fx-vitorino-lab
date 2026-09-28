"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Search, ShieldCheck } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { AdminAuditLog } from "@/lib/types/admin";
import { loadDemoAdminLogs } from "@/features/admin/data/demo-admin-store";

function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value)); }
function actionLabel(action: string) { if (action === "USER_ROLE_CHANGED") return "Função de usuário alterada"; if (action === "USER_STATUS_CHANGED") return "Status de usuário alterado"; return action.replaceAll("_", " "); }
function metadataSummary(log: AdminAuditLog) {
  if (log.action === "USER_ROLE_CHANGED") return `${String(log.metadata.oldRole ?? "—")} → ${String(log.metadata.newRole ?? "—")}`;
  if (log.action === "USER_STATUS_CHANGED") return `${String(log.metadata.oldStatus ?? "—")} → ${String(log.metadata.newStatus ?? "—")}${log.metadata.reason ? ` · ${String(log.metadata.reason)}` : ""}`;
  return Object.keys(log.metadata).length ? JSON.stringify(log.metadata) : "Sem metadados adicionais";
}

export function AdminAuditWorkspace({ initialLogs, demo }: { initialLogs: AdminAuditLog[]; demo: boolean }) {
  const [logs, setLogs] = useState(initialLogs);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("ALL");
  useEffect(() => { if (demo) setLogs(loadDemoAdminLogs(initialLogs)); }, [demo, initialLogs]);
  const filtered = useMemo(() => logs.filter((log) => {
    const term = query.trim().toLowerCase();
    const searchable = `${log.actorDisplayName} ${log.actorEmail} ${String(log.metadata.targetEmail ?? "")} ${log.targetId ?? ""} ${log.action}`.toLowerCase();
    return (!term || searchable.includes(term)) && (action === "ALL" || log.action === action);
  }), [logs, query, action]);
  const actions = useMemo(() => [...new Set(logs.map((log) => log.action))], [logs]);

  return <div className="space-y-5"><section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow">Governança</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Logs de Auditoria</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Registro cronológico das mutações administrativas relevantes. Em produção, os eventos são gravados pelas funções protegidas do banco.</p></div>{demo ? <StatusPill tone="warning">DEMONSTRAÇÃO</StatusPill> : <StatusPill tone="positive">REGISTRO ATIVO</StatusPill>}</section><section className="panel p-4"><div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_240px_auto]"><label className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-600"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar ator, usuário ou ação" className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600"/></label><select value={action} onChange={(e) => setAction(e.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-300"><option value="ALL">Todas as ações</option>{actions.map((item) => <option key={item} value={item}>{actionLabel(item)}</option>)}</select><div className="flex items-center justify-end text-xs text-slate-500">{filtered.length} eventos</div></div></section><section className="panel overflow-hidden"><div className="divide-y divide-slate-800/70">{filtered.map((log) => <article key={log.id} className="grid gap-3 p-4 hover:bg-slate-900/25 lg:grid-cols-[190px_minmax(220px,.8fr)_minmax(260px,1.2fr)_minmax(260px,1fr)]"><div><p className="tabular text-xs text-slate-400">{formatDate(log.createdAt)}</p><p className="mt-1 text-[10px] text-slate-700">ID {log.id}</p></div><div><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-violet-300"/><p className="text-sm font-medium text-slate-200">{log.actorDisplayName}</p></div><p className="mt-1 text-xs text-slate-600">{log.actorEmail || "ator do sistema"}</p></div><div><div className="flex items-center gap-2"><Activity className="size-4 text-sky-300"/><p className="text-sm text-slate-200">{actionLabel(log.action)}</p></div><p className="mt-1 text-xs text-slate-500">Alvo: {String(log.metadata.targetEmail ?? log.targetId ?? "—")}</p></div><div><p className="text-xs leading-5 text-slate-400">{metadataSummary(log)}</p></div></article>)}{filtered.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Nenhum evento encontrado.</p> : null}</div></section><p className="text-xs leading-5 text-slate-600">A interface não oferece exclusão de logs. Em produção, a tabela permanece sem política de escrita direta para o cliente; as inserções são feitas pelas rotinas administrativas protegidas.</p></div>;
}
