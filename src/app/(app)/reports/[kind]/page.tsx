"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Download, Printer, Save, Send, Undo2 } from "lucide-react";
import Link from "next/link";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { addDays } from "date-fns";
import { Forbidden } from "@/components/guard";
import { MonthlyReport } from "@/components/reports/monthly";
import { QuarterlyReport } from "@/components/reports/quarterly";
import type { ReportViewProps } from "@/components/reports/types";
import { WeeklyReport } from "@/components/reports/weekly";
import { Badge, Button, Field, Modal, Select, Textarea } from "@/components/ui";
import { REPORT_STATUS, ROLE_META } from "@/lib/catalog";
import { downloadCsv } from "@/lib/csv";
import { fdate, fdt } from "@/lib/format";
import { useData } from "@/lib/hooks";
import { periodFromKey, periodOf, previous, type PeriodKind } from "@/lib/periods";
import { can, isHQ } from "@/lib/rbac";
import { buildMonthly, buildQuarterly, snapshotDiff, snapshotOf, type Snapshot } from "@/lib/reports";
import { dueDate } from "@/lib/selectors";
import { useMe, useStaffMap, useStore, useToday } from "@/lib/store";
import type { ReportKind } from "@/lib/types";

const KIND: Record<ReportKind, { period: PeriodKind; label: string; View: (p: ReportViewProps) => React.ReactNode }> = {
  weekly: { period: "week", label: "Weekly progress report", View: WeeklyReport },
  monthly: { period: "month", label: "Monthly report", View: MonthlyReport },
  quarterly: { period: "quarter", label: "Quarterly report", View: QuarterlyReport },
};

export default function Page() {
  return (
    <Suspense>
      <ReportViewer />
    </Suspense>
  );
}

