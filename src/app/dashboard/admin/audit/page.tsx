import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listAdminAuditLogs } from "@/features/admin/services/admin-service";
import { AdminAuditWorkspace } from "@/features/admin/components/admin-audit-workspace";

export default async function AdminAuditPage() {
  await requirePermission(PERMISSIONS.ADMIN_AUDIT);
  const logs = await listAdminAuditLogs(200);
  return <AdminAuditWorkspace initialLogs={logs} demo={process.env.NEXT_PUBLIC_APP_MODE !== "production"} />;
}
