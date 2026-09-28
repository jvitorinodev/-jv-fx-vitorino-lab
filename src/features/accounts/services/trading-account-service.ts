import "server-only";

import { cookies } from "next/headers";
import { demoAccounts } from "@/features/dashboard/data/demo-dashboard";
import type { Actor } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TradingAccount } from "@/lib/types/trading";

export const ACTIVE_ACCOUNT_COOKIE = "jvfx_active_account";
export const ALL_ACCOUNTS_ID = "ALL";

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isMissingPrimaryColumnError(error: unknown): boolean {
  const message = typeof error === "object" && error && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : String(error ?? "");
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  return message.includes("is_primary") && (
    message.includes("does not exist") ||
    message.includes("Could not find") ||
    code === "42703" ||
    code === "PGRST204"
  );
}

function mapAccount(row: Record<string, unknown>): TradingAccount {
  const type = String(row.account_type) as TradingAccount["type"];
  const brokerProfile = row.broker_profiles && typeof row.broker_profiles === "object" && !Array.isArray(row.broker_profiles)
    ? row.broker_profiles as Record<string, unknown>
    : null;
  const broker = type === "DEMO"
    ? "Demonstração"
    : String(brokerProfile?.name ?? "Exness");

  return {
    id: String(row.id),
    name: String(row.name),
    broker,
    type,
    currency: String(row.currency ?? "USD"),
    balance: num(row.current_balance),
    equity: num(row.current_equity),
    source: type === "DEMO" ? "DEMO" : "MANUAL",
    brokerAccountLogin: row.broker_account_login ? String(row.broker_account_login) : null,
    brokerServer: row.broker_server ? String(row.broker_server) : null,
    lastSyncedAt: row.last_synced_at ? String(row.last_synced_at) : null,
    active: row.active !== false,
    isPrimary: row.is_primary === true,
  };
}

function applyLegacyPrimaryFallback(accounts: TradingAccount[]): TradingAccount[] {
  if (!accounts.length || accounts.some((account) => account.isPrimary)) return accounts;
  const preferred = accounts.find((account) => account.type !== "DEMO" && account.name.trim().toLowerCase() === "exness real")
    ?? accounts.find((account) => account.type !== "DEMO")
    ?? accounts[0];
  return accounts.map((account) => ({ ...account, isPrimary: account.id === preferred?.id }));
}

async function queryActiveProductionAccounts(actor: Actor): Promise<TradingAccount[]> {
  const supabase = await createSupabaseServerClient();

  const withPrimary = await supabase
    .from("trading_accounts")
    .select("id,name,account_type,currency,current_balance,current_equity,active,is_primary,broker_account_login,broker_server,last_synced_at,broker_profiles(name)")
    .eq("user_id", actor.id)
    .eq("active", true)
    .order("is_primary", { ascending: false })
    .order("account_type", { ascending: true })
    .order("created_at", { ascending: true });

  if (!withPrimary.error) {
    return applyLegacyPrimaryFallback((withPrimary.data ?? []).map((row: unknown) => mapAccount(row as Record<string, unknown>)));
  }

  if (!isMissingPrimaryColumnError(withPrimary.error)) {
    throw new Error(`Não foi possível carregar as contas ativas: ${withPrimary.error.message}`);
  }

  // Compatibilidade com bancos anteriores à migration 0017.
  // A plataforma continua abrindo e considera Exness Real como principal até o SQL ser aplicado.
  const legacy = await supabase
    .from("trading_accounts")
    .select("id,name,account_type,currency,current_balance,current_equity,active,broker_account_login,broker_server,last_synced_at,broker_profiles(name)")
    .eq("user_id", actor.id)
    .eq("active", true)
    .order("account_type", { ascending: true })
    .order("created_at", { ascending: true });

  if (legacy.error) throw new Error(`Não foi possível carregar as contas ativas: ${legacy.error.message}`);
  return applyLegacyPrimaryFallback((legacy.data ?? []).map((row: unknown) => mapAccount(row as Record<string, unknown>)));
}

export type TradingAccountSchemaStatus = {
  current: boolean;
  detail: string;
};

export async function getTradingAccountSchemaStatus(actor: Actor): Promise<TradingAccountSchemaStatus> {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    return { current: true, detail: "Modo demonstrativo; migration de produção não é exigida." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from("trading_accounts")
    .select("id,is_primary")
    .eq("user_id", actor.id)
    .limit(1);

  if (!result.error) {
    return { current: true, detail: "Schema de contas atualizado (is_primary disponível)." };
  }
  if (isMissingPrimaryColumnError(result.error)) {
    return { current: false, detail: "Banco anterior à v1.2.8 detectado. Execute SUPABASE_1_2_9.sql no SQL Editor; a plataforma continuará em modo compatível até lá." };
  }
  return { current: false, detail: `Não foi possível validar o schema: ${result.error.message}` };
}

export async function listActiveTradingAccounts(actor: Actor): Promise<TradingAccount[]> {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return demoAccounts;
  return queryActiveProductionAccounts(actor);
}

export async function getSelectedTradingAccountId(actor: Actor, accounts?: TradingAccount[]): Promise<string> {
  const activeAccounts = accounts ?? await listActiveTradingAccounts(actor);
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value?.trim();

  if (!raw) return preferredConcreteAccountId(activeAccounts, ALL_ACCOUNTS_ID);
  if (raw === ALL_ACCOUNTS_ID) return ALL_ACCOUNTS_ID;
  if (activeAccounts.some((account) => account.id === raw)) return raw;
  return preferredConcreteAccountId(activeAccounts, ALL_ACCOUNTS_ID);
}

export function preferredConcreteAccountId(accounts: TradingAccount[], selectedAccountId: string): string {
  if (selectedAccountId !== ALL_ACCOUNTS_ID && accounts.some((account) => account.id === selectedAccountId)) return selectedAccountId;
  return accounts.find((account) => account.isPrimary)?.id
    ?? accounts.find((account) => account.type !== "DEMO")?.id
    ?? accounts[0]?.id
    ?? "";
}
