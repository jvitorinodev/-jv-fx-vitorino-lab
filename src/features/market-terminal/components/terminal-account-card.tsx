"use client";

import { useEffect, useState } from "react";
import { Landmark, RefreshCw } from "lucide-react";
import type { TerminalAccountSnapshot } from "@/lib/types/market-terminal";
import { StatusPill } from "@/components/ui/status-pill";

export function TerminalAccountCard() {
  const [account, setAccount] = useState<TerminalAccountSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/market/account", { cache: "no-store" });
      const payload = await response.json() as { account?: TerminalAccountSnapshot | null; error?: string };
      if (!response.ok) throw new Error(payload.error || "Falha ao consultar conta MT5.");
      setAccount(payload.account ?? null);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao consultar conta MT5.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2"><Landmark className="size-4 text-sky-300" /><div><p className="eyebrow">Conta de mercado</p><h2 className="text-sm font-semibold">Exness / MT5</h2></div></div>
        <button type="button" onClick={() => void load()} className="action" aria-label="Atualizar conta"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
      <div className="p-4">
        {error ? <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-xs text-red-300">{error}</div> : account ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-slate-200">{account.broker}</p><p className="mt-0.5 text-[10px] text-slate-600">Servidor {account.server || "MT5"} · conta •••{account.login.slice(-4)}</p></div><StatusPill tone="positive">CONECTADA</StatusPill></div>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Saldo" value={money(account.balance, account.currency)} />
              <Metric label="Equity" value={money(account.equity, account.currency)} />
              <Metric label="Margem livre" value={money(account.freeMargin, account.currency)} />
              <Metric label="P&L aberto" value={money(account.profit, account.currency)} tone={account.profit >= 0 ? "positive" : "negative"} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-600"><span>Alavancagem 1:{account.leverage}</span><span>Nível de margem {account.marginLevel == null ? "—" : `${account.marginLevel.toFixed(1)}%`}</span><span>Fonte REALTIME</span></div>
          </div>
        ) : (
          <div className="space-y-2 text-xs text-slate-500"><div className="flex items-center gap-2"><StatusPill tone="warning">MODO DEMO</StatusPill><span>Nenhuma conta MT5 real conectada.</span></div><p className="text-[10px] leading-relaxed text-slate-600">Defina MARKET_DATA_PROVIDER=mt5 e execute o bridge local para carregar saldo, equity e cotações da conta conectada no MetaTrader 5.</p></div>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  const className = tone === "positive" ? "text-emerald-300" : tone === "negative" ? "text-red-300" : "text-slate-200";
  return <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-2.5"><p className="text-[9px] uppercase tracking-[0.12em] text-slate-600">{label}</p><p className={`mt-1 text-sm font-semibold tabular ${className}`}>{value}</p></div>;
}

function money(value: number, currency: string) {
  try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value); } catch { return `${currency} ${value.toFixed(2)}`; }
}
