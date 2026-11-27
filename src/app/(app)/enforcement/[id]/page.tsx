"use client";

import { ArrowLeft, Check, Hammer, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { parseISO } from "date-fns";
import { Forbidden } from "@/components/guard";
import { Badge, Button, Card, CardHeader, Empty, Field, Input, KeyValue, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { NOTICE_TYPES, OUTCOME_TONE, SANCTION_TYPES, sanctionLabel, labelOfUse } from "@/lib/catalog";
import { cx, fdate, fdt } from "@/lib/format";
import { can, isHQ } from "@/lib/rbac";
import { nextEscalation, useMe, useStaffMap, useStore, useToday, useZoneMap } from "@/lib/store";
import type { EnforcementCase, NoticeType, SanctionType } from "@/lib/types";

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const me = useMe()!;
  const c = useStore((s) => s.cases.find((x) => x.id === id));
  const zones = useZoneMap();
  const staff = useStaffMap();
  const today = useToday();
  const serve = useStore((s) => s.serveNotice);
  const comply = useStore((s) => s.setNoticeComplied);
  const outcome = useStore((s) => s.setCaseOutcome);
  const [serveType, setServeType] = useState<NoticeType | "">("");
  const [sanctionOpen, setSanctionOpen] = useState(false);

  if (!c) return <Empty title="Case not found" />;
  if (!isHQ(me) && c.zoneId !== me.zoneId) return <Forbidden what="cases outside your zone" />;
  const next = nextEscalation(c);
  const editable = can(me, "enf.create") && (isHQ(me) ? me.role === "SUPER_ADMIN" : true);
  const events = [
    ...c.notices.map((n) => ({ at: n.servedAt, kind: "notice" as const, n })),
    ...c.sanctions.map((s) => ({ at: s.at, kind: "sanction" as const, s })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="rise">
      <Link href="/enforcement" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Enforcement
      </Link>
      <PageHeader
        eyebrow={`${zones[c.zoneId]?.name} ZPO · ${c.caseNo}`}
        title={c.owner}
        sub={c.location}
        right={
          <Badge tone={OUTCOME_TONE[c.outcome]} dot className="px-3 py-1 text-[12.5px]">
            {c.outcome}
          </Badge>
        }
      />
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          {editable && c.outcome === "open" && (
            <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <div className="text-[12px] font-semibold text-ink-3">Next step</div>
                <div className="text-[17px] font-bold tracking-tight">{next ? `Escalate: ${NOTICE_TYPES.find((n) => n.id === next)?.label}` : "Escalation complete — record sanction or close"}</div>
                <div className="text-[13px] text-ink-2">Escalation order: contravention → stop-work → quit → sealing → demolition</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  className="w-56"
                  value={serveType || next || ""}
                  onChange={(e) => setServeType(e.target.value as NoticeType)}
                  options={NOTICE_TYPES.map((n) => ({ value: n.id, label: n.label }))}
                />
                <Button variant="primary" onClick={() => serve(c.id, (serveType || next || "contravention") as NoticeType)}>
                  Serve notice
                </Button>
                {can(me, "enf.sanction") && (
                  <Button onClick={() => setSanctionOpen(true)}>
                    <Hammer className="size-4" /> Sanction
                  </Button>
                )}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Notices & sanctions" sub="Newest first. Mark compliance once the deadline passes." />
            <ol className="px-5 pt-4 pb-5">
              {events.length === 0 && <p className="text-[13px] text-ink-3">No notices served yet.</p>}
              {events.map((e, i) => (
                <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                  <span className={cx("relative z-[1] mt-1 size-3 shrink-0 rounded-full ring-4 ring-surface", e.kind === "sanction" ? "bg-crit" : "bg-bronze")} />
                  {i < events.length - 1 && <span className="absolute top-4 left-[5px] h-full w-0.5 bg-line" />}
                  <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[14px] font-semibold">{e.kind === "notice" ? NOTICE_TYPES.find((n) => n.id === e.n.type)?.label : sanctionLabel(e.s.type)}</div>
                      <div className="text-[12px] text-ink-3">
                        {fdt(e.at)} · {staff[e.kind === "notice" ? e.n.by : e.s.by]?.firstName ?? "Officer"}
                        {e.kind === "notice" && ` · deadline ${fdate(e.n.deadline)}`}
                      </div>
                      {e.kind === "sanction" && e.s.note && <div className="mt-1 text-[13px] text-ink-2">{e.s.note}</div>}
                    </div>
                    {e.kind === "notice" &&
                      (e.n.complied === undefined ? (
                        parseISO(e.n.deadline) < today ? (
                          editable ? (
                            <div className="flex gap-1.5">
                              <Button size="sm" onClick={() => comply(c.id, e.n.id, true)}>
                                <Check className="size-3.5" /> Complied
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => comply(c.id, e.n.id, false)}>
                                <X className="size-3.5" /> Not complied
                              </Button>
                            </div>
                          ) : (
                            <Badge tone="critical">Deadline passed</Badge>
                          )
                        ) : (
                          <Badge tone="info">Running</Badge>
                        )
                      ) : (
                        <Badge tone={e.n.complied ? "good" : "critical"}>{e.n.complied ? "Complied" : "Not complied"}</Badge>
                      ))}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="space-y-5 xl:col-span-4">
          <Card className="px-5 pt-4 pb-2">
            <KeyValue
              items={[
                ["Contravention", c.description],
                ["Use", labelOfUse(c.useGroup)],
                ["Stage", c.stage],
                ["Opened", fdate(c.openedAt)],
                ["Officer", staff[c.officerId] ? `${staff[c.officerId].firstName} ${staff[c.officerId].lastName}` : "—"],
                ["Notices served", c.notices.length],
              ]}
            />
          </Card>
          {editable && (
            <Card className="p-5">
              <div className="mb-3 text-[14px] font-bold">Close case</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => outcome(c.id, "complied")}>
                  Complied
                </Button>
                <Button size="sm" onClick={() => outcome(c.id, "regularised")}>
                  Regularised
                </Button>
                <Button size="sm" onClick={() => outcome(c.id, "revoked")}>
                  Permit revoked
                </Button>
                {c.outcome !== "open" && (
                  <Button size="sm" variant="ghost" onClick={() => outcome(c.id, "open")}>
                    Re-open
                  </Button>
                )}
              </div>
              <p className="mt-3 text-[12px] text-ink-3">
                Regularising? Register an application with “Developed” status so the penal fee applies —{" "}
                <Link className="font-semibold text-brand" href="/applications/new">
                  new application
                </Link>
                .
              </p>
            </Card>
          )}
        </div>
      </div>
      <SanctionModal open={sanctionOpen} onClose={() => setSanctionOpen(false)} c={c} />
    </div>
  );
}

function SanctionModal({ open, onClose, c }: { open: boolean; onClose: () => void; c: EnforcementCase }) {
  const record = useStore((s) => s.recordSanction);
  const me = useMe()!;
  const [type, setType] = useState<SanctionType>("sealing");
  const [note, setNote] = useState("");
  const [fee, setFee] = useState(50000);
  return (
    <Modal open={open} onClose={onClose} title="Record sanction">
      <div className="space-y-4">
        <Field label="Sanction">
          <Select value={type} onChange={(e) => setType(e.target.value as SanctionType)} options={SANCTION_TYPES.map((s) => ({ value: s.id, label: s.label }))} />
        </Field>
        {type === "unsealing" && (
          <Field label="Unsealing fee (₦)" hint="Posted to the revenue ledger">
            <Input type="number" value={fee} onChange={(e) => setFee(Number(e.target.value))} />
          </Field>
        )}
        <Field label="Note">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Team, equipment, observations…" />
        </Field>
        {me.role !== "ZTPO" && <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-[12.5px] text-warn">Sanctions recorded by officers are flagged for ZTPO approval.</p>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            record(c.id, type, note || undefined, type === "unsealing" ? fee : undefined);
            onClose();
          }}
        >
          Record
        </Button>
      </div>
    </Modal>
  );
}
