import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PositionSizeCalculator } from "@/features/position-size/components/position-size-calculator";

export default async function PositionSizePage() {
  await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
  return <PositionSizeCalculator standalone />;
}
