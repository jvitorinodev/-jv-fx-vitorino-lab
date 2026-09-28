import "server-only";

import { demoAccounts } from "@/features/dashboard/data/demo-dashboard";
import { demoJournalTrades } from "@/features/journal/data/demo-journal";
import { DEFAULT_RISK_POLICY } from "@/features/risk/config/default-risk-policy";
import { getExnessInstrument } from "@/features/brokers/data/exness-instruments";
import { calculatePositionSize } from "@/lib/core/position-size-service";
import { evaluateRisk, type RiskPolicy, type RiskSnapshot } from "@/lib/core/risk-service";
import { calculateTradeOutcome, generateSetupId, resolveMarketType, validateTradeGeometry } from "@/lib/core/trade-lifecycle-service";
import type { Actor } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSelectedTradingAccountId, listActiveTradingAccounts, preferredConcreteAccountId } from "@/features/accounts/services/trading-account-service";
import type { CloseTradeInput, CreateTradeInput, TradePlannerData, TradeRecord, UpdateTradeAnnotationsInput } from "@/lib/types/journal";

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function localDateKey(value: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function localWeekKey(value: string | Date, timeZone: string): string {
  const key = localDateKey(value, timeZone);
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekDay = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekDay + 1);
  return date.toISOString().slice(0, 10);
}

function policyFromRow(row: Record<string, unknown> | null): RiskPolicy {
  if (!row) return DEFAULT_RISK_POLICY;
  return {
    defaultRiskPerTradePct: num(row.default_risk_per_trade_pct, DEFAULT_RISK_POLICY.defaultRiskPerTradePct),
    maxRiskPerTradePct: num(row.max_risk_per_trade_pct, DEFAULT_RISK_POLICY.maxRiskPerTradePct),
    maxDailyLossPct: num(row.max_daily_loss_pct, DEFAULT_RISK_POLICY.maxDailyLossPct),
    maxWeeklyLossPct: num(row.max_weekly_loss_pct, DEFAULT_RISK_POLICY.maxWeeklyLossPct),
    maxTradesPerDay: num(row.max_trades_per_day, DEFAULT_RISK_POLICY.maxTradesPerDay),
    cautionConsecutiveLosses: num(row.caution_consecutive_losses, DEFAULT_RISK_POLICY.cautionConsecutiveLosses),
    lockOnDailyLossLimit: typeof row.lock_on_daily_loss_limit === "boolean" ? row.lock_on_daily_loss_limit : DEFAULT_RISK_POLICY.lockOnDailyLossLimit,
    lockOnWeeklyLossLimit: typeof row.lock_on_weekly_loss_limit === "boolean" ? row.lock_on_weekly_loss_limit : DEFAULT_RISK_POLICY.lockOnWeeklyLossLimit,
    lockOnTradeLimit: typeof row.lock_on_trade_limit === "boolean" ? row.lock_on_trade_limit : DEFAULT_RISK_POLICY.lockOnTradeLimit,
  };
}

