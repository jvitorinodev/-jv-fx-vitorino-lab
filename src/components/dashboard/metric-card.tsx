import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function MetricCard({ label, value, secondary, direction = "neutral" }: { label: string; value: string; secondary?: string; direction?: "up" | "down" | "neutral" }) {
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const tone = direction === "up" ? "text-emerald-300" : direction === "down" ? "text-red-300" : "text-slate-500";
  return (
    <article className="panel min-w-0 p-4">
      <p className="eyebrow">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="tabular truncate text-xl font-semibold tracking-tight text-slate-100">{value}</p>
        {secondary ? <span className={`flex shrink-0 items-center gap-1 text-xs font-medium ${tone}`}><Icon className="size-3.5" aria-hidden="true" />{secondary}</span> : null}
      </div>
    </article>
  );
}
