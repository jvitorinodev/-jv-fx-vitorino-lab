import "server-only";

import { demoAccounts } from "@/features/dashboard/data/demo-dashboard";
import { getExnessInstrument } from "@/features/brokers/data/exness-instruments";
import { getTerminalAccount, getTerminalClosedTrade, getTerminalClosedTrades } from "@/features/market-terminal/services/market-data-server";
import type { Actor } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EMPTY_TRADE_CHECKLIST, type ImportMt5TradeInput, type TradeRecord } from "@/lib/types/journal";
import type { Mt5ClosedTrade, Mt5HistoryPayload } from "@/lib/types/market-terminal";
import { resolveMarketType } from "@/lib/core/trade-lifecycle-service";
import { getTradeById } from "@/features/journal/services/trade-service";
import { mt5CompatibilityMessage } from "@/features/accounts/lib/mt5-account-kind";

function resultFromPnl(netPnl: number): "WIN" | "LOSS" | "BE" {
  const epsilon = 0.000001;
  return netPnl > epsilon ? "WIN" : netPnl < -epsilon ? "LOSS" : "BE";
}

function expectedRr(entry: number, stop: number | null, target: number | null): number | null {
  if (stop == null || target == null) return null;
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  if (!Number.isFinite(risk) || !Number.isFinite(reward) || risk <= 0) return null;
  return reward / risk;
}

export async function listMt5ImportCandidates(actor: Actor, days = 30): Promise<{
  history: Mt5HistoryPayload;
  importedPositionIds: string[];
}> {
  const safeDays = Math.min(3650, Math.max(1, Math.trunc(days)));
  const history = await getTerminalClosedTrades(safeDays, 200);

  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    return { history, importedPositionIds: [] };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trades")
    .select("broker_position_id")
    .eq("user_id", actor.id)
    .eq("broker_provider", "MT5")
    .not("broker_position_id", "is", null);
  if (error) throw new Error(`Não foi possível verificar as importações existentes: ${error.message}`);

  return {
    history,
    importedPositionIds: (data ?? []).map((row: unknown) => String((row as Record<string, unknown>).broker_position_id)),
  };
}

