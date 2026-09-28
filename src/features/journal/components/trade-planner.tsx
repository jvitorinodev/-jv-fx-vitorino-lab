"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Check, ChevronRight, Database, LockKeyhole, ShieldCheck } from "lucide-react";
import { createTradeAction, getRiskGateAction } from "@/features/journal/actions/trade-actions";
import { upsertDemoTrade } from "@/features/journal/data/demo-trade-store";
import { EXNESS_STANDARD_MT5_INSTRUMENTS } from "@/features/brokers/data/exness-instruments";
import { DEFAULT_RISK_POLICY } from "@/features/risk/config/default-risk-policy";
import { calculatePositionSize } from "@/lib/core/position-size-service";
import { CONFLUENCE_CATALOG, defaultConfluenceWeights, weightFor } from "@/lib/core/confluence-service";
import { validateTradeGeometry } from "@/lib/core/trade-lifecycle-service";
import type { RiskPolicy, RiskSnapshot } from "@/lib/core/risk-service";
import type { Direction, TradingAccount } from "@/lib/types/trading";
import type { ConfluenceWeightMap } from "@/lib/types/price-zones";
import { EMPTY_TRADE_CHECKLIST, type CreateTradeInput, type TradeChecklist, type TradeConfluenceInput, type TradingSession } from "@/lib/types/journal";
import { StatusPill } from "@/components/ui/status-pill";
import { formatters, labelDataSource, labelDirection, labelRiskStatus, labelTradingSession } from "@/lib/i18n/pt-br";
import { BRAND } from "@/config/brand";

const fieldClass = "mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 disabled:cursor-not-allowed disabled:opacity-50";
const textAreaClass = "mt-1.5 min-h-24 w-full resize-y rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500";
const money = formatters.usd;

const presets: Record<string, { entry: number; stop: number; target: number }> = {
  EURUSD: { entry: 1.18, stop: 1.176, target: 1.188 },
  GBPUSD: { entry: 1.34, stop: 1.334, target: 1.352 },
  USDJPY: { entry: 146.8, stop: 145.8, target: 148.8 },
  XAUUSD: { entry: 3679, stop: 3659, target: 3719 },
  XAGUSD: { entry: 43.2, stop: 42.7, target: 44.2 },
  NAS100: { entry: 24120, stop: 24270, target: 23820 },
  US30: { entry: 46300, stop: 46600, target: 45700 },
  SPX500: { entry: 6710, stop: 6750, target: 6630 },
  BTCUSD: { entry: 114800, stop: 111800, target: 120800 },
  ETHUSD: { entry: 4550, stop: 4400, target: 4850 },
};


function presetForDirection(symbol: string, direction: Direction) {
  const base = presets[symbol] ?? presets.XAUUSD;
  const defaultDirection: Direction = ["NAS100", "US30", "SPX500"].includes(symbol) ? "SHORT" : "LONG";
  if (direction === defaultDirection) return base;
  const stopDistance = Math.abs(base.entry - base.stop);
  const targetDistance = Math.abs(base.target - base.entry);
  return direction === "LONG"
    ? { entry: base.entry, stop: base.entry - stopDistance, target: base.entry + targetDistance }
    : { entry: base.entry, stop: base.entry + stopDistance, target: base.entry - targetDistance };
}

const checklistLabels: Array<[keyof TradeChecklist, string]> = [
  ["htfAligned", "HTF alinhado"],
  ["liquidityTaken", "Liquidez capturada"],
  ["poiIdentified", "POI identificado"],
  ["fvgPresent", "FVG presente"],
  ["structureShift", "Mudança de estrutura"],
  ["priceActionConfirmation", "Confirmação por Ação do Preço"],
  ["newsChecked", "Notícias verificadas"],
];

const baseConfluenceCatalog: TradeConfluenceInput[] = CONFLUENCE_CATALOG.map((item) => ({
  key: item.key,
  label: item.label,
  weight: item.defaultWeight,
}));

export type TradePlannerInitialContext = {
  symbol?: string;
  setupId?: string;
  direction?: Direction;
  higherTimeframe?: string;
  timeframe?: string;
  strategy?: string;
  setupName?: string;
  entryPrice?: number;
  stopPrice?: number;
  targetPrice?: number;
  confluenceKeys?: string[];
};

