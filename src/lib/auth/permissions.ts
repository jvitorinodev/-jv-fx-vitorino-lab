export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  MARKETS_VIEW: "markets.view",
  TERMINAL_VIEW: "terminal.view",
  NEWS_VIEW: "news.view",
  ANALYSIS_VIEW: "market_analysis.view",
  PRICE_ZONES_VIEW: "price_zones.view",
  CONFLUENCE_VIEW: "confluence.view",
  TRADE_PLANNER_VIEW: "trade_planner.view",
  POSITION_SIZE_VIEW: "position_size.view",
  RISK_VIEW: "risk_center.view",
  JOURNAL_VIEW: "journal.view",
  REPORTS_VIEW: "reports.view",
  PERFORMANCE_VIEW: "performance.view",
  ADMIN_ACCESS: "admin.access",
  ADMIN_USERS: "admin.users",
  ADMIN_AUDIT: "admin.audit",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type AppRole = "FREE" | "TRADER" | "ADMIN";

const base: Permission[] = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.MARKETS_VIEW,
  PERMISSIONS.TERMINAL_VIEW,
  PERMISSIONS.NEWS_VIEW,
  PERMISSIONS.POSITION_SIZE_VIEW,
  PERMISSIONS.RISK_VIEW,
  PERMISSIONS.JOURNAL_VIEW,
  PERMISSIONS.REPORTS_VIEW,
];

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  FREE: base,
  TRADER: [
    ...base,
    PERMISSIONS.ANALYSIS_VIEW,
    PERMISSIONS.PRICE_ZONES_VIEW,
    PERMISSIONS.CONFLUENCE_VIEW,
    PERMISSIONS.TRADE_PLANNER_VIEW,
    PERMISSIONS.PERFORMANCE_VIEW,
  ],
  ADMIN: Object.values(PERMISSIONS),
};

export function permissionsForRole(role: AppRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function hasPermission(permissions: readonly Permission[], permission: Permission): boolean {
  return permissions.includes(permission);
}
