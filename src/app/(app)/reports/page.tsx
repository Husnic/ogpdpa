"use client";

import { ArrowRight, CalendarRange, FileBarChart, FileClock, FileText } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Forbidden } from "@/components/guard";
import { Badge, Card, CardHeader, PageHeader, Segmented } from "@/components/ui";
import { REPORT_STATUS } from "@/lib/catalog";
import { cx, fdate } from "@/lib/format";
import { periodOf, previous, type Period, type PeriodKind } from "@/lib/periods";
import { can, isHQ } from "@/lib/rbac";
import { dueDate } from "@/lib/selectors";
import { useMe, useStore, useToday, useZoneMap } from "@/lib/store";
import type { ReportKind, ReportSubmission } from "@/lib/types";

const KINDS: { kind: ReportKind; period: PeriodKind; label: string; icon: typeof FileText; n: number }[] = [
  { kind: "weekly", period: "week", label: "Weekly", icon: FileClock, n: 8 },
  { kind: "monthly", period: "month", label: "Monthly", icon: CalendarRange, n: 6 },
  { kind: "quarterly", period: "quarter", label: "Quarterly", icon: FileBarChart, n: 4 },
];

function lastPeriods(kind: PeriodKind, today: Date, n: number): Period[] {
  const out: Period[] = [];
  let p = previous(periodOf(kind, today));
  for (let i = 0; i < n; i++) {
    out.unshift(p);
    p = previous(p);
  }
  return out;
}

type CellState = { label: string; cls: string; late: boolean };
function cellState(r: ReportSubmission | undefined, kind: ReportKind, key: string, today: Date): CellState {
  const due = dueDate(kind, key);
  const late = r?.submittedAt ? new Date(r.submittedAt) > due : due < today;
  if (!r || r.status === "draft") return due < today ? { label: "Overdue", cls: "bg-crit text-white", late: true } : { label: "Draft", cls: "bg-surface-3 text-ink-3", late: false };
  if (r.status === "returned") return { label: "Returned", cls: "bg-crit-soft text-crit", late };
  if (r.status === "submitted") return { label: "To review", cls: "bg-info-soft text-info", late };
  return { label: "Done", cls: "bg-good-soft text-good", late };
}

export default function ReportCentre() {
  const me = useMe()!;
  const today = useToday();
  const reports = useStore((s) => s.reports);
  const zones = useStore((s) => s.zones);
  const zmap = useZoneMap();
  const [kind, setKind] = useState<ReportKind>("weekly");
  const byId = useMemo(() => Object.fromEntries(reports.map((r) => [r.id, r])), [reports]);
  if (!can(me, "report.view")) return <Forbidden what="reports" />;
  const hq = isHQ(me);
  const cfg = KINDS.find((k) => k.kind === kind)!;
  const periods = lastPeriods(cfg.period, today, cfg.n);
  const awaiting = reports.filter((r) => r.status === "submitted").sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));

  return (
    <div className="rise">
      <PageHeader title="Reports" sub="Generated from logged records — weekly progress, monthly and quarterly returns" />

      {/* Quick open */}
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        {KINDS.map((k) => {
          const last = previous(periodOf(k.period, today));
          const r = byId[`${k.kind}:${me.zoneId}:${last.key}`];
          const st = hq ? null : cellState(r, k.kind, last.key, today);
          return (
            <Link key={k.kind} href={`/reports/${k.kind}?zone=${hq ? "all" : me.zoneId}&p=${last.key}`} className="group">
              <Card className="flex h-full flex-col p-5 transition-shadow group-hover:shadow-[0_10px_30px_-18px_rgba(16,21,18,0.35)]">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand">
                    <k.icon className="size-5" />
                  </span>
                  {st && <span className={cx("rounded-full px-2.5 py-0.5 text-[11.5px] font-bold", st.cls)}>{st.label}</span>}
                </div>
                <div className="mt-4 text-[17px] font-bold tracking-tight">{k.label} {hq ? "(consolidated)" : "report"}</div>
                <div className="text-[13px] text-ink-2">{last.label}</div>
                <div className="mt-4 flex items-center gap-1 text-[13px] font-semibold text-brand">
                  Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="mb-5">
        <CardHeader
          title={hq ? "Submission tracker" : "Your submissions"}
          sub={hq ? "Every zone × recent periods. Click a cell to open the report." : "Recent periods for your zone"}
          right={<Segmented value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k.kind, label: k.label }))} />}
        />
        <div className="overflow-x-auto px-5 pt-4 pb-5">
          <table className="w-full border-separate border-spacing-1 text-[12px]">
            <thead>
              <tr>
                <th className="text-left font-semibold text-ink-3">Zone</th>
                {periods.map((p) => (
                  <th key={p.key} className="min-w-24 font-semibold whitespace-nowrap text-ink-3">
                    {kind === "weekly" ? fdate(p.from.toISOString(), "d MMM") : p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(hq ? zones : zones.filter((z) => z.id === me.zoneId)).map((z) => (
                <tr key={z.id}>
                  <td className="pr-3 font-medium whitespace-nowrap text-ink-2">{z.name}</td>
                  {periods.map((p) => {
                    const st = cellState(byId[`${kind}:${z.id}:${p.key}`], kind, p.key, today);
                    return (
                      <td key={p.key}>
                        <Link href={`/reports/${kind}?zone=${z.id}&p=${p.key}`} className={cx("flex h-9 items-center justify-center gap-1 rounded-xl font-semibold transition-transform hover:scale-[1.04]", st.cls)} title={`${z.name} · ${p.label}: ${st.label}${st.late ? " (late)" : ""}`}>
                          {st.label}
                          {st.late && st.label !== "Overdue" && <span className="size-1.5 rounded-full bg-crit" />}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-crit" /> submitted after due date
            </span>
            <span>Due: weekly Wednesday after week end · monthly 5th · quarterly 15th of following month</span>
          </div>
        </div>
      </Card>

      {hq && can(me, "report.review") && (
        <Card>
          <CardHeader title="Awaiting your review" sub={`${awaiting.length} submissions`} />
          <ul className="divide-y divide-line px-5 pt-2 pb-3">
            {awaiting.slice(0, 12).map((r) => (
              <li key={r.id}>
                <Link href={`/reports/${r.kind}?zone=${r.zoneId}&p=${r.periodKey}`} className="flex items-center gap-3 py-3 text-[13.5px] hover:text-brand">
                  <Badge tone={REPORT_STATUS[r.status].tone}>{r.kind}</Badge>
                  <span className="flex-1 font-medium">
                    {zmap[r.zoneId]?.name} · {r.periodKey}
                  </span>
                  <span className="text-[12px] text-ink-3">submitted {fdate(r.submittedAt)}</span>
                  <ArrowRight className="size-4 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
