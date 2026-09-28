import Link from "next/link";
import { Clock3, MailCheck } from "lucide-react";
import { BrandIdentity } from "@/components/brand/brand-identity";
import { signOut } from "@/app/login/actions";

export default async function PendingApprovalPage({ searchParams }: { searchParams: Promise<{ registered?: string; confirmEmail?: string }> }) {
  const params = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-6 py-12"><section className="w-full max-w-[520px]"><div className="mb-6"><BrandIdentity /></div><div className="panel p-7 text-center">
    <div className="mx-auto grid size-12 place-items-center rounded-full bg-amber-50 text-amber-600">{params.confirmEmail ? <MailCheck className="size-6"/> : <Clock3 className="size-6"/>}</div>
    <h1 className="mt-4 text-2xl font-semibold text-slate-950">{params.confirmEmail ? "Confirme seu e-mail" : "Acesso aguardando liberação"}</h1>
    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{params.confirmEmail ? "Abra o e-mail enviado pelo Supabase e confirme o cadastro. Depois disso, sua conta ficará aguardando aprovação administrativa." : "Seu cadastro foi recebido. Um administrador do JV FX precisa aprovar sua conta antes do primeiro acesso ao painel."}</p>
    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center"><Link href="/login" className="action justify-center">Voltar ao login</Link><form action={signOut}><button type="submit" className="action w-full justify-center">Sair</button></form></div>
  </div></section></main>;
}
