"use client";

import { CheckCheck, Eye, Hourglass, MessageSquareWarning, Plus } from "lucide-react";
import { MiniStat } from "@/components/widgets";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Table, Tabs, Td, Th } from "@/components/ui";
import { PETITION_STATUS } from "@/lib/catalog";
import { fdate } from "@/lib/format";
import { useScope } from "@/lib/hooks";
import { can, isHQ } from "@/lib/rbac";
import { useMe, useStaffMap, useStore, useToday, useZoneMap } from "@/lib/store";
import type { Petition } from "@/lib/types";

type View = "open" | "treated" | "all";

export default function PetitionsPage() {
  const me = useMe()!;
  const petitions = useStore((s) => s.petitions);
  const scope = useScope();
  const zones = useZoneMap();
  const staff = useStaffMap();
  const today = useToday();
  const router = useRouter();
  const [view, setView] = useState<View>("open");
  const [creating, setCreating] = useState(false);
  const base = useMemo(() => petitions.filter((p) => !scope || scope.includes(p.zoneId)), [petitions, scope]);
  const f: Record<View, (p: Petition) => boolean> = { open: (p) => p.status !== "treated", treated: (p) => p.status === "treated", all: () => true };
  const list = base.filter(f[view]).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  return (
    <div className="rise">
      <PageHeader
        title="Petitions & disputes"
        sub="Register, assign and resolve petitions"
        right={
          can(me, "pet.create") && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Register petition
            </Button>
          )
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat accent label="Outstanding" value={base.filter(f.open).length} icon={<MessageSquareWarning className="size-5" />} onClick={() => setView("open")} />
        <MiniStat label="Under review" value={base.filter((p) => p.status === "under_review").length} icon={<Eye className="size-5" />} />
        <MiniStat label="Over 30 days old" value={base.filter((p) => p.status !== "treated" && differenceInCalendarDays(today, parseISO(p.receivedAt)) > 30).length} icon={<Hourglass className="size-5" />} />
        <MiniStat
          label="Avg. days to resolve"
          value={(() => {
            const t = base.filter((p) => p.treatedAt).map((p) => differenceInCalendarDays(parseISO(p.treatedAt!), parseISO(p.receivedAt)));
            return t.length ? Math.round(t.reduce((a, b) => a + b, 0) / t.length) : "—";
          })()}
          icon={<CheckCheck className="size-5" />}
          onClick={() => setView("treated")}
          active={view === "treated"}
        />
      </div>
      <Card>
        <div className="px-5 pt-5 pb-4">
          <Tabs value={view} onChange={setView} tabs={(["open", "treated", "all"] as View[]).map((v) => ({ value: v, label: { open: "Outstanding", treated: "Treated", all: "All" }[v], count: base.filter(f[v]).length }))} />
        </div>
        {list.length === 0 ? (
          <Empty title="No petitions" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Petition</Th>
                {isHQ(me) && <Th>Zone</Th>}
                <Th>Against</Th>
                <Th>Assigned</Th>
                <Th>Received</Th>
                <Th className="text-right">Age</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const age = differenceInCalendarDays(p.treatedAt ? parseISO(p.treatedAt) : today, parseISO(p.receivedAt));
                return (
                  <tr key={p.id} className="cursor-pointer hover:bg-surface-2/60" onClick={() => router.push(`/petitions/${p.id}`)}>
                    <Td>
                      <div className="font-semibold">{p.subject}</div>
                      <div className="text-[12px] text-ink-3">
                        <span className="font-mono">{p.petitionNo}</span> · {p.petitioner}
                      </div>
                    </Td>
                    {isHQ(me) && <Td className="text-ink-2">{zones[p.zoneId]?.name}</Td>}
                    <Td className="text-ink-2">{p.against}</Td>
                    <Td className="text-ink-2">{p.assignedTo ? `${staff[p.assignedTo]?.firstName} ${staff[p.assignedTo]?.lastName}` : "—"}</Td>
                    <Td className="text-ink-2">{fdate(p.receivedAt)}</Td>
                    <Td className={`text-right tnum ${p.status !== "treated" && age > 30 ? "font-semibold text-crit" : "text-ink-2"}`}>{age}d</Td>
                    <Td>
                      <Badge tone={PETITION_STATUS[p.status].tone} dot>
                        {PETITION_STATUS[p.status].label}
                      </Badge>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <NewPetition open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function NewPetition({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()!;
  const zones = useStore((s) => s.zones);
  const create = useStore((s) => s.createPetition);
  const router = useRouter();
  const [f, setF] = useState({ petitioner: "", against: "", subject: "", location: "", zoneId: me.zoneId ?? zones[0]?.id, fee: 10000 });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} title="Register petition">
      <div className="grid gap-4">
        <Field label="Petitioner">
          <Input value={f.petitioner} onChange={(e) => set("petitioner", e.target.value)} />
        </Field>
        <Field label="Against">
          <Input value={f.against} onChange={(e) => set("against", e.target.value)} placeholder="Name or “Unknown developer”" />
        </Field>
        <Field label="Subject">
          <Input value={f.subject} onChange={(e) => set("subject", e.target.value)} placeholder="e.g. Boundary encroachment" />
        </Field>
        <Field label="Location">
          <Input value={f.location} onChange={(e) => set("location", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Zone">
            <Select disabled={!isHQ(me)} value={f.zoneId!} onChange={(e) => set("zoneId", e.target.value)} options={zones.map((z) => ({ value: z.id, label: z.name }))} />
          </Field>
          <Field label="Petition fee (₦)" hint="0 if waived">
            <Input type="number" value={f.fee} onChange={(e) => set("fee", Number(e.target.value))} />
          </Field>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!f.petitioner.trim() || !f.subject.trim()}
          onClick={() => {
            const id = create({ zoneId: f.zoneId!, petitioner: f.petitioner, against: f.against || "Unknown", subject: f.subject, location: f.location, fee: f.fee || undefined });
            onClose();
            router.push(`/petitions/${id}`);
          }}
        >
          Register
        </Button>
      </div>
    </Modal>
  );
}
