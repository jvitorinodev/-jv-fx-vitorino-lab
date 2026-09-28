import Link from "next/link";
import { UserPlus } from "lucide-react";
import { BrandIdentity } from "@/components/brand/brand-identity";
import { signUp } from "@/app/login/actions";

const errors: Record<string, string> = {
  "production-only": "Ative o modo de produção para testar o cadastro real.",
  "registration-closed": "Novos cadastros estão temporariamente fechados.",
  "missing-fields": "Preencha nome, e-mail e senha.",
  "weak-password": "Use uma senha com pelo menos 8 caracteres.",
  "password-mismatch": "As senhas não conferem.",
  "signup-failed": "Não foi possível concluir o cadastro. Verifique os dados e tente novamente.",
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] ?? "Não foi possível criar a conta." : null;
  const isDemo = process.env.NEXT_PUBLIC_APP_MODE !== "production";
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-6 py-12"><section className="w-full max-w-[460px]">
    <div className="mb-6"><BrandIdentity /><p className="mt-2 text-xs text-slate-500">Cadastro sujeito à aprovação do administrador.</p></div>
    <div className="panel overflow-hidden"><div className="border-b border-slate-100 p-6"><div className="mb-2 flex items-center gap-2 text-slate-500"><UserPlus className="size-4"/><span className="eyebrow">Solicitar acesso</span></div><h1 className="text-2xl font-semibold text-slate-950">Criar conta JV FX</h1><p className="mt-2 text-sm leading-6 text-slate-500">Crie suas credenciais. O acesso à plataforma é liberado por você, administrador do JV FX.</p></div>
      <div className="p-6">{error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <form action={signUp} className="space-y-4">
          <label className="block text-sm text-slate-600">Nome completo<input name="fullName" required className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900" /></label>
          <label className="block text-sm text-slate-600">E-mail<input name="email" type="email" autoComplete="email" required className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900" /></label>
          <label className="block text-sm text-slate-600">Senha<input name="password" type="password" autoComplete="new-password" minLength={8} required className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900" /></label>
          <label className="block text-sm text-slate-600">Confirmar senha<input name="passwordConfirm" type="password" autoComplete="new-password" minLength={8} required className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900" /></label>
          <button type="submit" disabled={isDemo} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Criar conta</button>
        </form>
        <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200"/>ou<span className="h-px flex-1 bg-slate-200"/></div>
        <a href={isDemo ? "#" : "/auth/google"} aria-disabled={isDemo} className={`flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${isDemo ? "pointer-events-none opacity-50" : ""}`}>Continuar com Google</a>
        <p className="mt-5 text-center text-xs text-slate-500">Já possui acesso? <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">Entrar</Link></p>
      </div></div>
  </section></main>;
}
