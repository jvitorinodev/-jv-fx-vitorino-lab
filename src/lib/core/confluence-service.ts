import type {
  ConfluenceCategory,
  ConfluenceDefinition,
  ConfluenceScore,
  ConfluenceScoreLevel,
  ConfluenceSelection,
  ConfluenceWeightMap,
} from "@/lib/types/price-zones";

export const CONFLUENCE_CATALOG: readonly ConfluenceDefinition[] = [
  { key: "htf_alignment", category: "HTF_CONTEXT", label: "Alinhamento HTF", description: "Viés do período superior alinhado com a direção planejada.", defaultWeight: 2 },
  { key: "premium_discount", category: "HTF_CONTEXT", label: "Premium / Discount", description: "Preço localizado em região coerente com a direção do setup.", defaultWeight: 1 },
  { key: "bos", category: "STRUCTURE", label: "BOS", description: "Rompimento de estrutura compatível com o contexto.", defaultWeight: 1 },
  { key: "choch", category: "STRUCTURE", label: "CHoCH", description: "Mudança de caráter observada na estrutura do preço.", defaultWeight: 1 },
  { key: "mss", category: "STRUCTURE", label: "MSS", description: "Mudança de estrutura de mercado após deslocamento ou tomada de liquidez.", defaultWeight: 2 },
  { key: "liquidity_sweep", category: "LIQUIDITY", label: "Varredura de Liquidez", description: "Liquidez relevante foi capturada antes da confirmação do setup.", defaultWeight: 2 },
  { key: "equal_highs_lows", category: "LIQUIDITY", label: "Equal Highs / Lows", description: "Máximas ou mínimas iguais formam pool de liquidez próximo.", defaultWeight: 1 },
  { key: "pdh_pdl", category: "LIQUIDITY", label: "PDH / PDL", description: "Máxima ou mínima do dia anterior participa do contexto.", defaultWeight: 1 },
  { key: "pwh_pwl", category: "LIQUIDITY", label: "PWH / PWL", description: "Máxima ou mínima da semana anterior participa do contexto.", defaultWeight: 1 },
  { key: "asian_liquidity", category: "LIQUIDITY", label: "Liquidez Asiática", description: "Máxima ou mínima da sessão asiática participa do setup.", defaultWeight: 1 },
  { key: "fvg", category: "ICT", label: "FVG · Lacuna de Valor Justo", description: "Desequilíbrio de três candles usado como região de interesse.", defaultWeight: 1 },
  { key: "ifvg", category: "ICT", label: "IFVG · FVG Invertido", description: "FVG invalidado que passou a atuar como região oposta.", defaultWeight: 1 },
  { key: "bpr", category: "ICT", label: "BPR · Faixa de Preço Balanceada", description: "Sobreposição de desequilíbrios em sentidos opostos.", defaultWeight: 1 },
  { key: "order_block", category: "ICT", label: "Bloco de Ordens", description: "Candle ou faixa institucional marcada como POI.", defaultWeight: 1 },
  { key: "breaker_block", category: "ICT", label: "Breaker Block", description: "Bloco invalidado que passa a atuar em sentido oposto.", defaultWeight: 1 },
  { key: "mitigation_block", category: "ICT", label: "Mitigation Block", description: "Região de mitigação identificada na leitura ICT.", defaultWeight: 1 },
  { key: "ote", category: "ICT", label: "OTE", description: "Entrada em região de retração ótima definida pelo trader.", defaultWeight: 1 },
  { key: "displacement", category: "ICT", label: "Deslocamento", description: "Movimento impulsivo com desequilíbrio confirma intenção direcional.", defaultWeight: 1 },

  // Fibonacci: somente uma leitura de retração do mesmo swing deve ser pontuada por vez.
  { key: "fib_236", category: "FIBONACCI", label: "Fibonacci 23,6%", description: "Preço reage ou encontra contexto na retração de 23,6% do swing selecionado.", defaultWeight: 0.5, exclusiveGroup: "fibonacci_retracement" },
  { key: "fib_382", category: "FIBONACCI", label: "Fibonacci 38,2%", description: "Preço reage ou encontra contexto na retração de 38,2% do swing selecionado.", defaultWeight: 0.5, exclusiveGroup: "fibonacci_retracement" },
  { key: "fib_50", category: "FIBONACCI", label: "Fibonacci 50%", description: "Preço reage ou encontra contexto na retração de 50% do swing selecionado.", defaultWeight: 1, exclusiveGroup: "fibonacci_retracement" },
  { key: "fib_618", category: "FIBONACCI", label: "Fibonacci 61,8%", description: "Preço reage ou encontra contexto na retração de 61,8% do swing selecionado.", defaultWeight: 1.5, exclusiveGroup: "fibonacci_retracement" },
  { key: "fib_705", category: "FIBONACCI", label: "Fibonacci 70,5%", description: "Preço reage ou encontra contexto na retração de 70,5% do swing selecionado.", defaultWeight: 1.5, exclusiveGroup: "fibonacci_retracement" },
  { key: "fib_72", category: "FIBONACCI", label: "Fibonacci 72%", description: "Preço reage ou encontra contexto na retração de 72% do swing selecionado.", defaultWeight: 1.5, exclusiveGroup: "fibonacci_retracement" },
  { key: "fib_618_72_zone", category: "FIBONACCI", label: "Zona Fibonacci 61,8%–72%", description: "Preço está dentro da faixa de retração de 61,8% a 72% definida para o swing analisado.", defaultWeight: 2, exclusiveGroup: "fibonacci_retracement" },

  // RSI: os quatro estados de divergência são mutuamente exclusivos para a mesma leitura.
  { key: "rsi_regular_bullish", category: "MOMENTUM", label: "RSI · Divergência Altista Regular", description: "Preço forma mínima mais baixa enquanto o RSI forma mínima mais alta.", defaultWeight: 2, exclusiveGroup: "rsi_divergence" },
  { key: "rsi_regular_bearish", category: "MOMENTUM", label: "RSI · Divergência Baixista Regular", description: "Preço forma máxima mais alta enquanto o RSI forma máxima mais baixa.", defaultWeight: 2, exclusiveGroup: "rsi_divergence" },
  { key: "rsi_hidden_bullish", category: "MOMENTUM", label: "RSI · Divergência Altista Oculta", description: "Preço forma mínima mais alta enquanto o RSI forma mínima mais baixa, sugerindo continuidade altista.", defaultWeight: 1.5, exclusiveGroup: "rsi_divergence" },
  { key: "rsi_hidden_bearish", category: "MOMENTUM", label: "RSI · Divergência Baixista Oculta", description: "Preço forma máxima mais baixa enquanto o RSI forma máxima mais alta, sugerindo continuidade baixista.", defaultWeight: 1.5, exclusiveGroup: "rsi_divergence" },

  { key: "volume_confirmation", category: "VOLUME", label: "Confirmação por Volume", description: "Volume ou volume relativo confirma o comportamento observado.", defaultWeight: 1 },
  { key: "vwap_context", category: "VOLUME", label: "Contexto VWAP", description: "Posição/reação em VWAP reforça o contexto do setup.", defaultWeight: 1 },

  { key: "ema_9_context", category: "MOVING_AVERAGES", label: "EMA 9", description: "Preço e inclinação da EMA 9 estão coerentes com o momentum de curto prazo do setup.", defaultWeight: 0.5 },
  { key: "ema_20_context", category: "MOVING_AVERAGES", label: "EMA 20", description: "Preço e inclinação da EMA 20 estão coerentes com a tendência curta do setup.", defaultWeight: 0.5 },
  { key: "ema_50_context", category: "MOVING_AVERAGES", label: "EMA 50", description: "Preço e inclinação da EMA 50 estão coerentes com a tendência intermediária do setup.", defaultWeight: 0.5 },
  { key: "ema_200_context", category: "MOVING_AVERAGES", label: "EMA 200", description: "Preço e inclinação da EMA 200 estão coerentes com o contexto estrutural de longo prazo.", defaultWeight: 1 },
  { key: "ema_9_20_cross", category: "MOVING_AVERAGES", label: "EMA 9 / 20 · Alinhamento", description: "Relação entre EMA 9 e EMA 20 está alinhada com a direção do setup.", defaultWeight: 0.5 },
  { key: "ema_alignment", category: "MOVING_AVERAGES", label: "Alinhamento EMA 9 / 20 / 50 / 200", description: "As principais EMAs estão ordenadas de forma coerente com a direção planejada.", defaultWeight: 1 },
  { key: "ema_rejection", category: "MOVING_AVERAGES", label: "Rejeição em EMA 9 / 20 / 50 / 200", description: "Preço reage em uma das principais médias como suporte ou resistência dinâmica.", defaultWeight: 1 },

  { key: "price_action_confirmation", category: "PRICE_ACTION", label: "Confirmação por Ação do Preço", description: "Rejeição, engulfing, reteste ou fechamento confirma a região.", defaultWeight: 2 },
  { key: "session_killzone", category: "SESSION", label: "Sessão / Kill Zone", description: "Setup ocorre dentro da janela operacional definida pelo trader.", defaultWeight: 1 },

  // Macro: confirmação de processo, não direção de mercado. A combinação substitui as fontes isoladas.
  { key: "macro_forex_factory_checked", category: "MACRO", label: "Forex Factory conferido", description: "Agenda macro relevante ao ativo foi conferida no Forex Factory antes da operação.", defaultWeight: 0.5, exclusiveGroup: "macro_validation" },
  { key: "macro_investing_checked", category: "MACRO", label: "Investing.com conferido", description: "Calendário econômico do Investing.com foi usado como validação secundária.", defaultWeight: 0.5, exclusiveGroup: "macro_validation" },
  { key: "macro_sources_confirmed", category: "MACRO", label: "Forex Factory + Investing.com conferidos", description: "As duas fontes macro foram conferidas para a janela operacional do setup. Não representa direção do preço.", defaultWeight: 1, exclusiveGroup: "macro_validation" },
] as const;

