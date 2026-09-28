import "server-only";

import { getTerminalAccount, getTerminalClosedTrades, getTerminalStatus } from "@/features/market-terminal/services/market-data-server";
import { importMt5HistoryTrade } from "@/features/journal/services/mt5-import-service";
import type { Actor } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BrokerSyncOverview, BrokerSyncState, BrokerSyncStatus, SyncMt5Input, SyncMt5Result } from "@/lib/types/broker-sync";
import type { TradeRecord } from "@/lib/types/journal";
import { normalizeHistoryWindowDays, REALTIME_SYNC_WINDOW_DAYS } from "@/config/history-windows";
import { mt5CompatibilityMessage } from "@/features/accounts/lib/mt5-account-kind";

const PAGE_SIZE = 500;
const MAX_IMPORTS_PER_RUN = 10_000;

function safeDays(value: number | undefined) {
  return normalizeHistoryWindowDays(value);
}

function mapSyncState(row: Record<string, unknown>): BrokerSyncState {
  return {
    id: String(row.id),
    accountId: String(row.trading_account_id),
    provider: "MT5",
    brokerAccountLogin: row.broker_account_login ? String(row.broker_account_login) : null,
    status: String(row.status ?? "NEVER") as BrokerSyncStatus,
    lastStartedAt: row.last_started_at ? String(row.last_started_at) : null,
    lastCompletedAt: row.last_completed_at ? String(row.last_completed_at) : null,
    importedCount: Number(row.imported_count ?? 0),
    skippedCount: Number(row.skipped_count ?? 0),
    failedCount: Number(row.failed_count ?? 0),
    errorMessage: row.error_message ? String(row.error_message) : null,
    sourceWindowDays: Number(row.source_window_days ?? 365),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

async function saveSyncState(
  actor: Actor,
  input: {
    accountId: string;
    brokerAccountLogin: string | null;
    status: BrokerSyncStatus;
    lastStartedAt: string;
    lastCompletedAt: string | null;
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    errorMessage: string | null;
    sourceWindowDays: number;
  },
) {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("broker_sync_states").upsert({
    user_id: actor.id,
    trading_account_id: input.accountId,
    provider: "MT5",
    broker_account_login: input.brokerAccountLogin,
    status: input.status,
    last_started_at: input.lastStartedAt,
    last_completed_at: input.lastCompletedAt,
    imported_count: input.importedCount,
    skipped_count: input.skippedCount,
    failed_count: input.failedCount,
    error_message: input.errorMessage,
    source_window_days: input.sourceWindowDays,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,trading_account_id,provider" });
  if (error) throw new Error(`Não foi possível salvar o estado da sincronização: ${error.message}`);
}

async function validateAndLinkProductionAccount(actor: Actor, accountId: string, brokerLogin: string, terminal: Awaited<ReturnType<typeof getTerminalAccount>>) {
  if (!terminal) throw new Error("O MT5 não retornou os dados da conta conectada.");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trading_accounts")
    .select("id,user_id,broker_account_login,name,account_type")
    .eq("id", accountId)
    .eq("user_id", actor.id)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível validar a conta do JV FX: ${error.message}`);
  if (!data) throw new Error("Conta do JV FX não encontrada ou inativa.");

  const compatibilityError = mt5CompatibilityMessage(String(data.account_type), terminal.server);
  if (compatibilityError) throw new Error(compatibilityError);

  // A sincronização manual representa uma escolha explícita do usuário.
  // Portanto, se a conta selecionada estava ligada a outro login, atualizamos o vínculo
  // e garantimos que o login MT5 atual não permaneça associado a outra conta JV FX.
  const { error: clearOtherError } = await supabase
    .from("trading_accounts")
    .update({
      broker_account_login: null,
      broker_server: null,
      last_synced_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", actor.id)
    .eq("broker_account_login", brokerLogin)
    .neq("id", accountId);
  if (clearOtherError) throw new Error(`Não foi possível liberar um vínculo MT5 anterior: ${clearOtherError.message}`);

  const { error: updateError } = await supabase
    .from("trading_accounts")
    .update({
      broker_account_login: brokerLogin,
      broker_server: terminal.server,
      current_balance: terminal.balance,
      current_equity: terminal.equity,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .eq("user_id", actor.id);
  if (updateError) throw new Error(`Não foi possível atualizar o saldo da conta vinculada: ${updateError.message}`);
}

export async function getMt5SyncOverview(actor: Actor): Promise<BrokerSyncOverview> {
  const feed = await getTerminalStatus();
  let terminalAccount: BrokerSyncOverview["terminalAccount"] = null;
  if (feed.connected) {
    try {
      terminalAccount = await getTerminalAccount();
    } catch {
      terminalAccount = null;
    }
  }

  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    return { feed, terminalAccount, states: [] };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("broker_sync_states")
    .select("*")
    .eq("user_id", actor.id)
    .eq("provider", "MT5")
    .order("updated_at", { ascending: false });

  return {
    feed,
    terminalAccount,
    states: (data ?? []).map((row: unknown) => mapSyncState(row as Record<string, unknown>)),
  };
}

export async function syncMt5History(actor: Actor, input: SyncMt5Input): Promise<SyncMt5Result> {
  const accountId = input.accountId.trim();
  if (!accountId) return { ok: false, message: "Selecione uma conta do JV FX para sincronizar." };
  const days = safeDays(input.days);
  const startedAt = new Date().toISOString();
  let brokerLogin: string | null = null;
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const demoTrades: TradeRecord[] = [];

  try {
    await saveSyncState(actor, {
      accountId,
      brokerAccountLogin: null,
      status: "RUNNING",
      lastStartedAt: startedAt,
      lastCompletedAt: null,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errorMessage: null,
      sourceWindowDays: days,
    });

    const terminalAccount = await getTerminalAccount();
    brokerLogin = terminalAccount?.login ?? null;
    let offset = 0;
    let currency = terminalAccount?.currency ?? "USD";
    let totalSeen = 0;

    if (process.env.NEXT_PUBLIC_APP_MODE === "production") {
      if (!brokerLogin) throw new Error("O MT5 não informou o login da conta conectada.");
      if (!terminalAccount) throw new Error("Não foi possível obter saldo/equity da conta MT5 conectada.");
      // Vincula e atualiza saldo/equity antes de consultar o histórico. Assim, mesmo uma
      // conta sem operações ou uma consulta lenta já fica associada corretamente ao JV FX.
      await validateAndLinkProductionAccount(actor, accountId, brokerLogin, terminalAccount);
    }

    while (totalSeen < MAX_IMPORTS_PER_RUN) {
      const page = await getTerminalClosedTrades(days, PAGE_SIZE, offset);
      if (page.accountLogin && brokerLogin && page.accountLogin !== brokerLogin) {
        throw new Error(`A conta MT5 mudou durante a sincronização (${brokerLogin} → ${page.accountLogin}). Tente novamente com a conta desejada conectada.`);
      }
      brokerLogin = page.accountLogin ?? brokerLogin;
      currency = page.currency || currency;

      for (const brokerTrade of page.trades) {
        totalSeen += 1;
        if (!brokerTrade.supported) {
          skipped += 1;
          continue;
        }
        try {
          const result = await importMt5HistoryTrade(actor, accountId, brokerTrade, {
            accountLogin: brokerLogin,
            currency,
          });
          if (result.duplicate) skipped += 1;
          else {
            imported += 1;
            if (process.env.NEXT_PUBLIC_APP_MODE !== "production") demoTrades.push(result.trade);
          }
        } catch {
          failed += 1;
        }
      }

      if (!page.hasMore || page.trades.length === 0) break;
      offset += page.trades.length;
      if (offset >= page.total) break;
    }

    const completedAt = new Date().toISOString();
    const status: BrokerSyncStatus = failed > 0 ? "PARTIAL" : "SUCCESS";
    await saveSyncState(actor, {
      accountId,
      brokerAccountLogin: brokerLogin,
      status,
      lastStartedAt: startedAt,
      lastCompletedAt: completedAt,
      importedCount: imported,
      skippedCount: skipped,
      failedCount: failed,
      errorMessage: failed > 0 ? `${failed} operação(ões) não puderam ser importadas.` : null,
      sourceWindowDays: days,
    });

    return {
      ok: true,
      status,
      message: imported > 0
        ? `${imported} nova(s) operação(ões) sincronizada(s). ${skipped} já existente(s) ou ignorada(s).`
        : `Sincronização concluída. Nenhuma operação nova; ${skipped} já existente(s) ou ignorada(s).`,
      imported,
      skipped,
      failed,
      brokerAccountLogin: brokerLogin,
      lastCompletedAt: completedAt,
      demoTrades: demoTrades.length ? demoTrades : undefined,
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : "Não foi possível sincronizar o histórico MT5.";
    try {
      await saveSyncState(actor, {
        accountId,
        brokerAccountLogin: brokerLogin,
        status: "ERROR",
        lastStartedAt: startedAt,
        lastCompletedAt: completedAt,
        importedCount: imported,
        skippedCount: skipped,
        failedCount: Math.max(1, failed),
        errorMessage: message,
        sourceWindowDays: days,
      });
    } catch {
      // Preserve o erro original se o registro de estado também falhar.
    }
    return { ok: false, message };
  }
}


export async function syncConnectedMt5Account(actor: Actor, days = REALTIME_SYNC_WINDOW_DAYS): Promise<SyncMt5Result & { accountId?: string }> {
  const safeWindow = safeDays(days);
  const terminal = await getTerminalAccount();
  const brokerLogin = terminal?.login?.trim();
  if (!brokerLogin) return { ok: false, message: "O MT5 não informou o login da conta conectada." };

  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    return { ok: false, message: "A sincronização automática em tempo real é usada no modo de produção." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trading_accounts")
    .select("id,name")
    .eq("user_id", actor.id)
    .eq("active", true)
    .eq("broker_account_login", brokerLogin)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível localizar a conta vinculada ao MT5: ${error.message}`);
  if (!data?.id) {
    return { ok: false, message: `MT5 ${brokerLogin} ainda não está vinculado a uma conta do JV FX. Faça uma sincronização manual uma vez.` };
  }

  const result = await syncMt5History(actor, { accountId: String(data.id), days: safeWindow });
  return result.ok ? { ...result, accountId: String(data.id) } : result;
}
