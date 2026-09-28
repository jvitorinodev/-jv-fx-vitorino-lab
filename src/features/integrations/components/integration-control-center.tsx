import Link from "next/link";
import {
  CheckCircle2,
  CircleAlert,
  Database,
  ExternalLink,
  KeyRound,
  Link2,
  Server,
  ShieldCheck,
  UserCheck,
  Plus,
  Star,
  Unlink,
} from "lucide-react";
import type { BrokerSyncOverview } from "@/lib/types/broker-sync";
import type { TradingAccount } from "@/lib/types/trading";
import type { IntegrationCheckStatus, IntegrationReadiness } from "@/features/integrations/services/integration-readiness-service";
import { createTradingAccount, linkCurrentMt5ToTradingAccount, setPrimaryTradingAccount, unlinkTradingAccountMt5 } from "@/features/accounts/actions/account-actions";
import { isMt5CompatibleWithTradingAccount, mt5AccountKindLabel } from "@/features/accounts/lib/mt5-account-kind";

export function IntegrationControlCenter({ readiness, overview, accounts }: { readiness: IntegrationReadiness; overview: BrokerSyncOverview | null; accounts: TradingAccount[] }) {
  const account = overview?.terminalAccount ?? null;
  const realAccounts = accounts.filter((item) => item.type !== "DEMO");
  const demoAccounts = accounts.filter((item) => item.type === "DEMO");

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Beta controlado · v{readiness.version}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Central de integrações</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Valide autenticação, Google e Exness/MT5 sem adicionar novos módulos ao produto. O objetivo agora é confiabilidade operacional.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Prontidão desta sessão</p>
          <p className="mt-1 text-xl font-semibold tabular text-slate-950">{readiness.completed}/{readiness.total}</p>
          <p className="text-[10px] text-slate-400">itens confirmados automaticamente</p>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ShieldCheck} label="Conta atual" value={readiness.actor.role} detail={`${readiness.actor.email} · ${readiness.actor.status}`} />
        <SummaryCard icon={Database} label="Supabase" value={readiness.appMode === "production" ? "PRODUÇÃO" : "DEMO"} detail={readiness.supabaseUrl ?? "Não configurado"} />
        <SummaryCard icon={KeyRound} label="Cadastros" value={readiness.registrationOpen ? "ABERTOS" : "FECHADOS"} detail="Acesso continua sujeito à aprovação." />
        <SummaryCard icon={Server} label="Market provider" value={readiness.marketProvider.toUpperCase()} detail={overview?.feed.label ?? "Sem leitura do feed"} />
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Contas de trading</p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900">Todas as contas ativas</h2>
            <p className="mt-1 text-[11px] text-slate-500">O seletor no topo permite alternar entre todas, uma conta real específica ou a conta de demonstração.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="rounded-md bg-slate-100 px-2 py-1">{realAccounts.length} real(is)</span>
            <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">{demoAccounts.length} demo</span>
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                    <span className={`rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${item.type === "DEMO" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{item.type === "DEMO" ? "DEMO" : "REAL"}</span>
                    {item.isPrimary ? <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700"><Star className="size-3 fill-current" />Principal</span> : null}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">{item.broker} · {item.currency}</p>
                </div>
                <span className="size-2 shrink-0 rounded-full bg-emerald-500" title="Conta ativa" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <AccountMetric label="Saldo" value={formatCurrency(item.balance, item.currency)} />
                <AccountMetric label="Equity" value={formatCurrency(item.equity, item.currency)} />
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
                {item.brokerAccountLogin ? (
                  <p>MT5 {item.brokerAccountLogin}{item.brokerServer ? ` · ${item.brokerServer}` : ""}</p>
                ) : item.type === "DEMO" ? (
                  <p>Conta de demonstração ainda sem vínculo MT5.</p>
                ) : (
                  <p>Aguardando vínculo com um login MT5.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {!item.isPrimary ? (
                    <form action={setPrimaryTradingAccount}>
                      <input type="hidden" name="accountId" value={item.id} />
                      <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"><Star className="size-3.5" />Tornar principal</button>
                    </form>
                  ) : null}
                  {account ? (
                    isMt5CompatibleWithTradingAccount(item.type, account.server) ? (
                      <form action={linkCurrentMt5ToTradingAccount}>
                        <input type="hidden" name="accountId" value={item.id} />
                        <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-[10px] font-semibold text-white hover:bg-blue-700"><Link2 className="size-3.5" />{item.brokerAccountLogin === account.login ? "MT5 atual associado" : "Associar MT5 atual"}</button>
                      </form>
                    ) : (
                      <span className="inline-flex h-8 items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[10px] font-semibold text-amber-700" title={`MT5 detectado como ${mt5AccountKindLabel(account.server)}.`}>MT5 {mt5AccountKindLabel(account.server)} incompatível</span>
                    )
                  ) : null}
                  {item.brokerAccountLogin ? (
                    <form action={unlinkTradingAccountMt5}>
                      <input type="hidden" name="accountId" value={item.id} />
                      <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><Unlink className="size-3.5" />Desvincular</button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 p-4">
          <form action={createTradingAccount} className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
            <label className="block">
              <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">Nova conta</span>
              <input name="name" required maxLength={80} placeholder="Ex.: Exness Real 2" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">Tipo</span>
              <select name="accountType" defaultValue="PERSONAL" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-slate-400">
                <option value="PERSONAL">Real pessoal</option>
                <option value="PROP">Prop</option>
                <option value="EVALUATION">Avaliação</option>
                <option value="FUNDED">Funded</option>
                <option value="DEMO">Demo</option>
              </select>
            </label>
            <button className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"><Plus className="size-4" />Adicionar conta</button>
          </form>
          <p className="mt-2 text-[10px] leading-4 text-slate-400">Depois de criar, conecte a conta desejada no MT5 e clique em “Associar MT5 atual”. Um login MT5 fica associado a uma única conta do JV FX.</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Checklist operacional</p>
              <h2 className="mt-1 text-sm font-semibold text-slate-900">O que já está pronto e o que falta validar</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {readiness.checks.map((item) => (
              <div key={item.key} className="flex gap-3 px-4 py-3">
                <StatusIcon status={item.status} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-slate-900">{item.label}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Google OAuth</p>
                <h2 className="mt-1 text-sm font-semibold text-slate-900">Configuração e teste</h2>
              </div>
              <UserCheck className="size-4 text-slate-400" />
            </div>
            <div className="space-y-3 p-4 text-xs text-slate-600">
              <ConfigRow label="Origem autorizada" value={readiness.siteUrl} />
              <ConfigRow label="Callback do Google/Supabase" value={readiness.supabaseCallbackUrl ?? "Configure NEXT_PUBLIC_SUPABASE_URL"} />
              <ConfigRow label="Redirect do JV FX" value={readiness.appCallbackUrl} />
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-[11px] leading-5 text-blue-800">
                Faça o teste com uma conta Google diferente em janela anônima. O usuário novo deve chegar como <strong>PENDING</strong>, ser aprovado pelo ADMIN e continuar isolado dos demais usuários.
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/login" className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800">Abrir login <ExternalLink className="size-3.5" /></Link>
                <Link href="/dashboard/admin/users" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Usuários e aprovações</Link>
              </div>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Exness / MetaTrader 5</p>
                <h2 className="mt-1 text-sm font-semibold text-slate-900">Conta MT5 detectada</h2>
              </div>
              <Link2 className="size-4 text-slate-400" />
            </div>
            <div className="p-4">
              {account ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <AccountMetric label="Login MT5" value={account.login} />
                  <AccountMetric label="Servidor" value={account.server || account.broker} />
                  <AccountMetric label="Tipo detectado" value={mt5AccountKindLabel(account.server)} />
                  <AccountMetric label="Saldo" value={formatCurrency(account.balance, account.currency)} />
                  <AccountMetric label="Equity" value={formatCurrency(account.equity, account.currency)} />
                  <AccountMetric label="Margem livre" value={formatCurrency(account.freeMargin, account.currency)} />
                  <AccountMetric label="Alavancagem" value={`1:${account.leverage}`} />
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">
                  O JV FX ainda não está recebendo uma conta MT5. Use <code className="font-semibold">INICIAR_TUDO.ps1</code>, mantenha o MetaTrader 5 aberto e logado e atualize esta página. O iniciador sincroniza o segredo do Bridge antes de subir o Next.js.
                </div>
              )}
              <div className="mt-3 grid gap-2 text-[11px] text-slate-500">
                <Step index="1" text="Abra o MetaTrader 5 da Exness e entre na conta que deseja usar." />
                <Step index="2" text="Inicie sempre pela raiz com INICIAR_TUDO.ps1; ele configura e valida o Bridge antes do site." />
                <Step index="3" text="Quando o login aparecer acima, associe-o ao cartão REAL ou DEMO compatível." />
                <Step index="4" text="Depois use Sincronização Exness / MT5 para importar o histórico e ativar o Journal automático." />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/dashboard/journal/import-mt5" className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">Sincronização Exness / MT5</Link>
                <Link href="/dashboard" className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Voltar à visão geral</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Próximo marco</p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900">Critério para começar a beta real</h2>
          </div>
        </div>
        <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          <Milestone label="Autenticação" detail="E-mail/senha + ADMIN + isolamento" done={readiness.appMode === "production" && readiness.actor.status === "ACTIVE"} />
          <Milestone label="Google" detail="Novo usuário → PENDING → aprovação" done={false} />
          <Milestone label="MT5" detail="Bridge + conta Exness detectada" done={Boolean(account)} />
          <Milestone label="Sincronização" detail="Histórico real no Journal" done={Boolean(overview?.states.some((item) => item.status === "SUCCESS" || item.status === "PARTIAL"))} />
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, detail }: { icon: any; label: string; value: string; detail: string }) {
  return <div className="panel p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-1 text-base font-semibold text-slate-900">{value}</p></div><div className="rounded-lg bg-slate-100 p-2 text-slate-500"><Icon className="size-4" /></div></div><p className="mt-2 truncate text-[10px] text-slate-400" title={detail}>{detail}</p></div>;
}

function StatusIcon({ status }: { status: IntegrationCheckStatus }) {
  if (status === "OK") return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />;
  if (status === "ACTION") return <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />;
  return <CircleAlert className="mt-0.5 size-4 shrink-0 text-blue-500" />;
}

function StatusBadge({ status }: { status: IntegrationCheckStatus }) {
  const copy = status === "OK" ? "OK" : status === "ACTION" ? "AÇÃO" : "VALIDAR";
  const classes = status === "OK" ? "bg-emerald-50 text-emerald-700" : status === "ACTION" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";
  return <span className={`rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${classes}`}>{copy}</span>;
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p><code className="mt-1 block overflow-x-auto rounded-md bg-slate-50 px-2.5 py-2 text-[10px] text-slate-700">{value}</code></div>;
}

function AccountMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"><p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p><p className="tabular mt-1 text-xs font-semibold text-slate-800">{value}</p></div>;
}

function Step({ index, text }: { index: string; text: string }) {
  return <div className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600">{index}</span><p className="leading-5">{text}</p></div>;
}

function Milestone({ label, detail, done }: { label: string; detail: string; done: boolean }) {
  return <div className="bg-white p-4"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${done ? "bg-emerald-500" : "bg-slate-300"}`} /><p className="text-xs font-semibold text-slate-800">{label}</p></div><p className="mt-1 text-[10px] leading-4 text-slate-400">{detail}</p></div>;
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
