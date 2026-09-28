"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check, Database, Download, RefreshCw, Search, Server, TriangleAlert } from "lucide-react";
import { importMt5TradeAction } from "@/features/journal/actions/trade-actions";
import { loadDemoTrades, upsertDemoTrade } from "@/features/journal/data/demo-trade-store";
import type { TradingAccount } from "@/lib/types/trading";
import type { Mt5HistoryPayload } from "@/lib/types/market-terminal";
import { StatusPill } from "@/components/ui/status-pill";
import { formatters, labelDirection } from "@/lib/i18n/pt-br";
import { HISTORY_WINDOWS } from "@/config/history-windows";

const fieldClass = "h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-slate-400";

export function Mt5HistoryImporter({
  history,
  importedPositionIds,
  accounts,
  defaultAccountId,
  days,
  demoMode,
  providerMode,
  loadError,
}: {
  history: Mt5HistoryPayload | null;
  importedPositionIds: string[];
  accounts: TradingAccount[];
  defaultAccountId: string;
  days: number;
  demoMode: boolean;
  providerMode: "demo" | "mt5" | "exness";
  loadError?: string;
}) {
  const suggestedAccountId = history?.accountLogin
    ? accounts.find((item) => item.brokerAccountLogin === history.accountLogin)?.id ?? defaultAccountId ?? accounts[0]?.id ?? ""
    : defaultAccountId || accounts[0]?.id || "";
  const [accountId, setAccountId] = useState(suggestedAccountId);
  const [query, setQuery] = useState("");
  const [ticketInput, setTicketInput] = useState("");
  const [imported, setImported] = useState(() => new Set(importedPositionIds));
  const [busyTicket, setBusyTicket] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (suggestedAccountId && accountId !== suggestedAccountId && !accounts.some((item) => item.id === accountId)) {
      setAccountId(suggestedAccountId);
    }
    if (!demoMode) return;
    const local = loadDemoTrades();
    const ids = local.map((trade) => trade.brokerPositionId).filter((value): value is string => Boolean(value));
    if (!ids.length) return;
    setImported((current) => new Set([...current, ...ids]));
  }, [accountId, accounts, demoMode, suggestedAccountId]);

  const trades = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = history?.trades ?? [];
    if (!normalized) return source;
    return source.filter((trade) => `${trade.positionId} ${trade.symbol} ${trade.brokerSymbol} ${trade.comment}`.toLowerCase().includes(normalized));
  }, [history, query]);

  const providerLabel = history?.provider === "MT5_BRIDGE"
    ? "MT5 Bridge"
    : history?.provider === "DEMO" || providerMode === "demo"
      ? "Demonstração"
      : providerMode === "mt5"
        ? "MT5 indisponível"
        : "Exness indisponível";

  function importTicket(positionId: string) {
    if (!accountId) {
      setMessage({ tone: "error", text: "Selecione uma conta de destino do JV FX." });
      return;
    }
    setBusyTicket(positionId);
    setMessage(null);
    startTransition(async () => {
      const result = await importMt5TradeAction({ accountId, positionId });
      setBusyTicket(null);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      if (demoMode) upsertDemoTrade(result.trade);
      setImported((current) => new Set([...current, positionId]));
      setMessage({ tone: "success", text: result.message });
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/dashboard" className="mb-3 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" />Visão geral</Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Histórico Exness / MT5</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Área de conferência e importação manual. Para sincronizar o histórico em lote, use o painel de sincronização da Visão geral.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {HISTORY_WINDOWS.map((item) => <Link key={item.value} href={`/dashboard/journal/import-mt5?days=${item.value}`} className={`rounded-lg border px-3 py-2 text-xs ${days === item.value ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{item.label}</Link>)}
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="panel p-4"><p className="eyebrow">Provedor</p><div className="mt-2 flex items-center gap-2"><Server className="size-4 text-blue-600" /><p className="text-sm font-semibold text-slate-900">{providerLabel}</p></div></div>
        <div className="panel p-4"><p className="eyebrow">Conta MT5</p><p className="tabular mt-2 text-sm font-semibold text-slate-900">{history?.accountLogin ?? "—"}</p><p className="mt-1 text-[10px] text-slate-400">Moeda: {history?.currency ?? "—"}</p></div>
        <div className="panel p-4"><p className="eyebrow">Operações encontradas</p><p className="tabular mt-2 text-xl font-semibold text-slate-950">{history?.total ?? history?.trades.length ?? 0}</p><p className="mt-1 text-[10px] text-slate-400">Janela: {days} dias</p></div>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header gap-3">
          <div><p className="eyebrow">Destino</p><h2 className="mt-1 text-sm font-semibold text-slate-900">Conta do JV FX</h2></div>
          <select className={fieldClass} value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-label="Conta de destino">
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.broker}</option>)}
          </select>
        </div>
        <div className="grid gap-3 border-t border-slate-200 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.65fr)] lg:items-end">
          <p className="text-xs leading-5 text-slate-500">A importação preserva o P&amp;L realizado pelo MT5. Quando o histórico não permite reconstruir com segurança o risco original, <strong className="font-medium text-slate-700">Risco e R realizado permanecem indisponíveis</strong>, em vez de receber valores estimados.</p>
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Importar ticket específico</p>
            <div className="flex gap-2"><input className={`${fieldClass} min-w-0 flex-1`} inputMode="numeric" value={ticketInput} onChange={(event) => setTicketInput(event.target.value.replace(/\D/g, ""))} placeholder="position_id / ticket" /><button type="button" disabled={!ticketInput || isPending || !accountId} onClick={() => importTicket(ticketInput)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[11px] font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><Download className="size-3" />Importar</button></div>
          </div>
        </div>
      </section>

      {loadError ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><div><p className="font-medium">Histórico indisponível</p><p className="mt-1 text-xs leading-5 text-amber-700">{loadError}</p><p className="mt-2 text-[10px] text-amber-600">No modo MT5, confirme que o MetaTrader 5 e o Bridge Python estão em execução.</p></div></div></div> : null}
      {message ? <div className={`rounded-xl border p-3 text-xs ${message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{message.text}</div> : null}

      <section className="panel overflow-hidden">
        <div className="panel-header gap-3">
          <div><p className="eyebrow">Histórico da corretora</p><h2 className="mt-1 text-sm font-semibold text-slate-900">Posições fechadas</h2></div>
          <label className="relative min-w-[260px]"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><input className={`${fieldClass} w-full pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ticket ou ativo…" /></label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-left text-xs">
            <thead className="border-y border-slate-200 bg-slate-50 text-[9px] uppercase tracking-[0.15em] text-slate-400"><tr><th className="px-4 py-3">Ticket</th><th className="px-3 py-3">Ativo</th><th className="px-3 py-3">Direção</th><th className="px-3 py-3">Lote</th><th className="px-3 py-3">Entrada</th><th className="px-3 py-3">Saída</th><th className="px-3 py-3">SL / TP</th><th className="px-3 py-3">P&amp;L líquido</th><th className="px-3 py-3">Fechamento</th><th className="px-4 py-3 text-right">Importação</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {trades.map((trade) => {
                const done = imported.has(trade.positionId);
                const busy = isPending && busyTicket === trade.positionId;
                return <tr key={trade.positionId} className="text-slate-600 transition hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="tabular font-medium text-slate-900">#{trade.positionId}</p><p className="mt-0.5 text-[10px] text-slate-400">{trade.entryDealId ? `Deal ${trade.entryDealId}` : "MT5"}</p></td>
                  <td className="px-3 py-3"><p className="font-medium text-slate-800">{trade.symbol}</p><p className="text-[10px] text-slate-400">{trade.brokerSymbol}</p></td>
                  <td className={`px-3 py-3 font-medium ${trade.direction === "LONG" ? "text-emerald-700" : "text-red-600"}`}>{labelDirection(trade.direction)}</td>
                  <td className="tabular px-3 py-3">{trade.volume.toFixed(2)}</td>
                  <td className="tabular px-3 py-3">{formatPrice(trade.entryPrice)}</td>
                  <td className="tabular px-3 py-3">{formatPrice(trade.exitPrice)}</td>
                  <td className="tabular px-3 py-3 text-slate-400">{trade.stopLoss == null ? "SL —" : `SL ${formatPrice(trade.stopLoss)}`}<br />{trade.takeProfit == null ? "TP —" : `TP ${formatPrice(trade.takeProfit)}`}</td>
                  <td className={`tabular px-3 py-3 font-medium ${trade.netPnl > 0 ? "text-emerald-700" : trade.netPnl < 0 ? "text-red-600" : "text-slate-500"}`}>{formatters.usd.format(trade.netPnl)}</td>
                  <td className="tabular px-3 py-3 text-slate-500">{new Date(trade.closedAt * 1000).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right">
                    {!trade.supported ? <StatusPill tone="warning">Ativo não mapeado</StatusPill> : done ? <StatusPill tone="positive"><Check className="mr-1 size-3" />Importado</StatusPill> : <button type="button" disabled={busy || !accountId} onClick={() => importTicket(trade.positionId)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <RefreshCw className="size-3 animate-spin" /> : <Download className="size-3" />}{busy ? "Importando…" : "Importar"}</button>}
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
          {!trades.length && !loadError ? <div className="p-10 text-center text-sm text-slate-400"><Database className="mx-auto mb-3 size-5 text-slate-300" />Nenhuma operação fechada encontrada nessa janela.</div> : null}
        </div>
      </section>
    </div>
  );
}

function formatPrice(value: number) {
  return value >= 1000 ? value.toFixed(2) : value >= 10 ? value.toFixed(3) : value.toFixed(5);
}
