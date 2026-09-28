"use client";

import type { AppRole } from "@/lib/auth/permissions";
import type { AdminAccountStatus, AdminAuditLog, AdminUser } from "@/lib/types/admin";

const USERS_KEY = "jvfx.demo.admin.users.v1";
const LOGS_KEY = "jvfx.demo.admin.logs.v1";
const permissionCount: Record<AppRole, number> = { FREE: 8, TRADER: 13, ADMIN: 16 };

function sanitizeUser(user: AdminUser | (Omit<AdminUser, "role"> & { role: string })): AdminUser {
  const role: AppRole = user.role === "ADMIN" ? "ADMIN" : user.role === "FREE" ? "FREE" : "TRADER";
  return { ...user, role, permissionCount: permissionCount[role] } as AdminUser;
}

function sanitizeLog(log: AdminAuditLog): AdminAuditLog {
  const metadata = { ...log.metadata };
  if (metadata.oldRole === "VIP") metadata.oldRole = "TRADER";
  if (metadata.newRole === "VIP") metadata.newRole = "TRADER";
  return { ...log, metadata };
}

export function loadDemoAdminUsers(fallback: AdminUser[]): AdminUser[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    const users = raw ? (JSON.parse(raw) as AdminUser[]) : fallback;
    const sanitized = users.map(sanitizeUser);
    window.localStorage.setItem(USERS_KEY, JSON.stringify(sanitized));
    return sanitized;
  } catch {
    return fallback.map(sanitizeUser);
  }
}

export function loadDemoAdminLogs(fallback: AdminAuditLog[]): AdminAuditLog[] {
  try {
    const raw = window.localStorage.getItem(LOGS_KEY);
    const logs = raw ? (JSON.parse(raw) as AdminAuditLog[]) : fallback;
    const sanitized = logs.map(sanitizeLog);
    window.localStorage.setItem(LOGS_KEY, JSON.stringify(sanitized));
    return sanitized;
  } catch {
    return fallback.map(sanitizeLog);
  }
}

export function saveDemoAdminUsers(users: AdminUser[]) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users.map(sanitizeUser)));
}

export function saveDemoAdminLogs(logs: AdminAuditLog[]) {
  window.localStorage.setItem(LOGS_KEY, JSON.stringify(logs.map(sanitizeLog)));
}

export function makeDemoAuditLog(input: {
  action: string;
  target: AdminUser;
  metadata: Record<string, unknown>;
}): AdminAuditLog {
  return {
    id: `demo-${Date.now()}`,
    actorUserId: "demo-ceo",
    actorDisplayName: "CEO JV FX",
    actorEmail: "ceo@jvfx.local",
    action: input.action,
    targetType: "USER",
    targetId: input.target.id,
    metadata: { targetEmail: input.target.email, ...input.metadata },
    createdAt: new Date().toISOString(),
  };
}

export function applyDemoRole(user: AdminUser, role: AppRole): AdminUser {
  return { ...user, role, permissionCount: permissionCount[role] };
}

export function applyDemoStatus(user: AdminUser, status: AdminAccountStatus): AdminUser {
  return { ...user, status };
}
