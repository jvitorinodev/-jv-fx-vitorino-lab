"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100">
        <main className="grid min-h-screen place-items-center px-6">
          <section className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-slate-500">JV FX · Vitorino LAB</p>
            <h1 className="mt-3 text-xl font-semibold">Falha crítica de interface</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">A aplicação não conseguiu renderizar esta página. Recarregue o ambiente antes de continuar qualquer fluxo operacional.</p>
            <button onClick={reset} className="mt-6 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950">Tentar novamente</button>
          </section>
        </main>
      </body>
    </html>
  );
}
