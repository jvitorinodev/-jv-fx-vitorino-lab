import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (process.env.REGISTRATION_OPEN === "false") {
    return NextResponse.redirect(new URL("/login?error=registration-closed", request.url));
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin).replace(/\/$/, "");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/login?error=oauth-failed", request.url));
  return NextResponse.redirect(data.url);
}
