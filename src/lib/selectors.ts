import { addDays, differenceInCalendarDays, endOfDay, format, max as dmax, min as dmin, startOfMonth } from "date-fns";
import { FEE_HEADS, NOTICE_TYPES, SANCTION_TYPES, USE_GROUPS, findUseGroup, labelOfUse } from "./catalog";
import { avg, sum } from "./format";
import { d, inRange, monthsIn, periodFromKey, ts, periodOf, weekOfMonth, weeksInMonth, type Period, type Range } from "./periods";
import type { Application, Assignment, EnforcementCase, FeeHead, NoticeType, Payment, Petition, SanctionType, Settings, Staff, Zone } from "./types";

export interface Data {
  zones: Zone[];
  staff: Staff[];
  applications: Application[];
  payments: Payment[];
  cases: EnforcementCase[];
  petitions: Petition[];
  assignments: Assignment[];
  settings: Settings;
}

export type ZoneFilter = string[] | null; // null = all zones

/* Per-zone index, cached per array identity (store arrays are immutable). */
const ZIDX = new WeakMap<object, Map<string, unknown[]>>();
export function byZone<T extends { zoneId: string | null }>(arr: T[], z: ZoneFilter): T[] {
  if (!z) return arr;
  let m = ZIDX.get(arr) as Map<string, T[]> | undefined;
  if (!m) {
    m = new Map();
    for (const x of arr) {
      const k = x.zoneId ?? "__hq";
      const list = m.get(k);
      if (list) list.push(x);
      else m.set(k, [x]);
    }
    ZIDX.set(arr, m as Map<string, unknown[]>);
  }
  return z.length === 1 ? (m.get(z[0]) ?? []) : z.flatMap((k) => m!.get(k) ?? []);
}

export interface Bucket {
  label: string;
  range: Range;
}
export const weekBuckets = (month: Date): Bucket[] => {
  const n = weeksInMonth(month);
  const first = startOfMonth(month);
  const end = endOfDay(addDays(startOfMonth(addDays(first, 32)), -1));
  return Array.from({ length: n }, (_, i) => {
    const days = Array.from({ length: end.getDate() }, (_, k) => addDays(first, k)).filter((x) => weekOfMonth(x) === i + 1);
    return { label: `Week ${i + 1}`, range: { from: dmin(days), to: endOfDay(dmax(days)) } };
  });
};
export const monthBuckets = (r: Range): Bucket[] => monthsIn(r).map((m) => ({ label: format(m, "MMMM"), range: periodOf("month", m) }));

/* ── Core counters ───────────────────────────────────────────────── */

export const statusEvents = (apps: Application[], status: string, r: Range) =>
  apps.filter((a) => a.history.some((h) => h.status === status && inRange(h.at, r))).length;

export const processingDays = (a: Application) => (a.registeredAt && a.approvedAt ? Math.max(0, differenceInCalendarDays(d(a.approvedAt), d(a.registeredAt))) : null);

export function pendingAt(apps: Application[], at: Date) {
  const t = at.getTime();
  return apps.filter((a) => a.registeredAt && ts(a.registeredAt) <= t && !(a.approvedAt && ts(a.approvedAt) <= t) && a.status !== "disapproved");
}

export interface Metrics {
  received: number;
  okayed: number;
  assessed: number;
  registered: number;
  approved: number;
  disapproved: number;
  pended: number;
  pending: number;
  backlog: number;
  revenue: number;
  penal: number;
  byHead: Record<FeeHead, number>;
  notices: number;
  noticesByType: Record<NoticeType, number>;
  sanctions: number;
  sanctionsByType: Record<SanctionType, number>;
  petitionsReceived: number;
  petitionsTreated: number;
  petitionsOutstanding: number;
  avgProcessing: number;
  withinTarget: number; // 0..1
  fencePermits: number;
  simpleApproved: number;
  specialApproved: number;
  openCases: number;
  expiredAssessments: number;
}

