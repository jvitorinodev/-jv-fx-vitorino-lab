import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseCookieToSet } from "@/lib/supabase/cookie-types";

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) throw new Error("A configuração do Supabase para o servidor está ausente.");

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: SupabaseCookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components nem sempre podem alterar cookies. O middleware renova as sessões.
        }
      },
    },
  });
}
