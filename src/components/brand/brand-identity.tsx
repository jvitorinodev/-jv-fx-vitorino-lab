import { BRAND } from "@/config/brand";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const sizeClass = compact ? "size-10 rounded-2xl" : "size-12 rounded-[1.35rem]";
  const monogramClass = compact ? "text-[16px]" : "text-[18px]";

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden border border-slate-200/80 bg-[#0f2742] shadow-[0_8px_24px_rgba(15,39,66,0.24)] ${sizeClass}`}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(47,230,214,0.15),_transparent_55%)]" />
      <svg viewBox="0 0 56 56" className="size-[85%]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M11 37.5L22 33L31 37.5L40.5 29.5L47 32"
          stroke="#36E6D5"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="28"
          y="24.5"
          textAnchor="middle"
          fill="#36E6D5"
          className={`font-black tracking-[-0.08em] ${monogramClass}`}
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {BRAND.monogram}
        </text>
      </svg>
    </div>
  );
}

export function BrandIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BrandMark compact={compact} />
      <div className="min-w-0">
        <p className={`${compact ? "text-[15px]" : "text-base"} truncate font-black tracking-[0.03em] text-slate-950`}>
          {BRAND.primaryName}
        </p>
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">{BRAND.secondaryName}</p>
      </div>
    </div>
  );
}
