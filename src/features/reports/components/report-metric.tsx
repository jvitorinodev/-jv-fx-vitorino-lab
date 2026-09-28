export function ReportMetric({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail?: string; tone?: "neutral" | "positive" | "negative" | "warning" }) {
  const toneClass = tone === "positive" ? "text-emerald-300" : tone === "negative" ? "text-red-300" : tone === "warning" ? "text-amber-300" : "text-slate-100";
  return <div className="panel p-4"><p className="eyebrow">{label}</p><p className={`tabular mt-2 text-xl font-semibold ${toneClass}`}>{value}</p>{detail ? <p className="mt-1 text-[11px] text-slate-600">{detail}</p> : null}</div>;
}