export function metrics(data: Data, z: ZoneFilter, r: Range): Metrics {
  const apps = byZone(data.applications, z);
  const pays = byZone(data.payments, z).filter((p) => inRange(p.paidAt, r));
  const cases = byZone(data.cases, z);
  const pets = byZone(data.petitions, z);
  const approvedIn = apps.filter((a) => inRange(a.approvedAt, r));
  const pdays = approvedIn.map(processingDays).filter((x): x is number => x !== null);
  const byHead = Object.fromEntries(FEE_HEADS.map((f) => [f.id, 0])) as Record<FeeHead, number>;
  for (const p of pays) for (const l of p.lines) byHead[l.head] += l.amount;
  const noticesByType = Object.fromEntries(NOTICE_TYPES.map((n) => [n.id, 0])) as Record<NoticeType, number>;
  const sanctionsByType = Object.fromEntries(SANCTION_TYPES.map((n) => [n.id, 0])) as Record<SanctionType, number>;
  for (const c of cases) {
    for (const n of c.notices) if (inRange(n.servedAt, r)) noticesByType[n.type]++;
    for (const s of c.sanctions) if (inRange(s.at, r)) sanctionsByType[s.type]++;
  }
  const end = r.to;
  const pend = pendingAt(apps, end);
  const backlogCut = addDays(end, -data.settings.backlogDays);
  return {
    received: apps.filter((a) => inRange(a.receivedAt, r)).length,
    okayed: statusEvents(apps, "okayed", r),
    assessed: statusEvents(apps, "assessed", r),
    registered: statusEvents(apps, "registered", r),
    approved: approvedIn.length,
    disapproved: statusEvents(apps, "disapproved", r),
    pended: statusEvents(apps, "pended", r),
    pending: pend.length,
    backlog: pend.filter((a) => d(a.registeredAt!) < backlogCut).length,
    revenue: sum(pays.map((p) => p.amount)),
    penal: byHead.penal,
    byHead,
    notices: sum(Object.values(noticesByType)),
    noticesByType,
    sanctions: sanctionsByType.token_demolition + sanctionsByType.total_demolition + sanctionsByType.sealing,
    sanctionsByType,
    petitionsReceived: pets.filter((p) => inRange(p.receivedAt, r)).length,
    petitionsTreated: pets.filter((p) => inRange(p.treatedAt, r)).length,
    petitionsOutstanding: pets.filter((p) => d(p.receivedAt) <= end && !(p.treatedAt && d(p.treatedAt) <= end)).length,
    avgProcessing: avg(pdays),
    withinTarget: pdays.length ? pdays.filter((x) => x <= data.settings.processingTargetDays).length / pdays.length : 0,
    fencePermits: approvedIn.filter((a) => a.useGroup === "fencing").length,
    simpleApproved: approvedIn.filter((a) => !findUseGroup(a.useGroup).special).length,
    specialApproved: approvedIn.filter((a) => findUseGroup(a.useGroup).special).length,
    openCases: cases.filter((c) => c.outcome === "open" && d(c.openedAt) <= end).length,
    expiredAssessments: apps.filter((a) => a.status === "assessed" && a.assessment && d(a.assessment.expiresAt) < end).length,
  };
}

/** Time series of selected metrics over buckets. */
export function series(data: Data, z: ZoneFilter, buckets: Bucket[]) {
  return buckets.map((b) => ({ label: b.label, ...metrics(data, z, b.range) }));
}

/* ── Zone comparison (HQ) ────────────────────────────────────────── */

export interface ZoneRow {
  zone: Zone;
  m: Metrics;
  prev: Metrics;
  staff: number;
  revenuePerOfficer: number;
  reportsOnTime: number; // 0..1
  reportsLate: number;
  reportsPending: number;
}

export function zoneRows(data: Data & { reports: import("./types").ReportSubmission[] }, p: Period, prev: Period, today: Date): ZoneRow[] {
  return data.zones.map((zone) => {
    const m = metrics(data, [zone.id], p);
    const staff = data.staff.filter((s) => s.zoneId === zone.id && s.status === "active").length;
    const reps = data.reports.filter((r) => r.zoneId === zone.id && inRange(periodEndFromKey(r.periodKey), { from: addDays(today, -120), to: today }));
    const onTime = reps.filter((r) => r.submittedAt && d(r.submittedAt) <= dueDate(r.kind, r.periodKey)).length;
    const late = reps.filter((r) => (r.submittedAt && d(r.submittedAt) > dueDate(r.kind, r.periodKey)) || (!r.submittedAt && dueDate(r.kind, r.periodKey) < today)).length;
    return {
      zone,
      m,
      prev: metrics(data, [zone.id], prev),
      staff,
      revenuePerOfficer: staff ? m.revenue / staff : 0,
      reportsOnTime: reps.length ? onTime / reps.length : 0,
      reportsLate: late,
      reportsPending: reps.filter((r) => r.status === "submitted").length,
    };
  });
}

