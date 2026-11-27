"use client";

import { ArrowLeft, CheckCircle2, Clock3, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Forbidden } from "@/components/guard";
import { Badge, Button, Card, CardHeader, Empty, Field, Input, KeyValue, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { FEE_HEADS, STATUS_META, findUseGroup } from "@/lib/catalog";
import { defaultFees, lineTotal } from "@/lib/fees";
import { cx, fdate, fdt, naira } from "@/lib/format";
import { can, isHQ } from "@/lib/rbac";
import { processingDays, describeUse } from "@/lib/selectors";
import { useMe, useStaffMap, useStore, useToday, useZoneMap } from "@/lib/store";
import type { Application, FeeHead, FeeLine, Payment } from "@/lib/types";

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const me = useMe()!;
  const app = useStore((s) => s.applications.find((a) => a.id === id));
  const payments = useStore((s) => s.payments.filter((p) => p.refId === id));
  const zones = useZoneMap();
  const staff = useStaffMap();
  const today = useToday();

  if (!app) return <Empty title="Application not found" sub="It may have been removed or the link is wrong." />;
  if (!isHQ(me) && app.zoneId !== me.zoneId) return <Forbidden what="applications outside your zone" />;

  const pd = processingDays(app);
  const waiting = app.registeredAt && !app.approvedAt ? differenceInCalendarDays(today, parseISO(app.registeredAt)) : null;
  const officer = staff[app.officerId];

  return (
    <div className="rise">
      <Link href="/applications" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Applications
      </Link>
      <PageHeader
        eyebrow={`${zones[app.zoneId]?.name} ZPO · ${app.regNo ?? "Not yet registered"}`}
        title={app.applicant}
        sub={app.location}
        right={
          <>
            <Badge tone={STATUS_META[app.status].tone} dot className="px-3 py-1 text-[12.5px]">
              {STATUS_META[app.status].label}
            </Badge>
            {app.status === "approved" && (
              <Button onClick={() => window.print()}>
                <Printer className="size-4" /> Print permit
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <Actions app={app} />

          <Card>
            <CardHeader title="Assessment & fees" sub={app.assessment ? `Assessed ${fdt(app.assessment.assessedAt)} · valid until ${fdate(app.assessment.expiresAt)}` : "Not yet assessed"} />
            {app.assessment ? (
              <div className="px-5 pt-3 pb-5">
                <div className="divide-y divide-line rounded-2xl border border-line">
                  {app.assessment.lines.map((l) => (
                    <div key={l.head} className="flex items-center justify-between px-4 py-2.5 text-[13.5px]">
                      <span className="text-ink-2">{FEE_HEADS.find((f) => f.id === l.head)?.label}</span>
                      <span className="font-semibold tnum">{naira(l.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-surface-2 px-4 py-3 text-[14px]">
                    <span className="font-bold">Total assessed</span>
                    <span className="text-[17px] font-bold tnum">{naira(lineTotal(app.assessment.lines))}</span>
                  </div>
                </div>
                {payments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl bg-good-soft px-4 py-2.5 text-[13px] text-good">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="size-4" /> Paid {fdt(p.paidAt)} · {p.channel.toUpperCase()} · {p.receiptNo}
                        </span>
                        <span className="font-bold tnum">{naira(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="px-5 pt-2 pb-5 text-[13px] text-ink-3">Fees are computed after the desk check from the use, floors and compliance status.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Timeline" sub="Every status change is recorded with who and when" />
            <ol className="relative px-5 pt-4 pb-5">
              {[...app.history].reverse().map((h, i) => (
                <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                  <span className={cx("relative z-[1] mt-1 size-3 shrink-0 rounded-full ring-4 ring-surface", i === 0 ? "bg-brand" : "bg-line-strong")} />
                  {i < app.history.length - 1 && <span className="absolute top-4 left-[5px] h-full w-0.5 bg-line" />}
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold capitalize">{h.status === "expired" ? "Assessment lapsed" : (STATUS_META[h.status as keyof typeof STATUS_META]?.label ?? h.status)}</div>
                    <div className="text-[12px] text-ink-3">
                      {fdt(h.at)} · {staff[h.by] ? `${staff[h.by].firstName} ${staff[h.by].lastName}` : "System"}
                    </div>
                    {h.note && <div className="mt-1 text-[13px] text-ink-2">{h.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-5 xl:col-span-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink-2">
                <Clock3 className="size-5" />
              </span>
              <div>
                <div className="text-[12.5px] text-ink-3">{pd !== null ? "Processing time" : waiting !== null ? "Waiting since registration" : "Received"}</div>
                <div className="text-[22px] font-bold tracking-tight tnum">{pd !== null ? `${pd} days` : waiting !== null ? `${waiting} days` : fdate(app.receivedAt)}</div>
              </div>
            </div>
          </Card>
          <Card className="px-5 pt-4 pb-2">
            <KeyValue
              items={[
                ["Type of use", describeUse(app)],
                ["Category", findUseGroup(app.useGroup).special ? "Special" : "Simple"],
                ["Compliance", app.devStatus === "developed" ? <Badge tone="warning">Non-compliance (developed)</Badge> : "Compliance (undeveloped)"],
                ["Kind", app.kind],
                ["Applicant phone", app.phone],
                ["Consultant", app.consultant || "—"],
                ["Consultant phone", app.consultantPhone || "—"],
                ["Handling officer", officer ? `${officer.title} ${officer.firstName} ${officer.lastName}` : "—"],
                ["Received", fdate(app.receivedAt)],
                ["Registered", fdate(app.registeredAt)],
                ["Approved", fdate(app.approvedAt)],
                ["Approval No", app.approvalNo ? <span className="font-mono text-[12px]">{app.approvalNo}</span> : "—"],
              ]}
            />
          </Card>
          {app.remarks && (
            <Card className="p-5 text-[13px] text-ink-2">
              <div className="mb-1 text-[12.5px] font-semibold text-ink">Remarks</div>
              {app.remarks}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Lifecycle action panel ───────────────────────────────────────── */

function Actions({ app }: { app: Application }) {
  const me = useMe()!;
  const today = useToday();
  const settings = useStore((s) => s.settings);
  const transition = useStore((s) => s.transition);
  const approve = useStore((s) => s.approve);
  const pay = useStore((s) => s.recordPayment);
  const [assessOpen, setAssessOpen] = useState(false);
  const [noteFor, setNoteFor] = useState<null | "pended" | "disapproved">(null);
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState<Payment["channel"]>("remita");
  const lapsed = app.status === "assessed" && app.assessment && parseISO(app.assessment.expiresAt) < today;

  const step = (() => {
    switch (app.status) {
      case "received":
        return can(me, "app.assess")
          ? { title: "Desk check", body: "Confirm the documents are complete before assessment.", actions: [<Button key="o" variant="primary" onClick={() => transition(app.id, "okayed", "Documents complete")}>Mark as okayed</Button>, <Button key="p" onClick={() => setNoteFor("pended")}>Pend</Button>] }
          : { title: "Awaiting desk check", body: "A planning officer will review documents." };
      case "okayed":
        return can(me, "app.assess")
          ? { title: "Assess fees", body: "Compute the assessment from the fee schedule; adjust lines if needed.", actions: [<Button key="a" variant="primary" onClick={() => setAssessOpen(true)}>Assess fees</Button>] }
          : { title: "Awaiting assessment", body: "Fees will be assessed by a planning officer." };
      case "assessed":
        if (lapsed)
          return can(me, "app.assess")
            ? { title: "Assessment lapsed", body: `Not paid within ${settings.assessmentValidityDays} days. Re-assess to issue a fresh demand.`, tone: "critical" as const, actions: [<Button key="r" variant="primary" onClick={() => setAssessOpen(true)}>Re-assess</Button>] }
            : { title: "Assessment lapsed", body: "Refer the applicant to a planning officer for re-assessment.", tone: "critical" as const };
        return can(me, "app.pay")
          ? {
              title: "Record payment",
              body: `Confirm payment of ${naira(lineTotal(app.assessment!.lines))}. The registration number is generated automatically.`,
              actions: [
                <Select key="c" className="w-40" value={channel} onChange={(e) => setChannel(e.target.value as Payment["channel"])} options={[{ value: "remita", label: "Remita" }, { value: "bank", label: "Bank teller" }, { value: "transfer", label: "Transfer" }, { value: "pos", label: "POS" }]} />,
                <Button key="p" variant="primary" onClick={() => pay(app.id, channel)}>Confirm payment</Button>,
              ],
            }
          : { title: "Awaiting payment", body: `Assessment valid until ${fdate(app.assessment!.expiresAt)}.` };
      case "registered":
        return can(me, "app.recommend")
          ? { title: "Inspect & recommend", body: "After site inspection, recommend to the ZTPO for approval.", actions: [<Button key="r" variant="primary" onClick={() => transition(app.id, "recommended", "Site inspected; recommended")}>Recommend for approval</Button>, <Button key="p" onClick={() => setNoteFor("pended")}>Pend</Button>] }
          : { title: "Awaiting inspection", body: "A planning officer will inspect and recommend." };
      case "recommended":
        return can(me, "app.approve")
          ? { title: "Final approval", body: `Approve to issue the planning permit (${app.regNo ? `OGPDPA/${app.regNo}` : ""}).`, actions: [<Button key="a" variant="primary" onClick={() => approve(app.id)}>Approve & issue permit</Button>, <Button key="d" variant="danger" onClick={() => setNoteFor("disapproved")}>Disapprove</Button>] }
          : { title: "Awaiting ZTPO approval", body: "Recommended and waiting for the Zonal Town Planning Officer." };
      case "pended":
        return can(me, "app.assess")
          ? { title: "Pended", body: app.history[app.history.length - 1].note ?? "Waiting on applicant.", tone: "warning" as const, actions: [<Button key="r" variant="primary" onClick={() => transition(app.id, app.assessment ? (app.regNo ? "registered" : "assessed") : "okayed", "Resumed — conditions met")}>Resume processing</Button>] }
          : { title: "Pended", body: app.history[app.history.length - 1].note ?? "", tone: "warning" as const };
      case "approved":
        return { title: "Permit issued", body: `Approval No ${app.approvalNo}`, tone: "good" as const };
      case "disapproved":
        return { title: "Disapproved", body: app.history[app.history.length - 1].note ?? "", tone: "critical" as const };
    }
  })();

  const toneCls = { critical: "bg-crit-soft", warning: "bg-warn-soft", good: "bg-good-soft" } as const;
  return (
    <>
      <Card className={cx("flex flex-wrap items-center justify-between gap-4 p-5", "tone" in step && step.tone ? toneCls[step.tone] + " border-transparent" : "")}>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-ink-3">Next step</div>
          <div className="text-[17px] font-bold tracking-tight">{step.title}</div>
          <div className="text-[13px] text-ink-2">{step.body}</div>
        </div>
        {"actions" in step && step.actions && <div className="flex flex-wrap items-center gap-2">{step.actions}</div>}
      </Card>

      <AssessModal open={assessOpen} onClose={() => setAssessOpen(false)} app={app} />
      <Modal open={!!noteFor} onClose={() => setNoteFor(null)} title={noteFor === "pended" ? "Pend application" : "Disapprove application"}>
        <Field label="Reason (shared with applicant)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={noteFor === "pended" ? "e.g. Survey plan missing" : "e.g. Contravenes setback regulation"} />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setNoteFor(null)}>
            Cancel
          </Button>
          <Button
            variant={noteFor === "disapproved" ? "dark" : "primary"}
            disabled={!note.trim()}
            onClick={() => {
              transition(app.id, noteFor!, note.trim());
              setNoteFor(null);
              setNote("");
            }}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </>
  );
}

function AssessModal({ open, onClose, app }: { open: boolean; onClose: () => void; app: Application }) {
  const settings = useStore((s) => s.settings);
  const assess = useStore((s) => s.assess);
  const [lines, setLines] = useState<FeeLine[]>(() => defaultFees(app, settings));
  const [add, setAdd] = useState<FeeHead | "">("");
  const unused = FEE_HEADS.filter((f) => !lines.some((l) => l.head === f.id) && !["petition", "unsealing"].includes(f.id));
  const setAmt = (head: FeeHead, amount: number) => setLines((ls) => ls.map((l) => (l.head === head ? { ...l, amount } : l)));

  return (
    <Modal open={open} onClose={onClose} title="Assess fees" wide>
      <p className="mb-4 text-[13px] text-ink-2">
        Pre-filled from the fee schedule for <b>{describeUse(app)}</b>
        {app.devStatus === "developed" && " with penal fee for non-compliance"}. Adjust any line before saving.
      </p>
      <div className="space-y-2">
        {lines.map((l) => (
          <div key={l.head} className="flex items-center gap-3">
            <span className="flex-1 text-[13.5px] text-ink-2">{FEE_HEADS.find((f) => f.id === l.head)?.label}</span>
            <Input type="number" className="w-44 text-right tnum" value={l.amount} min={0} onChange={(e) => setAmt(l.head, Math.max(0, Number(e.target.value)))} />
            <button type="button" className="text-[12px] font-semibold text-ink-3 hover:text-crit" onClick={() => setLines((ls) => ls.filter((x) => x.head !== l.head))}>
              Remove
            </button>
          </div>
        ))}
      </div>
      {unused.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <Select className="w-64" value={add} onChange={(e) => setAdd(e.target.value as FeeHead)} options={[{ value: "", label: "Add fee head…" }, ...unused.map((u) => ({ value: u.id, label: u.label }))]} />
          <Button size="sm" disabled={!add} onClick={() => add && (setLines((ls) => [...ls, { head: add, amount: 0 }]), setAdd(""))}>
            Add
          </Button>
        </div>
      )}
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
        <span className="text-[13.5px] font-semibold">Total · valid {settings.assessmentValidityDays} days</span>
        <span className="text-[20px] font-bold tnum">{naira(lineTotal(lines))}</span>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!lines.length || lineTotal(lines) <= 0}
          onClick={() => {
            assess(app.id, lines.filter((l) => l.amount > 0));
            onClose();
          }}
        >
          Save assessment
        </Button>
      </div>
    </Modal>
  );
}

