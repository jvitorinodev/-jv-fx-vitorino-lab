import type { AppRole } from "@/lib/auth/permissions";

export type AdminAccountStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  status: AdminAccountStatus;
  timezone: string;
  preferredCurrency: string;
  createdAt: string;
  lastSignInAt: string | null;
  permissionCount: number;
};

export type AdminAuditLog = {
  id: string;
  actorUserId: string | null;
  actorDisplayName: string;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AdminDashboardStats = {
  totalUsers: number;
  activeUsers30d: number;
  newUsers30d: number;
  pendingUsers: number;
  suspendedUsers: number;
  adminUsers: number;
  auditEvents24h: number;
};

export type AdminDashboardData = {
  stats: AdminDashboardStats;
  users: AdminUser[];
  logs: AdminAuditLog[];
};
