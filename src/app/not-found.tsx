import Link from "next/link";
import { SearchX } from "lucide-react";
import { BrandIdentity } from "@/components/brand/brand-identity";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-xl text-center">
        <div className="mb-8 flex justify-center"><BrandIdentity /></div>
        <div className="panel p-8">
          <SearchX className="mx-auto size-7 text-slate-600" aria-hidden="true" />
          <p className="eyebrow mt-4">Erro 404</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Página não encontrada</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">O endereço não existe nesta versão do JV FX ou o módulo foi removido do escopo da primeira geração.</p>
          <Link href="/dashboard" className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-950 hover:bg-white">Voltar à Mesa de Operações</Link>
        </div>
      </section>
    </main>
  );
}
