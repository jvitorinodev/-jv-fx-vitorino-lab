import type {
  AutoAnalysisSnapshot,
  AutoEvidence,
  AutoEvidenceConfidence,
  AutoEvidenceDirection,
  MarketCandle,
  TerminalTimeframe,
} from "@/lib/types/market-terminal";

function last<T>(items: readonly T[], offset = 0): T | undefined {
  return items[items.length - 1 - offset];
}

function ema(values: readonly number[], period: number): number[] {
  if (!values.length) return [];
  const alpha = 2 / (period + 1);
  let current = values[0];
  return values.map((value, index) => {
    current = index === 0 ? value : value * alpha + current * (1 - alpha);
    return current;
  });
}

function rsi(values: readonly number[], period = 14): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);
  if (values.length <= period) return result;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const delta = values[i] - values[i - 1];
    gains += Math.max(delta, 0);
    losses += Math.max(-delta, 0);
  }
  let averageGain = gains / period;
  let averageLoss = losses / period;
  result[period] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);

  for (let i = period + 1; i < values.length; i += 1) {
    const delta = values[i] - values[i - 1];
    averageGain = (averageGain * (period - 1) + Math.max(delta, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-delta, 0)) / period;
    result[i] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  }
  return result;
}

type Pivot = { index: number; price: number; type: "HIGH" | "LOW" };

function pivots(candles: readonly MarketCandle[], radius = 2): Pivot[] {
  const rows: Pivot[] = [];
  for (let i = radius; i < candles.length - radius; i += 1) {
    const current = candles[i];
    const neighborhood = candles.slice(i - radius, i + radius + 1);
    if (neighborhood.every((row, idx) => idx === radius || current.high > row.high)) rows.push({ index: i, price: current.high, type: "HIGH" });
    if (neighborhood.every((row, idx) => idx === radius || current.low < row.low)) rows.push({ index: i, price: current.low, type: "LOW" });
  }
  return rows;
}

function confidenceFromRecency(index: number, length: number): AutoEvidenceConfidence {
  const barsAgo = Math.max(0, length - 1 - index);
  if (barsAgo <= 3) return "HIGH";
  if (barsAgo <= 8) return "MEDIUM";
  return "LOW";
}

function evidence(
  key: string,
  label: string,
  category: string,
  direction: AutoEvidenceDirection,
  confidence: AutoEvidenceConfidence,
  detail: string,
  confluenceKey?: string,
  zone?: AutoEvidence["zone"],
): AutoEvidence {
  return { key, label, category, direction, confidence, detail, confluenceKey, zone };
}

function detectStructure(candles: readonly MarketCandle[]): AutoEvidence[] {
  if (candles.length < 20) return [];
  const rows = pivots(candles, 2);
  const highs = rows.filter((row) => row.type === "HIGH");
  const lows = rows.filter((row) => row.type === "LOW");
  const lastHigh = last(highs);
  const previousHigh = last(highs, 1);
  const lastLow = last(lows);
  const previousLow = last(lows, 1);
  const current = last(candles)!;
  const prior = last(candles, 1)!;
  const output: AutoEvidence[] = [];

  if (lastHigh && current.close > lastHigh.price && prior.close <= lastHigh.price) {
    output.push(evidence("auto_bos_up", "BOS detectado", "ESTRUTURA", "BULLISH", "HIGH", `Fechamento rompeu a máxima estrutural ${lastHigh.price.toFixed(5)}.`, "bos"));
  }
  if (lastLow && current.close < lastLow.price && prior.close >= lastLow.price) {
    output.push(evidence("auto_bos_down", "BOS detectado", "ESTRUTURA", "BEARISH", "HIGH", `Fechamento rompeu a mínima estrutural ${lastLow.price.toFixed(5)}.`, "bos"));
  }

  if (lastHigh && previousHigh && lastLow && previousLow) {
    const bullishSequence = lastHigh.price > previousHigh.price && lastLow.price > previousLow.price;
    const bearishSequence = lastHigh.price < previousHigh.price && lastLow.price < previousLow.price;
    if (bullishSequence) output.push(evidence("auto_structure_hh_hl", "Estrutura HH/HL", "ESTRUTURA", "BULLISH", "MEDIUM", "Os dois últimos swings confirmados formam máxima e mínima ascendentes."));
    if (bearishSequence) output.push(evidence("auto_structure_lh_ll", "Estrutura LH/LL", "ESTRUTURA", "BEARISH", "MEDIUM", "Os dois últimos swings confirmados formam máxima e mínima descendentes."));

    if (bullishSequence && current.close < lastLow.price) {
      output.push(evidence("auto_choch_down", "CHoCH detectado", "ESTRUTURA", "BEARISH", "HIGH", "Estrutura previamente ascendente perdeu a última mínima relevante.", "choch"));
    }
    if (bearishSequence && current.close > lastHigh.price) {
      output.push(evidence("auto_choch_up", "CHoCH detectado", "ESTRUTURA", "BULLISH", "HIGH", "Estrutura previamente descendente rompeu a última máxima relevante.", "choch"));
    }
  }

  return output;
}