export function TradePlanner({ accounts, defaultAccountId, source, initialContext, confluenceWeights = defaultConfluenceWeights() }: { accounts: TradingAccount[]; defaultAccountId: string; source: "DEMO" | "MANUAL" | "BROKER" | "REALTIME" | "DELAYED"; initialContext?: TradePlannerInitialContext; confluenceWeights?: ConfluenceWeightMap }) {
  const initialSymbol = initialContext?.symbol && presets[initialContext.symbol] ? initialContext.symbol : "XAUUSD";
  const initialDirection: Direction = initialContext?.direction ?? (["NAS100", "US30", "SPX500"].includes(initialSymbol) ? "SHORT" : "LONG");
  const preset = presetForDirection(initialSymbol, initialDirection);
  const contextualEntry = initialContext?.entryPrice ?? preset.entry;
  const contextualStop = initialContext?.stopPrice ?? preset.stop;
  const stopDistance = Math.abs(contextualEntry - contextualStop);
  const contextualTarget = initialContext?.targetPrice ?? (initialContext?.entryPrice != null && initialContext?.stopPrice != null
    ? initialDirection === "LONG" ? contextualEntry + stopDistance * 2 : contextualEntry - stopDistance * 2
    : preset.target);
  const confluenceCatalog: TradeConfluenceInput[] = baseConfluenceCatalog.map((item) => ({ ...item, weight: weightFor(item.key, confluenceWeights) }));
  const validInitialConfluences = (initialContext?.confluenceKeys ?? ["liquidity_sweep", "fvg", "mss"]).filter((key) => confluenceCatalog.some((item) => item.key === key));
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [entry, setEntry] = useState(contextualEntry);
  const [stop, setStop] = useState(contextualStop);
  const [target, setTarget] = useState(contextualTarget);
  const [riskPct, setRiskPct] = useState(DEFAULT_RISK_POLICY.defaultRiskPerTradePct);
  const [session, setSession] = useState<TradingSession>("NEW_YORK");
  const [higherTimeframe, setHigherTimeframe] = useState(initialContext?.higherTimeframe ?? "4H");
  const [timeframe, setTimeframe] = useState(initialContext?.timeframe ?? "15M");
  const [strategy, setStrategy] = useState(initialContext?.strategy ?? "ICT + Ação do Preço");
  const [setupName, setSetupName] = useState(initialContext?.setupName ?? "Varredura de Liquidez + FVG + MSS");
  const [setupId, setSetupId] = useState(initialContext?.setupId ?? "");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<TradeChecklist>({
    ...EMPTY_TRADE_CHECKLIST,
    htfAligned: validInitialConfluences.includes("htf_alignment"),
    liquidityTaken: validInitialConfluences.includes("liquidity_sweep"),
    poiIdentified: Boolean(initialContext?.setupId),
    fvgPresent: validInitialConfluences.some((key) => ["fvg", "ifvg", "bpr"].includes(key)),
    structureShift: validInitialConfluences.some((key) => ["mss", "choch", "bos"].includes(key)),
    priceActionConfirmation: validInitialConfluences.includes("price_action_confirmation"),
  });
  const [selectedConfluences, setSelectedConfluences] = useState<string[]>(validInitialConfluences);
  const [riskData, setRiskData] = useState<{ policy: RiskPolicy; snapshot: RiskSnapshot } | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const account = accounts.find((item) => item.id === accountId) ?? accounts[0];
  const spec = useMemo(() => EXNESS_STANDARD_MT5_INSTRUMENTS.find((item) => item.internalSymbol === symbol)!, [symbol]);
  const geometryErrors = useMemo(() => {
    try { return validateTradeGeometry({ direction, entryPrice: entry, stopPrice: stop, targetPrice: target }); }
    catch (error) { return [error instanceof Error ? error.message : "Geometria da operação inválida."]; }
  }, [direction, entry, stop, target]);

  const sizing = useMemo(() => {
    if (!account || geometryErrors.length) return { result: null, error: geometryErrors[0] ?? "Selecione uma conta." };
    try {
      const maxRisk = riskData?.snapshot.maxAllowedNextTradeRiskPct ?? DEFAULT_RISK_POLICY.maxRiskPerTradePct;
      return {
        result: calculatePositionSize({
          capitalBase: account.equity || account.balance,
          accountCurrency: account.currency,
          riskPct,
          maxRiskPct: Math.max(0.01, maxRisk),
          entryPrice: entry,
          stopPrice: stop,
          targetPrice: target,
          specification: spec,
        }),
        error: null,
      };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Não foi possível calcular o tamanho da posição." };
    }
  }, [account, entry, geometryErrors, riskData, riskPct, spec, stop, target]);

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    setRiskError(null);
    startTransition(async () => {
      const result = await getRiskGateAction(accountId);
      if (!active) return;
      if (result.ok) setRiskData({ policy: result.policy, snapshot: result.snapshot });
      else setRiskError(result.message);
    });
    return () => { active = false; };
  }, [accountId]);

  const effectiveChecklist: TradeChecklist = {
    ...checklist,
    riskCalculated: Boolean(sizing.result && sizing.result.recommendedLots > 0),
    dailyLimitChecked: Boolean(riskData?.snapshot.executionAllowed),
  };
  const checklistCount = Object.values(effectiveChecklist).filter(Boolean).length;
  const readinessPct = Math.round((checklistCount / Object.keys(effectiveChecklist).length) * 100);
  const gate = riskData?.snapshot;
  const canSubmit = Boolean(account && sizing.result && sizing.result.recommendedLots > 0 && gate?.executionAllowed && riskPct <= (gate?.maxAllowedNextTradeRiskPct ?? 0) && !isPending);

  function changeSymbol(nextSymbol: string) {
    setSymbol(nextSymbol);
    const preset = presets[nextSymbol];
    if (preset) {
      setEntry(preset.entry);
      setStop(preset.stop);
      setTarget(preset.target);
    }
    if (["NAS100", "US30", "SPX500"].includes(nextSymbol)) setDirection("SHORT");
    else setDirection("LONG");
  }

  function toggleChecklist(key: keyof TradeChecklist) {
    if (key === "riskCalculated" || key === "dailyLimitChecked") return;
    setChecklist((current) => ({ ...current, [key]: !current[key] }));
  }

  function toggleConfluence(key: string) {
    setSelectedConfluences((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function submit() {
    if (!canSubmit || !account) return;
    setMessage(null);
    const confluences = confluenceCatalog
      .filter((item) => selectedConfluences.includes(item.key))
      .map((item) => ({ ...item, timeframe }));
    const input: CreateTradeInput = {
      accountId: account.id,
      setupId: setupId.trim() || undefined,
      symbol,
      direction,
      session,
      higherTimeframe,
      timeframe,
      strategy,
      setupName,
      entryPrice: entry,
      stopPrice: stop,
      targetPrice: target,
      riskPercent: riskPct,
      checklist: effectiveChecklist,
      notes,
      confluences,
    };

    startTransition(async () => {
      const result = await createTradeAction(input);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      if (process.env.NEXT_PUBLIC_APP_MODE !== "production") upsertDemoTrade(result.trade);
      setCreatedId(result.trade.id);
      setMessage({ tone: "success", text: result.message });
    });
  }

  if (!account) {
    return <div className="panel p-6"><p className="text-sm text-slate-300">Nenhuma conta de trading ativa está disponível. Crie uma conta Exness antes de abrir uma operação.</p></div>;
  }

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,.75fr)]">
      <div className="space-y-5">
        <section className="panel overflow-hidden">
          <div className="panel-header">
            <div><p className="eyebrow">Fluxo de execução</p><h2 className="mt-1 text-sm font-semibold">Análise → ID da Configuração → Exness → Risco → Abrir Operação</h2></div>
            <StatusPill tone={source === "DEMO" ? "info" : "neutral"}>{labelDataSource(source)}</StatusPill>
          </div>
          <div className="space-y-5 p-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Conta"><select className={fieldClass} value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.broker}</option>)}</select></Field>
              <Field label="Ativo"><select className={fieldClass} value={symbol} onChange={(event) => changeSymbol(event.target.value)}>{EXNESS_STANDARD_MT5_INSTRUMENTS.map((item) => <option key={item.internalSymbol} value={item.internalSymbol}>{item.internalSymbol} · {item.brokerSymbol}</option>)}</select></Field>
              <Field label="Direção"><select className={fieldClass} value={direction} onChange={(event) => setDirection(event.target.value as Direction)}><option value="LONG">{labelDirection("LONG")}</option><option value="SHORT">{labelDirection("SHORT")}</option></select></Field>
              <Field label="Sessão"><select className={fieldClass} value={session} onChange={(event) => setSession(event.target.value as TradingSession)}><option value="ASIA">{labelTradingSession("ASIA")}</option><option value="LONDON">{labelTradingSession("LONDON")}</option><option value="NEW_YORK">{labelTradingSession("NEW_YORK")}</option><option value="OTHER">{labelTradingSession("OTHER")}</option></select></Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Entrada"><input className={fieldClass} type="number" step="any" value={entry} onChange={(event) => setEntry(Number(event.target.value))} /></Field>
              <Field label="Preço de Stop"><input className={fieldClass} type="number" step="any" value={stop} onChange={(event) => setStop(Number(event.target.value))} /></Field>
              <Field label="Alvo de lucro"><input className={fieldClass} type="number" step="any" value={target} onChange={(event) => setTarget(Number(event.target.value))} /></Field>
              <Field label="Risco %"><input className={fieldClass} type="number" min="0.01" max={riskData?.policy.maxRiskPerTradePct ?? DEFAULT_RISK_POLICY.maxRiskPerTradePct} step="0.25" value={riskPct} onChange={(event) => setRiskPct(Number(event.target.value))} /></Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Período superior (HTF)"><select className={fieldClass} value={higherTimeframe} onChange={(event) => setHigherTimeframe(event.target.value)}>{["M","W","D","4H","1H"].map((tf) => <option key={tf}>{tf}</option>)}</select></Field>
              <Field label="Período de execução"><select className={fieldClass} value={timeframe} onChange={(event) => setTimeframe(event.target.value)}>{["4H","1H","30M","15M","5M","1M"].map((tf) => <option key={tf}>{tf}</option>)}</select></Field>
              <Field label="Estratégia"><input className={fieldClass} value={strategy} onChange={(event) => setStrategy(event.target.value)} /></Field>
              <Field label="ID da Configuração (opcional)"><input className={fieldClass} placeholder="Gerado automaticamente se estiver vazio" value={setupId} onChange={(event) => setSetupId(event.target.value)} /></Field>
            </div>

            <Field label="Nome da configuração"><input className={fieldClass} value={setupName} onChange={(event) => setSetupName(event.target.value)} /></Field>
            <Field label="Notas pré-operação"><textarea className={textAreaClass} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Por que esta operação é válida? O que invalida a ideia?" /></Field>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-header"><div><p className="eyebrow">Evidências</p><h2 className="mt-1 text-sm font-semibold">Confluências</h2></div><span className="tabular text-xs text-slate-500">{selectedConfluences.length} selecionadas</span></div>
          <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-4">
            {confluenceCatalog.map((item) => {
              const active = selectedConfluences.includes(item.key);
              return <button key={item.key} type="button" onClick={() => toggleConfluence(item.key)} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs transition ${active ? "border-sky-400/30 bg-sky-400/[0.06] text-sky-100" : "border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-700"}`}><span>{item.label}</span><span className="tabular text-[10px] text-slate-600">+{item.weight}</span></button>;
            })}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-header"><div><p className="eyebrow">Disciplina de processo</p><h2 className="mt-1 text-sm font-semibold">Checklist Pré-Operação</h2></div><span className="tabular text-xs text-slate-500">{checklistCount}/10 · {readinessPct}%</span></div>
          <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {checklistLabels.map(([key, label]) => <ChecklistButton key={key} active={effectiveChecklist[key]} label={label} onClick={() => toggleChecklist(key)} />)}
            <ChecklistButton active={effectiveChecklist.riskCalculated} label="Risco calculado" automatic />
            <ChecklistButton active={effectiveChecklist.dailyLimitChecked} label="Trava de risco do servidor verificada" automatic />
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="panel overflow-hidden">
          <div className="panel-header"><div><p className="eyebrow">Prévia de execução</p><h2 className="mt-1 text-sm font-semibold">Exness · {spec.brokerSymbol}</h2></div><Database className="size-4 text-slate-600" /></div>
          <div className="p-4">
            {sizing.result ? <>
              <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.04] p-4"><p className="eyebrow">Tamanho da posição</p><p className="tabular mt-2 text-4xl font-semibold">{sizing.result.recommendedLots.toFixed(2)} <span className="text-base text-slate-500">lote</span></p><p className="mt-2 text-xs text-slate-500">Risco real {sizing.result.actualRiskPct.toFixed(2)}% · {money.format(sizing.result.actualRisk)}</p></div>
              <div className="mt-3 grid grid-cols-2 gap-2"><MiniMetric label="Orçamento de risco" value={money.format(sizing.result.riskBudget)} /><MiniMetric label="R:R" value={sizing.result.rewardRiskRatio ? `1:${sizing.result.rewardRiskRatio.toFixed(2)}` : "—"} /><MiniMetric label="Preço de Stop" value={`${sizing.result.pipDistance.toFixed(1)} pips`} /><MiniMetric label="Projetado" value={sizing.result.potentialProfit == null ? "—" : money.format(sizing.result.potentialProfit)} /></div>
            </> : <div className="rounded-lg border border-red-400/20 bg-red-400/[0.04] p-3 text-xs leading-5 text-red-200">{sizing.error}</div>}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-header"><div><p className="eyebrow">Proteção no servidor</p><h2 className="mt-1 text-sm font-semibold">Trava de Risco</h2></div>{gate ? <StatusPill tone={gate.status === "SAFE" ? "positive" : gate.status === "LOCKED" ? "negative" : "warning"}>{labelRiskStatus(gate.status)}</StatusPill> : null}</div>
          <div className="space-y-3 p-4">
            {riskError ? <p className="text-xs text-red-300">{riskError}</p> : gate ? <>
              <div className="grid grid-cols-2 gap-2"><MiniMetric label="Máx. próxima operação" value={`${gate.maxAllowedNextTradeRiskPct.toFixed(2)}%`} /><MiniMetric label="Comprometido diário" value={`${gate.committedDailyRiskPct.toFixed(2)} / ${riskData!.policy.maxDailyLossPct}%`} /><MiniMetric label="Comprometido semanal" value={`${gate.committedWeeklyRiskPct.toFixed(2)} / ${riskData!.policy.maxWeeklyLossPct}%`} /><MiniMetric label="Operações hoje" value={`${gate.tradesToday} / ${riskData!.policy.maxTradesPerDay}`} /></div>
              {gate.lockReason ? <div className="flex gap-2 rounded-lg border border-red-400/20 bg-red-400/[0.04] p-3 text-xs text-red-200"><LockKeyhole className="size-4 shrink-0" />{gate.lockReason}</div> : <div className="flex gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.03] p-3 text-xs text-emerald-200"><ShieldCheck className="size-4 shrink-0" />A execução está liberada. A validação final será executada novamente no servidor ao registrar a operação.</div>}
            </> : <p className="text-xs text-slate-500">Carregando estado de risco da conta…</p>}
          </div>
        </section>

        {riskPct >= 5 ? <div className="flex gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.035] p-4 text-xs leading-5 text-amber-100/80"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>Seu perfil configurado permite de 5% a 10% de risco por operação. A plataforma respeitará essa configuração mantendo ativos os limites rígidos diário, semanal e de quantidade de operações.</span></div> : null}

        {message ? <div className={`rounded-xl border p-3 text-sm ${message.tone === "success" ? "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-200" : "border-red-400/20 bg-red-400/[0.04] text-red-200"}`}>{message.text}{createdId ? <Link href={`/dashboard/journal/${createdId}`} className="mt-2 flex items-center gap-1 text-xs underline">Abrir detalhes da operação <ChevronRight className="size-3" /></Link> : null}</div> : null}

        <button type="button" disabled={!canSubmit} onClick={submit} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"><Check className="size-4" />{isPending ? "Validando…" : "Abrir Operação"}</button>
        <p className="text-[10px] leading-5 text-slate-600">{BRAND.primaryName} registra e valida o plano. Nesta etapa, a plataforma ainda não envia ordens para a Exness.</p>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs text-slate-400">{label}{children}</label>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3"><p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">{label}</p><p className="tabular mt-1.5 text-sm font-medium text-slate-200">{value}</p></div>;
}

function ChecklistButton({ active, label, automatic = false, onClick }: { active: boolean; label: string; automatic?: boolean; onClick?: () => void }) {
  return <button type="button" disabled={automatic} onClick={onClick} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition ${active ? "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-100" : "border-slate-800 bg-slate-950/30 text-slate-500 hover:border-slate-700"} ${automatic ? "cursor-default" : ""}`}><span className={`grid size-4 place-items-center rounded border ${active ? "border-emerald-400/30 bg-emerald-400/10" : "border-slate-700"}`}>{active ? <Check className="size-3" /> : null}</span><span>{label}</span>{automatic ? <span className="ml-auto text-[9px] uppercase tracking-wide text-slate-600">automático</span> : null}</button>;
}
