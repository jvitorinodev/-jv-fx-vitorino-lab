import type { MarketCandle, TerminalFeedStatus, TerminalTimeframe } from "@/lib/types/market-terminal";
import { generateDemoCandles } from "@/features/market-terminal/data/demo-terminal";

export interface MarketTerminalProvider {
  readonly id: "DEMO" | "MT5_BRIDGE" | "EXNESS_API";
  readonly name: string;
  getCandles(symbol: string, timeframe: TerminalTimeframe, limit?: number): Promise<MarketCandle[]>;
  getStatus(): Promise<TerminalFeedStatus>;
}

export class DemoTerminalProvider implements MarketTerminalProvider {
  readonly id = "DEMO" as const;
  readonly name = "JV FX Demo Feed";

  async getCandles(symbol: string, timeframe: TerminalTimeframe, limit = 220) {
    return generateDemoCandles(symbol, timeframe, limit);
  }

  async getStatus(): Promise<TerminalFeedStatus> {
    return {
      provider: "DEMO",
      source: "DEMO",
      connected: true,
      label: "Demonstração",
      detail: "Candles simulados. Nenhuma cotação real é usada neste modo.",
      lastUpdate: new Date().toISOString(),
      latencyMs: 0,
      websocketAvailable: false,
    };
  }
}

/**
 * O caminho real da v1.1.0 é implementado no servidor via MT5 Bridge para manter
 * credenciais fora do browser. Esta classe existe como contrato conceitual para
 * adapters externos, mas a UI consulta somente /api/market/*.
 */
export class Mt5BridgeTerminalProvider implements MarketTerminalProvider {
  readonly id = "MT5_BRIDGE" as const;
  readonly name = "MetaTrader 5 Bridge";

  async getCandles(): Promise<MarketCandle[]> {
    throw new Error("Use o BFF server-side /api/market/candles para acessar o MT5 Bridge.");
  }

  async getStatus(): Promise<TerminalFeedStatus> {
    return {
      provider: "MT5_BRIDGE",
      source: "REALTIME",
      connected: false,
      label: "MT5 Bridge",
      detail: "O status real é resolvido server-side para não expor credenciais.",
      websocketAvailable: true,
    };
  }
}

export class ExnessTerminalProvider implements MarketTerminalProvider {
  readonly id = "EXNESS_API" as const;
  readonly name = "Exness API Direta";

  async getCandles(): Promise<MarketCandle[]> {
    throw new Error("O adaptador direto da Exness permanece reservado para uma evolução v1.1.x.");
  }

  async getStatus(): Promise<TerminalFeedStatus> {
    return {
      provider: "EXNESS_API",
      source: "REALTIME",
      connected: false,
      label: "Exness API direta",
      detail: "Adapter reservado. A v1.1.0 usa a conta Exness real através do terminal MT5.",
      websocketAvailable: false,
    };
  }
}
