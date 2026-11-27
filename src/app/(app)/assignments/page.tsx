"use client";

import { AlarmClock, CalendarClock, CheckCheck, ClipboardList, Plus, Star } from "lucide-react";
import { MiniStat } from "@/components/widgets";
import { useMemo, useState } from "react";
import { parseISO } from "date-fns";
import { Badge, Button, Card, Checkbox, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { cx, fdate } from "@/lib/format";
import { useScope } from "@/lib/hooks";
import { can, isHQ } from "@/lib/rbac";
import { useMe, useStaffMap, useStore, useToday, useZoneMap } from "@/lib/store";
import type { Assignment } from "@/lib/types";

const COLUMNS: { status: Assignment["status"]; label: string; dot: string }[] = [
  { status: "open", label: "To do", dot: "bg-info" },
  { status: "in_progress", label: "In progress", dot: "bg-warn" },
  { status: "done", label: "Done", dot: "bg-good" },
];

export default function AssignmentsPage() {
  const me = useMe()!;
  const all = useStore((s) => s.assignments);
  const update = useStore((s) => s.updateAssignment);
  const scope = useScope();
  const staff = useStaffMap();
  const zones = useZoneMap();
  const today = useToday();
  const [mine, setMine] = useState(me.role === "PLANNING_OFFICER");
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState<Assignment | null>(null);
  const list = useMemo(() => all.filter((a) => (!scope || (a.zoneId && scope.includes(a.zoneId))) && (!mine || a.assignedTo === me.id)), [all, scope, mine, me.id]);
  const editable = (a: Assignment) => can(me, "assign.update") && (a.assignedTo === me.id || me.role === "ZTPO" || isHQ(me));

  return (
    <div className="rise">
      <PageHeader
        title="Assignments"
        sub="Sector monitoring and special assignments — completed special assignments flow into the weekly report"
        right={
          <>
            <Checkbox label="Only mine" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            {can(me, "assign.create") && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> New assignment
              </Button>
            )}
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat accent label="Active" value={list.filter((a) => a.status !== "done").length} icon={<ClipboardList className="size-5" />} />
        <MiniStat label="Overdue" value={list.filter((a) => a.status !== "done" && parseISO(a.due) < today).length} icon={<AlarmClock className="size-5" />} />
        <MiniStat label="Special assignments" value={list.filter((a) => a.special).length} icon={<Star className="size-5" />} />
        <MiniStat label="Completed" value={list.filter((a) => a.status === "done").length} icon={<CheckCheck className="size-5" />} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = list.filter((a) => a.status === col.status).sort((a, b) => a.due.localeCompare(b.due));
          return (
            <div key={col.status} className="rounded-[var(--radius-card)] bg-surface-3/60 p-3">
              <div className="mb-3 flex items-center gap-2 px-2 pt-1 text-[14px] font-bold">
                <span className={cx("size-2 rounded-full", col.dot)} />
                {col.label}
                <span className="rounded-full bg-surface px-2 text-[12px] text-ink-3">{items.length}</span>
              </div>
              <div className="space-y-2.5">
                {items.slice(0, 30).map((a) => {
                  const late = a.status !== "done" && parseISO(a.due) < today;
                  return (
                    <Card key={a.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[14px] leading-snug font-semibold">{a.title}</div>
                        {a.special && <Star className="size-4 shrink-0 fill-bronze text-bronze" aria-label="Special assignment" />}
                      </div>
                      <div className="mt-1.5 text-[12.5px] text-ink-3">
                        {staff[a.assignedTo]?.firstName} {staff[a.assignedTo]?.lastName}
                        {isHQ(me) && a.zoneId && ` · ${zones[a.zoneId]?.name}`}
                        {staff[a.assignedBy]?.zoneId === null && <Badge className="ml-1.5" tone="neutral">from HQ</Badge>}
                      </div>
                      {a.outcome && <div className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-[12.5px] text-ink-2">{a.outcome}</div>}
                      <div className="mt-3 flex items-center justify-between">
                        <span className={cx("inline-flex items-center gap-1 text-[12px] font-medium", late ? "text-crit" : "text-ink-3")}>
                          <CalendarClock className="size-3.5" /> {a.status === "done" ? `Done ${fdate(a.doneAt, "d MMM")}` : `Due ${fdate(a.due, "d MMM")}`}
                        </span>
                        {editable(a) && a.status !== "done" && (
                          <Button size="sm" variant={a.status === "open" ? "secondary" : "primary"} onClick={() => (a.status === "open" ? update(a.id, { status: "in_progress" }) : setClosing(a))}>
                            {a.status === "open" ? "Start" : "Complete"}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <NewAssignment open={creating} onClose={() => setCreating(false)} />
      <CompleteModal a={closing} onClose={() => setClosing(null)} />
    </div>
  );
}

function CompleteModal({ a, onClose }: { a: Assignment | null; onClose: () => void }) {
  const update = useStore((s) => s.updateAssignment);
  const [outcome, setOutcome] = useState("");
  return (
    <Modal open={!!a} onClose={onClose} title="Complete assignment">
      <Field label="Outcome / findings">
        <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} />
      </Field>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!outcome.trim()}
          onClick={() => {
            update(a!.id, { status: "done", outcome: outcome.trim() });
            setOutcome("");
            onClose();
          }}
        >
          Mark done
        </Button>
      </div>
    </Modal>
  );
}

function NewAssignment({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()!;
  const zones = useStore((s) => s.zones);
  const staff = useStore((s) => s.staff);
  const create = useStore((s) => s.createAssignment);
  const [f, setF] = useState({ title: "", description: "", zoneId: me.zoneId ?? zones[0]?.id, assignedTo: "", due: "", special: true });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const officers = staff.filter((s) => s.zoneId === f.zoneId && s.role !== "CLERICAL" && s.status === "active");
  return (
    <Modal open={open} onClose={onClose} title="New assignment">
      <div className="grid gap-4">
        <Field label="Title">
          <Input value={f.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Description">
          <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Zone">
            <Select disabled={!isHQ(me)} value={f.zoneId!} onChange={(e) => setF((x) => ({ ...x, zoneId: e.target.value, assignedTo: "" }))} options={zones.map((z) => ({ value: z.id, label: z.name }))} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={f.due} onChange={(e) => set("due", e.target.value)} />
          </Field>
        </div>
        <Field label="Assign to">
          <Select value={f.assignedTo} onChange={(e) => set("assignedTo", e.target.value)} options={[{ value: "", label: "Choose officer…" }, ...officers.map((o) => ({ value: o.id, label: `${o.title} ${o.firstName} ${o.lastName} · ${o.designation ?? o.post}` }))]} />
        </Field>
        <Checkbox label="Special assignment (reported in weekly item 11)" checked={f.special} onChange={(e) => set("special", e.target.checked)} />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!f.title.trim() || !f.assignedTo || !f.due}
          onClick={() => {
            create({ title: f.title, description: f.description, zoneId: f.zoneId!, assignedTo: f.assignedTo, due: `${f.due}T17:00:00`, special: f.special });
            onClose();
          }}
        >
          Assign
        </Button>
      </div>
    </Modal>
  );
}
