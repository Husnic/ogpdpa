"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { periodOf, previous, type PeriodKind } from "./periods";
import type { Data, ZoneFilter } from "./selectors";
import { isHQ } from "./rbac";
import { useMe, useStore, useToday } from "./store";

export function useData(): Data & { reports: ReturnType<typeof useStore.getState>["reports"] } {
  const zones = useStore((s) => s.zones);
  const staff = useStore((s) => s.staff);
  const applications = useStore((s) => s.applications);
  const payments = useStore((s) => s.payments);
  const cases = useStore((s) => s.cases);
  const petitions = useStore((s) => s.petitions);
  const assignments = useStore((s) => s.assignments);
  const settings = useStore((s) => s.settings);
  const reports = useStore((s) => s.reports);
  return useMemo(
    () => ({ zones, staff, applications, payments, cases, petitions, assignments, settings, reports }),
    [zones, staff, applications, payments, cases, petitions, assignments, settings, reports],
  );
}

/** The zones the current user may see. */
export function useScope(): ZoneFilter {
  const me = useMe();
  return useMemo(() => (isHQ(me) ? null : me?.zoneId ? [me.zoneId] : []), [me]);
}

export function usePeriod(initial: PeriodKind = "quarter") {
  const today = useToday();
  const [kind, setKind] = useState<PeriodKind>(initial);
  const [offset, setOffset] = useState(0);
  // Controls update instantly; heavy figures recompute from the deferred value in the background.
  const dKind = useDeferredValue(kind);
  const dOffset = useDeferredValue(offset);
  const p = useMemo(() => {
    let cur = periodOf(dKind, today);
    for (let i = 0; i < dOffset; i++) cur = previous(cur);
    return cur;
  }, [dKind, dOffset, today]);
  // clamp "to" at today for in-progress periods
  const effective = useMemo(() => ({ ...p, to: p.to > today ? today : p.to }), [p, today]);
  // compare like-for-like: same elapsed span of the previous period
  const prev = useMemo(() => {
    const pp = previous(p);
    const span = effective.to.getTime() - effective.from.getTime();
    const to = new Date(Math.min(pp.to.getTime(), pp.from.getTime() + span));
    return { ...pp, to };
  }, [p, effective]);
  return { kind, setKind: (k: PeriodKind) => (setKind(k), setOffset(0)), offset, setOffset, period: effective, full: p, prev, today, pending: dKind !== kind || dOffset !== offset };
}