function mapTrade(row: Record<string, unknown>): TradeRecord {
  const account = row.trading_accounts && typeof row.trading_accounts === "object" && !Array.isArray(row.trading_accounts)
    ? row.trading_accounts as Record<string, unknown>
    : null;
  const rawConfluences = Array.isArray(row.trade_confluences) ? row.trade_confluences : [];
  return {
    id: String(row.id),
    userId: String(row.user_id),
    accountId: String(row.account_id),
    accountName: String(account?.name ?? "Conta de operações"),
    setupId: String(row.setup_id),
    symbol: String(row.symbol),
    brokerSymbol: String(row.broker_symbol),
    marketType: String(row.market_type) as TradeRecord["marketType"],
    direction: String(row.direction) as TradeRecord["direction"],
    status: String(row.status) as TradeRecord["status"],
    result: row.result ? String(row.result) as TradeRecord["result"] : null,
    session: String(row.session ?? "OTHER") as TradeRecord["session"],
    higherTimeframe: row.higher_timeframe ? String(row.higher_timeframe) : null,
    timeframe: String(row.timeframe),
    strategy: String(row.strategy ?? "Custom"),
    setupName: String(row.setup_name ?? "Configuração manual"),
    entryPrice: num(row.entry_price),
    stopPrice: row.stop_price == null ? null : num(row.stop_price),
    targetPrice: row.target_price == null ? null : num(row.target_price),
    exitPrice: row.exit_price == null ? null : num(row.exit_price),
    positionSize: num(row.position_size),
    riskPercent: row.risk_percent == null ? null : num(row.risk_percent),
    riskAmount: row.risk_amount == null ? null : num(row.risk_amount),
    expectedRr: row.expected_rr == null ? null : num(row.expected_rr),
    realizedR: row.realized_r == null ? null : num(row.realized_r),
    grossPnl: row.gross_pnl == null ? null : num(row.gross_pnl),
    netPnl: row.net_pnl == null ? null : num(row.net_pnl),
    commission: num(row.commission),
    swap: num(row.swap),
    contractSize: num(row.contract_size),
    conversionRate: num(row.conversion_rate, 1),
    checklist: (row.checklist ?? {}) as TradeRecord["checklist"],
    notes: String(row.notes ?? ""),
    mistakes: String(row.mistakes ?? ""),
    lessons: String(row.lessons ?? ""),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    quickNote: String(row.quick_note ?? ""),
    confluences: rawConfluences.map((item) => {
      const value = item as Record<string, unknown>;
      return {
        key: String(value.confluence_key),
        label: String(value.label),
        weight: num(value.weight, 1),
        timeframe: value.timeframe ? String(value.timeframe) : null,
      };
    }),
    source: String(row.source ?? "MANUAL") as TradeRecord["source"],
    brokerProvider: String(row.broker_provider ?? "") === "MT5" ? "MT5" : null,
    brokerAccountLogin: row.broker_account_login ? String(row.broker_account_login) : null,
    brokerPositionId: row.broker_position_id ? String(row.broker_position_id) : null,
    brokerEntryDealId: row.broker_entry_deal_id ? String(row.broker_entry_deal_id) : null,
    brokerExitDealId: row.broker_exit_deal_id ? String(row.broker_exit_deal_id) : null,
    importedAt: row.imported_at ? String(row.imported_at) : null,
    openedAt: String(row.opened_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function getProductionAccount(actor: Actor, accountId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trading_accounts")
    .select("id,name,account_type,currency,current_balance,current_equity,broker_profile_id")
    .eq("id", accountId)
    .eq("user_id", actor.id)
    .eq("active", true)
    .single();
  if (error || !data) throw new Error("Conta de trading não encontrada ou sem acesso.");
  return data as Record<string, unknown>;
}

async function resolveRiskPolicy(actor: Actor, accountId: string): Promise<RiskPolicy> {
  const supabase = await createSupabaseServerClient();
  const { data: accountPolicy } = await supabase
    .from("risk_settings")
    .select("*")
    .eq("user_id", actor.id)
    .eq("trading_account_id", accountId)
    .maybeSingle();
  if (accountPolicy) return policyFromRow(accountPolicy as Record<string, unknown>);

  const { data: globalPolicy } = await supabase
    .from("risk_settings")
    .select("*")
    .eq("user_id", actor.id)
    .is("trading_account_id", null)
    .maybeSingle();
  return policyFromRow(globalPolicy as Record<string, unknown> | null);
}

async function resolveTimezone(actor: Actor): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("timezone").eq("id", actor.id).maybeSingle();
  return String(data?.timezone ?? "America/Sao_Paulo");
}

export async function getServerRiskSnapshot(actor: Actor, accountId: string): Promise<{ policy: RiskPolicy; snapshot: RiskSnapshot }> {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    const policy = DEFAULT_RISK_POLICY;
    return {
      policy,
      snapshot: evaluateRisk({ policy, dailyLossPct: 3.5, weeklyLossPct: 8.5, openRiskPct: 5, tradesToday: 1, consecutiveLosses: 1 }),
    };
  }

  const account = await getProductionAccount(actor, accountId);
  const balance = Math.max(1, num(account.current_balance));
  const policy = await resolveRiskPolicy(actor, accountId);
  const timeZone = await resolveTimezone(actor);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trades")
    .select("status,risk_percent,net_pnl,opened_at,closed_at,result")
    .eq("user_id", actor.id)
    .eq("account_id", accountId)
    .order("closed_at", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw new Error(`Não foi possível calcular o uso de risco: ${error.message}`);

  const now = new Date();
  const today = localDateKey(now, timeZone);
  const week = localWeekKey(now, timeZone);
  let dailyLoss = 0;
  let weeklyLoss = 0;
  let openRiskPct = 0;
  let tradesToday = 0;

  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>;
    const status = String(row.status);
    const openedAt = String(row.opened_at);
    const closedAt = row.closed_at ? String(row.closed_at) : null;
    if (localDateKey(openedAt, timeZone) === today) tradesToday += 1;
    if (status === "OPEN") openRiskPct += num(row.risk_percent);
    if (status === "CLOSED" && num(row.net_pnl) < 0 && closedAt) {
      const lossPct = (Math.abs(num(row.net_pnl)) / balance) * 100;
      if (localDateKey(closedAt, timeZone) === today) dailyLoss += lossPct;
      if (localWeekKey(closedAt, timeZone) === week) weeklyLoss += lossPct;
    }
  }

  const closedRows = (data ?? []).filter((raw: unknown) => String((raw as Record<string, unknown>).status) === "CLOSED");
  let consecutiveLosses = 0;
  for (const raw of closedRows) {
    if (String((raw as Record<string, unknown>).result) !== "LOSS") break;
    consecutiveLosses += 1;
  }

  return {
    policy,
    snapshot: evaluateRisk({ policy, dailyLossPct: dailyLoss, weeklyLossPct: weeklyLoss, openRiskPct, tradesToday, consecutiveLosses }),
  };
}

export async function getTradePlannerData(actor: Actor): Promise<TradePlannerData> {
  const accounts = await listActiveTradingAccounts(actor);
  const selectedAccountId = await getSelectedTradingAccountId(actor, accounts);
  const defaultAccountId = preferredConcreteAccountId(accounts, selectedAccountId);
  return {
    accounts,
    defaultAccountId,
    selectedAccountId,
    source: process.env.NEXT_PUBLIC_APP_MODE === "production" ? "MANUAL" : "DEMO",
  };
}

export async function listTrades(actor: Actor): Promise<TradeRecord[]> {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return demoJournalTrades;
  const supabase = await createSupabaseServerClient();
  const pageSize = 1000;
  const maxRows = 10_000;
  const rows: Record<string, unknown>[] = [];

  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await supabase
      .from("trades")
      .select("*,trading_accounts(name),trade_confluences(confluence_key,label,weight,timeframe)")
      .eq("user_id", actor.id)
      .order("opened_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Não foi possível carregar o diário de operações: ${error.message}`);
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows.map(mapTrade);
}

export async function getTradeById(actor: Actor, id: string): Promise<TradeRecord | null> {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return demoJournalTrades.find((trade) => trade.id === id) ?? null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trades")
    .select("*,trading_accounts(name),trade_confluences(confluence_key,label,weight,timeframe)")
    .eq("id", id)
    .eq("user_id", actor.id)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a operação: ${error.message}`);
  return data ? mapTrade(data as Record<string, unknown>) : null;
}

export async function createTradeRecord(actor: Actor, input: CreateTradeInput): Promise<TradeRecord> {
  const geometryErrors = validateTradeGeometry({ direction: input.direction, entryPrice: input.entryPrice, stopPrice: input.stopPrice, targetPrice: input.targetPrice });
  if (geometryErrors.length) throw new Error(geometryErrors.join(" "));
  if (!input.accountId) throw new Error("Selecione uma conta de trading.");
  if (!input.timeframe.trim()) throw new Error("O timeframe de execução é obrigatório.");
  if (!input.strategy.trim()) throw new Error("A estratégia é obrigatória.");
  if (!input.setupName.trim()) throw new Error("O nome do setup é obrigatório.");

  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    const account = demoAccounts.find((item) => item.id === input.accountId) ?? demoAccounts[0]!;
    const spec = getExnessInstrument(input.symbol);
    const { policy, snapshot } = await getServerRiskSnapshot(actor, input.accountId);
    if (!snapshot.executionAllowed) throw new Error(snapshot.lockReason ?? "A trava de risco está bloqueada.");
    if (input.riskPercent > snapshot.maxAllowedNextTradeRiskPct) throw new Error(`A trava de risco permite no máximo ${snapshot.maxAllowedNextTradeRiskPct.toFixed(2)}% na próxima operação.`);
    const sizing = calculatePositionSize({ capitalBase: account.equity || account.balance, accountCurrency: account.currency, riskPct: input.riskPercent, maxRiskPct: policy.maxRiskPerTradePct, entryPrice: input.entryPrice, stopPrice: input.stopPrice, targetPrice: input.targetPrice, specification: spec });
    if (sizing.recommendedLots <= 0) throw new Error("O risco e o stop selecionados não produzem um volume válido para a corretora.");
    const now = new Date();
    return {
      id: `DEMO-${Date.now()}`,
      userId: actor.id,
      accountId: account.id,
      accountName: account.name,
      setupId: input.setupId?.trim() || generateSetupId(input.symbol, now, demoJournalTrades.length + 1),
      symbol: input.symbol,
      brokerSymbol: spec.brokerSymbol,
      marketType: resolveMarketType(input.symbol),
      direction: input.direction,
      status: "OPEN",
      result: null,
      session: input.session,
      higherTimeframe: input.higherTimeframe ?? null,
      timeframe: input.timeframe,
      strategy: input.strategy,
      setupName: input.setupName,
      entryPrice: input.entryPrice,
      stopPrice: input.stopPrice,
      targetPrice: input.targetPrice ?? null,
      exitPrice: null,
      positionSize: sizing.recommendedLots,
      riskPercent: sizing.actualRiskPct,
      riskAmount: sizing.actualRisk,
      expectedRr: sizing.rewardRiskRatio,
      realizedR: null,
      grossPnl: null,
      netPnl: null,
      commission: 0,
      swap: 0,
      contractSize: spec.contractSize,
      conversionRate: sizing.conversionRate,
      checklist: input.checklist,
      notes: input.notes ?? "",
      mistakes: "",
      lessons: "",
      confluences: input.confluences ?? [],
      source: "DEMO",
      openedAt: now.toISOString(),
      closedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  const account = await getProductionAccount(actor, input.accountId);
  const { policy, snapshot } = await getServerRiskSnapshot(actor, input.accountId);
  if (!snapshot.executionAllowed) throw new Error(snapshot.lockReason ?? "A trava de risco está bloqueada.");
  if (input.riskPercent > policy.maxRiskPerTradePct) throw new Error(`O risco por operação não pode exceder ${policy.maxRiskPerTradePct.toFixed(2)}%.`);
  if (input.riskPercent > snapshot.maxAllowedNextTradeRiskPct) throw new Error(`A trava de risco permite no máximo ${snapshot.maxAllowedNextTradeRiskPct.toFixed(2)}% na próxima operação.`);

  const spec = getExnessInstrument(input.symbol);
  const capitalBase = Math.max(0, num(account.current_equity) || num(account.current_balance));
  const sizing = calculatePositionSize({
    capitalBase,
    accountCurrency: String(account.currency ?? "USD"),
    riskPct: input.riskPercent,
    maxRiskPct: policy.maxRiskPerTradePct,
    entryPrice: input.entryPrice,
    stopPrice: input.stopPrice,
    targetPrice: input.targetPrice,
    specification: spec,
  });
  if (sizing.recommendedLots <= 0) throw new Error("O risco e o stop selecionados não produzem um volume válido para a corretora.");

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  let setupId = input.setupId?.trim();
  if (!setupId) {
    const { count } = await supabase.from("trades").select("id", { count: "exact", head: true }).eq("user_id", actor.id);
    setupId = generateSetupId(input.symbol, now, (count ?? 0) + 1);
  }

  const { data, error } = await supabase
    .from("trades")
    .insert({
      user_id: actor.id,
      account_id: input.accountId,
      setup_id: setupId,
      symbol: input.symbol,
      broker_symbol: spec.brokerSymbol,
      market_type: spec.marketType,
      direction: input.direction,
      status: "OPEN",
      session: input.session,
      higher_timeframe: input.higherTimeframe ?? null,
      timeframe: input.timeframe,
      strategy: input.strategy.trim(),
      setup_name: input.setupName.trim(),
      entry_price: input.entryPrice,
      stop_price: input.stopPrice,
      target_price: input.targetPrice ?? null,
      position_size: sizing.recommendedLots,
      risk_percent: sizing.actualRiskPct,
      risk_amount: sizing.actualRisk,
      expected_rr: sizing.rewardRiskRatio,
      contract_size: spec.contractSize,
      conversion_rate: sizing.conversionRate,
      checklist: input.checklist,
      notes: input.notes?.trim() ?? "",
      source: "MANUAL",
      opened_at: now.toISOString(),
    })
    .select("*,trading_accounts(name),trade_confluences(confluence_key,label,weight,timeframe)")
    .single();
  if (error || !data) throw new Error(`Não foi possível criar a operação: ${error?.message ?? "erro desconhecido no banco de dados"}`);

  if (input.confluences?.length) {
    const { error: confluenceError } = await supabase.from("trade_confluences").insert(input.confluences.map((item) => ({
      trade_id: String(data.id),
      confluence_key: item.key,
      label: item.label,
      weight: item.weight,
      timeframe: item.timeframe ?? null,
    })));
    if (confluenceError) throw new Error(`A operação foi criada, mas as confluências não puderam ser salvas: ${confluenceError.message}`);
  }

  return (await getTradeById(actor, String(data.id))) ?? mapTrade(data as Record<string, unknown>);
}

export async function closeTradeRecord(actor: Actor, input: CloseTradeInput): Promise<TradeRecord> {
  const trade = await getTradeById(actor, input.tradeId);
  if (!trade) throw new Error("Operação não encontrada.");
  if (trade.status !== "OPEN") throw new Error("Somente operações abertas podem ser encerradas.");
  if (trade.riskAmount == null || trade.riskAmount <= 0) throw new Error("Esta operação não possui risco registrado suficiente para calcular o R automaticamente.");

  const outcome = calculateTradeOutcome({
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    exitPrice: input.exitPrice,
    positionSize: trade.positionSize,
    contractSize: trade.contractSize,
    conversionRate: trade.conversionRate,
    riskAmount: trade.riskAmount,
    commission: input.commission,
    swap: input.swap,
  });

  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    const now = new Date().toISOString();
    return {
      ...trade,
      status: "CLOSED",
      result: outcome.result,
      exitPrice: input.exitPrice,
      grossPnl: outcome.grossPnl,
      netPnl: outcome.netPnl,
      realizedR: outcome.realizedR,
      commission: Math.abs(input.commission ?? 0),
      swap: input.swap ?? 0,
      mistakes: input.mistakes?.trim() ?? "",
      lessons: input.lessons?.trim() ?? "",
      closedAt: now,
      updatedAt: now,
    };
  }

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("trades")
    .update({
      status: "CLOSED",
      result: outcome.result,
      exit_price: input.exitPrice,
      gross_pnl: outcome.grossPnl,
      net_pnl: outcome.netPnl,
      realized_r: outcome.realizedR,
      commission: Math.abs(input.commission ?? 0),
      swap: input.swap ?? 0,
      mistakes: input.mistakes?.trim() ?? "",
      lessons: input.lessons?.trim() ?? "",
      closed_at: now,
      updated_at: now,
    })
    .eq("id", trade.id)
    .eq("user_id", actor.id)
    .eq("status", "OPEN");
  if (error) throw new Error(`Não foi possível encerrar a operação: ${error.message}`);

  return (await getTradeById(actor, trade.id))!;
}


export async function updateTradeAnnotations(actor: Actor, input: UpdateTradeAnnotationsInput): Promise<TradeRecord> {
  const tags = [...new Set(input.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
  const quickNote = input.quickNote.trim().slice(0, 500);
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    const trade = demoJournalTrades.find((item) => item.id === input.tradeId);
    if (!trade) throw new Error("Operação não encontrada no modo demonstração.");
    return { ...trade, tags, quickNote, updatedAt: new Date().toISOString() };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trades")
    .update({ tags, quick_note: quickNote, updated_at: new Date().toISOString() })
    .eq("id", input.tradeId)
    .eq("user_id", actor.id)
    .select("*,trading_accounts(name),trade_confluences(confluence_key,label,weight,timeframe)")
    .single();
  if (error || !data) throw new Error(`Não foi possível atualizar tags/notas: ${error?.message ?? "operação não encontrada"}`);
  return mapTrade(data as Record<string, unknown>);
}
