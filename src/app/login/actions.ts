"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function signIn(formData: FormData) {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") redirect("/dashboard");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing-credentials");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=invalid-credentials");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") redirect("/signup?error=production-only");
  if (process.env.REGISTRATION_OPEN === "false") redirect("/signup?error=registration-closed");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!fullName || !email || !password) redirect("/signup?error=missing-fields");
  if (password.length < 8) redirect("/signup?error=weak-password");
  if (password !== passwordConfirm) redirect("/signup?error=password-mismatch");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/pending-approval`,
    },
  });

  if (error) redirect("/signup?error=signup-failed");
  if (data.session) redirect("/pending-approval?registered=1");
  redirect("/pending-approval?registered=1&confirmEmail=1");
}

export async function signOut() {
  if (process.env.NEXT_PUBLIC_APP_MODE === "production") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
