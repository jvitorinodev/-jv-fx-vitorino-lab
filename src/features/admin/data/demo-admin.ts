import type { AdminAuditLog, AdminDashboardData, AdminUser } from "@/lib/types/admin";

export const demoAdminUsers: AdminUser[] = [
  { id: "demo-ceo", email: "ceo@jvfx.local", displayName: "CEO JV FX", role: "ADMIN", status: "ACTIVE", timezone: "America/Sao_Paulo", preferredCurrency: "USD", createdAt: "2026-06-10T13:00:00.000Z", lastSignInAt: "2026-09-21T21:18:00.000Z", permissionCount: 16 },
  { id: "demo-trader-01", email: "marina@demo.local", displayName: "Marina Costa", role: "TRADER", status: "ACTIVE", timezone: "America/Sao_Paulo", preferredCurrency: "USD", createdAt: "2026-08-14T15:10:00.000Z", lastSignInAt: "2026-09-21T18:42:00.000Z", permissionCount: 13 },
  { id: "demo-trader-02", email: "lucas@demo.local", displayName: "Lucas Almeida", role: "TRADER", status: "ACTIVE", timezone: "America/Sao_Paulo", preferredCurrency: "USD", createdAt: "2026-08-28T11:20:00.000Z", lastSignInAt: "2026-09-20T23:14:00.000Z", permissionCount: 13 },
  { id: "demo-free-01", email: "camila@demo.local", displayName: "Camila Rocha", role: "FREE", status: "ACTIVE", timezone: "America/Sao_Paulo", preferredCurrency: "BRL", createdAt: "2026-09-02T18:35:00.000Z", lastSignInAt: "2026-09-19T19:31:00.000Z", permissionCount: 8 },
  { id: "demo-trader-03", email: "andre@demo.local", displayName: "André Martins", role: "TRADER", status: "SUSPENDED", timezone: "America/Sao_Paulo", preferredCurrency: "USD", createdAt: "2026-07-19T12:10:00.000Z", lastSignInAt: "2026-09-12T14:08:00.000Z", permissionCount: 13 },
  { id: "demo-trader-04", email: "bruno@demo.local", displayName: "Bruno Nogueira", role: "TRADER", status: "ACTIVE", timezone: "Europe/Lisbon", preferredCurrency: "EUR", createdAt: "2026-09-15T09:00:00.000Z", lastSignInAt: "2026-09-21T17:02:00.000Z", permissionCount: 13 },
  { id: "demo-free-02", email: "renata@demo.local", displayName: "Renata Lima", role: "FREE", status: "PENDING", timezone: "America/Sao_Paulo", preferredCurrency: "USD", createdAt: "2026-09-20T13:50:00.000Z", lastSignInAt: null, permissionCount: 8 },
];

export const demoAdminLogs: AdminAuditLog[] = [
  { id: "1006", actorUserId: "demo-ceo", actorDisplayName: "CEO JV FX", actorEmail: "ceo@jvfx.local", action: "USER_ROLE_CHANGED", targetType: "USER", targetId: "demo-trader-04", metadata: { oldRole: "FREE", newRole: "TRADER", targetEmail: "bruno@demo.local" }, createdAt: "2026-09-21T18:04:00.000Z" },
  { id: "1005", actorUserId: "demo-ceo", actorDisplayName: "CEO JV FX", actorEmail: "ceo@jvfx.local", action: "USER_STATUS_CHANGED", targetType: "USER", targetId: "demo-trader-03", metadata: { oldStatus: "ACTIVE", newStatus: "SUSPENDED", reason: "Revisão administrativa", targetEmail: "andre@demo.local" }, createdAt: "2026-09-21T15:42:00.000Z" },
  { id: "1004", actorUserId: "demo-ceo", actorDisplayName: "CEO JV FX", actorEmail: "ceo@jvfx.local", action: "USER_ROLE_CHANGED", targetType: "USER", targetId: "demo-trader-01", metadata: { oldRole: "FREE", newRole: "TRADER", targetEmail: "marina@demo.local" }, createdAt: "2026-09-20T20:30:00.000Z" },
  { id: "1003", actorUserId: "demo-ceo", actorDisplayName: "CEO JV FX", actorEmail: "ceo@jvfx.local", action: "USER_STATUS_CHANGED", targetType: "USER", targetId: "demo-free-01", metadata: { oldStatus: "SUSPENDED", newStatus: "ACTIVE", reason: "Acesso revalidado", targetEmail: "camila@demo.local" }, createdAt: "2026-09-19T16:12:00.000Z" },
  { id: "1002", actorUserId: "demo-ceo", actorDisplayName: "CEO JV FX", actorEmail: "ceo@jvfx.local", action: "USER_ROLE_CHANGED", targetType: "USER", targetId: "demo-trader-02", metadata: { oldRole: "FREE", newRole: "TRADER", targetEmail: "lucas@demo.local" }, createdAt: "2026-09-18T12:22:00.000Z" },
];

export function buildDemoAdminDashboardData(): AdminDashboardData {
  const now = new Date("2026-09-21T22:00:00.000Z").getTime();
  const days = (value: string | null, amount: number) => value ? now - new Date(value).getTime() <= amount * 86_400_000 : false;
  return {
    stats: {
      totalUsers: demoAdminUsers.length,
      activeUsers30d: demoAdminUsers.filter((user) => user.status === "ACTIVE" && days(user.lastSignInAt, 30)).length,
      newUsers30d: demoAdminUsers.filter((user) => days(user.createdAt, 30)).length,
      pendingUsers: demoAdminUsers.filter((user) => user.status === "PENDING").length,
      suspendedUsers: demoAdminUsers.filter((user) => user.status === "SUSPENDED").length,
      adminUsers: demoAdminUsers.filter((user) => user.role === "ADMIN").length,
      auditEvents24h: demoAdminLogs.filter((log) => days(log.createdAt, 1)).length,
    },
    users: demoAdminUsers,
    logs: demoAdminLogs,
  };
}
