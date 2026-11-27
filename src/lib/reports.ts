/* Report builders — pure functions over operational records.
   Every number in a report is derived here; nothing is typed in by hand. */

import { NOTICE_TYPES } from "./catalog";
import { sum } from "./format";
import { inRange, type Period } from "./periods";
import {
  approvedList,
  assessedList,
  dataRecording,
  metrics,
  monthBuckets,
  noticeTable,
  paidList,
  petitionTable,
  planTable,
  revenueTable,
  approvalsByUse,
  weekBuckets,
  type Data,
  type ZoneFilter,
} from "./selectors";
import type { ReportKind } from "./types";

const inZ = (z: ZoneFilter, id: string | null) => !z || (id !== null && z.includes(id));

export function buildWeekly(data: Data, z: ZoneFilter, p: Period) {
  const m = metrics(data, z, p);
  const illegal = data.cases
    .filter((c) => inZ(z, c.zoneId) && c.notices.some((n) => inRange(n.servedAt, p)))
    .map((c) => ({ c, served: c.notices.filter((n) => inRange(n.servedAt, p)) }));
  const special = data.assignments.filter((a) => inZ(z, a.zoneId) && a.special && a.status === "done" && inRange(a.doneAt, p));
  return {
    items: {
      registered: m.registered,
      approved: m.approved,
      fence: m.fencePermits,
      petitionsReceived: m.petitionsReceived,
      petitionsTreated: m.petitionsTreated,
      revenue: m.revenue - m.penal,
      penal: m.penal,
    },
    notices: NOTICE_TYPES.map((n) => ({ ...n, count: m.noticesByType[n.id] })),
    illegal,
    sanctions: { token: m.sanctionsByType.token_demolition, total: m.sanctionsByType.total_demolition, sealing: m.sanctionsByType.sealing },
    special,
    profile: assessedList(data, z, p),
  };
}

export function buildMonthly(data: Data, z: ZoneFilter, p: Period) {
  const weeks = weekBuckets(p.from);
  return {
    buckets: weeks,
    plan: planTable(data, z, weeks),
    notices: noticeTable(data, z, weeks),
    petitions: petitionTable(data, z, weeks),
    revenue: revenueTable(data, z, weeks),
    uses: approvalsByUse(data, z, p.from.getFullYear(), p.to),
    tracking: approvedList(data, z, p),
    paid: paidList(data, z, p),
    recording: dataRecording(data, z, weeks),
    m: metrics(data, z, p),
  };
}

export function buildQuarterly(data: Data, z: ZoneFilter, p: Period) {
  const months = monthBuckets(p);
  return {
    buckets: months,
    plan: planTable(data, z, months),
    notices: noticeTable(data, z, months),
    petitions: petitionTable(data, z, months),
    revenue: revenueTable(data, z, months),
    uses: approvalsByUse(data, z, p.from.getFullYear(), p.to),
    tracking: approvedList(data, z, p),
    recording: dataRecording(data, z, months),
    staff: data.staff.filter((s) => s.status === "active" && inZ(z, s.zoneId)).sort((a, b) => b.gradeLevel - a.gradeLevel),
    m: metrics(data, z, p),
  };
}

/** Headline figures frozen into a submission, so later record changes are detectable. */
export function snapshotOf(kind: ReportKind, data: Data, z: ZoneFilter, p: Period) {
  const m = metrics(data, z, p);
  return {
    kind,
    received: m.received,
    registered: m.registered,
    approved: m.approved,
    revenue: m.revenue,
    penal: m.penal,
    notices: m.notices,
    sanctions: m.sanctions,
    petitionsReceived: m.petitionsReceived,
    petitionsTreated: m.petitionsTreated,
  };
}
export type Snapshot = ReturnType<typeof snapshotOf>;

export function snapshotDiff(a: Snapshot | undefined, b: Snapshot) {
  if (!a) return [];
  return (Object.keys(b) as (keyof Snapshot)[]).filter((k) => k !== "kind" && a[k] !== b[k]).map((k) => ({ key: k, was: a[k] as number, now: b[k] as number }));
}

export const totalOf = (xs: number[]) => sum(xs);
