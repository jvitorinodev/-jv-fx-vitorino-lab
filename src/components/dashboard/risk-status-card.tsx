import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { RiskSnapshot } from "@/lib/core/risk-service";
import { labelRiskStatus } from "@/lib/i18n/pt-br";
import { StatusPill } from "@/components/ui/status-pill";

function toneFor(status: RiskSnapshot["status"]): "positive" | "warning" | "negative" {
  return status === "SAFE" ? "positive" : status === "CAUTION" ? "warning" : "negative";
}

export function RiskStatusCard({ risk }: { risk: RiskSnapshot }) {
  const Icon = risk.status === "SAFE" ? ShieldCheck : ShieldAlert;
  return (
    <section className="panel h-full overflow-hidden">
      <div className="panel-header"><div><p className="eyebrow">Controle de risco</p><h2 className="mt-1 text-sm font-semibold">Status de Risco</h2></div><StatusPill tone={toneFor(risk.status)}>{labelRiskStatus(risk.status)}</StatusPill></div>
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div><p className="text-xs text-slate-500">Orçamento diário de perda</p><p className="tabular mt-1 text-2xl font-semibold">{risk.committedDailyRiskPct.toFixed(2)}<span className="text-sm text-slate-500"> / {risk.policy.maxDailyLossPct.toFixed(2)}%</span></p></div>
          <Icon className="size-7 text-slate-500" aria-hidden="true" />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800" aria-label={`Orçamento de perda diária utilizado ${risk.dailyUtilizationPct.toFixed(0)}%`}><div className={`h-full rounded-full ${risk.status === "SAFE" ? "bg-emerald-400" : risk.status === "CAUTION" ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${risk.dailyUtilizationPct}%` }} /></div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div><p className="text-slate-600">Risco / operação</p><p className="tabular mt-0.5 font-medium text-slate-300">{risk.policy.defaultRiskPerTradePct}% <span className="text-slate-600">/ máx. {risk.policy.maxRiskPerTradePct}%</span></p></div>
          <div><p className="text-slate-600">Perda realizada / risco aberto</p><p className="tabular mt-0.5 font-medium text-slate-300">{risk.dailyLossPct.toFixed(2)}% / {risk.openRiskPct.toFixed(2)}%</p></div>
          <div><p className="text-slate-600">Operações hoje</p><p className="tabular mt-0.5 font-medium text-slate-300">{risk.tradesToday} / {risk.policy.maxTradesPerDay}</p></div>
          <div><p className="text-slate-600">Sequência de perdas</p><p className="tabular mt-0.5 font-medium text-slate-300">{risk.consecutiveLosses} <span className="text-slate-600">/ atenção em {risk.policy.cautionConsecutiveLosses}</span></p></div>
          <div><p className="text-slate-600">Perda semanal</p><p className="tabular mt-0.5 font-medium text-slate-300">{risk.weeklyLossPct.toFixed(2)} / {risk.policy.maxWeeklyLossPct}%</p></div>
          <div><p className="text-slate-600">Limite da próxima operação</p><p className="tabular mt-0.5 font-medium text-slate-300">{risk.maxAllowedNextTradeRiskPct.toFixed(2)}%</p></div>
        </div>
        {risk.lockReason ? <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-300">{risk.lockReason}</p> : null}
        {!risk.lockReason && risk.reasons.length ? <p className="mt-4 rounded-lg border border-amber-400/15 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">{risk.reasons.join(" · ")}</p> : null}
      </div>
    </section>
  );
}