function ReportViewer() {
  const { kind } = useParams<{ kind: ReportKind }>();
  if (!(kind in KIND)) notFound();
  const cfg = KIND[kind];
  const me = useMe()!;
  const sp = useSearchParams();
  const router = useRouter();
  const today = useToday();
  const data = useData();
  const staff = useStaffMap();
  const reports = useStore((s) => s.reports);
  const saveReport = useStore((s) => s.saveReport);
  const submitReport = useStore((s) => s.submitReport);
  const reviewReport = useStore((s) => s.reviewReport);

  const hq = isHQ(me);
  const zoneId = sp.get("zone") ?? (hq ? "all" : me.zoneId!);
  const key = sp.get("p") ?? previous(periodOf(cfg.period, today)).key;
  const period = useMemo(() => periodFromKey(key), [key]);
  const z = zoneId === "all" ? null : [zoneId];
  const zone = data.zones.find((x) => x.id === zoneId);
  const id = `${kind}:${zoneId}:${key}`;
  const rec = reports.find((r) => r.id === id);
  const [narrative, setNarrative] = useState<Record<string, string>>(rec?.narrative ?? {});
  const [dirty, setDirty] = useState(false);
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    setNarrative(rec?.narrative ?? {});
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!can(me, "report.view")) return <Forbidden what="reports" />;
  if (!hq && zoneId !== me.zoneId) return <Forbidden what="other zones’ reports" />;

  const go = (params: { zone?: string; p?: string }) => router.replace(`/reports/${kind}?zone=${params.zone ?? zoneId}&p=${params.p ?? key}`);
  const prevKey = previous(period).key;
  const nextP = periodOf(cfg.period, addDays(period.to, 1));
  const future = period.from > today;
  const inProgress = period.to > today;

  const status = rec?.status ?? "draft";
  const editable = zoneId !== "all" && can(me, "report.draft") && me.zoneId === zoneId && (status === "draft" || status === "returned");
  const canSubmit = editable && can(me, "report.submit") && !inProgress;
  const canReview = zoneId !== "all" && can(me, "report.review") && status === "submitted";
  const current = snapshotOf(kind, data, z, period);
  const drift = rec?.snapshot && status !== "draft" ? snapshotDiff(rec.snapshot as Snapshot, current) : [];
  const ztpo = data.staff.find((s) => s.zoneId === zoneId && s.role === "ZTPO");
  const office = zone ? `${zone.name} Zonal Planning Office`.toUpperCase() : "ALL ZONAL PLANNING OFFICES (CONSOLIDATED)";
  const signatory = zone
    ? { name: ztpo ? `${ztpo.title} ${ztpo.firstName} ${ztpo.lastName}` : "—", role: "Zonal Town Planning Officer", office: `${zone.name} Zonal Planning Office`, date: rec?.submittedAt ? fdate(rec.submittedAt) : undefined }
    : { name: `${me.title} ${me.firstName} ${me.lastName}`, role: ROLE_META[me.role].label, office: "OGPDPA Headquarters" };

  const setN = (k: string, v: string) => {
    setNarrative((n) => ({ ...n, [k]: v }));
    setDirty(true);
  };
  const exportCsv = () => {
    const b = kind === "quarterly" ? buildQuarterly(data, z, period) : buildMonthly(data, z, kind === "weekly" ? periodOf("month", period.from) : period);
    const cols = b.buckets.map((x) => x.label);
    const rows: (string | number)[][] = [
      ["PLANS PROCESSED"],
      ...b.plan.map((r) => [r.label, ...r.cells, r.total]),
      [],
      ["NOTICES SERVED"],
      ...b.notices.notices.map((r) => [r.label, ...r.cells, r.total]),
      [],
      ["REVENUE (₦)"],
      ...b.revenue.rows.map((r) => [r.label, ...r.cells, r.total]),
      ["TOTAL", ...b.revenue.totals, b.revenue.grand],
    ];
    downloadCsv(`${kind}-${zone?.code ?? "ALL"}-${key}.csv`, ["", ...cols, "Total"], rows);
  };

  const View = cfg.View;
  return (
    <div className="rise">
      {/* toolbar */}
      <div className="no-print mb-5 space-y-4">
        <Link href="/reports" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> Report centre
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-[-0.02em]">{cfg.label}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
              {zoneId !== "all" && (
                <Badge tone={REPORT_STATUS[status].tone} dot>
                  {REPORT_STATUS[status].label}
                </Badge>
              )}
              {zoneId !== "all" && <span>Due {fdate(dueDate(kind, key).toISOString())}</span>}
              {rec?.submittedAt && <span>· submitted {fdt(rec.submittedAt)} by {staff[rec.submittedBy!]?.firstName}</span>}
              {rec?.reviewedAt && <span>· reviewed {fdt(rec.reviewedAt)} by {staff[rec.reviewedBy!]?.firstName}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hq && <Select className="w-52 rounded-full" value={zoneId} onChange={(e) => go({ zone: e.target.value })} options={[{ value: "all", label: "All zones (consolidated)" }, ...data.zones.map((x) => ({ value: x.id, label: x.name }))]} />}
            <div className="flex h-10 items-center rounded-full bg-surface ring-1 ring-inset ring-line">
              <button type="button" className="grid size-10 place-items-center text-ink-3 hover:text-ink" onClick={() => go({ p: prevKey })} aria-label="Previous period">
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-36 text-center text-[13.5px] font-semibold">{period.label}</span>
              <button type="button" className="grid size-10 place-items-center text-ink-3 hover:text-ink disabled:opacity-30" disabled={nextP.from > today} onClick={() => go({ p: nextP.key })} aria-label="Next period">
                <ChevronRight className="size-4" />
              </button>
            </div>
            <Button onClick={exportCsv}>
              <Download className="size-4" /> CSV
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="size-4" /> Print / PDF
            </Button>
          </div>
        </div>

        {rec?.status === "returned" && rec.reviewNote && (
          <div className="flex items-start gap-3 rounded-2xl bg-crit-soft px-4 py-3 text-[13px] text-crit">
            <Undo2 className="mt-0.5 size-4 shrink-0" />
            <span>
              <b>Returned by HQ:</b> {rec.reviewNote}
            </span>
          </div>
        )}
        {drift.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-[13px] text-warn">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              <b>Records changed since submission:</b> {drift.map((d) => `${d.key} ${d.was.toLocaleString()} → ${d.now.toLocaleString()}`).join(" · ")}. {hq ? "Consider returning for resubmission." : "HQ may request a resubmission."}
            </span>
          </div>
        )}
        {inProgress && !future && <div className="rounded-2xl bg-info-soft px-4 py-3 text-[13px] text-info">This period is still running — figures are live and the report can be submitted once it closes.</div>}

        {(editable || canReview) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line">
            <span className="text-[13px] text-ink-2">
              {editable ? "Figures are generated from records. Add the narrative sections highlighted in green, then submit to HQ." : "Review the submission. Acknowledge, or return it to the zone with a note."}
            </span>
            <div className="flex gap-2">
              {editable && (
                <>
                  <Button
                    disabled={!dirty}
                    onClick={() => {
                      saveReport(kind, zoneId, key, { narrative });
                      setDirty(false);
                    }}
                  >
                    <Save className="size-4" /> Save draft
                  </Button>
                  {canSubmit && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        saveReport(kind, zoneId, key, { narrative });
                        submitReport(kind, zoneId, key, current);
                        setDirty(false);
                      }}
                    >
                      <Send className="size-4" /> Sign & submit to HQ
                    </Button>
                  )}
                </>
              )}
              {canReview && (
                <>
                  <Button variant="danger" onClick={() => setReturning(true)}>
                    <Undo2 className="size-4" /> Return
                  </Button>
                  <Button variant="primary" onClick={() => reviewReport(id, "acknowledged")}>
                    <CheckCircle2 className="size-4" /> Acknowledge
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {future ? (
        <p className="py-16 text-center text-ink-3">This period hasn’t started yet.</p>
      ) : (
        <View data={data} z={z} period={period} office={office} zone={zone} narrative={narrative} editable={editable} onNarrative={setN} signatory={signatory} />
      )}

      <Modal open={returning} onClose={() => setReturning(false)} title="Return report to zone">
        <Field label="What needs to change?">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Revenue narrative inconsistent with Table 4" />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setReturning(false)}>
            Cancel
          </Button>
          <Button
            variant="dark"
            disabled={!note.trim()}
            onClick={() => {
              reviewReport(id, "returned", note.trim());
              setReturning(false);
              setNote("");
            }}
          >
            Return report
          </Button>
        </div>
      </Modal>
    </div>
  );
}
