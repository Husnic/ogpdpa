import type { Role, Staff } from "./types";

export type Action =
  | "dashboard.state"
  | "performance.view"
  | "app.create"
  | "app.assess"
  | "app.pay"
  | "app.recommend"
  | "app.approve"
  | "app.override"
  | "enf.create"
  | "enf.sanction"
  | "enf.approveSanction"
  | "pet.create"
  | "pet.treat"
  | "assign.create"
  | "assign.update"
  | "report.view"
  | "report.draft"
  | "report.submit"
  | "report.review"
  | "zones.manage"
  | "staff.view"
  | "staff.manage"
  | "staff.roster"
  | "settings.manage"
  | "audit.view"
  | "revenue.view";

const M: Record<Action, Role[]> = {
  "dashboard.state": ["SUPER_ADMIN", "HQ_ADMIN", "HQ_RECORDS"],
  "performance.view": ["SUPER_ADMIN", "HQ_ADMIN", "HQ_RECORDS"],
  "app.create": ["SUPER_ADMIN", "ZTPO", "PLANNING_OFFICER", "CLERICAL"],
  "app.assess": ["SUPER_ADMIN", "ZTPO", "PLANNING_OFFICER"],
  "app.pay": ["SUPER_ADMIN", "ZTPO", "PLANNING_OFFICER", "CLERICAL"],
  "app.recommend": ["SUPER_ADMIN", "ZTPO", "PLANNING_OFFICER"],
  "app.approve": ["SUPER_ADMIN", "ZTPO"],
  "app.override": ["SUPER_ADMIN", "HQ_ADMIN"],
  "enf.create": ["SUPER_ADMIN", "ZTPO", "PLANNING_OFFICER"],
  "enf.sanction": ["SUPER_ADMIN", "ZTPO", "PLANNING_OFFICER"],
  "enf.approveSanction": ["SUPER_ADMIN", "ZTPO"],
  "pet.create": ["SUPER_ADMIN", "ZTPO", "PLANNING_OFFICER", "CLERICAL"],
  "pet.treat": ["SUPER_ADMIN", "HQ_ADMIN", "ZTPO", "PLANNING_OFFICER"],
  "assign.create": ["SUPER_ADMIN", "HQ_ADMIN", "ZTPO"],
  "assign.update": ["SUPER_ADMIN", "HQ_ADMIN", "ZTPO", "PLANNING_OFFICER"],
  "report.view": ["SUPER_ADMIN", "HQ_ADMIN", "HQ_RECORDS", "ZTPO", "PLANNING_OFFICER"],
  "report.draft": ["ZTPO", "PLANNING_OFFICER"],
  "report.submit": ["ZTPO"],
  "report.review": ["SUPER_ADMIN", "HQ_ADMIN", "HQ_RECORDS"],
  "zones.manage": ["SUPER_ADMIN", "HQ_ADMIN"],
  "staff.view": ["SUPER_ADMIN", "HQ_ADMIN", "HQ_RECORDS", "ZTPO"],
  "staff.manage": ["SUPER_ADMIN", "HQ_ADMIN"],
  "staff.roster": ["SUPER_ADMIN", "HQ_ADMIN", "ZTPO"],
  "settings.manage": ["SUPER_ADMIN", "HQ_ADMIN"],
  "audit.view": ["SUPER_ADMIN", "HQ_ADMIN", "HQ_RECORDS", "ZTPO"],
  "revenue.view": ["SUPER_ADMIN", "HQ_ADMIN", "HQ_RECORDS", "ZTPO", "PLANNING_OFFICER", "CLERICAL"],
};

export function can(user: Staff | null | undefined, action: Action): boolean {
  if (!user || user.status !== "active") return false;
  if (action === "app.approve" && user.actingZtpo) return true;
  return M[action].includes(user.role);
}

export const isHQ = (u?: Staff | null) => !!u && u.zoneId === null;
