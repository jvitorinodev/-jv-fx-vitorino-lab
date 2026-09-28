import type { TerminalAccountSnapshot, TerminalFeedStatus } from "@/lib/types/market-terminal";
import type { TradeRecord } from "@/lib/types/journal";

export type BrokerSyncStatus = "NEVER" | "RUNNING" | "SUCCESS" | "PARTIAL" | "ERROR";

export type BrokerSyncState = {
  id: string;
  accountId: string;
  provider: "MT5";
  brokerAccountLogin: string | null;
  status: BrokerSyncStatus;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errorMessage: string | null;
  sourceWindowDays: number;
  updatedAt: string;
};

export type BrokerSyncOverview = {
  feed: TerminalFeedStatus;
  terminalAccount: TerminalAccountSnapshot | null;
  states: BrokerSyncState[];
};

export type SyncMt5Input = {
  accountId: string;
  days?: number;
};

export type SyncMt5Result =
  | {
      ok: true;
      status: BrokerSyncStatus;
      message: string;
      imported: number;
      skipped: number;
      failed: number;
      brokerAccountLogin: string | null;
      lastCompletedAt: string;
      demoTrades?: TradeRecord[];
    }
  | { ok: false; message: string };
