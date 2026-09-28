"use client";

import Link from "next/link";
import { Archive, Bell, BellOff, CheckCircle2, Copy, Edit3, Route, ShieldX, Sparkles } from "lucide-react";
import { getDemoQuote } from "@/features/market-analysis/data/demo-market-analysis";
import { inferPriceZoneStatus, zoneMidpoint } from "@/lib/core/price-zone-service";
import {
  labelConfluenceLevel,
  labelDirection,
  labelPriceZoneStatus,
  labelPriceZoneType,
} from "@/lib/i18n/pt-br";
import type { PriceZoneRecord, PriceZoneStatus } from "@/lib/types/price-zones";
import { StatusPill } from "@/components/ui/status-pill";

function statusTone(status: PriceZoneStatus): "positive" | "negative" | "warning" | "info" | "neutral" {
  if (status === "INVALIDATED") return "negative";
  if (status === "COMPLETED" || status === "REACTION") return "positive";
  if (status === "APPROACHING" || status === "INSIDE_ZONE") return "warning";
  if (status === "ARCHIVED") return "neutral";
  return "info";
}

export function PriceZoneCard({
  zone,
  onEdit,
  onDuplicate,
  onStatus,
}: {
  zone: PriceZoneRecord;
  onEdit: (zone: PriceZoneRecord) => void;
  onDuplicate: (zone: PriceZoneRecord) => void;
  onStatus: (zone: PriceZoneRecord, status: PriceZoneStatus) => void;
}) {
  const quote = getDemoQuote(zone.symbol);
  const effectiveStatus = zone.source === "DEMO" ? inferPriceZoneStatus(quote.price, zone.lowerPrice, zone.upperPrice, zone.status) : zone.status;
  const midpoint = zoneMidpoint(zone);
  const stop = zone.invalidationPrice ?? (zone.direction === "LONG" ? zone.lowerPrice - Math.abs(zone.upperPrice - zone.lowerPrice) : zone.upperPrice + Math.abs(zone.upperPrice - zone.lowerPrice));
  const plannerHref = `/dashboard/trade-planner?symbol=${encodeURIComponent(zone.symbol)}&setupId=${encodeURIComponent(zone.setupId)}&direction=${zone.direction}&tf=${encodeURIComponent(zone.timeframe)}&strategy=${encodeURIComponent("Zona + Motor de Confluências")}&name=${encodeURIComponent(labelPriceZoneType(zone.zoneType))}&entry=${midpoint}&stop=${stop}&confluences=${encodeURIComponent(zone.confluences.map((item) => item.key).join(","))}`;

  return (
    <article className="panel overflow-hidden">
      <div className="border-b border-slate-800/80 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">{zone.symbol}</h3>
              <StatusPill tone={zone.direction === "LONG" ? "positive" : "negative"}>{labelDirection(zone.direction)}</StatusPill>
              <StatusPill tone={statusTone(effectiveStatus)}>{labelPriceZoneStatus(effectiveStatus)}</StatusPill>
            </div>
            <p className="mt-1 text-xs text-slate-500">{labelPriceZoneType(zone.zoneType)} · {zone.timeframe} · {zone.setupId}</p>
          </div>
          <div className="text-right">
            <p className="tabular text-xl font-semibold text-slate-100">{zone.score.points.toFixed(1)}</p>
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">{labelConfluenceLevel(zone.score.level)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Preço inferior" value={zone.lowerPrice.toString()} />
          <Metric label="Preço superior" value={zone.upperPrice.toString()} />
          <Metric label="Invalidação" value={zone.invalidationPrice?.toString() ?? "—"} />
          <Metric label="Localização" value={zone.priceLocation === "DISCOUNT" ? "DISCOUNT" : zone.priceLocation === "PREMIUM" ? "PREMIUM" : zone.priceLocation === "EQUILIBRIUM" ? "EQUILÍBRIO" : "—"} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between"><p className="eyebrow">Confluências registradas</p><span className="text-[10px] text-slate-600">{zone.confluences.length}</span></div>
          <div className="flex flex-wrap gap-1.5">
            {zone.confluences.slice(0, 8).map((item) => <span key={item.key} className="rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1 text-[10px] text-slate-400">{item.label} <b className="text-slate-600">+{item.weight}</b></span>)}
            {zone.confluences.length > 8 ? <span className="px-2 py-1 text-[10px] text-slate-600">+{zone.confluences.length - 8}</span> : null}
          </div>
        </div>

        {zone.notes ? <p className="line-clamp-2 text-xs leading-5 text-slate-500">{zone.notes}</p> : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-900 pt-3">
          <button type="button" onClick={() => onEdit(zone)} className="action"><Edit3 className="size-3.5" />Editar</button>
          <button type="button" onClick={() => onDuplicate(zone)} className="action"><Copy className="size-3.5" />Duplicar</button>
          {!(["INVALIDATED", "COMPLETED", "ARCHIVED"] as PriceZoneStatus[]).includes(zone.status) ? <button type="button" onClick={() => onStatus(zone, "REACTION")} className="action text-emerald-300"><Sparkles className="size-3.5" />Marcar reação</button> : null}
          {!(["INVALIDATED", "COMPLETED", "ARCHIVED"] as PriceZoneStatus[]).includes(zone.status) ? <button type="button" onClick={() => onStatus(zone, "COMPLETED")} className="action text-emerald-300"><CheckCircle2 className="size-3.5" />Concluir</button> : null}
          {!(["INVALIDATED", "COMPLETED", "ARCHIVED"] as PriceZoneStatus[]).includes(zone.status) ? <button type="button" onClick={() => onStatus(zone, "INVALIDATED")} className="action text-red-300"><ShieldX className="size-3.5" />Invalidar</button> : null}
          {zone.status !== "ARCHIVED" ? <button type="button" onClick={() => onStatus(zone, "ARCHIVED")} className="action"><Archive className="size-3.5" />Arquivar</button> : null}
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-600">{zone.alertEnabled ? <Bell className="size-3" /> : <BellOff className="size-3" />}{zone.alertEnabled ? "Alerta preparado" : "Sem alerta"}</span>
          <Link href={plannerHref} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-400/20 bg-sky-400/[0.05] px-3 text-[11px] font-semibold text-sky-200 hover:bg-sky-400/[0.09]"><Route className="size-3.5" />Planejar operação</Link>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3"><p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">{label}</p><p className="tabular mt-1.5 truncate text-sm font-medium text-slate-200">{value}</p></div>;
}
