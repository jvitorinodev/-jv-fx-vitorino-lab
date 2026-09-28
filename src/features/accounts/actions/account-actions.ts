"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireActor } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTerminalAccount } from "@/features/market-terminal/services/market-data-server";
import {
  ACTIVE_ACCOUNT_COOKIE,
  ALL_ACCOUNTS_ID,
  isMissingPrimaryColumnError,
  listActiveTradingAccounts,
} from "@/features/accounts/services/trading-account-service";
import { mt5CompatibilityMessage } from "@/features/accounts/lib/mt5-account-kind";

function refreshAccountsUi() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/integrations");
  revalidatePath("/dashboard/journal");
  revalidatePath("/dashboard/performance");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/reports");
}

async function persistActiveAccountCookie(accountId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ACCOUNT_COOKIE, accountId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function setActiveTradingAccount(formData: FormData) {
  const actor = await requireActor();
  const requested = String(formData.get("accountId") ?? ALL_ACCOUNTS_ID).trim() || ALL_ACCOUNTS_ID;
  const accounts = await listActiveTradingAccounts(actor);
  const value = requested === ALL_ACCOUNTS_ID || accounts.some((account) => account.id === requested)
    ? requested
    : (accounts.find((account) => account.isPrimary)?.id ?? ALL_ACCOUNTS_ID);

  await persistActiveAccountCookie(value);
  refreshAccountsUi();
}

export async function setPrimaryTradingAccount(formData: FormData) {
  const actor = await requireActor();
  const accountId = String(formData.get("accountId") ?? "").trim();
  if (!accountId || process.env.NEXT_PUBLIC_APP_MODE !== "production") return;

  const supabase = await createSupabaseServerClient();
  const { data: target, error: targetError } = await supabase
    .from("trading_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", actor.id)
    .eq("active", true)
    .maybeSingle();
  if (targetError || !target) return;

  const clear = await supabase
    .from("trading_accounts")
    .update({ is_primary: false, updated_at: new Date().toISOString() })
    .eq("user_id", actor.id);

  if (clear.error && !isMissingPrimaryColumnError(clear.error)) {
    throw new Error(`Não foi possível definir a conta principal: ${clear.error.message}`);
  }

  if (!clear.error) {
    const setPrimary = await supabase
      .from("trading_accounts")
      .update({ is_primary: true, updated_at: new Date().toISOString() })
      .eq("id", accountId)
      .eq("user_id", actor.id);
    if (setPrimary.error) throw new Error(`Não foi possível definir a conta principal: ${setPrimary.error.message}`);
  }

  // Em bancos anteriores à migration 0017, a preferência ainda fica funcional via cookie.
  // Assim a UI não quebra enquanto o usuário aplica SUPABASE_1_2_9.sql.
  await persistActiveAccountCookie(accountId);
  refreshAccountsUi();
}

export async function linkCurrentMt5ToTradingAccount(formData: FormData) {
  const actor = await requireActor();
  const accountId = String(formData.get("accountId") ?? "").trim();
  if (!accountId || process.env.NEXT_PUBLIC_APP_MODE !== "production") return;

  const terminal = await getTerminalAccount();
  if (!terminal?.login) throw new Error("Nenhuma conta MT5 conectada foi encontrada.");

  const supabase = await createSupabaseServerClient();
  const { data: target, error: targetError } = await supabase
    .from("trading_accounts")
    .select("id,account_type")
    .eq("id", accountId)
    .eq("user_id", actor.id)
    .eq("active", true)
    .maybeSingle();
  if (targetError || !target) throw new Error("A conta escolhida não foi encontrada.");

  const compatibilityError = mt5CompatibilityMessage(String(target.account_type), terminal.server);
  if (compatibilityError) throw new Error(compatibilityError);

  // Um login MT5 só pode pertencer a uma conta JV FX. Se já estiver em outra, move o vínculo.
  const { error: clearError } = await supabase
    .from("trading_accounts")
    .update({ broker_account_login: null, broker_server: null, last_synced_at: null, updated_at: new Date().toISOString() })
    .eq("user_id", actor.id)
    .eq("broker_account_login", terminal.login)
    .neq("id", accountId);
  if (clearError) throw new Error(`Não foi possível liberar o login MT5 anterior: ${clearError.message}`);

  const { error } = await supabase
    .from("trading_accounts")
    .update({
      broker_account_login: terminal.login,
      broker_server: terminal.server,
      current_balance: terminal.balance,
      current_equity: terminal.equity,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .eq("user_id", actor.id);
  if (error) throw new Error(`Não foi possível associar o MT5 atual: ${error.message}`);

  await persistActiveAccountCookie(accountId);
  refreshAccountsUi();
}

export async function unlinkTradingAccountMt5(formData: FormData) {
  const actor = await requireActor();
  const accountId = String(formData.get("accountId") ?? "").trim();
  if (!accountId || process.env.NEXT_PUBLIC_APP_MODE !== "production") return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("trading_accounts")
    .update({ broker_account_login: null, broker_server: null, last_synced_at: null, updated_at: new Date().toISOString() })
    .eq("id", accountId)
    .eq("user_id", actor.id);
  if (error) throw new Error(`Não foi possível remover o vínculo MT5: ${error.message}`);
  refreshAccountsUi();
}

export async function createTradingAccount(formData: FormData) {
  const actor = await requireActor();
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return;

  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const requestedType = String(formData.get("accountType") ?? "PERSONAL").trim();
  const allowed = new Set(["PERSONAL", "PROP", "EVALUATION", "FUNDED", "DEMO"]);
  const accountType = allowed.has(requestedType) ? requestedType : "PERSONAL";
  if (!name) throw new Error("Informe um nome para a nova conta.");

  const supabase = await createSupabaseServerClient();
  const primaryQuery = await supabase
    .from("trading_accounts")
    .select("id")
    .eq("user_id", actor.id)
    .eq("active", true)
    .eq("is_primary", true)
    .maybeSingle();

  const baseRow = {
    user_id: actor.id,
    name,
    account_type: accountType,
    currency: "USD",
    initial_balance: 0,
    current_balance: 0,
    current_equity: 0,
    active: true,
  };

  if (primaryQuery.error && isMissingPrimaryColumnError(primaryQuery.error)) {
    const { error } = await supabase.from("trading_accounts").insert(baseRow);
    if (error) throw new Error(`Não foi possível criar a conta: ${error.message}`);
    refreshAccountsUi();
    return;
  }

  if (primaryQuery.error) throw new Error(`Não foi possível verificar a conta principal: ${primaryQuery.error.message}`);

  const { error } = await supabase.from("trading_accounts").insert({
    ...baseRow,
    is_primary: !primaryQuery.data,
  });
  if (error) throw new Error(`Não foi possível criar a conta: ${error.message}`);
  refreshAccountsUi();
}
