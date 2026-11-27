"use client";

import { Plus, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Forbidden } from "@/components/guard";
import { Avatar, Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { ROLE_META } from "@/lib/catalog";
import { useScope } from "@/lib/hooks";
import { can, isHQ } from "@/lib/rbac";
import { useMe, useStore, useToday, useZoneMap } from "@/lib/store";
import type { Post, Role, Staff } from "@/lib/types";

const POSTS: Post[] = ["PTPO", "STPO", "TPO I", "TPO II", "HTO", "CCO", "DIRECTOR", "ADMIN", "RECORDS"];

export default function Page() {
  return (
    <Suspense>
      <StaffPage />
    </Suspense>
  );
}

function StaffPage() {
  const me = useMe()!;
  const sp = useSearchParams();
  const staff = useStore((s) => s.staff);
  const apps = useStore((s) => s.applications);
  const cases = useStore((s) => s.cases);
  const zones = useZoneMap();
  const scope = useScope();
  const today = useToday();
  const [q, setQ] = useState("");
  const [zone, setZone] = useState(sp.get("zone") ?? "all");
  const [role, setRole] = useState<Role | "all">("all");
  const [editing, setEditing] = useState<Staff | "new" | null>(null);

  const yearStart = `${today.getFullYear()}-01-01`;
  const perf = useMemo(() => {
    const out: Record<string, { handled: number; notices: number }> = {};
    for (const a of apps) if (a.approvedAt && a.approvedAt >= yearStart) (out[a.officerId] ??= { handled: 0, notices: 0 }).handled++;
    for (const c of cases) for (const n of c.notices) if (n.servedAt >= yearStart) (out[n.by] ??= { handled: 0, notices: 0 }).notices++;
    return out;
  }, [apps, cases, yearStart]);

  if (!can(me, "staff.view")) return <Forbidden what="staff records" />;
  const list = staff
    .filter((s) => (!scope || (s.zoneId && scope.includes(s.zoneId))) && (zone === "all" || (zone === "hq" ? s.zoneId === null : s.zoneId === zone)) && (role === "all" || s.role === role))
    .filter((s) => !q || `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.zoneId ?? "").localeCompare(b.zoneId ?? "") || b.gradeLevel - a.gradeLevel);

  return (
    <div className="rise">
      <PageHeader
        title="Staff & officers"
        sub={`${list.length} people · nominal roll, roles and performance`}
        right={
          can(me, "staff.manage") && (
            <Button variant="primary" onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Add staff
            </Button>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap gap-2 px-5 pt-5 pb-4">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute top-3 left-3.5 size-4 text-ink-3" />
            <Input className="pl-10" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {isHQ(me) && <Select className="w-48" value={zone} onChange={(e) => setZone(e.target.value)} options={[{ value: "all", label: "All offices" }, { value: "hq", label: "Headquarters" }, ...Object.values(zones).map((z) => ({ value: z.id, label: z.name }))]} />}
          <Select className="w-52" value={role} onChange={(e) => setRole(e.target.value as Role)} options={[{ value: "all", label: "All roles" }, ...Object.entries(ROLE_META).map(([k, v]) => ({ value: k, label: v.label }))]} />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Officer</Th>
              <Th>Office</Th>
              <Th>Post</Th>
              <Th>System role</Th>
              <Th className="text-right">Approvals YTD</Th>
              <Th className="text-right">Notices YTD</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="hover:bg-surface-2/60">
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={`${s.firstName} ${s.lastName}`} />
                    <div>
                      <div className="font-semibold">
                        {s.title} {s.firstName} {s.lastName}
                      </div>
                      <div className="text-[12px] text-ink-3">{s.email}</div>
                    </div>
                  </div>
                </Td>
                <Td className="text-ink-2">{s.zoneId ? zones[s.zoneId]?.name : "Headquarters"}</Td>
                <Td className="text-ink-2">
                  {s.designation ?? s.post} · GL {s.gradeLevel}
                </Td>
                <Td>
                  <Badge tone={ROLE_META[s.role].hq ? "info" : "neutral"}>{ROLE_META[s.role].short}</Badge>
                  {s.actingZtpo && <Badge tone="warning" className="ml-1">acting ZTPO</Badge>}
                </Td>
                <Td className="text-right tnum">{perf[s.id]?.handled ?? 0}</Td>
                <Td className="text-right tnum">{perf[s.id]?.notices ?? 0}</Td>
                <Td>
                  <Badge tone={s.status === "active" ? "good" : "critical"} dot>
                    {s.status}
                  </Badge>
                </Td>
                <Td className="text-right">
                  {(can(me, "staff.manage") || (can(me, "staff.roster") && s.zoneId === me.zoneId)) && (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                      Edit
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      {editing && <StaffModal staff={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function StaffModal({ staff, onClose }: { staff: Staff | null; onClose: () => void }) {
  const me = useMe()!;
  const zones = useStore((s) => s.zones);
  const upsert = useStore((s) => s.upsertStaff);
  const full = can(me, "staff.manage");
  const [f, setF] = useState<Staff>(
    staff ?? {
      id: `u${Date.now().toString(36)}`,
      title: "TPL",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "PLANNING_OFFICER",
      post: "TPO II",
      gradeLevel: 8,
      zoneId: zones[0]?.id ?? null,
      duties: [],
      status: "active",
      joinedAt: new Date().toISOString().slice(0, 10),
    },
  );
  const set = <K extends keyof Staff>(k: K, v: Staff[K]) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.firstName.trim() && f.lastName.trim() && /\S+@\S+/.test(f.email);
  return (
    <Modal open onClose={onClose} title={staff ? `Edit ${staff.firstName} ${staff.lastName}` : "Add staff"} wide>
      {!full && <p className="mb-4 rounded-xl bg-info-soft px-3.5 py-2.5 text-[12.5px] text-info">As ZTPO you can update duties and designation. Roles, transfers and suspensions are managed by HQ.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Title">
          <Input disabled={!full} value={f.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="First name">
          <Input disabled={!full} value={f.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Last name">
          <Input disabled={!full} value={f.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input disabled={!full} value={f.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input disabled={!full} value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Office" hint={staff && full ? "Changing this transfers the officer" : undefined}>
          <Select disabled={!full} value={f.zoneId ?? "hq"} onChange={(e) => set("zoneId", e.target.value === "hq" ? null : e.target.value)} options={[{ value: "hq", label: "Headquarters" }, ...zones.map((z) => ({ value: z.id, label: z.name }))]} />
        </Field>
        <Field label="System role">
          <Select disabled={!full} value={f.role} onChange={(e) => set("role", e.target.value as Role)} options={Object.entries(ROLE_META).filter(([, v]) => v.hq === (f.zoneId === null)).map(([k, v]) => ({ value: k, label: v.label }))} />
        </Field>
        <Field label="Status">
          <Select disabled={!full} value={f.status} onChange={(e) => set("status", e.target.value as Staff["status"])} options={[{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }]} />
        </Field>
        <Field label="Post">
          <Select disabled={!full} value={f.post} onChange={(e) => set("post", e.target.value as Post)} options={POSTS.map((p) => ({ value: p, label: p }))} />
        </Field>
        <Field label="Grade level">
          <Input disabled={!full} type="number" value={f.gradeLevel} onChange={(e) => set("gradeLevel", Number(e.target.value))} />
        </Field>
        <Field label="Designation">
          <Input value={f.designation ?? ""} onChange={(e) => set("designation", e.target.value || undefined)} placeholder="e.g. Deputy ZTPO" />
        </Field>
        <Field label="Schedule of activities (one per line)" className="sm:col-span-3">
          <Textarea rows={4} value={f.duties.join("\n")} onChange={(e) => set("duties", e.target.value.split("\n"))} />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!valid}
          onClick={() => {
            upsert({ ...f, duties: f.duties.map((d) => d.trim()).filter(Boolean) });
            onClose();
          }}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}