export async function importMt5HistoryTrade(
  actor: Actor,
  accountId: string,
  brokerTrade: Mt5ClosedTrade,
  context: { accountLogin: string | null; currency: string },
): Promise<{ trade: TradeRecord; duplicate: boolean }> {
  if (!accountId.trim()) throw new Error("Selecione a conta do JV FX que receberá a operação.");
  if (!brokerTrade.supported) throw new Error(`O ativo ${brokerTrade.brokerSymbol} ainda não está mapeado no universo do JV FX.`);

  const brokerLogin = context.accountLogin || "MT5";
  const importedAt = new Date().toISOString();
  const openedAt = new Date(brokerTrade.openedAt * 1000).toISOString();
  const closedAt = new Date(brokerTrade.closedAt * 1000).toISOString();
  const setupId = `MT5-${brokerLogin.replace(/[^A-Za-z0-9]/g, "").slice(-12) || "ACCOUNT"}-${brokerTrade.symbol}-${brokerTrade.positionId}`;
  const commissionCost = Math.abs(brokerTrade.commission + brokerTrade.fee);
  const contractSize = brokerTrade.contractSize > 0
    ? brokerTrade.contractSize
    : getExnessInstrument(brokerTrade.symbol).contractSize;

  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    const account = demoAccounts.find((item) => item.id === accountId) ?? demoAccounts[0]!;
    const trade: TradeRecord = {
      id: `DEMO-MT5-${brokerTrade.positionId}`,
      userId: actor.id,
      accountId: account.id,
      accountName: account.name,
      setupId,
      symbol: brokerTrade.symbol,
      brokerSymbol: brokerTrade.brokerSymbol,
      marketType: resolveMarketType(brokerTrade.symbol),
      direction: brokerTrade.direction,
      status: "CLOSED",
      result: resultFromPnl(brokerTrade.netPnl),
      session: "OTHER",
      higherTimeframe: null,
      timeframe: "N/D",
      strategy: "Importada do MT5",
      setupName: `Histórico MT5 · ticket ${brokerTrade.positionId}`,
      entryPrice: brokerTrade.entryPrice,
      stopPrice: brokerTrade.stopLoss,
      targetPrice: brokerTrade.takeProfit,
      exitPrice: brokerTrade.exitPrice,
      positionSize: brokerTrade.volume,
      riskPercent: null,
      riskAmount: null,
      expectedRr: expectedRr(brokerTrade.entryPrice, brokerTrade.stopLoss, brokerTrade.takeProfit),
      realizedR: null,
      grossPnl: brokerTrade.grossPnl,
      netPnl: brokerTrade.netPnl,
      commission: commissionCost,
      swap: brokerTrade.swap,
      contractSize,
      conversionRate: 1,
      checklist: EMPTY_TRADE_CHECKLIST,
      notes: brokerTrade.comment ? `Comentário MT5: ${brokerTrade.comment}` : "Importação automática do histórico MT5.",
      mistakes: "",
      lessons: "",
      confluences: [],
      source: "BROKER",
      brokerProvider: "MT5",
      brokerAccountLogin: brokerLogin,
      brokerPositionId: brokerTrade.positionId,
      brokerEntryDealId: brokerTrade.entryDealId,
      brokerExitDealId: brokerTrade.exitDealId,
      importedAt,
      openedAt,
      closedAt,
      createdAt: importedAt,
      updatedAt: importedAt,
    };
    return { trade, duplicate: false };
  }

  const supabase = await createSupabaseServerClient();
  const { data: account, error: accountError } = await supabase
    .from("trading_accounts")
    .select("id,name,user_id")
    .eq("id", accountId)
    .eq("user_id", actor.id)
    .eq("active", true)
    .maybeSingle();
  if (accountError) throw new Error(`Não foi possível validar a conta de destino: ${accountError.message}`);
  if (!account) throw new Error("Conta de destino não encontrada ou sem acesso.");

  const { data: existing, error: existingError } = await supabase
    .from("trades")
    .select("id")
    .eq("user_id", actor.id)
    .eq("broker_provider", "MT5")
    .eq("broker_account_login", brokerLogin)
    .eq("broker_position_id", brokerTrade.positionId)
    .maybeSingle();
  if (existingError) throw new Error(`Não foi possível verificar duplicidade: ${existingError.message}`);
  if (existing?.id) {
    const trade = await getTradeById(actor, String(existing.id));
    if (!trade) throw new Error("A operação já foi importada, mas não pôde ser carregada.");
    return { trade, duplicate: true };
  }

  const { data, error } = await supabase
    .from("trades")
    .insert({
      user_id: actor.id,
      account_id: accountId,
      setup_id: setupId,
      symbol: brokerTrade.symbol,
      broker_symbol: brokerTrade.brokerSymbol,
      market_type: resolveMarketType(brokerTrade.symbol),
      direction: brokerTrade.direction,
      status: "CLOSED",
      result: resultFromPnl(brokerTrade.netPnl),
      session: "OTHER",
      higher_timeframe: null,
      timeframe: "N/D",
      strategy: "Importada do MT5",
      setup_name: `Histórico MT5 · ticket ${brokerTrade.positionId}`,
      entry_price: brokerTrade.entryPrice,
      stop_price: brokerTrade.stopLoss,
      target_price: brokerTrade.takeProfit,
      exit_price: brokerTrade.exitPrice,
      position_size: brokerTrade.volume,
      risk_percent: null,
      risk_amount: null,
      expected_rr: expectedRr(brokerTrade.entryPrice, brokerTrade.stopLoss, brokerTrade.takeProfit),
      realized_r: null,
      gross_pnl: brokerTrade.grossPnl,
      net_pnl: brokerTrade.netPnl,
      commission: commissionCost,
      swap: brokerTrade.swap,
      contract_size: contractSize,
      conversion_rate: 1,
      checklist: EMPTY_TRADE_CHECKLIST,
      notes: brokerTrade.comment ? `Comentário MT5: ${brokerTrade.comment}` : "Importação automática do histórico MT5.",
      source: "BROKER",
      opened_at: openedAt,
      closed_at: closedAt,
      broker_provider: "MT5",
      broker_account_login: brokerLogin,
      broker_position_id: brokerTrade.positionId,
      broker_entry_deal_id: brokerTrade.entryDealId,
      broker_exit_deal_id: brokerTrade.exitDealId,
      imported_at: importedAt,
      import_metadata: {
        fee: brokerTrade.fee,
        rawCommission: brokerTrade.commission,
        magic: brokerTrade.magic,
        currency: context.currency,
      },
    })
    .select("id")
    .single();

  if (error || !data) {
    if ((error as { code?: string } | null)?.code === "23505") {
      const { data: duplicate } = await supabase
        .from("trades")
        .select("id")
        .eq("user_id", actor.id)
        .eq("broker_provider", "MT5")
        .eq("broker_account_login", brokerLogin)
        .eq("broker_position_id", brokerTrade.positionId)
        .maybeSingle();
      if (duplicate?.id) {
        const trade = await getTradeById(actor, String(duplicate.id));
        if (trade) return { trade, duplicate: true };
      }
    }
    throw new Error(`Não foi possível importar a operação: ${error?.message ?? "erro desconhecido"}`);
  }

  const trade = await getTradeById(actor, String(data.id));
  if (!trade) throw new Error("A operação foi importada, mas não pôde ser recarregada.");
  return { trade, duplicate: false };
}

export async function importMt5ClosedTrade(actor: Actor, input: ImportMt5TradeInput): Promise<{ trade: TradeRecord; duplicate: boolean }> {
  if (!input.accountId.trim()) throw new Error("Selecione a conta do JV FX que receberá a operação.");
  if (!/^\d+$/.test(input.positionId.trim())) throw new Error("Ticket/position_id inválido.");

  if (process.env.NEXT_PUBLIC_APP_MODE === "production") {
    const terminal = await getTerminalAccount();
    const supabase = await createSupabaseServerClient();
    const { data: target, error } = await supabase
      .from("trading_accounts")
      .select("id,account_type")
      .eq("id", input.accountId)
      .eq("user_id", actor.id)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(`Não foi possível validar a conta de destino: ${error.message}`);
    if (!target) throw new Error("Conta de destino não encontrada ou sem acesso.");
    const compatibilityError = mt5CompatibilityMessage(String(target.account_type), terminal?.server);
    if (compatibilityError) throw new Error(compatibilityError);
  }

  const payload = await getTerminalClosedTrade(input.positionId.trim());
  return importMt5HistoryTrade(actor, input.accountId, payload.trade, {
    accountLogin: payload.accountLogin,
    currency: payload.currency,
  });
}
