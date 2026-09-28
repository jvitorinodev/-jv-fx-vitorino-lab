"use client";

import { ChevronDown, Layers3 } from "lucide-react";
import { setActiveTradingAccount } from "@/features/accounts/actions/account-actions";
import type { TradingAccount } from "@/lib/types/trading";

function accountLabel(account: TradingAccount) {
  const kind = account.type === "DEMO" ? "DEMO" : "REAL";
  const login = account.brokerAccountLogin ? ` · ${account.brokerAccountLogin}` : "";
  const principal = account.isPrimary ? " ★" : "";
  return `${kind} · ${account.name}${principal}${login}`;
}

export function TradingAccountSelector({ accounts, selectedAccountId }: { accounts: TradingAccount[]; selectedAccountId: string }) {
  return (
    <form action={setActiveTradingAccount} className="relative hidden min-w-[230px] md:block">
      <label className="block">
        <span className="sr-only">Conta de operações atual</span>
        <Layers3 className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" aria-hidden="true" />
        <select
          key={selectedAccountId}
          name="accountId"
          defaultValue={selectedAccountId}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-xs font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        >
          <option value="ALL">Todas as contas ativas</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-2.5 size-4 text-slate-400" aria-hidden="true" />
      </label>
    </form>
  );
}
