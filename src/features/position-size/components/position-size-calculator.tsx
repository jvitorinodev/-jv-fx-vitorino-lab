"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Database, DollarSign, Percent, ShieldAlert, Target } from "lucide-react";
import { EXNESS_STANDARD_MT5_INSTRUMENTS } from "@/features/brokers/data/exness-instruments";
import { DEFAULT_RISK_POLICY } from "@/features/risk/config/default-risk-policy";
import { calculatePositionSize } from "@/lib/core/position-size-service";
import { formatters } from "@/lib/i18n/pt-br";
import { StatusPill } from "@/components/ui/status-pill";
import type { TerminalExecutionEstimate } from "@/lib/types/market-terminal";

const presets: Record<string, { entry: number; stop: number; target: number }> = {
  EURUSD: { entry: 1.18, stop: 1.176, target: 1.188 },
  GBPUSD: { entry: 1.34, stop: 1.334, target: 1.352 },
  USDJPY: { entry: 146.8, stop: 145.8, target: 148.8 },
  XAUUSD: { entry: 3679, stop: 3666, target: 3719 },
  XAGUSD: { entry: 43.2, stop: 42.7, target: 44.2 },
  NAS100: { entry: 24120, stop: 23970, target: 24420 },
  US30: { entry: 46300, stop: 46000, target: 46900 },
  SPX500: { entry: 6710, stop: 6670, target: 6790 },
  BTCUSD: { entry: 114800, stop: 111800, target: 120800 },
  ETHUSD: { entry: 4550, stop: 4400, target: 4850 },
};

const riskProfiles = [
  {
    key: "CONSERVADOR",
    label: "Conservador",
    description: "Faixa personalizada do JV FX para reduzir exposição por operação.",
    rangeLabel: "1% a 3%",
    min: 1,
    max: 3,
    defaultPct: 2,
  },
  {
    key: "MODERADO",
    label: "Moderado",
    description: "Faixa intermediária para equilibrar exposição e crescimento.",
    rangeLabel: "3% a 5%",
    min: 3,
    max: 5,
    defaultPct: 4,
  },
  {
    key: "ARRISCADO",
    label: "Arriscado",
    description: "Faixa elevada de exposição. O painel destaca margem e capital comprometido.",
    rangeLabel: "6% a 10%",
    min: 6,
    max: 10,
    defaultPct: 8,
  },
  {
    key: "ESPECULADOR",
    label: "Especulador",
    description: "Permite exposição acima de 10% até o limite configurado da conta, sujeita à margem disponível na Exness.",
    rangeLabel: "10% a 100%",
    min: 10,
    max: DEFAULT_RISK_POLICY.maxRiskPerTradePct,
    defaultPct: 15,
  },
] as const;

type RiskProfileKey = typeof riskProfiles[number]["key"];
type DirectionMode = "LONG" | "SHORT";
type DistanceMode = "PRICE" | "PERCENT" | "USD_DISTANCE";

const distanceModes = [
  { key: "PRICE" as const, label: "Preço", short: "Preço exato", icon: Target },
  { key: "PERCENT" as const, label: "%", short: "% da entrada", icon: Percent },
  { key: "USD_DISTANCE" as const, label: "US$", short: "Distância em US$", icon: DollarSign },
];

const fieldClass = "mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-500";

function floorToStep(value: number, step: number) {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(step) || step <= 0) return 0;
  const decimals = String(step).includes(".") ? String(step).split(".")[1]?.length ?? 0 : 0;
  return Number((Math.floor((value + Number.EPSILON) / step) * step).toFixed(decimals));
}

function resolveStopTarget(entry: number, stopValue: number, targetValue: number, direction: DirectionMode, mode: DistanceMode) {
  if (mode === "PRICE") return { stopPrice: stopValue, targetPrice: targetValue };
  const stopDistance = mode === "PERCENT" ? entry * (stopValue / 100) : stopValue;
  const targetDistance = mode === "PERCENT" ? entry * (targetValue / 100) : targetValue;
  if (direction === "LONG") return { stopPrice: entry - stopDistance, targetPrice: entry + targetDistance };
  return { stopPrice: entry + stopDistance, targetPrice: entry - targetDistance };
}

function convertMeasure(entry: number, stopPrice: number, targetPrice: number, mode: DistanceMode) {
  const stopDistance = Math.abs(entry - stopPrice);
  const targetDistance = Math.abs(targetPrice - entry);
  if (mode === "PRICE") return { stopValue: stopPrice, targetValue: targetPrice };
  if (mode === "PERCENT") {
    const divisor = Math.max(Math.abs(entry), Number.EPSILON);
    return { stopValue: stopDistance / divisor * 100, targetValue: targetDistance / divisor * 100 };
  }
  return { stopValue: stopDistance, targetValue: targetDistance };
}

