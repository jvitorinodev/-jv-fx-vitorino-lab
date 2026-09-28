import { AlertTriangle } from "lucide-react";

export function ErrorState({ title = "Não foi possível carregar esta área", description, action }: { title?: string; description: string; action?: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-xl border border-red-400/15 bg-red-400/[0.04] p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-300" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-red-100">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
