import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listAdminAuditLogs, listAdminUsers } from "@/features/admin/services/admin-service";
import { AdminUsersWorkspace } from "@/features/admin/components/admin-users-workspace";

export default async function AdminUsersPage() {
  const actor = await requirePermission(PERMISSIONS.ADMIN_USERS);
  const [users, logs] = await Promise.all([listAdminUsers(), listAdminAuditLogs(100)]);
  return <AdminUsersWorkspace initialUsers={users} initialLogs={logs} demo={process.env.NEXT_PUBLIC_APP_MODE !== "production"} actorId={actor.id} />;
}