export const CONFLUENCE_CATEGORIES: readonly ConfluenceCategory[] = [
  "HTF_CONTEXT",
  "STRUCTURE",
  "LIQUIDITY",
  "ICT",
  "FIBONACCI",
  "MOMENTUM",
  "VOLUME",
  "MOVING_AVERAGES",
  "PRICE_ACTION",
  "SESSION",
  "MACRO",
];

export function defaultConfluenceWeights(): ConfluenceWeightMap {
  return Object.fromEntries(CONFLUENCE_CATALOG.map((item) => [item.key, item.defaultWeight]));
}

export function normalizeWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(5, Math.max(0, Math.round(value * 2) / 2));
}

export function weightFor(key: string, weights?: ConfluenceWeightMap): number {
  const definition = CONFLUENCE_CATALOG.find((item) => item.key === key);
  const custom = weights?.[key];
  return normalizeWeight(custom ?? definition?.defaultWeight ?? 0);
}

export function normalizeConfluenceKeys(keys: readonly string[]): string[] {
  const result: string[] = [];

  for (const key of keys) {
    const definition = CONFLUENCE_CATALOG.find((item) => item.key === key);
    if (!definition) continue;

    if (definition.exclusiveGroup) {
      for (let index = result.length - 1; index >= 0; index -= 1) {
        const current = CONFLUENCE_CATALOG.find((item) => item.key === result[index]);
        if (current?.exclusiveGroup === definition.exclusiveGroup) result.splice(index, 1);
      }
    } else if (result.includes(key)) {
      continue;
    }

    result.push(key);
  }

  return result;
}

