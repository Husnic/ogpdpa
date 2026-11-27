"use client";

/* Tables shared by the monthly and quarterly reports. */

import { USE_GROUPS } from "@/lib/catalog";
import { fdate, num } from "@/lib/format";
import { buildMonthly } from "@/lib/reports";
import { feeOf, processingDays, describeUse, type Bucket } from "@/lib/selectors";
import type { Application } from "@/lib/types";
import { Caption, M, N, RTable } from "./doc";

type B = ReturnType<typeof buildMonthly>;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function PlanTable({ plan, buckets, caption }: { plan: B["plan"]; buckets: Bucket[]; caption: string }) {
  return (
    <>
      <Caption>{caption}</Caption>
      <RTable head={["Building plan application", ...buckets.map((b) => b.label), "Total"]} rows={plan.map((r) => [r.label, ...r.cells.map(N), N(r.total)])} />
    </>
  );
}

export function NoticeTable({ notices, buckets, caption }: { notices: B["notices"]; buckets: Bucket[]; caption: string }) {
  const rows = [...notices.notices.filter((n) => n.total > 0 || ["contravention", "stop_work", "quit", "demolition", "seal"].includes(n.key)), ...notices.sanctions.filter((s) => s.key !== "sealing")];
  return (
    <>
      <Caption>{caption}</Caption>
      <RTable head={["Notices", ...buckets.map((b) => b.label), "Total"]} rows={rows.map((r) => [r.short === "Token Demolition" ? "Token demolition carried out" : r.short, ...r.cells.map(N), N(r.total)])} />
    </>
  );
}

export function PetitionTable({ rows, buckets, caption }: { rows: B["petitions"]; buckets: Bucket[]; caption: string }) {
  return (
    <>
      <Caption>{caption}</Caption>
      <RTable head={["Petition", ...buckets.map((b) => b.label), "Total"]} rows={rows.map((r) => [r.label, ...r.cells.map(N), N(r.total)])} />
    </>
  );
}

export function RevenueTable({ rev, buckets, caption }: { rev: B["revenue"]; buckets: Bucket[]; caption: string }) {
  return (
    <>
      <Caption>{caption}</Caption>
      <RTable head={["Revenue (₦)", ...buckets.map((b) => b.label), "Total"]} rows={rev.rows.map((r) => [r.label, ...r.cells.map(M), M(r.total)])} foot={["TOTAL", ...rev.totals.map(M), M(rev.grand)]} />
    </>
  );
}

export function UseMatrix({ uses, caption }: { uses: B["uses"]; caption: string }) {
  const rows: React.ReactNode[][] = [];
  USE_GROUPS.forEach((g, gi) => {
    const grp = uses.groups.find((x) => x.id === g.id)!;
    rows.push([<b key="g">{`${gi + 1}. ${g.label.toUpperCase()}`}</b>, ...(g.types.length ? grp.cells.map(() => "") : grp.cells.map((c) => (c ? c : ""))), g.types.length ? "" : grp.total || ""]);
    grp.types.forEach((t) => rows.push([<span key="t" className="pl-4 font-normal">{t.label}</span>, ...t.cells.map((c) => (c ? c : "")), t.total || ""]));
  });
  return (
    <>
      <Caption>{caption}</Caption>
      <RTable compact head={["Type of plan", ...MONTHS, "Total"]} rows={rows} foot={["TOTAL", ...uses.totals.map((c) => c || ""), uses.grand]} />
    </>
  );
}

export function RecordingTable({ rec, caption }: { rec: B["recording"]; caption: string }) {
  const t = (k: keyof (typeof rec)[number]) => rec.reduce((a, r) => a + (r[k] as number), 0);
  return (
    <>
      <Caption>{caption}</Caption>
      <RTable
        compact
        head={["Period", "Received: simple", "special", "total", "Approved: simple", "special", "total", "Simple compliance", "Simple non-compliance", "Special compliance", "Special non-compliance", "Pending (end)"]}
        rows={rec.map((r) => [r.label, N(r.recSimple), N(r.recSpecial), N(r.recSimple + r.recSpecial), N(r.aprSimple), N(r.aprSpecial), N(r.aprSimple + r.aprSpecial), N(r.simpleComp), N(r.simpleNon), N(r.specialComp), N(r.specialNon), N(r.pending)])}
        foot={["TOTAL", N(t("recSimple")), N(t("recSpecial")), N(t("recSimple") + t("recSpecial")), N(t("aprSimple")), N(t("aprSpecial")), N(t("aprSimple") + t("aprSpecial")), N(t("simpleComp")), N(t("simpleNon")), N(t("specialComp")), N(t("specialNon")), N(rec[rec.length - 1]?.pending ?? 0)]}
      />
    </>
  );
}

/** 7-days tracking chart / analysis of permits granted. */
export function TrackingTable({ apps, caption, target, zoneCol }: { apps: Application[]; caption: string; target: number; zoneCol?: (a: Application) => string }) {
  if (!apps.length)
    return (
      <>
        <Caption>{caption}</Caption>
        <p className="mb-4 text-[13px]">NIL</p>
      </>
    );
  return (
    <>
      <Caption>{caption}</Caption>
      <RTable
        compact
        head={["S/N", "Applicant", ...(zoneCol ? ["Zone"] : []), "Location", "Status", "Use / floors", "Actual (₦)", "Penal (₦)", "Total (₦)", "Reg No", "Reg date", "Approval No", "Approval date", "Days"]}
        rows={apps.map((a, i) => {
          const total = a.assessment ? a.assessment.lines.reduce((s, l) => s + l.amount, 0) : 0;
          const penal = feeOf(a, "penal");
          const d = processingDays(a) ?? 0;
          return [
            String(i + 1),
            a.applicant,
            ...(zoneCol ? [zoneCol(a)] : []),
            a.location,
            a.devStatus === "developed" ? "Developed" : "Undeveloped",
            describeUse(a),
            num(total - penal),
            M(penal),
            num(total),
            a.regNo ?? "",
            fdate(a.registeredAt, "dd/MM/yyyy"),
            a.approvalNo ?? "",
            fdate(a.approvedAt, "dd/MM/yyyy"),
            <span key="d" className={d > target ? "font-bold text-crit" : ""}>
              {d}
            </span>,
          ];
        })}
      />
    </>
  );
}

/** Monthly revenue performance per application (Table 7). */
export function PerformanceTable({ apps, caption }: { apps: Application[]; caption: string }) {
  const heads = ["basic", "fencing", "tp_admin", "fitness", "idc", "spatial", "layout", "stage", "penal"] as const;
  return (
    <>
      <Caption>{caption}</Caption>
      {apps.length ? (
        <RTable
          compact
          head={["S/N", "Reg No", "Basic assessment", "Fencing", "10% admin", "C of F", "I.D.C", "Spatial", "Layout", "Inspection & cert.", "Penal", "Total paid"]}
          rows={apps.map((a, i) => [String(i + 1), a.regNo ?? "", ...heads.map((h) => M(feeOf(a, h))), num(heads.reduce((s, h) => s + feeOf(a, h), 0))])}
        />
      ) : (
        <p className="mb-4 text-[13px]">NIL</p>
      )}
    </>
  );
}
