import { requirePermission } from "@/lib/auth/guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { getAdminDashboardData } from "@/features/admin/services/admin-service";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";

export default async function AdminPage() {
  const actor = await requirePermission(PERMISSIONS.ADMIN_ACCESS);
  const data = await getAdminDashboardData({
    includeUsers: hasPermission(actor.permissions, PERMISSIONS.ADMIN_USERS),
    includeAudit: hasPermission(actor.permissions, PERMISSIONS.ADMIN_AUDIT),
  });
  return <AdminDashboard data={data} demo={process.env.NEXT_PUBLIC_APP_MODE !== "production"} />;
}