export function toggleConfluenceKey(keys: readonly string[], key: string): string[] {
  if (keys.includes(key)) return keys.filter((item) => item !== key);
  return normalizeConfluenceKeys([...keys, key]);
}

export function selectionFromKeys(keys: readonly string[], weights?: ConfluenceWeightMap, timeframe?: string): ConfluenceSelection[] {
  const normalized = new Set(normalizeConfluenceKeys(keys));
  return CONFLUENCE_CATALOG
    .filter((item) => normalized.has(item.key))
    .map((item) => ({
      key: item.key,
      category: item.category,
      label: item.label,
      weight: weightFor(item.key, weights),
      timeframe: timeframe ?? null,
      note: "",
    }));
}

export function scoreLevel(points: number): ConfluenceScoreLevel {
  if (points >= 10) return "HIGH";
  if (points >= 7) return "STRONG";
  if (points >= 4) return "DEVELOPING";
  return "LOW";
}

export function calculateConfluenceScore(selections: readonly ConfluenceSelection[]): ConfluenceScore {
  const byCategory = CONFLUENCE_CATEGORIES.map((category) => {
    const items = selections.filter((item) => item.category === category);
    return {
      category,
      points: Number(items.reduce((sum, item) => sum + normalizeWeight(item.weight), 0).toFixed(2)),
      selectedCount: items.length,
    };
  }).filter((item) => item.selectedCount > 0);

  const points = Number(selections.reduce((sum, item) => sum + normalizeWeight(item.weight), 0).toFixed(2));
  return {
    points,
    selectedCount: selections.length,
    level: scoreLevel(points),
    byCategory,
  };
}

export function validateConfluenceWeights(weights: ConfluenceWeightMap): string[] {
  const errors: string[] = [];
  for (const [key, value] of Object.entries(weights)) {
    if (!CONFLUENCE_CATALOG.some((item) => item.key === key)) errors.push(`Confluência desconhecida: ${key}.`);
    if (!Number.isFinite(value) || value < 0 || value > 5) errors.push(`O peso de ${key} deve estar entre 0 e 5.`);
  }
  return errors;
}