export function PositionSizeCalculator({ standalone = false }: { standalone?: boolean }) {
  const [symbol, setSymbol] = useState("XAUUSD");
  const [balance, setBalance] = useState(10_000);
  const [profileKey, setProfileKey] = useState<RiskProfileKey>("CONSERVADOR");
  const [riskPct, setRiskPct] = useState<number>(riskProfiles[0].defaultPct);
  const [direction, setDirection] = useState<DirectionMode>("LONG");
  const [distanceMode, setDistanceMode] = useState<DistanceMode>("PRICE");
  const [entry, setEntry] = useState(presets.XAUUSD.entry);
  const [stopValue, setStopValue] = useState(presets.XAUUSD.stop);
  const [targetValue, setTargetValue] = useState(presets.XAUUSD.target);
  const [executionEstimate, setExecutionEstimate] = useState<TerminalExecutionEstimate | null>(null);

  const spec = useMemo(() => EXNESS_STANDARD_MT5_INSTRUMENTS.find((item) => item.internalSymbol === symbol)!, [symbol]);
  const activeProfile = riskProfiles.find((item) => item.key === profileKey) ?? riskProfiles[0];
  const { stopPrice, targetPrice } = useMemo(
    () => resolveStopTarget(entry, stopValue, targetValue, direction, distanceMode),
    [direction, distanceMode, entry, stopValue, targetValue],
  );

  const calculation = useMemo(() => {
    try {
      return {
        result: calculatePositionSize({
          capitalBase: balance,
          accountCurrency: "USD",
          riskPct,
          maxRiskPct: DEFAULT_RISK_POLICY.maxRiskPerTradePct,
          entryPrice: entry,
          stopPrice,
          targetPrice,
          specification: spec,
        }),
        error: null,
      };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Não foi possível calcular o tamanho da posição." };
    }
  }, [balance, entry, riskPct, spec, stopPrice, targetPrice]);

  const result = calculation.result;

  const marginView = useMemo(() => {
    if (!result || !executionEstimate || executionEstimate.volume <= 0) return null;
    const freeMargin = executionEstimate.accountFreeMargin;
    const marginRequired = executionEstimate.marginRequired;
    const sufficient = freeMargin == null ? null : marginRequired <= freeMargin;
    const step = executionEstimate.specification.volumeStep || spec.lotStep;
    const estimatedMaxLotsByMargin = freeMargin != null && marginRequired > 0
      ? floorToStep(executionEstimate.volume * (freeMargin / marginRequired), step)
      : null;
    const viableLots = estimatedMaxLotsByMargin == null
      ? result.recommendedLots
      : Math.min(result.recommendedLots, estimatedMaxLotsByMargin);
    return {
      freeMargin,
      sufficient,
      estimatedMaxLotsByMargin,
      viableLots,
      marginRequired,
    };
  }, [executionEstimate, result, spec.lotStep]);

  function applyPreset(nextSymbol: string, nextDirection: DirectionMode = direction, nextMode: DistanceMode = distanceMode) {
    const preset = presets[nextSymbol];
    if (!preset) return;
    setEntry(preset.entry);
    const rawStop = nextDirection === "LONG" ? preset.stop : preset.entry + Math.abs(preset.entry - preset.stop);
    const rawTarget = nextDirection === "LONG" ? preset.target : preset.entry - Math.abs(preset.target - preset.entry);
    const converted = convertMeasure(preset.entry, rawStop, rawTarget, nextMode);
    setStopValue(converted.stopValue);
    setTargetValue(converted.targetValue);
  }

  function changeSymbol(next: string) {
    setSymbol(next);
    applyPreset(next);
  }

  function selectProfile(next: RiskProfileKey) {
    const profile = riskProfiles.find((item) => item.key === next) ?? riskProfiles[0];
    setProfileKey(next);
    setRiskPct(profile.defaultPct);
  }

  function changeDirection(next: DirectionMode) {
    if (next === direction) return;
    const currentStopDistance = Math.abs(entry - stopPrice);
    const currentTargetDistance = Math.abs(targetPrice - entry);
    setDirection(next);
    if (distanceMode === "PRICE") {
      setStopValue(next === "LONG" ? entry - currentStopDistance : entry + currentStopDistance);
      setTargetValue(next === "LONG" ? entry + currentTargetDistance : entry - currentTargetDistance);
    }
  }

  function changeDistanceMode(next: DistanceMode) {
    if (next === distanceMode) return;
    const converted = convertMeasure(entry, stopPrice, targetPrice, next);
    setDistanceMode(next);
    setStopValue(converted.stopValue);
    setTargetValue(converted.targetValue);
  }

  function clampRiskPct(value: number) {
    if (Number.isNaN(value)) return activeProfile.defaultPct;
    return Math.min(Math.max(value, activeProfile.min), activeProfile.max);
  }

  useEffect(() => {
    let disposed = false;
    if (!result || result.recommendedLots <= 0) {
      setExecutionEstimate(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/market/execution-estimate?symbol=${encodeURIComponent(symbol)}&direction=${direction}&volume=${encodeURIComponent(String(result.recommendedLots))}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as TerminalExecutionEstimate;
        if (!disposed) setExecutionEstimate(payload);
      } catch {
        if (!disposed) setExecutionEstimate(null);
      }
    }, 250);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [direction, result?.recommendedLots, symbol]);

  const stopLabel = distanceMode === "PRICE" ? "Stop Loss · preço" : distanceMode === "PERCENT" ? "Stop Loss · % da entrada" : "Stop Loss · distância US$";
  const targetLabel = distanceMode === "PRICE" ? "Take Profit · preço" : distanceMode === "PERCENT" ? "Take Profit · % da entrada" : "Take Profit · distância US$";
  const measureStep = distanceMode === "PERCENT" ? "0.1" : "any";

  return (
    <div className="space-y-4">
      {standalone ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Calculadora de lote</h1>
            <p className="mt-1 text-sm text-slate-500">Dimensione lote, risco, Stop, Take Profit e margem usando dados de referência da Exness / MT5.</p>
          </div>
          <StatusPill tone="info">Exness · MT5</StatusPill>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)]">
        <section className="panel overflow-hidden">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Calculadora profissional Exness / MT5</p>
              <h2 className="mt-1 text-sm font-semibold text-slate-900">Gerenciamento, Stop/Take e margem operacional</h2>
            </div>
            <StatusPill tone="info">Exness · MT5</StatusPill>
          </div>

          <div className="space-y-5 p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {riskProfiles.map((profile) => {
                const selected = profile.key === profileKey;
                return (
                  <button
                    key={profile.key}
                    type="button"
                    onClick={() => selectProfile(profile.key)}
                    className={`rounded-xl border p-3 text-left transition ${selected ? "border-sky-400/40 bg-sky-400/[0.08]" : "border-slate-800 bg-slate-950/30 hover:border-slate-700"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-100">{profile.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selected ? "bg-sky-500/15 text-sky-200" : "bg-slate-800 text-slate-400"}`}>{profile.rangeLabel}</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-slate-500">{profile.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoBox label="Corretora" value="Exness" />
              <InfoBox label="Conta" value="Standard · USD" />
              <InfoBox label="Perfil" value={`${activeProfile.label} · ${activeProfile.rangeLabel}`} />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="eyebrow">Direção da operação</p>
                  <p className="mt-1 text-xs text-slate-500">Usada para transformar porcentagem ou distância em preços reais de Stop e Take.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => changeDirection("LONG")} className={`h-9 rounded-lg border px-4 text-xs font-semibold transition ${direction === "LONG" ? "border-emerald-400/40 bg-emerald-400/[0.08] text-emerald-300" : "border-slate-800 bg-slate-950/35 text-slate-400"}`}>Compra</button>
                  <button type="button" onClick={() => changeDirection("SHORT")} className={`h-9 rounded-lg border px-4 text-xs font-semibold transition ${direction === "SHORT" ? "border-red-400/40 bg-red-400/[0.08] text-red-300" : "border-slate-800 bg-slate-950/35 text-slate-400"}`}>Venda</button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-3">
              <p className="eyebrow">Como medir Stop Loss e Take Profit</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {distanceModes.map((mode) => {
                  const Icon = mode.icon;
                  const active = distanceMode === mode.key;
                  return <button key={mode.key} type="button" onClick={() => changeDistanceMode(mode.key)} className={`flex h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${active ? "border-sky-400/40 bg-sky-400/[0.08] text-sky-200" : "border-slate-800 bg-slate-950/35 text-slate-400 hover:text-slate-200"}`}><Icon className="size-3.5" />{mode.short}</button>;
                })}
              </div>
              <p className="mt-2 text-[10px] leading-5 text-slate-600">Preço: informe o nível exato. %: informe a distância percentual da entrada. US$: informe quantos dólares de distância no preço você quer entre a entrada e o Stop/Take.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-slate-400">Saldo da conta (USD)
                <input className={fieldClass} type="number" min="1" step="100" value={balance} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setBalance(Number(event.target.value))} />
              </label>
              <label className="text-xs text-slate-400">Ativo
                <select className={fieldClass} value={symbol} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => changeSymbol(event.target.value)}>
                  {EXNESS_STANDARD_MT5_INSTRUMENTS.map((item) => <option key={item.internalSymbol} value={item.internalSymbol}>{item.internalSymbol} · Exness {item.brokerSymbol}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-400">Entrada
                <input className={fieldClass} type="number" step="any" value={entry} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEntry(Number(event.target.value))} />
              </label>
              <label className="text-xs text-slate-400">Risco por operação (%)
                <input className={fieldClass} type="number" min={activeProfile.min} max={activeProfile.max} step="0.5" value={riskPct} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRiskPct(clampRiskPct(Number(event.target.value)))} />
                <span className="mt-1.5 block text-[10px] text-slate-600">Faixa atual: {activeProfile.rangeLabel}. Especulador pode chegar a {DEFAULT_RISK_POLICY.maxRiskPerTradePct}%.</span>
              </label>
              <label className="text-xs text-slate-400">{stopLabel}
                <input className={fieldClass} type="number" min={distanceMode === "PRICE" ? undefined : 0} step={measureStep} value={stopValue} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setStopValue(Number(event.target.value))} />
              </label>
              <label className="text-xs text-slate-400">{targetLabel}
                <input className={fieldClass} type="number" min={distanceMode === "PRICE" ? undefined : 0} step={measureStep} value={targetValue} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTargetValue(Number(event.target.value))} />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DerivedPrice label="Stop calculado" value={stopPrice} symbol={symbol} />
              <DerivedPrice label="Take calculado" value={targetPrice} symbol={symbol} />
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-4">
              <div className="mb-3 flex items-center justify-between gap-3"><div><p className="eyebrow">Especificação do contrato</p><p className="mt-1 text-sm font-semibold text-slate-200">{spec.internalSymbol} → {spec.brokerSymbol}</p></div><span className="flex items-center gap-1 text-[10px] text-slate-500"><Database className="size-3" />Referência Exness</span></div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div><p className="text-slate-600">Contrato</p><p className="tabular mt-1 text-slate-300">{formatters.compact.format(spec.contractSize)}</p></div>
                <div><p className="text-slate-600">Tamanho do pip</p><p className="tabular mt-1 text-slate-300">{spec.pipSize}</p></div>
                <div><p className="text-slate-600">Lote mínimo</p><p className="tabular mt-1 text-slate-300">{spec.minLot}</p></div>
                <div><p className="text-slate-600">Passo do lote</p><p className="tabular mt-1 text-slate-300">{spec.lotStep}</p></div>
              </div>
              <p className="mt-3 text-[10px] leading-5 text-slate-600">As especificações podem variar por conta, sessão, símbolo e alavancagem. A margem ao vivo vem do MT5 quando o Bridge estiver conectado.</p>
            </div>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-header"><div><p className="eyebrow">Resultado calculado</p><h2 className="mt-1 text-sm font-semibold text-slate-900">Lote, risco, Stop/Take e margem</h2></div><Calculator className="size-4 text-slate-500" /></div>
          <div className="p-4">
            {calculation.error ? (
              <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">{calculation.error}</div>
            ) : result ? (
              <>
                <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.04] p-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="eyebrow">Volume por gerenciamento</p>
                      <p className="tabular mt-2 text-4xl font-semibold tracking-tight text-slate-100">{result.recommendedLots.toFixed(2)} <span className="text-base font-medium text-slate-500">lote</span></p>
                    </div>
                    <StatusPill tone={direction === "LONG" ? "positive" : "negative"}>{direction === "LONG" ? "COMPRA" : "VENDA"}</StatusPill>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Calculado pelo saldo, risco selecionado e distância do Stop. A margem disponível pode reduzir o volume viável.</p>
                </div>

                {marginView?.sufficient === false ? (
                  <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
                    <div className="flex gap-3"><ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-300" /><div><p className="text-sm font-semibold text-amber-200">Margem insuficiente para o volume calculado</p><p className="mt-1 text-xs leading-5 text-amber-200/80">A Exness/MT5 informa margem livre menor que a margem necessária. O lote viável estimado pela margem é {marginView.viableLots.toFixed(2)}.</p></div></div>
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <ResultCell label="Perfil" value={`${activeProfile.label} · ${riskPct.toFixed(2)}%`} />
                  <ResultCell label="Orçamento de risco" value={formatters.usd.format(result.riskBudget)} />
                  <ResultCell label="Risco real" value={`${formatters.usd.format(result.actualRisk)} · ${result.actualRiskPct.toFixed(2)}%`} tone={result.actualRisk > 0 ? "negative" : "neutral"} />
                  <ResultCell label="Distância do Stop" value={`${result.pipDistance.toFixed(1)} pips`} />
                  <ResultCell label="Stop calculado" value={formatPrice(stopPrice)} />
                  <ResultCell label="Take calculado" value={formatPrice(targetPrice)} />
                  <ResultCell label="R:R" value={result.rewardRiskRatio ? `1 : ${result.rewardRiskRatio.toFixed(2)}` : "—"} tone={result.rewardRiskRatio && result.rewardRiskRatio >= 1 ? "positive" : "neutral"} />
                  <ResultCell label="Lucro projetado" value={result.potentialProfit !== null ? formatters.usd.format(result.potentialProfit) : "—"} tone={result.potentialProfit && result.potentialProfit > 0 ? "positive" : "neutral"} />
                  <ResultCell label="Margem necessária" value={executionEstimate ? `${executionEstimate.marginRequired.toFixed(2)} ${executionEstimate.accountCurrency}` : "Aguardando MT5"} tone={marginView?.sufficient === false ? "negative" : marginView?.sufficient === true ? "positive" : "neutral"} />
                  <ResultCell label="Margem livre MT5" value={executionEstimate?.accountFreeMargin != null ? `${executionEstimate.accountFreeMargin.toFixed(2)} ${executionEstimate.accountCurrency}` : "Aguardando MT5"} tone={marginView?.sufficient === false ? "negative" : marginView?.sufficient === true ? "positive" : "neutral"} />
                  <ResultCell label="Lote viável pela margem" value={marginView ? marginView.viableLots.toFixed(2) : "—"} tone={marginView?.sufficient === false ? "negative" : marginView?.sufficient === true ? "positive" : "neutral"} />
                  <ResultCell label="Alavancagem" value={executionEstimate?.leverage ? `1:${executionEstimate.leverage}` : "—"} />
                  <ResultCell label="Capital comprometido" value={executionEstimate ? `${executionEstimate.capitalCommittedPct.toFixed(2)}%` : "—"} tone={executionEstimate && executionEstimate.capitalCommittedPct > 35 ? "negative" : executionEstimate && executionEstimate.capitalCommittedPct > 0 ? "positive" : "neutral"} />
                  <ResultCell label="Valor / pip / lote" value={formatters.usd.format(result.valuePerPipPerLot)} />
                </div>

                {result.warnings.length ? <div className="mt-4 space-y-2">{result.warnings.map((warning) => <div key={warning} className="flex gap-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.04] px-3 py-2 text-xs leading-5 text-amber-200/85"><ShieldAlert className="mt-0.5 size-4 shrink-0" />{warning}</div>)}</div> : null}
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"><p className="eyebrow">{label}</p><p className="mt-1 text-sm font-medium text-slate-200">{value}</p></div>;
}

function DerivedPrice({ label, value, symbol }: { label: string; value: number; symbol: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-3"><p className="eyebrow">{label}</p><div className="mt-1.5 flex items-end justify-between gap-3"><p className="tabular text-lg font-semibold text-slate-100">{formatPrice(value)}</p><span className="text-[10px] text-slate-500">{symbol}</span></div></div>;
}

function ResultCell({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "positive" | "negative" }) {
  const cls = tone === "positive" ? "text-emerald-300" : tone === "negative" ? "text-red-300" : "text-slate-200";
  const border = tone === "positive" ? "border-emerald-400/20 bg-emerald-400/[0.04]" : tone === "negative" ? "border-red-400/20 bg-red-400/[0.04]" : "border-slate-800 bg-slate-950/35";
  return <div className={`rounded-lg ${border} p-3`}><p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</p><p className={`tabular mt-1.5 text-sm font-medium ${cls}`}>{value}</p></div>;
}

function formatPrice(value: number) {
  if (!Number.isFinite(value)) return "—";
  const decimals = Math.abs(value) >= 1000 ? 2 : Math.abs(value) >= 10 ? 3 : 5;
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(value);
}
