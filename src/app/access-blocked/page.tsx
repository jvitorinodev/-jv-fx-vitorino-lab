import { ShieldX } from "lucide-react";
import { BrandIdentity } from "@/components/brand/brand-identity";
import { signOut } from "@/app/login/actions";

export default function AccessBlockedPage() {
  return <main className="grid min-h-screen place-items-center px-6 py-12"><section className="w-full max-w-lg"><BrandIdentity/><div className="panel mt-8 overflow-hidden"><div className="border-b border-slate-800 p-6"><div className="mb-4 grid size-11 place-items-center rounded-xl border border-red-400/20 bg-red-400/10"><ShieldX className="size-5 text-red-300"/></div><p className="eyebrow">Acesso suspenso</p><h1 className="mt-2 text-2xl font-semibold">Esta conta está temporariamente bloqueada.</h1><p className="mt-3 text-sm leading-6 text-slate-400">O status administrativo desta conta impede o acesso às áreas protegidas do JV FX. Entre em contato com a administração caso precise revisar o acesso.</p></div><div className="p-6"><form action={signOut}><button type="submit" className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-white">Encerrar sessão</button></form></div></div></section></main>;
}