/* ── Report periods & due dates ──────────────────────────────────── */
export const periodEndFromKey = (k: string) => format(periodFromKey(k).to, "yyyy-MM-dd'T'HH:mm:ss");
export function dueDate(kind: string, key: string) {
  const p = periodFromKey(key);
  const lag = kind === "weekly" ? 3 : kind === "monthly" ? 5 : 15;
  return endOfDay(addDays(p.to, lag));
}

/* ── Report tables ───────────────────────────────────────────────── */

export const PLAN_ROWS = [
  ["Plan Okayed", "okayed"],
  ["Plan Assessed", "assessed"],
  ["Plan Registered", "registered"],
  ["Plan Approved", "approved"],
  ["Plan Disapproved", "disapproved"],
  ["Plan Pending", "pending"],
  ["Plan Backlog", "backlog"],
  ["Plan Re-validated", "revalidated"],
  ["Plan Renovation", "renovation"],
] as const;

export function planTable(data: Data, z: ZoneFilter, buckets: Bucket[]) {
  const apps = byZone(data.applications, z);
  const cell = (key: string, r: Range) => {
    if (key === "pending") return pendingAt(apps, r.to).length;
    if (key === "backlog") {
      const cut = addDays(r.to, -data.settings.backlogDays).getTime();
      return pendingAt(apps, r.to).filter((a) => ts(a.registeredAt!) < cut).length;
    }
    if (key === "revalidated") return apps.filter((a) => a.kind === "revalidation" && inRange(a.approvedAt, r)).length;
    if (key === "renovation") return apps.filter((a) => a.kind === "renovation" && inRange(a.approvedAt, r)).length;
    if (key === "approved") return apps.filter((a) => inRange(a.approvedAt, r)).length;
    return statusEvents(apps, key, r);
  };
  return PLAN_ROWS.map(([label, key]) => {
    const cells = buckets.map((b) => cell(key, b.range));
    // pending/backlog are point-in-time: total = last bucket
    const total = key === "pending" || key === "backlog" ? cells[cells.length - 1] ?? 0 : sum(cells);
    return { label, key, cells, total };
  });
}

export function noticeTable(data: Data, z: ZoneFilter, buckets: Bucket[]) {
  const cases = byZone(data.cases, z);
  const rows = NOTICE_TYPES.map((n) => {
    const cells = buckets.map((b) => cases.reduce((a, c) => a + c.notices.filter((x) => x.type === n.id && inRange(x.servedAt, b.range)).length, 0));
    return { label: n.label, short: n.short, key: n.id as string, cells, total: sum(cells) };
  });
  const sanc = SANCTION_TYPES.filter((s) => s.id !== "unsealing").map((s) => {
    const cells = buckets.map((b) => cases.reduce((a, c) => a + c.sanctions.filter((x) => x.type === s.id && inRange(x.at, b.range)).length, 0));
    return { label: s.label, short: s.label, key: s.id as string, cells, total: sum(cells) };
  });
  return { notices: rows, sanctions: sanc };
}

export function petitionTable(data: Data, z: ZoneFilter, buckets: Bucket[]) {
  const pets = byZone(data.petitions, z);
  const reg = buckets.map((b) => pets.filter((p) => inRange(p.receivedAt, b.range)).length);
  const tr = buckets.map((b) => pets.filter((p) => inRange(p.treatedAt, b.range)).length);
  const out = buckets.map((b) => pets.filter((p) => d(p.receivedAt) <= b.range.to && !(p.treatedAt && d(p.treatedAt) <= b.range.to)).length);
  return [
    { label: "Registered", cells: reg, total: sum(reg) },
    { label: "Treated", cells: tr, total: sum(tr) },
    { label: "Outstanding", cells: out, total: out[out.length - 1] ?? 0 },
  ];
}

