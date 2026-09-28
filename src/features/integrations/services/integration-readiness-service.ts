import "server-only";

import type { Actor } from "@/lib/auth/guards";
import { productionEnvironmentStatus } from "@/config/runtime";
import type { BrokerSyncOverview } from "@/lib/types/broker-sync";
import { BRAND } from "@/config/brand";
import type { TradingAccountSchemaStatus } from "@/features/accounts/services/trading-account-service";

export type IntegrationCheckStatus = "OK" | "ACTION" | "INFO";

export type IntegrationCheck = {
  key: string;
  label: string;
  status: IntegrationCheckStatus;
  detail: string;
};

export type IntegrationReadiness = {
  version: string;
  appMode: "demo" | "production";
  siteUrl: string;
  supabaseUrl: string | null;
  supabaseCallbackUrl: string | null;
  appCallbackUrl: string;
  registrationOpen: boolean;
  marketProvider: "demo" | "mt5" | "exness";
  bridgeUrl: string;
  bridgeSecretConfigured: boolean;
  actor: {
    email: string;
    role: string;
    status: string;
  };
  checks: IntegrationCheck[];
  completed: number;
  total: number;
};

export function buildIntegrationReadiness(actor: Actor, overview: BrokerSyncOverview | null, schemaStatus?: TradingAccountSchemaStatus): IntegrationReadiness {
  const runtime = productionEnvironmentStatus();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "") || null;
  const bridgeUrl = (process.env.MT5_BRIDGE_HTTP_URL ?? "http://127.0.0.1:8765").replace(/\/$/, "");
  const bridgeSecretConfigured = Boolean(process.env.MT5_BRIDGE_SHARED_SECRET?.trim());
  const registrationOpen = process.env.REGISTRATION_OPEN !== "false";
  const marketProvider = runtime.marketDataMode;

  const checks: IntegrationCheck[] = [
    {
      key: "auth",
      label: "Supabase Auth",
      status: runtime.mode === "production" && runtime.authConfigured ? "OK" : "ACTION",
      detail: runtime.mode === "production" && runtime.authConfigured
        ? "Ambiente de produção e credenciais públicas do Supabase configurados."
        : "Ative production e configure URL + Publishable Key do Supabase.",
    },
    {
      key: "database-schema",
      label: "Schema do banco",
      status: schemaStatus?.current === false ? "ACTION" : "OK",
      detail: schemaStatus?.detail ?? "Schema principal disponível.",
    },
    {
      key: "session",
      label: "Sessão e aprovação",
      status: actor.status === "ACTIVE" ? "OK" : "ACTION",
      detail: actor.status === "ACTIVE"
        ? `${actor.email} está ativo como ${actor.role}.`
        : `A conta atual está com status ${actor.status}.`,
    },
    {
      key: "google",
      label: "Login com Google",
      status: "INFO",
      detail: "A rota OAuth está pronta no JV FX. Falta apenas validar o provider Google no Supabase/Google Cloud com uma conta de teste.",
    },
    {
      key: "registration",
      label: "Novos cadastros",
      status: registrationOpen ? "OK" : "INFO",
      detail: registrationOpen
        ? "Solicitações de cadastro estão abertas e continuam sujeitas à aprovação do administrador."
        : "Solicitações de cadastro estão fechadas no ambiente.",
    },
    {
      key: "mt5-config",
      label: "Configuração do Bridge MT5",
      status: marketProvider === "mt5" && bridgeSecretConfigured ? "OK" : "ACTION",
      detail: marketProvider === "mt5" && bridgeSecretConfigured
        ? `Provider MT5 habilitado e segredo do Bridge configurado em ${bridgeUrl}.`
        : "Para dados reais, use MARKET_DATA_PROVIDER=mt5 e configure MT5_BRIDGE_SHARED_SECRET no app e no Bridge.",
    },
    {
      key: "mt5-feed",
      label: "Conexão MT5",
      status: overview?.feed.connected ? "OK" : "ACTION",
      detail: overview?.feed.connected
        ? `${overview.feed.label}${overview.feed.latencyMs != null ? ` · ${overview.feed.latencyMs} ms` : ""}.`
        : overview?.feed.detail ?? "O Bridge ainda não está conectado ao MetaTrader 5.",
    },
    {
      key: "mt5-account",
      label: "Conta Exness / MT5",
      status: overview?.terminalAccount ? "OK" : "ACTION",
      detail: overview?.terminalAccount
        ? `Login ${overview.terminalAccount.login} · ${overview.terminalAccount.server || overview.terminalAccount.broker} · ${overview.terminalAccount.currency}.`
        : "Nenhuma conta MT5 real foi identificada pelo Bridge.",
    },
  ];

  const completed = checks.filter((item) => item.status === "OK").length;

  return {
    version: BRAND.version,
    appMode: runtime.mode,
    siteUrl,
    supabaseUrl,
    supabaseCallbackUrl: supabaseUrl ? `${supabaseUrl}/auth/v1/callback` : null,
    appCallbackUrl: `${siteUrl}/auth/callback`,
    registrationOpen,
    marketProvider,
    bridgeUrl,
    bridgeSecretConfigured,
    actor: {
      email: actor.email,
      role: actor.role,
      status: actor.status,
    },
    checks,
    completed,
    total: checks.length,
  };
}
