import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type AppRole, type Permission, hasPermission, permissionsForRole, PERMISSIONS } from "./permissions";

export type Actor = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  permissions: Permission[];
};

const permissionSet = new Set<Permission>(Object.values(PERMISSIONS));

function isAppRole(value: unknown): value is AppRole {
  return value === "FREE" || value === "TRADER" || value === "ADMIN";
}

function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && permissionSet.has(value as Permission);
}

export async function getActor(): Promise<Actor | null> {
  if (process.env.NEXT_PUBLIC_APP_MODE !== "production") {
    return {
      id: "demo-ceo",
      email: "ceo@demo.local",
      displayName: "Ambiente do CEO",
      role: "ADMIN",
      status: "ACTIVE",
      permissions: permissionsForRole("ADMIN"),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: access, error } = await supabase.rpc("get_my_access");
  if (error) throw new Error(`Não foi possível resolver as permissões de acesso: ${error.message}`);

  const accessObject = access && typeof access === "object" && !Array.isArray(access)
    ? access as { role?: unknown; status?: unknown; permissions?: unknown }
    : {};
  const role: AppRole = isAppRole(accessObject.role) ? accessObject.role : "FREE";
  const status: "PENDING" | "ACTIVE" | "SUSPENDED" = accessObject.status === "SUSPENDED" ? "SUSPENDED" : accessObject.status === "PENDING" ? "PENDING" : "ACTIVE";
  const permissions = Array.isArray(accessObject.permissions)
    ? accessObject.permissions.filter(isPermission)
    : permissionsForRole(role);

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Operador"),
    role,
    status,
    permissions,
  };
}

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.status === "PENDING") redirect("/pending-approval");
  if (actor.status === "SUSPENDED") redirect("/access-blocked");
  return actor;
}

export async function requirePermission(permission: Permission): Promise<Actor> {
  const actor = await requireActor();
  if (!hasPermission(actor.permissions, permission)) redirect("/dashboard?error=permission-denied");
  return actor;
}
