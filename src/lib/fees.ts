import { findUseGroup } from "./catalog";
import type { Application, FeeLine, Settings, Zone } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  assessmentValidityDays: 3,
  processingTargetDays: 7,
  backlogDays: 14,
  tpAdminPct: 10,
  penalPct: 25,
  feeRates: {
    residential: 165000,
    commercial: 420000,
    public: 300000,
    religious: 240000,
    recreational: 280000,
    agricultural: 150000,
    factory: 780000,
    industry: 1150000,
    farm_tank: 210000,
    layout: 60000,
    mixed_use: 380000,
    fencing: 85000,
  },
};

/** Default assessment for an application. Officers can adjust any line before saving. */
export function defaultFees(
  app: Pick<Application, "useGroup" | "floors" | "devStatus">,
  s: Settings,
  jitter = 1,
): FeeLine[] {
  const g = findUseGroup(app.useGroup);
  const floors = Math.max(1, app.floors || 1);
  const rate = s.feeRates[app.useGroup] ?? 150000;
  const base = Math.round((rate * (0.55 + 0.45 * floors) * jitter) / 5) * 5;
  const r5 = (n: number) => Math.round(n / 5) * 5;
  const lines: FeeLine[] = [];
  if (app.useGroup === "fencing") {
    lines.push({ head: "fencing", amount: base });
    lines.push({ head: "tp_admin", amount: r5((base * s.tpAdminPct) / 100) });
  } else if (app.useGroup === "layout") {
    lines.push({ head: "layout", amount: base });
    lines.push({ head: "tp_admin", amount: r5((base * s.tpAdminPct) / 100) });
  } else {
    lines.push({ head: "basic", amount: base });
    lines.push({ head: "fencing", amount: r5(base * 0.18) });
    lines.push({ head: "tp_admin", amount: r5((base * s.tpAdminPct) / 100) });
    lines.push({ head: "fitness", amount: r5(base * 0.177) });
    lines.push({ head: "stage", amount: r5(base * 0.06) });
    lines.push({ head: "layout", amount: 10000 });
    if (g?.special) {
      lines.push({ head: "idc", amount: r5(base * 0.05) });
      lines.push({ head: "spatial", amount: r5(base * 0.03) });
    }
  }
  if (app.devStatus === "developed") lines.push({ head: "penal", amount: r5((base * s.penalPct) / 100) });
  return lines;
}

export const lineTotal = (lines: FeeLine[]) => lines.reduce((a, l) => a + l.amount, 0);

/** Reg No e.g. ODZPO26/R/B/37 — series letter (A–D) is illustrative pending OGPDPA confirmation. */
export function makeRegNo(zone: Zone, year: number, useGroupId: string, floors: number, seq: number) {
  const series = "ABCD"[Math.min(3, Math.max(0, floors - 1))];
  return `${zone.code}${String(year).slice(2)}/${findUseGroup(useGroupId)?.code ?? "X"}/${series}/${seq}`;
}
export const makeApprovalNo = (regNo: string) => `OGPDPA/${regNo}`;