export function revenueTable(data: Data, z: ZoneFilter, buckets: Bucket[]) {
  const pays = byZone(data.payments, z);
  const rows = FEE_HEADS.map((f) => {
    const cells = buckets.map((b) => sum(pays.filter((p) => inRange(p.paidAt, b.range)).flatMap((p) => p.lines.filter((l) => l.head === f.id).map((l) => l.amount))));
    return { label: f.label, key: f.id, cells, total: sum(cells) };
  });
  const totals = buckets.map((_, i) => sum(rows.map((r) => r.cells[i])));
  return { rows, totals, grand: sum(totals) };
}

/** Type-of-use matrix (approved), Jan–Dec of `year`, up to `upTo`. */
export function approvalsByUse(data: Data, z: ZoneFilter, year: number, upTo: Date) {
  const apps = byZone(data.applications, z).filter((a) => a.approvedAt && ts(a.approvedAt) <= upTo.getTime() && d(a.approvedAt).getFullYear() === year);
  const months = Array.from({ length: 12 }, (_, i) => i);
  const count = (f: (a: Application) => boolean) => {
    const cells = months.map((m) => apps.filter((a) => f(a) && d(a.approvedAt!).getMonth() === m).length);
    return { cells, total: sum(cells) };
  };
  const groups = USE_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    ...count((a) => a.useGroup === g.id),
    types: g.types.map((t) => ({ id: t.id, label: t.label, ...count((a) => a.useGroup === g.id && a.useType === t.id) })),
  }));
  return { groups, totals: months.map((m) => apps.filter((a) => d(a.approvedAt!).getMonth() === m).length), grand: apps.length };
}

/** Data recording: simple/special received & approved, compliance split. */
export function dataRecording(data: Data, z: ZoneFilter, buckets: Bucket[]) {
  const apps = byZone(data.applications, z);
  const sp = (a: Application) => findUseGroup(a.useGroup).special;
  return buckets.map((b) => {
    const rec = apps.filter((a) => inRange(a.receivedAt, b.range));
    const apr = apps.filter((a) => inRange(a.approvedAt, b.range));
    return {
      label: b.label,
      recSimple: rec.filter((a) => !sp(a)).length,
      recSpecial: rec.filter(sp).length,
      aprSimple: apr.filter((a) => !sp(a)).length,
      aprSpecial: apr.filter(sp).length,
      simpleComp: rec.filter((a) => !sp(a) && a.devStatus === "undeveloped").length,
      simpleNon: rec.filter((a) => !sp(a) && a.devStatus === "developed").length,
      specialComp: rec.filter((a) => sp(a) && a.devStatus === "undeveloped").length,
      specialNon: rec.filter((a) => sp(a) && a.devStatus === "developed").length,
      pending: pendingAt(apps, b.range.to).length,
    };
  });
}

export const approvedList = (data: Data, z: ZoneFilter, r: Range) =>
  byZone(data.applications, z)
    .filter((a) => inRange(a.approvedAt, r))
    .sort((a, b) => a.approvedAt!.localeCompare(b.approvedAt!));

export const paidList = (data: Data, z: ZoneFilter, r: Range) => {
  const ids = new Set(byZone(data.payments, z).filter((p) => p.source === "application" && inRange(p.paidAt, r)).map((p) => p.refId));
  return byZone(data.applications, z).filter((a) => ids.has(a.id)).sort((a, b) => (a.registeredAt ?? "").localeCompare(b.registeredAt ?? ""));
};

export const assessedList = (data: Data, z: ZoneFilter, r: Range) =>
  byZone(data.applications, z).filter((a) => a.history.some((h) => h.status === "assessed" && inRange(h.at, r)));

export const feeOf = (a: Application, head: FeeHead) => sum(a.assessment?.lines.filter((l) => l.head === head).map((l) => l.amount) ?? []);
export const describeUse = (a: Application) => `${labelOfUse(a.useGroup, a.useType)}${a.useGroup === "residential" ? ` (${a.floors} Floor${a.floors > 1 ? "s" : ""})` : ""}`;