function detectLiquiditySweep(candles: readonly MarketCandle[]): AutoEvidence[] {
  if (candles.length < 25) return [];
  const recent = candles.slice(-25, -1);
  const current = last(candles)!;
  const priorHigh = Math.max(...recent.map((row) => row.high));
  const priorLow = Math.min(...recent.map((row) => row.low));
  const output: AutoEvidence[] = [];

  if (current.high > priorHigh && current.close < priorHigh) {
    output.push(evidence("auto_sweep_high", "Varredura de liquidez", "LIQUIDEZ", "BEARISH", "HIGH", "O candle atual superou a máxima recente e fechou novamente abaixo dela.", "liquidity_sweep"));
  }
  if (current.low < priorLow && current.close > priorLow) {
    output.push(evidence("auto_sweep_low", "Varredura de liquidez", "LIQUIDEZ", "BULLISH", "HIGH", "O candle atual rompeu a mínima recente e fechou novamente acima dela.", "liquidity_sweep"));
  }
  return output;
}

type FvgZone = {
  index: number;
  direction: "BULLISH" | "BEARISH";
  low: number;
  high: number;
};

function findFvgZones(candles: readonly MarketCandle[], lookback = 60): FvgZone[] {
  const zones: FvgZone[] = [];
  const start = Math.max(2, candles.length - lookback);
  for (let i = start; i < candles.length; i += 1) {
    const left = candles[i - 2];
    const right = candles[i];
    if (right.low > left.high) zones.push({ index: i, direction: "BULLISH", low: left.high, high: right.low });
    if (right.high < left.low) zones.push({ index: i, direction: "BEARISH", low: right.high, high: left.low });
  }
  return zones;
}

function detectFvg(candles: readonly MarketCandle[]): AutoEvidence[] {
  return findFvgZones(candles, 24).slice(-3).map((zone) =>
    evidence(
      `auto_fvg_${zone.direction === "BULLISH" ? "bull" : "bear"}_${zone.index}`,
      "FVG detectado",
      "ICT",
      zone.direction,
      confidenceFromRecency(zone.index, candles.length),
      `Desequilíbrio entre ${zone.low.toFixed(5)} e ${zone.high.toFixed(5)}.`,
      "fvg",
      { low: zone.low, high: zone.high, detectedIndex: zone.index },
    ),
  );
}

function detectIfvg(candles: readonly MarketCandle[]): AutoEvidence[] {
  const output: AutoEvidence[] = [];
  for (const zone of findFvgZones(candles, 70)) {
    let invalidatedIndex: number | null = null;
    for (let i = zone.index + 1; i < candles.length; i += 1) {
      const close = candles[i].close;
      if (zone.direction === "BULLISH" && close < zone.low) { invalidatedIndex = i; break; }
      if (zone.direction === "BEARISH" && close > zone.high) { invalidatedIndex = i; break; }
    }
    if (invalidatedIndex === null) continue;
    const direction: AutoEvidenceDirection = zone.direction === "BULLISH" ? "BEARISH" : "BULLISH";
    output.push(evidence(
      `auto_ifvg_${zone.index}_${invalidatedIndex}`,
      "IFVG detectado",
      "ICT",
      direction,
      confidenceFromRecency(invalidatedIndex, candles.length),
      `FVG de ${zone.low.toFixed(5)}–${zone.high.toFixed(5)} foi invalidado por fechamento e passou a ser tratado como região invertida.`,
      "ifvg",
      { low: zone.low, high: zone.high, detectedIndex: zone.index, invalidatedIndex },
    ));
  }
  return output.slice(-2);
}

