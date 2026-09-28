export default function DashboardLoading() {
  return (
    <div aria-label="Carregando módulo" className="space-y-5 animate-pulse">
      <div className="h-8 w-64 rounded-lg bg-slate-900" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 rounded-xl border border-slate-800 bg-slate-950/40" />)}
      </div>
      <div className="h-80 rounded-xl border border-slate-800 bg-slate-950/40" />
    </div>
  );
}
