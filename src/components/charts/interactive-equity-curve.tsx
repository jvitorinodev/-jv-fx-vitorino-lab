"use client";

import { useMemo, useRef, useState } from "react";
import { formatters } from "@/lib/i18n/pt-br";
import type { TradeTimelinePoint } from "@/lib/core/trade-insight-service";

type HoverState = {
  point: TradeTimelinePoint;
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function InteractiveEquityCurve({ points, emptyText = "Sem operações fechadas para desenhar a curva." }: { points: TradeTimelinePoint[]; emptyText?: string }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const width = 900;
  const height = 260;
  const padding = 20;

  const geometry = useMemo(() => {
    const values = [0, ...points.map((item) => item.cumulativePnl)];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;
    const coords = points.map((point, index) => {
      const x = padding + (index / Math.max(points.length - 1, 1)) * usableWidth;
      const y = height - padding - ((point.cumulativePnl - min) / range) * usableHeight;
      return { ...point, x, y };
    });
    const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
    const area = coords.length ? `${line} L${padding + usableWidth},${height - padding} L${padding},${height - padding} Z` : "";
    return { min, max, coords, line, area };
  }, [points]);

  if (!points.length) return <div className="grid h-64 place-items-center text-xs text-slate-400">{emptyText}</div>;

  function trackTooltip(event: any, point: TradeTimelinePoint) {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setHovered({
      point,
      x: clamp(event.clientX - bounds.left + 16, 12, bounds.width - 250),
      y: clamp(event.clientY - bounds.top - 10, 12, bounds.height - 130),
    });
  }

  return (
    <div>
      <div ref={wrapperRef} className="relative overflow-hidden rounded-lg border border-slate-100 bg-white">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full" role="img" aria-label="Curva acumulada de resultado por operação">
          <defs>
            <linearGradient id="performanceFillDetailed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#22c55e" stopOpacity="0.22" />
              <stop offset="1" stopColor="#22c55e" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
            <line key={ratio} x1={padding} x2={width - padding} y1={padding + (height - padding * 2) * ratio} y2={padding + (height - padding * 2) * ratio} stroke="#e2e8f0" />
          ))}
          <path d={geometry.area} fill="url(#performanceFillDetailed)" />
          <path d={geometry.line} fill="none" stroke="#22c55e" strokeWidth="2.5" />
          {geometry.coords.map((point) => (
            <circle
              key={point.id}
              cx={point.x}
              cy={point.y}
              r={5}
              fill={point.tone === "positive" ? "#10b981" : point.tone === "negative" ? "#ef4444" : "#94a3b8"}
              stroke="#ffffff"
              strokeWidth="2"
              onMouseEnter={(event: any) => trackTooltip(event, point)}
              onMouseMove={(event: any) => trackTooltip(event, point)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        {hovered ? (
          <div className="pointer-events-none absolute z-10 w-60 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-xl backdrop-blur" style={{ left: hovered.x, top: hovered.y }}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">{hovered.point.symbol}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${hovered.point.tone === "positive" ? "bg-emerald-50 text-emerald-700" : hovered.point.tone === "negative" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{hovered.point.resultLabel}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{hovered.point.dateLabel} · {hovered.point.timeLabel}</p>
            <div className="mt-2 space-y-1">
              <p className={`font-semibold ${hovered.point.tradePnl > 0 ? "text-emerald-700" : hovered.point.tradePnl < 0 ? "text-red-600" : "text-slate-700"}`}>Resultado: {formatters.usd.format(hovered.point.tradePnl)}</p>
              <p className="text-slate-600">P&L acumulado: <span className="font-medium text-slate-900">{formatters.usd.format(hovered.point.cumulativePnl)}</span></p>
              <p className="line-clamp-3 text-slate-500">Motivo: {hovered.point.reason}</p>
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>{points[0]?.dateLabel}</span><span>{points.at(-1)?.dateLabel}</span></div>
    </div>
  );
}
