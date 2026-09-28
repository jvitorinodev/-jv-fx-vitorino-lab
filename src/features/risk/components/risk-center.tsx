import { AlertTriangle, Ban, Gauge, ShieldCheck } from "lucide-react";
import type { RiskPolicy, RiskSnapshot } from "@/lib/core/risk-service";
import { labelRiskStatus } from "@/lib/i18n/pt-br";
import { StatusPill } from "@/components/ui/status-pill";

function toneFor(status: RiskSnapshot["status"]): "positive" | "warning" | "negative" {
  return status === "SAFE" ? "positive" : status === "CAUTION" ? "warning" : "negative";
}

export function RiskCenter({ snapshot, policy }: { snapshot: RiskSnapshot; policy: RiskPolicy }) {
  const Icon = snapshot.status === "SAFE" ? ShieldCheck : snapshot.status === "LOCKED" ? Ban : AlertTriangle;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <RuleCard label="Risco / operação" value={`${policy.defaultRiskPerTradePct}%`} detail={`máx. ${policy.maxRiskPerTradePct}%`} />
        <RuleCard label="Máx. diário" value={`${policy.maxDailyLossPct}%`} detail="limite rígido" />
        <RuleCard label="Máx. semanal" value={`${policy.maxWeeklyLossPct}%`} detail="limite rígido" />
        <RuleCard label="Operações / dia" value={`${policy.maxTradesPerDay}`} detail="máximo" />
        <RuleCard label="Sequência de perdas" value={`${policy.cautionConsecutiveLosses}`} detail="→ ATENÇÃO" />
        <RuleCard label="Limite diário" value="BLOQUEADO" detail="novas operações bloqueadas" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]">
        <section className="panel overflow-hidden">
          <div className="panel-header"><div><p className="eyebrow">Proteção de capital</p><h2 className="mt-1 text-sm font-semibold">Orçamento de Perda</h2></div><StatusPill tone={toneFor(snapshot.status)}>{labelRiskStatus(snapshot.status)}</StatusPill></div>
          <div className="space-y-5 p-4">
            <BudgetBar label="Risco diário comprometido (perda + risco aberto)" used={snapshot.committedDailyRiskPct} max={policy.maxDailyLossPct} utilization={snapshot.dailyUtilizationPct} />
            <BudgetBar label="Risco semanal comprometido (perda + risco aberto)" used={snapshot.committedWeeklyRiskPct} max={policy.maxWeeklyLossPct} utilization={snapshot.weeklyUtilizationPct} />
            <div className="grid gap-3 sm:grid-cols-4">
              <InfoCell label="Perda diária realizada" value={`${snapshot.dailyLossPct.toFixed(2)}%`} />
              <InfoCell label="Risco aberto" value={`${snapshot.openRiskPct.toFixed(2)}%`} />
              <InfoCell label="Operações hoje" value={`${snapshot.tradesToday} / ${policy.maxTradesPerDay}`} />
              <InfoCell label="Perdas seguidas" value={`${snapshot.consecutiveLosses}`} />
            </div>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="panel-header"><div><p className="eyebrow">Trava de execução</p><h2 className="mt-1 text-sm font-semibold">Permissão para Operar</h2></div><Icon className="size-5 text-slate-500" /></div>
          <div className="p-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-500">Status para nova operação</p>
              <p className={`mt-1 text-2xl font-semibold ${snapshot.executionAllowed ? "text-emerald-300" : "text-red-300"}`}>{snapshot.executionAllowed ? "LIBERADO" : "BLOQUEADO"}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Risco máximo permitido para a próxima operação considerando o orçamento de perda restante: <span className="tabular font-medium text-slate-300">{snapshot.maxAllowedNextTradeRiskPct.toFixed(2)}%</span>.</p>
            </div>
            {snapshot.lockReason ? <div className="mt-3 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-300">{snapshot.lockReason}</div> : null}
            {snapshot.reasons.length ? <div className="mt-4 space-y-2">{snapshot.reasons.map((reason) => <div key={reason} className="flex items-center gap-2 text-xs text-amber-200/85"><Gauge className="size-3.5" />{reason}</div>)}</div> : <p className="mt-4 text-xs text-slate-600">Nenhum gatilho de atenção ativo no cenário demonstrativo.</p>}
          </div>
        </section>
      </div>

      <section className="panel p-4">
        <p className="eyebrow">Nota sobre o perfil de risco</p>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">O risco padrão permanece em 5%, enquanto o teto configurável por operação passa a 100% conforme solicitado. Isso não significa que 100% estará sempre liberado: a trava operacional continua limitada pelos tetos diário, semanal, risco já aberto e quantidade de operações. Percentuais extremos são tratados apenas como configuração disponível, nunca como recomendação.</p>
      </section>
    </div>
  );
}

function RuleCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="panel p-4"><p className="eyebrow">{label}</p><p className="tabular mt-2 text-xl font-semibold">{value}</p><p className="mt-1 text-[10px] text-slate-600">{detail}</p></article>;
}

function BudgetBar({ label, used, max, utilization }: { label: string; used: number; max: number; utilization: number }) {
  return <div><div className="mb-2 flex items-center justify-between gap-4 text-xs"><span className="text-slate-400">{label}</span><span className="tabular text-slate-300">{used.toFixed(2)} / {max.toFixed(2)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${utilization >= 85 ? "bg-red-400" : utilization >= 60 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(100, utilization)}%` }} /></div></div>;
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3"><p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</p><p className="tabular mt-1.5 text-sm font-medium text-slate-200">{value}</p></div>;
}