function detectBpr(candles: readonly MarketCandle[]): AutoEvidence[] {
  const zones = findFvgZones(candles, 70);
  const output: AutoEvidence[] = [];
  for (let i = 0; i < zones.length; i += 1) {
    for (let j = i + 1; j < zones.length; j += 1) {
      const a = zones[i];
      const b = zones[j];
      if (a.direction === b.direction || Math.abs(a.index - b.index) > 24) continue;
      const low = Math.max(a.low, b.low);
      const high = Math.min(a.high, b.high);
      if (low >= high) continue;
      const newer = a.index > b.index ? a : b;
      output.push(evidence(
        `auto_bpr_${a.index}_${b.index}`,
        "BPR detectado",
        "ICT",
        newer.direction,
        confidenceFromRecency(Math.max(a.index, b.index), candles.length),
        `Sobreposição de FVGs opostos entre ${low.toFixed(5)} e ${high.toFixed(5)}.`,
        "bpr",
        { low, high, detectedIndex: Math.max(a.index, b.index) },
      ));
    }
  }
  return output.slice(-2);
}

function detectOrderBlocks(candles: readonly MarketCandle[]): AutoEvidence[] {
  if (candles.length < 30) return [];
  const output: AutoEvidence[] = [];
  const start = Math.max(20, candles.length - 70);
  for (let i = start; i < candles.length; i += 1) {
    const current = candles[i];
    const prior = candles.slice(i - 20, i);
    const averageBody = prior.reduce((sum, row) => sum + Math.abs(row.close - row.open), 0) / Math.max(1, prior.length);
    const body = Math.abs(current.close - current.open);
    if (averageBody <= 0 || body < averageBody * 1.6) continue;
    const direction: "BULLISH" | "BEARISH" | null = current.close > current.open ? "BULLISH" : current.close < current.open ? "BEARISH" : null;
    if (!direction) continue;
    const structuralWindow = candles.slice(Math.max(0, i - 6), i);
    const displacedStructure = direction === "BULLISH"
      ? current.close > Math.max(...structuralWindow.map((row) => row.high))
      : current.close < Math.min(...structuralWindow.map((row) => row.low));
    if (!displacedStructure) continue;

    let originIndex = -1;
    for (let cursor = i - 1; cursor >= Math.max(0, i - 6); cursor -= 1) {
      const origin = candles[cursor];
      const opposite = direction === "BULLISH" ? origin.close < origin.open : origin.close > origin.open;
      if (opposite) { originIndex = cursor; break; }
    }
    if (originIndex < 0) continue;
    const origin = candles[originIndex];
    const low = origin.low;
    const high = origin.high;
    const invalidated = candles.slice(i + 1).some((row) => direction === "BULLISH" ? row.close < low : row.close > high);
    if (invalidated) continue;
    output.push(evidence(
      `auto_ob_${direction === "BULLISH" ? "bull" : "bear"}_${originIndex}_${i}`,
      "Bloco de Ordens automático",
      "ICT",
      direction,
      confidenceFromRecency(i, candles.length),
      `Último candle oposto antes de deslocamento estrutural. Zona heurística ${low.toFixed(5)}–${high.toFixed(5)}; exige validação visual.`,
      "order_block",
      { low, high, detectedIndex: originIndex },
    ));
  }
  return output.slice(-2);
}

function detectDisplacementAndVolume(candles: readonly MarketCandle[]): AutoEvidence[] {
  if (candles.length < 25) return [];
  const current = last(candles)!;
  const prior = candles.slice(-21, -1);
  const avgBody = prior.reduce((sum, row) => sum + Math.abs(row.close - row.open), 0) / prior.length;
  const avgVolume = prior.reduce((sum, row) => sum + row.volume, 0) / prior.length;
  const body = Math.abs(current.close - current.open);
  const direction: AutoEvidenceDirection = current.close > current.open ? "BULLISH" : current.close < current.open ? "BEARISH" : "NEUTRAL";
  const output: AutoEvidence[] = [];
  if (avgBody > 0 && body >= avgBody * 1.6) {
    output.push(evidence("auto_displacement", "Deslocamento", "ICT", direction, body >= avgBody * 2.2 ? "HIGH" : "MEDIUM", `Corpo do candle equivale a ${(body / avgBody).toFixed(1)}× a média recente.`, "displacement"));
  }
  if (avgVolume > 0 && current.volume >= avgVolume * 1.45) {
    output.push(evidence("auto_volume", "Volume relativo elevado", "VOLUME", direction, current.volume >= avgVolume * 2 ? "HIGH" : "MEDIUM", `Volume atual equivale a ${(current.volume / avgVolume).toFixed(1)}× a média de 20 candles.`, "volume_confirmation"));
  }
  return output;
}

