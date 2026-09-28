"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Bell, CheckCircle2, Filter, Layers3, Plus, RotateCcw, Save, Search, Sparkles } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { CONFLUENCE_CATALOG, calculateConfluenceScore, selectionFromKeys } from "@/lib/core/confluence-service";
import type { MarketAnalysisRecord, AnalysisTimeframe, PriceLocation } from "@/lib/types/market-analysis";
import type { DataSource, Direction } from "@/lib/types/trading";
import type { ConfluenceSelection, ConfluenceWeightMap, PriceZoneRecord, PriceZoneStatus, PriceZoneType } from "@/lib/types/price-zones";
import { labelConfluenceLevel, labelDataSource, labelPriceZoneStatus, labelPriceZoneType } from "@/lib/i18n/pt-br";
import { savePriceZoneAction, updatePriceZoneStatusAction } from "@/features/price-zones/actions/price-zone-actions";
import { createDemoPriceZones } from "@/features/price-zones/data/demo-price-zones";
import { loadDemoConfluenceWeights, loadDemoPriceZones, replaceDemoPriceZones, upsertDemoPriceZone } from "@/features/price-zones/data/demo-price-zone-store";
import { loadDemoAnalyses } from "@/features/market-analysis/data/demo-analysis-store";
import { ANALYSIS_SYMBOLS, ANALYSIS_TIMEFRAMES, getDemoQuote } from "@/features/market-analysis/data/demo-market-analysis";
import { ConfluenceSelector } from "@/features/price-zones/components/confluence-selector";
import { PriceZoneCard } from "@/features/price-zones/components/price-zone-card";

const fieldClass = "mt-1.5 h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-500";
const areaClass = "mt-1.5 min-h-24 w-full resize-y rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500";
const zoneTypes: PriceZoneType[] = ["FVG", "IFVG", "BPR", "ORDER_BLOCK", "BREAKER_BLOCK", "MITIGATION_BLOCK", "OTE", "SUPPORT", "RESISTANCE", "CUSTOM"];
const priceLocations: PriceLocation[] = ["DISCOUNT", "EQUILIBRIUM", "PREMIUM", "NONE"];

function roundPrice(symbol: string, value: number) {
  const digits = ["EURUSD", "GBPUSD"].includes(symbol) ? 5 : symbol === "USDJPY" ? 3 : ["XAUUSD", "XAGUSD"].includes(symbol) ? 2 : 2;
  return Number(value.toFixed(digits));
}

function suggestedGeometry(symbol: string, direction: Direction) {
  const price = getDemoQuote(symbol).price;
  if (direction === "LONG") {
    return {
      lower: roundPrice(symbol, price * 0.9965),
      upper: roundPrice(symbol, price * 0.9985),
      invalidation: roundPrice(symbol, price * 0.9935),
    };
  }
  return {
    lower: roundPrice(symbol, price * 1.0015),
    upper: roundPrice(symbol, price * 1.0035),
    invalidation: roundPrice(symbol, price * 1.0065),
  };
}

function analysisConfluenceKeys(analysis: MarketAnalysisRecord): string[] {
  const keys = new Set<string>();
  if (analysis.consensus.direction) keys.add("htf_alignment");
  const execution = analysis.timeframes.find((item) => item.timeframe === analysis.executionTimeframe);
  if (execution?.priceLocation === "DISCOUNT" || execution?.priceLocation === "PREMIUM") keys.add("premium_discount");
  if (execution?.structure === "BOS") keys.add("bos");
  if (execution?.structure === "CHOCH") keys.add("choch");
  if (execution?.structure === "MSS") keys.add("mss");
  if (execution?.liquidity === "TAKEN") keys.add("liquidity_sweep");
  if (analysis.liquidity.previousDayHigh || analysis.liquidity.previousDayLow) keys.add("pdh_pdl");
  if (analysis.liquidity.previousWeekHigh || analysis.liquidity.previousWeekLow) keys.add("pwh_pwl");
  if (analysis.liquidity.asiaHigh || analysis.liquidity.asiaLow) keys.add("asian_liquidity");
  if ((analysis.volume.relativeVolumePct ?? 0) >= 100) keys.add("volume_confirmation");
  if (analysis.volume.vwapPosition !== "UNAVAILABLE") keys.add("vwap_context");

  const direction = analysis.consensus.direction;
  const ma = analysis.movingAverages;
  if (direction === "LONG") {
    if (ma.ema9Above20 === true) keys.add("ema_9_20_cross");
    if (ma.priceAboveEma50 === true) keys.add("ema_50_context");
    if (ma.priceAboveEma200 === true) keys.add("ema_200_context");
    if (ma.ema9Above20 === true && ma.priceAboveEma50 === true && ma.priceAboveEma200 === true) keys.add("ema_alignment");
  } else if (direction === "SHORT") {
    if (ma.ema9Above20 === false) keys.add("ema_9_20_cross");
    if (ma.priceAboveEma50 === false) keys.add("ema_50_context");
    if (ma.priceAboveEma200 === false) keys.add("ema_200_context");
    if (ma.ema9Above20 === false && ma.priceAboveEma50 === false && ma.priceAboveEma200 === false) keys.add("ema_alignment");
  }

  if (analysis.priceAction.confirmed) keys.add("price_action_confirmation");
  return [...keys];
}

