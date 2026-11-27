"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { GroupedBars, Legend, TrendArea } from "@/components/charts";
import { Forbidden } from "@/components/guard";
import { Avatar, Badge, Button, Card, CardHeader, Empty, Field, Input, KeyValue, Modal, PageHeader, Textarea } from "@/components/ui";
import { PeriodPicker, Stat } from "@/components/widgets";
import { ZoneMap } from "@/components/zone-map";
import { ROLE_META, SERIES } from "@/lib/catalog";
import { nairaCompact, num } from "@/lib/format";
import { useData, usePeriod } from "@/lib/hooks";
import { monthsIn, periodOf } from "@/lib/periods";
import { can, isHQ } from "@/lib/rbac";
import { metrics, zoneRows } from "@/lib/selectors";
import { useMe, useStore } from "@/lib/store";
import type { Zone } from "@/lib/types";

export default function ZoneProfile() {
  const { id } = useParams<{ id: string }>();
  const me = useMe()!;
  const data = useData();
  const { kind, setKind, offset, setOffset, period, prev, today } = usePeriod("quarter");
  const [editing, setEditing] = useState(false);
  const zone = data.zones.find((z) => z.id === id);
  const rows = useMemo(() => zoneRows(data, period, prev, today), [data, period, prev, today]);
  const trend = useMemo(
    () => monthsIn({ from: new Date(today.getFullYear(), 0, 1), to: today }).map((m) => ({ label: format(m, "MMM"), ...metrics(data, [id], periodOf("month", m)) })),
    [data, id, today],
  );
  if (!zone) return <Empty title="Zone not found" />;
  if (!isHQ(me) && me.zoneId !== id) return <Forbidden />;
  const row = rows.find((r) => r.zone.id === id)!;
  const rank = (f: (r: (typeof rows)[number]) => number, asc = false) => [...rows].sort((a, b) => (asc ? f(a) - f(b) : f(b) - f(a))).findIndex((r) => r.zone.id === id) + 1;
  const team = data.staff.filter((s) => s.zoneId === id).sort((a, b) => b.gradeLevel - a.gradeLevel);

  return (
    <div className="rise">
      <Link href={isHQ(me) ? "/zones" : "/dashboard"} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> {isHQ(me) ? "Zones" : "Overview"}
      </Link>
      <PageHeader
        eyebrow={zone.code}
        title={`${zone.name} Zonal Planning Office`}
        sub={`${zone.lgas.join(" · ")} · established ${zone.established}`}
        right={
          <>
            <PeriodPicker kind={kind} setKind={setKind} offset={offset} setOffset={setOffset} label={period.label} />
            {can(me, "zones.manage") && (
              <Button onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> Edit profile
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="p-4 xl:col-span-5">
          <ZoneMap mode="zone" selected={null} ownZone={id} />
          <div className="mt-4 flex flex-wrap gap-2 px-1">
            <Badge tone="brand">#{rank((r) => r.m.revenue)} of {rows.length} revenue</Badge>
            <Badge tone="info">#{rank((r) => r.m.approved)} approvals</Badge>
            <Badge tone="neutral">#{rank((r) => r.m.avgProcessing || 99, true)} speed</Badge>
            <Badge tone={row.reportsOnTime > 0.8 ? "good" : "warning"}>{Math.round(row.reportsOnTime * 100)}% reports on time</Badge>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4 xl:col-span-7">
          <Stat label="Revenue" value={nairaCompact(row.m.revenue)} cur={row.m.revenue} prev={row.prev.revenue} hint="vs prev." />
          <Stat label="Permits approved" value={num(row.m.approved)} cur={row.m.approved} prev={row.prev.approved} hint={`${row.m.received} received`} />
          <Stat label="Avg. processing" value={`${row.m.avgProcessing.toFixed(1)}d`} cur={row.m.avgProcessing} prev={row.prev.avgProcessing} invert hint={`${Math.round(row.m.withinTarget * 100)}% ≤ 7 days`} />
          <Stat label="Notices / sanctions" value={`${row.m.notices} / ${row.m.sanctions}`} hint={`${row.m.openCases} open cases`} />
        </div>

        <Card className="xl:col-span-7">
          <CardHeader title="Monthly revenue" sub={`${today.getFullYear()} to date`} />
          <div className="px-3 pt-2 pb-3">
            <TrendArea data={trend} x="label" y="revenue" name="Revenue" fmt={nairaCompact} height={230} />
          </div>
        </Card>
        <Card className="xl:col-span-5">
          <CardHeader title="Received vs approved" right={<Legend items={[{ label: "Received", color: SERIES[1] }, { label: "Approved", color: SERIES[0] }]} />} />
          <div className="px-3 pt-2 pb-3">
            <GroupedBars data={trend} x="label" keys={[{ key: "received", name: "Received", color: SERIES[1] }, { key: "approved", name: "Approved", color: SERIES[0] }]} fmt={num} height={230} />
          </div>
        </Card>

        <Card className="xl:col-span-7">
          <CardHeader title="Nominal roll" sub={`${team.length} officers`} right={can(me, "staff.view") && <Link href={`/staff?zone=${id}`} className="text-[13px] font-semibold text-brand">Manage staff</Link>} />
          <ul className="divide-y divide-line px-5 pt-2 pb-3">
            {team.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={`${s.firstName} ${s.lastName}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold">
                    {s.title} {s.firstName} {s.lastName}
                  </div>
                  <div className="truncate text-[12px] text-ink-3">{s.duties.slice(0, 2).join(" · ")}</div>
                </div>
                <Badge tone={s.role === "ZTPO" ? "brand" : "neutral"}>{s.designation ?? s.post}</Badge>
                <span className="w-12 text-right text-[12px] text-ink-3">GL {s.gradeLevel}</span>
                {s.status !== "active" && <Badge tone="critical">{s.status}</Badge>}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="px-5 pt-4 pb-2 xl:col-span-5">
          <KeyValue
            items={[
              ["Office address", zone.address],
              ["Towns covered", zone.towns],
              ["LGAs", zone.lgas.join(", ")],
              ["Boundaries", zone.boundaries || "—"],
              ["Phone", zone.phone || "—"],
              ["ZTPO", (() => {
                const z = team.find((t) => t.role === "ZTPO");
                return z ? `${z.title} ${z.firstName} ${z.lastName}` : "—";
              })()],
              ["Roles", Array.from(new Set(team.map((t) => ROLE_META[t.role].short))).join(", ")],
            ]}
          />
        </Card>
      </div>
      {editing && <EditZone zone={zone} onClose={() => setEditing(false)} />}
    </div>
  );
}

function EditZone({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertZone);
  const [f, setF] = useState(zone);
  const set = <K extends keyof Zone>(k: K, v: Zone[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal open onClose={onClose} title={`Edit ${zone.name}`} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Code" hint="Used in registration numbers">
          <Input value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input value={f.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Established">
          <Input value={f.established} onChange={(e) => set("established", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Towns covered" className="sm:col-span-2">
          <Textarea value={f.towns} onChange={(e) => set("towns", e.target.value)} />
        </Field>
        <Field label="Boundaries" className="sm:col-span-2" hint="Appears in the quarterly report introduction">
          <Textarea value={f.boundaries} onChange={(e) => set("boundaries", e.target.value)} />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            upsert(f);
            onClose();
          }}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}
