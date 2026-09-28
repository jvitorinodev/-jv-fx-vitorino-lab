export function EmptyState({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-800 bg-slate-950/25 p-6 text-center">
      <div>
        <Icon className="mx-auto size-5 text-slate-600" aria-hidden="true" />
        <h3 className="mt-3 text-sm font-semibold text-slate-300">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