function detectMovingAverages(candles: readonly MarketCandle[]) {
  const closes = candles.map((row) => row.close);
  const ema9Rows = ema(closes, 9);
  const ema20Rows = ema(closes, 20);
  const ema50Rows = ema(closes, 50);
  const ema200Rows = ema(closes, 200);
  const ema9 = last(ema9Rows) ?? null;
  const ema20 = last(ema20Rows) ?? null;
  const ema50 = last(ema50Rows) ?? null;
  const ema200 = last(ema200Rows) ?? null;
  const current = last(candles)?.close ?? 0;
  const output: AutoEvidence[] = [];

  if (ema9 !== null && ema20 !== null) {
    const direction: AutoEvidenceDirection = ema9 > ema20 ? "BULLISH" : ema9 < ema20 ? "BEARISH" : "NEUTRAL";
    output.push(evidence("auto_ema_9_20", "EMA 9 / 20 alinhadas", "MÉDIAS", direction, "MEDIUM", `EMA 9 ${direction === "BULLISH" ? "acima" : direction === "BEARISH" ? "abaixo" : "junto"} da EMA 20.`, "ema_9_20_cross"));
  }

  if (candles.length >= 200 && ema9 && ema20 && ema50 && ema200) {
    const bullish = ema9 > ema20 && ema20 > ema50 && ema50 > ema200 && current > ema9;
    const bearish = ema9 < ema20 && ema20 < ema50 && ema50 < ema200 && current < ema9;
    if (bullish || bearish) {
      output.push(evidence("auto_ema_stack", "EMAs 9/20/50/200 alinhadas", "MÉDIAS", bullish ? "BULLISH" : "BEARISH", "HIGH", "As quatro médias e o preço estão ordenados de forma consistente.", "ema_alignment"));
    }
  }

  return { ema9, ema20, ema50, ema200, evidence: output };
}

function detectRsiDivergence(candles: readonly MarketCandle[]) {
  const closes = candles.map((row) => row.close);
  const rsiRows = rsi(closes, 14);
  const currentRsi = last(rsiRows) ?? null;
  const swingRows = pivots(candles, 2);
  const highs = swingRows.filter((row) => row.type === "HIGH").slice(-2);
  const lows = swingRows.filter((row) => row.type === "LOW").slice(-2);
  const output: AutoEvidence[] = [];

  if (lows.length === 2) {
    const [a, b] = lows;
    const rsiA = rsiRows[a.index];
    const rsiB = rsiRows[b.index];
    if (rsiA !== null && rsiB !== null) {
      if (b.price < a.price && rsiB > rsiA) output.push(evidence("auto_rsi_regular_bull", "RSI · Divergência altista regular", "MOMENTUM", "BULLISH", "MEDIUM", "Preço fez mínima mais baixa enquanto o RSI fez mínima mais alta.", "rsi_regular_bullish"));
      if (b.price > a.price && rsiB < rsiA) output.push(evidence("auto_rsi_hidden_bull", "RSI · Divergência altista oculta", "MOMENTUM", "BULLISH", "MEDIUM", "Preço fez mínima mais alta enquanto o RSI fez mínima mais baixa.", "rsi_hidden_bullish"));
    }
  }
  if (highs.length === 2) {
    const [a, b] = highs;
    const rsiA = rsiRows[a.index];
    const rsiB = rsiRows[b.index];
    if (rsiA !== null && rsiB !== null) {
      if (b.price > a.price && rsiB < rsiA) output.push(evidence("auto_rsi_regular_bear", "RSI · Divergência baixista regular", "MOMENTUM", "BEARISH", "MEDIUM", "Preço fez máxima mais alta enquanto o RSI fez máxima mais baixa.", "rsi_regular_bearish"));
      if (b.price < a.price && rsiB > rsiA) output.push(evidence("auto_rsi_hidden_bear", "RSI · Divergência baixista oculta", "MOMENTUM", "BEARISH", "MEDIUM", "Preço fez máxima mais baixa enquanto o RSI fez máxima mais alta.", "rsi_hidden_bearish"));
    }
  }

  return { rsi14: currentRsi, evidence: output };
}

