import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminAuditLog, AdminDashboardData, AdminDashboardStats, AdminUser } from "@/lib/types/admin";
import { buildDemoAdminDashboardData, demoAdminLogs, demoAdminUsers } from "@/features/admin/data/demo-admin";
import type { AppRole } from "@/lib/auth/permissions";
import type { AdminAccountStatus } from "@/lib/types/admin";

const isDemo = () => process.env.NEXT_PUBLIC_APP_MODE !== "production";

function mapUser(row: Record<string, unknown>): AdminUser {
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    displayName: String(row.display_name ?? row.email ?? "Usuário"),
    role: String(row.role_key ?? "FREE") as AppRole,
    status: String(row.account_status ?? "ACTIVE") as AdminAccountStatus,
    timezone: String(row.timezone ?? "America/Sao_Paulo"),
    preferredCurrency: String(row.preferred_currency ?? "USD"),
    createdAt: String(row.created_at ?? new Date(0).toISOString()),
    lastSignInAt: row.last_sign_in_at ? String(row.last_sign_in_at) : null,
    permissionCount: Number(row.permission_count ?? 0),
  };
}

function mapLog(row: Record<string, unknown>): AdminAuditLog {
  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? row.metadata as Record<string, unknown>
    : {};
  return {
    id: String(row.id ?? ""),
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    actorDisplayName: String(row.actor_display_name ?? "Sistema"),
    actorEmail: String(row.actor_email ?? ""),
    action: String(row.action ?? "UNKNOWN"),
    targetType: row.target_type ? String(row.target_type) : null,
    targetId: row.target_id ? String(row.target_id) : null,
    metadata,
    createdAt: String(row.created_at ?? new Date(0).toISOString()),
  };
}

function mapStats(value: unknown): AdminDashboardStats {
  const row = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    totalUsers: Number(row.total_users ?? 0),
    activeUsers30d: Number(row.active_users_30d ?? 0),
    newUsers30d: Number(row.new_users_30d ?? 0),
    pendingUsers: Number(row.pending_users ?? 0),
    suspendedUsers: Number(row.suspended_users ?? 0),
    adminUsers: Number(row.admin_users ?? 0),
    auditEvents24h: Number(row.audit_events_24h ?? 0),
  };
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  if (isDemo()) return demoAdminUsers;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_users", { search_term: null });
  if (error) throw new Error(`Não foi possível carregar os usuários: ${error.message}`);
  return Array.isArray(data) ? data.map((row: unknown) => mapUser(row as Record<string, unknown>)) : [];
}

export async function listAdminAuditLogs(limit = 100): Promise<AdminAuditLog[]> {
  if (isDemo()) return demoAdminLogs;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_audit_logs", { limit_count: limit });
  if (error) throw new Error(`Não foi possível carregar a auditoria: ${error.message}`);
  return Array.isArray(data) ? data.map((row: unknown) => mapLog(row as Record<string, unknown>)) : [];
}

export async function getAdminDashboardData(options: { includeUsers?: boolean; includeAudit?: boolean } = {}): Promise<AdminDashboardData> {
  const includeUsers = options.includeUsers ?? true;
  const includeAudit = options.includeAudit ?? true;
  if (isDemo()) {
    const data = buildDemoAdminDashboardData();
    return { ...data, users: includeUsers ? data.users : [], logs: includeAudit ? data.logs : [] };
  }
  const supabase = await createSupabaseServerClient();
  const statsResult = await supabase.rpc("admin_get_dashboard_stats");
  if (statsResult.error) throw new Error(`Não foi possível carregar os indicadores administrativos: ${statsResult.error.message}`);

  let users: AdminUser[] = [];
  let logs: AdminAuditLog[] = [];
  if (includeUsers) {
    const usersResult = await supabase.rpc("admin_list_users", { search_term: null });
    if (usersResult.error) throw new Error(`Não foi possível carregar os usuários: ${usersResult.error.message}`);
    users = Array.isArray(usersResult.data) ? usersResult.data.map((row: unknown) => mapUser(row as Record<string, unknown>)) : [];
  }
  if (includeAudit) {
    const logsResult = await supabase.rpc("admin_list_audit_logs", { limit_count: 8 });
    if (logsResult.error) throw new Error(`Não foi possível carregar a auditoria: ${logsResult.error.message}`);
    logs = Array.isArray(logsResult.data) ? logsResult.data.map((row: unknown) => mapLog(row as Record<string, unknown>)) : [];
  }
  return { stats: mapStats(statsResult.data), users, logs };
}
