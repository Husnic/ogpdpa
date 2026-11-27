import {
  addDays,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  getISOWeek,
  getISOWeekYear,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subMonths,
  subQuarters,
  subWeeks,
  differenceInCalendarDays,
} from "date-fns";

export type PeriodKind = "week" | "month" | "quarter" | "year";
export interface Range {
  from: Date;
  to: Date; // inclusive end-of-day
}
export interface Period extends Range {
  kind: PeriodKind;
  key: string;
  label: string;
}

const W = { weekStartsOn: 1 as const };
/* Timestamps are parsed thousands of times per render; cache epoch ms per ISO string. */
const TS = new Map<string, number>();
export const ts = (s: string) => {
  let t = TS.get(s);
  if (t === undefined) {
    t = Date.parse(s);
    if (TS.size > 200_000) TS.clear();
    TS.set(s, t);
  }
  return t;
};
export const d = (s: string | Date) => (typeof s === "string" ? new Date(ts(s)) : s);
export const inRange = (s: string | undefined, r: Range) => {
  if (!s) return false;
  const t = ts(s);
  return t >= r.from.getTime() && t <= r.to.getTime();
};

export function periodOf(kind: PeriodKind, ref: Date): Period {
  switch (kind) {
    case "week": {
      const from = startOfWeek(ref, W);
      const to = endOfWeek(ref, W);
      return {
        kind,
        from,
        to,
        key: `${getISOWeekYear(ref)}-W${String(getISOWeek(ref)).padStart(2, "0")}`,
        label: `${format(from, "d MMM")} – ${format(addDays(from, 4), "d MMM yyyy")}`,
      };
    }
    case "month":
      return { kind, from: startOfMonth(ref), to: endOfMonth(ref), key: format(ref, "yyyy-MM"), label: format(ref, "MMMM yyyy") };
    case "quarter": {
      const q = Math.floor(ref.getMonth() / 3) + 1;
      return { kind, from: startOfQuarter(ref), to: endOfQuarter(ref), key: `${ref.getFullYear()}-Q${q}`, label: `Q${q} ${ref.getFullYear()}` };
    }
    case "year":
      return { kind, from: startOfYear(ref), to: endOfYear(ref), key: `${ref.getFullYear()}`, label: `${ref.getFullYear()}` };
  }
}

export function previous(p: Period): Period {
  const ref =
    p.kind === "week" ? subWeeks(p.from, 1) : p.kind === "month" ? subMonths(p.from, 1) : p.kind === "quarter" ? subQuarters(p.from, 1) : subMonths(p.from, 12);
  return periodOf(p.kind, ref);
}

export function periodFromKey(key: string): Period {
  if (/^\d{4}-W\d{2}$/.test(key)) {
    const [y, w] = key.split("-W").map(Number);
    // ISO week: Jan 4th is always in week 1
    const jan4 = new Date(y, 0, 4);
    return periodOf("week", addDays(startOfWeek(jan4, W), (w - 1) * 7));
  }
  if (/^\d{4}-Q\d$/.test(key)) {
    const [y, q] = key.split("-Q").map(Number);
    return periodOf("quarter", new Date(y, (q - 1) * 3, 1));
  }
  if (/^\d{4}-\d{2}$/.test(key)) {
    const [y, m] = key.split("-").map(Number);
    return periodOf("month", new Date(y, m - 1, 1));
  }
  return periodOf("year", new Date(Number(key), 0, 1));
}

/** Week N of month: Monday-start calendar rows overlapping the month (1–6). */
export function weekOfMonth(date: Date): number {
  const first = startOfWeek(startOfMonth(date), W);
  return Math.floor(differenceInCalendarDays(date, first) / 7) + 1;
}
export function weeksInMonth(ref: Date): number {
  return weekOfMonth(endOfMonth(ref));
}

/** Month buckets inside a period (for quarterly/yearly tables). */
export function monthsIn(p: Range): Date[] {
  const out: Date[] = [];
  let m = startOfMonth(p.from);
  while (m <= p.to) {
    out.push(m);
    m = startOfMonth(addDays(endOfMonth(m), 1));
  }
  return out;
}

export function lastNMonths(today: Date, n: number): Period[] {
  return Array.from({ length: n }, (_, i) => periodOf("month", subMonths(today, n - 1 - i)));
}

export const QUARTER_ORDINAL = ["First", "Second", "Third", "Fourth"];
