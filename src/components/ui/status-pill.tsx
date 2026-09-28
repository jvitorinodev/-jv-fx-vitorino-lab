type StatusTone = "positive" | "negative" | "warning" | "info" | "neutral" | "accent";

const tones: Record<StatusTone, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  negative: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  accent: "border-violet-200 bg-violet-50 text-violet-700",
};

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: StatusTone }) {
  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${tones[tone]}`}>{children}</span>;
}