export function PriceZonesWorkspace({
  initialZones,
  initialAnalyses,
  initialWeights,
  source,
  initialSetupId,
  initialConfluenceKey,
}: {
  initialZones: PriceZoneRecord[];
  initialAnalyses: MarketAnalysisRecord[];
  initialWeights: ConfluenceWeightMap;
  source: DataSource;
  initialSetupId?: string;
  initialConfluenceKey?: string;
}) {
  const [zones, setZones] = useState<PriceZoneRecord[]>(initialZones);
  const [analyses, setAnalyses] = useState<MarketAnalysisRecord[]>(initialAnalyses);
  const [weights, setWeights] = useState<ConfluenceWeightMap>(initialWeights);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string>("");
  const [setupId, setSetupId] = useState(initialSetupId ?? "");
  const [symbol, setSymbol] = useState("XAUUSD");
  const [direction, setDirection] = useState<Direction>("LONG");
  const [timeframe, setTimeframe] = useState<AnalysisTimeframe>("4H");
  const [zoneType, setZoneType] = useState<PriceZoneType>("FVG");
  const [priceLocation, setPriceLocation] = useState<PriceLocation>("DISCOUNT");
  const initialGeometry = suggestedGeometry("XAUUSD", "LONG");
  const [lowerPrice, setLowerPrice] = useState(initialGeometry.lower);
  const [upperPrice, setUpperPrice] = useState(initialGeometry.upper);
  const [invalidationPrice, setInvalidationPrice] = useState<number | null>(initialGeometry.invalidation);
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [notes, setNotes] = useState("");
  const [confluences, setConfluences] = useState<ConfluenceSelection[]>(() => selectionFromKeys(["htf_alignment", "liquidity_sweep", "fvg", "mss"], initialWeights, "4H"));
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PriceZoneStatus>("ALL");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_MODE === "production") return;
    const storedZones = loadDemoPriceZones();
    if (storedZones.length) setZones(storedZones);
    else {
      const seeded = createDemoPriceZones();
      replaceDemoPriceZones(seeded);
      setZones(seeded);
    }
    const storedAnalyses = loadDemoAnalyses();
    if (storedAnalyses.length) setAnalyses(storedAnalyses);
    setWeights(loadDemoConfluenceWeights());
  }, []);

  useEffect(() => {
    if (!initialSetupId || !analyses.length || analysisId) return;
    const analysis = analyses.find((item) => item.setupId === initialSetupId);
    if (analysis) {
      applyAnalysis(analysis);
      if (initialConfluenceKey && CONFLUENCE_CATALOG.some((item) => item.key === initialConfluenceKey)) {
        setConfluences((current) => selectionFromKeys([...current.map((item) => item.key), initialConfluenceKey], weights, analysis.executionTimeframe));
      }
    } else {
      setSetupId(initialSetupId);
      if (initialConfluenceKey && CONFLUENCE_CATALOG.some((item) => item.key === initialConfluenceKey)) {
        setConfluences((current) => selectionFromKeys([...current.map((item) => item.key), initialConfluenceKey], weights, timeframe));
      }
    }
  }, [analyses, initialSetupId, initialConfluenceKey, analysisId]);

  const score = useMemo(() => calculateConfluenceScore(confluences), [confluences]);
  const filteredZones = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return zones
      .filter((zone) => statusFilter === "ALL" || zone.status === statusFilter)
      .filter((zone) => !normalized || `${zone.symbol} ${zone.setupId} ${zone.zoneType} ${zone.notes}`.toLowerCase().includes(normalized))
      .sort((a, b) => b.score.points - a.score.points || +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [query, statusFilter, zones]);

  const summary = useMemo(() => ({
    active: zones.filter((zone) => !["INVALIDATED", "COMPLETED", "ARCHIVED"].includes(zone.status)).length,
    high: zones.filter((zone) => zone.score.points >= 10 && zone.status !== "ARCHIVED").length,
    approaching: zones.filter((zone) => ["APPROACHING", "INSIDE_ZONE"].includes(zone.status)).length,
    alerts: zones.filter((zone) => zone.alertEnabled && zone.status !== "ARCHIVED").length,
  }), [zones]);

  function setGeometry(nextSymbol: string, nextDirection: Direction) {
    const next = suggestedGeometry(nextSymbol, nextDirection);
    setLowerPrice(next.lower);
    setUpperPrice(next.upper);
    setInvalidationPrice(next.invalidation);
  }

  function changeSymbol(next: string) {
    setSymbol(next);
    setGeometry(next, direction);
  }

  function changeDirection(next: Direction) {
    setDirection(next);
    setGeometry(symbol, next);
  }

  function applyAnalysis(analysis: MarketAnalysisRecord) {
    const nextDirection = analysis.consensus.direction ?? "LONG";
    const execution = analysis.timeframes.find((item) => item.timeframe === analysis.executionTimeframe);
    setAnalysisId(analysis.id);
    setSetupId(analysis.setupId);
    setSymbol(analysis.symbol);
    setDirection(nextDirection);
    setTimeframe(analysis.executionTimeframe);
    setPriceLocation(execution?.priceLocation ?? "NONE");
    setGeometry(analysis.symbol, nextDirection);
    setConfluences(selectionFromKeys(analysisConfluenceKeys(analysis), weights, analysis.executionTimeframe));
    setNotes(analysis.thesis ? `Tese da análise: ${analysis.thesis}` : "");
    setEditingZoneId(null);
    setMessage(null);
  }

  function resetForm() {
    setEditingZoneId(null);
    setAnalysisId("");
    setSetupId("");
    setSymbol("XAUUSD");
    setDirection("LONG");
    setTimeframe("4H");
    setZoneType("FVG");
    setPriceLocation("DISCOUNT");
    const geometry = suggestedGeometry("XAUUSD", "LONG");
    setLowerPrice(geometry.lower);
    setUpperPrice(geometry.upper);
    setInvalidationPrice(geometry.invalidation);
    setAlertEnabled(true);
    setNotes("");
    setConfluences(selectionFromKeys(["htf_alignment", "liquidity_sweep", "fvg", "mss"], weights, "4H"));
    setMessage(null);
  }

  function editZone(zone: PriceZoneRecord) {
    setEditingZoneId(zone.id);
    setAnalysisId(zone.analysisId ?? "");
    setSetupId(zone.setupId);
    setSymbol(zone.symbol);
    setDirection(zone.direction);
    setTimeframe(zone.timeframe);
    setZoneType(zone.zoneType);
    setPriceLocation(zone.priceLocation);
    setLowerPrice(zone.lowerPrice);
    setUpperPrice(zone.upperPrice);
    setInvalidationPrice(zone.invalidationPrice);
    setAlertEnabled(zone.alertEnabled);
    setNotes(zone.notes);
    setConfluences(zone.confluences);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function duplicateZone(zone: PriceZoneRecord) {
    editZone({ ...zone, id: "", notes: `${zone.notes}${zone.notes ? "\n" : ""}Duplicada a partir da zona ${zone.id.slice(0, 8)}.` });
    setEditingZoneId(null);
  }

  function saveZone() {
    setMessage(null);
    startTransition(async () => {
      const result = await savePriceZoneAction({
        zoneId: editingZoneId ?? undefined,
        analysisId: analysisId || null,
        setupId: setupId.trim(),
        symbol,
        direction,
        timeframe,
        zoneType,
        lowerPrice,
        upperPrice,
        invalidationPrice,
        priceLocation,
        status: editingZoneId ? zones.find((item) => item.id === editingZoneId)?.status ?? "WAITING" : "WAITING",
        confluences,
        alertEnabled,
        notes,
        source,
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      if (process.env.NEXT_PUBLIC_APP_MODE !== "production") upsertDemoPriceZone(result.zone);
      setZones((current) => [result.zone, ...current.filter((item) => item.id !== result.zone.id)]);
      setEditingZoneId(result.zone.id);
      setMessage({ tone: "success", text: result.message });
    });
  }

  function changeStatus(zone: PriceZoneRecord, status: PriceZoneStatus) {
    startTransition(async () => {
      const result = await updatePriceZoneStatusAction(zone.id, status);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      const updated = { ...zone, status, updatedAt: new Date().toISOString() };
      if (process.env.NEXT_PUBLIC_APP_MODE !== "production") upsertDemoPriceZone(updated);
      setZones((current) => current.map((item) => item.id === zone.id ? updated : item));
      setMessage({ tone: "success", text: `Status atualizado para ${labelPriceZoneStatus(status)}.` });
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={<Layers3 className="size-4" />} label="Zonas ativas" value={summary.active.toString()} />
        <Summary icon={<Sparkles className="size-4" />} label="Alta confluência" value={summary.high.toString()} />
        <Summary icon={<CheckCircle2 className="size-4" />} label="Próximas / dentro" value={summary.approaching.toString()} />
        <Summary icon={<Bell className="size-4" />} label="Alertas preparados" value={summary.alerts.toString()} />
      </div>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <div><p className="eyebrow">Construção da zona</p><h2 className="mt-1 text-sm font-semibold">{editingZoneId ? "Editar Zona de Preço" : "Nova Zona de Preço"}</h2></div>
          <div className="flex items-center gap-2"><StatusPill tone="info">{labelDataSource(source)}</StatusPill><button type="button" onClick={resetForm} className="action"><RotateCcw className="size-3.5" />Nova</button></div>
        </div>
        <div className="space-y-5 p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Análise vinculada"><select className={fieldClass} value={analysisId} onChange={(event) => { const analysis = analyses.find((item) => item.id === event.target.value); if (analysis) applyAnalysis(analysis); else setAnalysisId(""); }}><option value="">Sem vínculo</option>{analyses.map((item) => <option key={item.id} value={item.id}>{item.setupId} · {item.symbol}</option>)}</select></Field>
            <Field label="ID da Configuração"><input className={fieldClass} value={setupId} onChange={(event) => setSetupId(event.target.value)} placeholder="XAUUSD-20260921-001" /></Field>
            <Field label="Ativo"><select className={fieldClass} value={symbol} onChange={(event) => changeSymbol(event.target.value)}>{ANALYSIS_SYMBOLS.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Contexto direcional"><select className={fieldClass} value={direction} onChange={(event) => changeDirection(event.target.value as Direction)}><option value="LONG">VIÉS ALTISTA</option><option value="SHORT">VIÉS BAIXISTA</option></select></Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Tipo de zona"><select className={fieldClass} value={zoneType} onChange={(event) => setZoneType(event.target.value as PriceZoneType)}>{zoneTypes.map((item) => <option key={item} value={item}>{labelPriceZoneType(item)}</option>)}</select></Field>
            <Field label="Timeframe"><select className={fieldClass} value={timeframe} onChange={(event) => { setTimeframe(event.target.value as AnalysisTimeframe); setConfluences(selectionFromKeys(confluences.map((item) => item.key), weights, event.target.value)); }}>{ANALYSIS_TIMEFRAMES.map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Localização"><select className={fieldClass} value={priceLocation} onChange={(event) => setPriceLocation(event.target.value as PriceLocation)}>{priceLocations.map((item) => <option key={item} value={item}>{item === "EQUILIBRIUM" ? "EQUILÍBRIO" : item === "NONE" ? "NÃO DEFINIDA" : item}</option>)}</select></Field>
            <label className="flex items-end gap-2 pb-2 text-xs text-slate-400"><input type="checkbox" checked={alertEnabled} onChange={(event) => setAlertEnabled(event.target.checked)} className="size-4 accent-sky-500" />Preparar alerta para esta zona</label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Preço inferior"><input className={fieldClass} type="number" step="any" value={lowerPrice} onChange={(event) => setLowerPrice(Number(event.target.value))} /></Field>
            <Field label="Preço superior"><input className={fieldClass} type="number" step="any" value={upperPrice} onChange={(event) => setUpperPrice(Number(event.target.value))} /></Field>
            <Field label="Preço de invalidação"><input className={fieldClass} type="number" step="any" value={invalidationPrice ?? ""} onChange={(event) => setInvalidationPrice(event.target.value ? Number(event.target.value) : null)} /></Field>
          </div>

          <Field label="Notas da zona"><textarea className={areaClass} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Liquidez, reação esperada, condição de invalidação e observações do contexto..." /></Field>

          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Motor de Confluências</p><h3 className="mt-1 text-sm font-semibold">Evidências desta zona</h3></div><div className="text-right"><p className="tabular text-2xl font-semibold text-slate-100">{score.points.toFixed(1)}</p><p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">{labelConfluenceLevel(score.level)} · {score.selectedCount} itens</p></div></div>
            <ConfluenceSelector selected={confluences} weights={weights} timeframe={timeframe} onChange={setConfluences} />
            <p className="mt-4 text-[10px] leading-4 text-slate-600">A pontuação soma somente os pesos configurados. Ela não representa percentual de acerto, probabilidade de ganho ou recomendação de execução.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900 pt-4">
            <div>{message ? <p className={`text-xs ${message.tone === "success" ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p> : <p className="text-xs text-slate-600">Zonas podem compartilhar o mesmo ID da Configuração para manter o contexto de uma única tese.</p>}</div>
            <button type="button" onClick={saveZone} disabled={isPending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-100 px-4 text-xs font-semibold text-slate-950 hover:bg-white disabled:opacity-40"><Save className="size-3.5" />{isPending ? "Salvando…" : editingZoneId ? "Atualizar zona" : "Salvar zona"}</button>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header"><div><p className="eyebrow">Mapa operacional</p><h2 className="mt-1 text-sm font-semibold">Zonas registradas</h2></div><span className="text-xs text-slate-500">{filteredZones.length} exibidas</span></div>
        <div className="grid gap-3 border-b border-slate-800/80 p-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-600" /><input className={`${fieldClass} mt-0 pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por ativo, ID, tipo ou nota..." /></label>
          <label className="relative"><Filter className="absolute left-3 top-3 size-4 text-slate-600" /><select className={`${fieldClass} mt-0 pl-9`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | PriceZoneStatus)}><option value="ALL">Todos os status</option><option value="WAITING">Aguardando</option><option value="APPROACHING">Aproximando</option><option value="INSIDE_ZONE">Dentro da zona</option><option value="REACTION">Reação</option><option value="INVALIDATED">Invalidada</option><option value="COMPLETED">Concluída</option><option value="ARCHIVED">Arquivada</option></select></label>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredZones.length ? filteredZones.map((zone) => <PriceZoneCard key={zone.id} zone={zone} onEdit={editZone} onDuplicate={duplicateZone} onStatus={changeStatus} />) : <div className="panel col-span-full p-8 text-center"><Plus className="mx-auto size-5 text-slate-600" /><p className="mt-3 text-sm text-slate-300">Nenhuma zona corresponde aos filtros atuais.</p><p className="mt-1 text-xs text-slate-600">Crie uma nova zona ou redefina os filtros.</p></div>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs text-slate-400">{label}{children}</label>;
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="panel flex items-center gap-3 p-4"><div className="grid size-9 place-items-center rounded-lg border border-slate-800 bg-slate-950/50 text-slate-500">{icon}</div><div><p className="eyebrow">{label}</p><p className="tabular mt-1 text-xl font-semibold text-slate-100">{value}</p></div></div>;
}
