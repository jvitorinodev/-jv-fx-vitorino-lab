import Link from "next/link";
import { Calculator, Crosshair, FilePlus2, NotebookPen, ScanSearch } from "lucide-react";

const actions = [
  { label: "Nova Operação", href: "/dashboard/trade-planner", icon: FilePlus2 },
  { label: "Nova Análise", href: "/dashboard/analysis", icon: ScanSearch },
  { label: "Calcular Posição", href: "/dashboard/position-size", icon: Calculator },
  { label: "Criar Zona de Preço", href: "/dashboard/price-zones", icon: Crosshair },
  { label: "Abrir Diário", href: "/dashboard/journal", icon: NotebookPen },
];

export function QuickActions() {
  return <div className="flex flex-wrap gap-2">{actions.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 text-[11px] font-medium text-slate-400 transition hover:border-slate-700 hover:text-slate-200"><Icon className="size-3.5" aria-hidden="true" />{label}</Link>)}</div>;
}
