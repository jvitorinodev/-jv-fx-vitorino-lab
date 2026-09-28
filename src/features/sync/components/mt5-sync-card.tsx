"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, Link2, RefreshCw, Server, Unplug } from "lucide-react";
import { syncMt5HistoryAction } from "@/features/sync/actions/mt5-sync-actions";
import { loadDemoSyncStates, saveDemoSyncState } from "@/features/sync/data/demo-sync-store";
import type { BrokerSyncOverview, BrokerSyncState, BrokerSyncStatus } from "@/lib/types/broker-sync";
import type { TradeRecord } from "@/lib/types/journal";
import type { TradingAccount } from "@/lib/types/trading";
import { formatters } from "@/lib/i18n/pt-br";
import { DEFAULT_HISTORY_WINDOW_DAYS, HISTORY_WINDOWS } from "@/config/history-windows";
import { isMt5CompatibleWithTradingAccount } from "@/features/accounts/lib/mt5-account-kind";

const WINDOWS = HISTORY_WINDOWS;

export function Mt5SyncCard({
  accounts,
  overview,
  demoMode,
  onDemoTradesImported,
}: {
  accounts: TradingAccount[];
  overview: BrokerSyncOverview;
  demoMode: boolean;
  onDemoTradesImported?: (trades: TradeRecord[]) => void;
}) {
  const router = useRouter();
  const suggestedAccountId = overview.terminalAccount
    ? accounts.find((item) => item.brokerAccountLogin === overview.terminalAccount?.login)?.id
      ?? accounts.find((item) => isMt5CompatibleWithTradingAccount(item.type, overview.terminalAccount?.server))?.id
      ?? accounts.find((item) => item.isPrimary)?.id
      ?? accounts[0]?.id
      ?? ""
    : accounts.find((item) => item.isPrimary)?.id ?? accounts[0]?.id ?? "";
  const [accountId, setAccountId] = useState(suggestedAccountId);
  const [days, setDays] = useState(DEFAULT_HISTORY_WINDOW_DAYS);
  const [states, setStates] = useState<BrokerSyncState[]>(overview.states);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (suggestedAccountId && !accounts.some((item) => item.id === accountId)) {
      setAccountId(suggestedAccountId);
    }
    if (!demoMode) {
      setStates(overview.states);
      return;
    }
    const local = loadDemoSyncStates();
    if (local.length) setStates(local);
  }, [accountId, accounts, demoMode, overview.states, suggestedAccountId]);

  const state = useMemo(() => states.find((item) => item.accountId === accountId) ?? null, [accountId, states]);
  const selectedAccount = useMemo(() => accounts.find((item) => item.id === accountId) ?? null, [accountId, accounts]);
  const connected = overview.feed.connected;
  const accountCompatible = !overview.terminalAccount || !selectedAccount || isMt5CompatibleWithTradingAccount(selectedAccount.type, overview.terminalAccount.server);
  const syncAvailable = (demoMode || (overview.feed.provider === "MT5_BRIDGE" && connected)) && accountCompatible;

  function syncNow() {
    if (!accountId) {
      setMessage({ tone: "error", text: "Crie ou selecione uma conta do JV FX antes de sincronizar." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await syncMt5HistoryAction({ accountId, days });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }

      const nextState: BrokerSyncState = {
        id: state?.id ?? `sync-${accountId}`,
        accountId,
        provider: "MT5",
        brokerAccountLogin: result.brokerAccountLogin,
        status: result.status,
        lastStartedAt: new Date().toISOString(),
        lastCompletedAt: result.lastCompletedAt,
        importedCount: result.imported,
        skippedCount: result.skipped,
        failedCount: result.failed,
        errorMessage: result.failed ? `${result.failed} operação(ões) falharam.` : null,
        sourceWindowDays: days,
        updatedAt: result.lastCompletedAt,
      };
      setStates((current) => [nextState, ...current.filter((item) => item.accountId !== accountId)]);

      if (demoMode) {
        saveDemoSyncState(nextState);
        if (result.demoTrades?.length) onDemoTradesImported?.(result.demoTrades);
      }

      setMessage({ tone: "success", text: result.message });
      router.refresh();
    });
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-0.5 rounded-lg p-2 ${connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {connected ? <Link2 className="size-4" /> : <Unplug className="size-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Sincronização Exness / MT5</h2>
              <SyncBadge status={state?.status ?? (connected ? "NEVER" : "ERROR")} connected={connected} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {connected
                ? overview.terminalAccount
                  ? `MT5 ${overview.terminalAccount.login} · ${overview.terminalAccount.server || overview.terminalAccount.broker}`
                  : overview.feed.detail
                : overview.feed.detail}
            </p>
            {state?.lastCompletedAt ? <p className="mt-1 text-[10px] text-slate-400">Última sincronização: {formatDateTime(state.lastCompletedAt)} · {state.importedCount} novas · {state.skippedCount} já existentes</p> : <p className="mt-1 text-[10px] text-slate-400">Nenhuma sincronização concluída para esta conta.</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-9 min-w-[190px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400" aria-label="Conta do JV FX">
            {accounts.length ? accounts.map((account) => {
              const incompatible = Boolean(overview.terminalAccount) && !isMt5CompatibleWithTradingAccount(account.type, overview.terminalAccount?.server);
              return <option key={account.id} value={account.id} disabled={incompatible}>{account.name}{incompatible ? " · incompatível com MT5 atual" : ""}</option>;
            }) : <option value="">Nenhuma conta</option>}
          </select>
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400" aria-label="Janela de sincronização">
            {WINDOWS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button type="button" onClick={syncNow} disabled={isPending || !accountId || !syncAvailable} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Sincronizando…" : !accountCompatible ? "Conta incompatível" : syncAvailable ? "Sincronizar agora" : "Configure o MT5"}
          </button>
        </div>
      </div>

      {overview.terminalAccount ? (
        <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          <SyncMetric label="Saldo MT5" value={formatCurrency(overview.terminalAccount.balance, overview.terminalAccount.currency)} />
          <SyncMetric label="Equity MT5" value={formatCurrency(overview.terminalAccount.equity, overview.terminalAccount.currency)} />
          <SyncMetric label="Margem livre" value={formatCurrency(overview.terminalAccount.freeMargin, overview.terminalAccount.currency)} />
          <SyncMetric label="Alavancagem" value={`1:${overview.terminalAccount.leverage}`} />
        </div>
      ) : null}

      {message ? <div className={`border-t px-4 py-3 text-xs ${message.tone === "success" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-red-100 bg-red-50 text-red-700"}`}>{message.text}</div> : null}
    </section>
  );
}

function SyncBadge({ status, connected }: { status: BrokerSyncStatus; connected: boolean }) {
  if (!connected) return <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500"><Server className="size-3" />Desconectado</span>;
  if (status === "ERROR") return <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-red-600"><CircleAlert className="size-3" />Erro</span>;
  if (status === "PARTIAL") return <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-amber-700"><CircleAlert className="size-3" />Parcial</span>;
  if (status === "SUCCESS") return <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-700"><CheckCircle2 className="size-3" />Sincronizado</span>;
  if (status === "RUNNING") return <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-blue-700"><RefreshCw className="size-3 animate-spin" />Sincronizando</span>;
  return <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-blue-700"><Server className="size-3" />Conectado</span>;
}

function SyncMetric({ label, value }: { label: string; value: string }) {
  return <div className="bg-white px-4 py-3"><p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p><p className="tabular mt-1 text-sm font-semibold text-slate-800">{value}</p></div>;
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return formatters.usd.format(value);
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
