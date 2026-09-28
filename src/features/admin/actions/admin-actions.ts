"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS, type AppRole } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminAccountStatus } from "@/lib/types/admin";

const roles = new Set<AppRole>(["FREE", "TRADER", "ADMIN"]);
const statuses = new Set<AdminAccountStatus>(["PENDING", "ACTIVE", "SUSPENDED"]);

export type AdminMutationResult = { ok: true } | { ok: false; message: string };

export async function updateAdminUserRole(userId: string, role: AppRole): Promise<AdminMutationResult> {
  await requirePermission(PERMISSIONS.ADMIN_USERS);
  if (!userId || !roles.has(role)) return { ok: false, message: "Função inválida." };
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return { ok: true };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_user_role", { target_user_id: userId, new_role: role });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/audit");
  return { ok: true };
}

export async function updateAdminUserStatus(userId: string, status: AdminAccountStatus, reason?: string): Promise<AdminMutationResult> {
  await requirePermission(PERMISSIONS.ADMIN_USERS);
  if (!userId || !statuses.has(status)) return { ok: false, message: "Status inválido." };
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") return { ok: true };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_user_status", {
    target_user_id: userId,
    new_status: status,
    reason_input: reason?.trim() || null,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/audit");
  return { ok: true };
}
