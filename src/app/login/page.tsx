import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { BrandIdentity } from "@/components/brand/brand-identity";
import { signIn } from "./actions";

const errorCopy: Record<string, string> = {
  "missing-credentials": "Informe e-mail e senha.",
  "invalid-credentials": "Credenciais inválidas.",
  "missing-auth-config": "Configure as variáveis do Supabase antes de usar o modo de produção.",
  "registration-closed": "Novos cadastros estão temporariamente fechados.",
  "oauth-failed": "Não foi possível iniciar o login com Google.",
  "oauth-callback": "Não foi possível concluir o login com Google.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const isDemo = process.env.NEXT_PUBLIC_APP_MODE !== "production";
  const error = params.error ? errorCopy[params.error] ?? "Não foi possível entrar." : null;
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-6 py-12"><section className="w-full max-w-[440px]">
    <div className="mb-7"><BrandIdentity /><p className="mt-2 text-xs text-slate-500">Performance Journal · Exness / MT5</p></div>
    <div className="panel overflow-hidden"><div className="border-b border-slate-100 p-6"><div className="mb-3 flex items-center gap-2 text-slate-500"><LockKeyhole className="size-4"/><span className="eyebrow">Ambiente seguro</span></div><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Entrar no JV FX</h1><p className="mt-2 text-sm leading-6 text-slate-500">Journal, sincronização e análise de desempenho em um único ambiente.</p></div>
      <div className="p-6">{error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {isDemo ? <><div className="mb-5 flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-slate-600"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-blue-600"/><p>Esta versão está em <strong>MODO DEMONSTRAÇÃO</strong>. Para testar cadastro, aprovação e Google, use o modo de produção com Supabase configurado.</p></div><Link href="/dashboard" className="flex w-full items-center justify-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Abrir ambiente demonstrativo</Link></> : <>
        <form action={signIn} className="space-y-4"><label className="block text-sm text-slate-600">E-mail<input name="email" type="email" autoComplete="email" required className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900" placeholder="trader@empresa.com" /></label><label className="block text-sm text-slate-600">Senha<input name="password" type="password" autoComplete="current-password" required className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900" /></label><button type="submit" className="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Entrar</button></form>
        <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200"/>ou<span className="h-px flex-1 bg-slate-200"/></div>
        <a href="/auth/google" className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Continuar com Google</a>
        <p className="mt-5 text-center text-xs text-slate-500">Ainda não possui conta? <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">Solicitar acesso</Link></p>
      </>}
      </div></div>
  </section></main>;
}