function detectFibonacci(candles: readonly MarketCandle[]) {
  const recent = candles.slice(-80);
  if (recent.length < 20) return { retracement: null as number | null, evidence: [] as AutoEvidence[] };
  let highIndex = 0;
  let lowIndex = 0;
  recent.forEach((row, index) => {
    if (row.high > recent[highIndex].high) highIndex = index;
    if (row.low < recent[lowIndex].low) lowIndex = index;
  });
  const high = recent[highIndex].high;
  const low = recent[lowIndex].low;
  const range = high - low;
  if (range <= 0) return { retracement: null, evidence: [] };
  const current = last(recent)!.close;
  const direction: AutoEvidenceDirection = highIndex > lowIndex ? "BULLISH" : "BEARISH";
  const retracement = direction === "BULLISH" ? (high - current) / range : (current - low) / range;
  const output: AutoEvidence[] = [];
  const pct = retracement * 100;

  if (retracement >= 0.618 && retracement <= 0.72) {
    output.push(evidence("auto_fib_ote_zone", "Zona Fibonacci 61,8%–72%", "FIBONACCI", direction, "HIGH", `Preço está em ${pct.toFixed(1)}% de retração do swing recente.`, "fib_618_72_zone"));
    output.push(evidence("auto_ote", "OTE contextual", "ICT", direction, "MEDIUM", "Retração atual está dentro da faixa 61,8%–72% configurada para contexto OTE.", "ote"));
  } else {
    const levels = [0.236, 0.382, 0.5, 0.618, 0.705, 0.72] as const;
    const nearest = levels.reduce((best, level) => Math.abs(retracement - level) < Math.abs(retracement - best) ? level : best, levels[0]);
    if (Math.abs(retracement - nearest) <= 0.018) {
      const keyMap: Record<string, string> = { "0.236": "fib_236", "0.382": "fib_382", "0.5": "fib_50", "0.618": "fib_618", "0.705": "fib_705", "0.72": "fib_72" };
      output.push(evidence(`auto_fib_${nearest}`, `Fibonacci ${(nearest * 100).toFixed(nearest === 0.705 ? 1 : 1)}%`, "FIBONACCI", direction, "MEDIUM", `Preço está próximo de ${(nearest * 100).toFixed(1)}% de retração do swing recente.`, keyMap[String(nearest)]));
    }
  }
  return { retracement, evidence: output };
}


function detectPriceAction(candles: readonly MarketCandle[]): AutoEvidence[] {
  if (candles.length < 3) return [];
  const current = last(candles)!;
  const previous = last(candles, 1)!;
  const output: AutoEvidence[] = [];
  const currentBody = Math.abs(current.close - current.open);
  const range = Math.max(current.high - current.low, Number.EPSILON);
  const upperWick = current.high - Math.max(current.open, current.close);
  const lowerWick = Math.min(current.open, current.close) - current.low;

  const bullishEngulfing = current.close > current.open && previous.close < previous.open && current.open <= previous.close && current.close >= previous.open;
  const bearishEngulfing = current.close < current.open && previous.close > previous.open && current.open >= previous.close && current.close <= previous.open;
  if (bullishEngulfing) output.push(evidence("auto_pa_engulf_bull", "Engulfing altista", "PRICE ACTION", "BULLISH", "MEDIUM", "O candle atual engolfou o corpo do candle anterior.", "price_action_confirmation"));
  if (bearishEngulfing) output.push(evidence("auto_pa_engulf_bear", "Engulfing baixista", "PRICE ACTION", "BEARISH", "MEDIUM", "O candle atual engolfou o corpo do candle anterior.", "price_action_confirmation"));

  if (lowerWick / range >= 0.55 && currentBody / range <= 0.35) output.push(evidence("auto_pa_rejection_low", "Rejeição inferior", "PRICE ACTION", "BULLISH", "MEDIUM", "Pavio inferior dominante sugere rejeição de preços mais baixos.", "price_action_confirmation"));
  if (upperWick / range >= 0.55 && currentBody / range <= 0.35) output.push(evidence("auto_pa_rejection_high", "Rejeição superior", "PRICE ACTION", "BEARISH", "MEDIUM", "Pavio superior dominante sugere rejeição de preços mais altos.", "price_action_confirmation"));
  return output;
}

function detectMssComposite(rows: readonly AutoEvidence[]): AutoEvidence[] {
  const sweep = rows.find((row) => row.confluenceKey === "liquidity_sweep");
  const displacement = rows.find((row) => row.confluenceKey === "displacement");
  const structural = rows.find((row) => row.confluenceKey === "choch" || row.confluenceKey === "bos");
  if (!sweep || !displacement || !structural) return [];
  if (displacement.direction === "NEUTRAL" || structural.direction === "NEUTRAL") return [];
  if (displacement.direction !== structural.direction) return [];
  return [evidence("auto_mss_composite", "MSS composto", "ESTRUTURA", structural.direction, "HIGH", "Varredura de liquidez, deslocamento e rompimento estrutural aparecem no mesmo contexto recente.", "mss")];
}

function detectPriceLocation(candles: readonly MarketCandle[]): AutoEvidence[] {
  const recent = candles.slice(-80);
  if (!recent.length) return [];
  const high = Math.max(...recent.map((row) => row.high));
  const low = Math.min(...recent.map((row) => row.low));
  const midpoint = (high + low) / 2;
  const current = last(recent)!.close;
  if (current < midpoint) return [evidence("auto_discount", "Preço em Discount", "CONTEXTO", "BULLISH", "LOW", "Preço está abaixo do equilíbrio do range recente.", "premium_discount")];
  if (current > midpoint) return [evidence("auto_premium", "Preço em Premium", "CONTEXTO", "BEARISH", "LOW", "Preço está acima do equilíbrio do range recente.", "premium_discount")];
  return [];
}

function aggregateContext(evidenceRows: readonly AutoEvidence[]) {
  const weight: Record<AutoEvidenceConfidence, number> = { LOW: 0.5, MEDIUM: 1, HIGH: 1.5 };
  let bullish = 0;
  let bearish = 0;
  for (const row of evidenceRows) {
    if (row.direction === "BULLISH") bullish += weight[row.confidence];
    if (row.direction === "BEARISH") bearish += weight[row.confidence];
  }
  if (bullish === bearish || Math.abs(bullish - bearish) < 1) return { context: "NEUTRAL" as const, bullish, bearish };
  return { context: bullish > bearish ? "BULLISH" as const : "BEARISH" as const, bullish, bearish };
}

export function analyzeMarketCandles(symbol: string, timeframe: TerminalTimeframe, candles: readonly MarketCandle[]): AutoAnalysisSnapshot {
  if (candles.length < 25) {
    return {
      symbol,
      timeframe,
      evaluatedAt: new Date().toISOString(),
      candleCount: candles.length,
      context: "NEUTRAL",
      evidenceScore: 0,
      evidenceMax: 10,
      rsi14: null,
      ema9: null,
      ema20: null,
      ema50: null,
      ema200: null,
      fibRetracement: null,
      evidence: [],
      notes: ["São necessários pelo menos 25 candles para a análise automática básica."],
    };
  }

  const moving = detectMovingAverages(candles);
  const momentum = detectRsiDivergence(candles);
  const fib = detectFibonacci(candles);
  const baseRows = [
    ...detectStructure(candles),
    ...detectLiquiditySweep(candles),
    ...detectFvg(candles),
    ...detectIfvg(candles),
    ...detectBpr(candles),
    ...detectOrderBlocks(candles),
    ...detectDisplacementAndVolume(candles),
    ...moving.evidence,
    ...momentum.evidence,
    ...fib.evidence,
    ...detectPriceAction(candles),
    ...detectPriceLocation(candles),
  ];
  const rows = [...baseRows, ...detectMssComposite(baseRows)];

  const deduped = Array.from(new Map(rows.map((row) => [row.key, row])).values());
  const context = aggregateContext(deduped);
  const confidencePoints = deduped.reduce((sum, row) => sum + (row.confidence === "HIGH" ? 1.5 : row.confidence === "MEDIUM" ? 1 : 0.5), 0);
  const evidenceScore = Math.min(10, Number((confidencePoints / 1.5).toFixed(1)));

  return {
    symbol,
    timeframe,
    evaluatedAt: new Date().toISOString(),
    candleCount: candles.length,
    context: context.context,
    evidenceScore,
    evidenceMax: 10,
    rsi14: momentum.rsi14 === null ? null : Number(momentum.rsi14.toFixed(2)),
    ema9: moving.ema9,
    ema20: moving.ema20,
    ema50: moving.ema50,
    ema200: moving.ema200,
    fibRetracement: fib.retracement === null ? null : Number((fib.retracement * 100).toFixed(2)),
    evidence: deduped,
    notes: [
      "Leitura automática descritiva: não é sinal de compra ou venda.",
      "Order Block, IFVG e BPR automáticos são heurísticos e continuam exigindo validação visual do operador.",
      "A pontuação de evidências não representa probabilidade estatística de ganho.",
    ],
  };
}
