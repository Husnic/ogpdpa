"use client";

import { FileWarning, Gavel, Hammer, Plus, Search, TimerOff } from "lucide-react";
import { MiniStat } from "@/components/widgets";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { parseISO, startOfMonth } from "date-fns";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Table, Tabs, Td, Textarea, Th } from "@/components/ui";
import { OUTCOME_TONE, USE_GROUPS, noticeLabel, sanctionLabel } from "@/lib/catalog";
import { fdate } from "@/lib/format";
import { useScope } from "@/lib/hooks";
import { can, isHQ } from "@/lib/rbac";
import { useMe, useStore, useToday, useZoneMap } from "@/lib/store";
import type { EnforcementCase } from "@/lib/types";

type View = "open" | "overdue" | "sanctioned" | "closed" | "all";

export default function EnforcementPage() {
  const me = useMe()!;
  const cases = useStore((s) => s.cases);
  const scope = useScope();
  const zones = useZoneMap();
  const today = useToday();
  const router = useRouter();
  const [view, setView] = useState<View>("open");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [limit, setLimit] = useState(60);

  const overdue = (c: EnforcementCase) => {
    const n = c.notices[c.notices.length - 1];
    return c.outcome === "open" && !!n && n.complied === undefined && parseISO(n.deadline) < today;
  };
  const views: Record<View, (c: EnforcementCase) => boolean> = {
    open: (c) => c.outcome === "open",
    overdue,
    sanctioned: (c) => c.outcome === "sanctioned",
    closed: (c) => ["complied", "regularised", "revoked"].includes(c.outcome),
    all: () => true,
  };
  const base = useMemo(() => cases.filter((c) => !scope || scope.includes(c.zoneId)), [cases, scope]);
  const list = useMemo(() => {
    const s = q.toLowerCase().trim();
    return base.filter(views[view]).filter((c) => !s || [c.caseNo, c.owner, c.location, c.description].some((x) => x.toLowerCase().includes(s))).sort((a, b) => b.openedAt.localeCompare(a.openedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, view, q, today]);

  return (
    <div className="rise">
      <PageHeader
        title="Enforcement"
        sub="Illegal developments, statutory notices and sanctions"
        right={
          can(me, "enf.create") && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Report contravention
            </Button>
          )
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat accent label="Open cases" value={base.filter(views.open).length} icon={<Gavel className="size-5" />} onClick={() => setView("open")} />
        <MiniStat label="Deadline passed" value={base.filter(overdue).length} hint="escalate" icon={<TimerOff className="size-5" />} onClick={() => setView("overdue")} active={view === "overdue"} />
        <MiniStat label="Notices this month" value={base.reduce((a, c) => a + c.notices.filter((n) => parseISO(n.servedAt) >= startOfMonth(today)).length, 0)} icon={<FileWarning className="size-5" />} />
        <MiniStat label="Sanctions this year" value={base.reduce((a, c) => a + c.sanctions.filter((x) => x.type !== "unsealing" && parseISO(x.at).getFullYear() === today.getFullYear()).length, 0)} icon={<Hammer className="size-5" />} onClick={() => setView("sanctioned")} active={view === "sanctioned"} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
          <Tabs value={view} onChange={(v) => (setView(v), setLimit(60))} tabs={(["open", "overdue", "sanctioned", "closed", "all"] as View[]).map((v) => ({ value: v, label: { open: "Open", overdue: "Deadline passed", sanctioned: "Sanctioned", closed: "Closed", all: "All" }[v], count: base.filter(views[v]).length }))} />
          <div className="relative w-72">
            <Search className="absolute top-3 left-3.5 size-4 text-ink-3" />
            <Input className="pl-10" placeholder="Search case, owner, location…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {list.length === 0 ? (
          <Empty title="No cases here" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Case</Th>
                {isHQ(me) && <Th>Zone</Th>}
                <Th>Contravention</Th>
                <Th>Latest notice</Th>
                <Th>Deadline</Th>
                <Th>Sanctions</Th>
                <Th>Outcome</Th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, limit).map((c) => {
                const n = c.notices[c.notices.length - 1];
                return (
                  <tr key={c.id} className="cursor-pointer hover:bg-surface-2/60" onClick={() => router.push(`/enforcement/${c.id}`)}>
                    <Td>
                      <div className="font-semibold">{c.owner}</div>
                      <div className="font-mono text-[11.5px] text-ink-3">{c.caseNo}</div>
                    </Td>
                    {isHQ(me) && <Td className="text-ink-2">{zones[c.zoneId]?.name}</Td>}
                    <Td>
                      <div className="text-ink">{c.description}</div>
                      <div className="max-w-64 truncate text-[12px] text-ink-3">{c.location}</div>
                    </Td>
                    <Td>{n ? <Badge tone="neutral">{noticeLabel(n.type)}</Badge> : "—"}</Td>
                    <Td className={overdue(c) ? "font-semibold text-crit" : "text-ink-2"}>{n ? fdate(n.deadline, "d MMM") : "—"}</Td>
                    <Td className="text-ink-2">{c.sanctions.map((s) => sanctionLabel(s.type)).join(", ") || "—"}</Td>
                    <Td>
                      <Badge tone={OUTCOME_TONE[c.outcome]} dot>
                        {c.outcome}
                      </Badge>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {list.length > limit && (
          <div className="p-3 text-center">
            <Button variant="ghost" onClick={() => setLimit((l) => l + 100)}>
              Show more ({list.length - limit})
            </Button>
          </div>
        )}
      </Card>
      <NewCase open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function NewCase({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()!;
  const zones = useStore((s) => s.zones);
  const create = useStore((s) => s.createCase);
  const serve = useStore((s) => s.serveNotice);
  const router = useRouter();
  const [f, setF] = useState({ owner: "", location: "", description: "", useGroup: "residential", stage: "foundation" as EnforcementCase["stage"], zoneId: me.zoneId ?? zones[0]?.id, serve: true });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} title="Report a contravention" wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Owner / developer">
          <Input value={f.owner} onChange={(e) => set("owner", e.target.value)} placeholder="Name, or “Unknown developer”" />
        </Field>
        <Field label="Zone">
          <Select disabled={!isHQ(me)} value={f.zoneId!} onChange={(e) => set("zoneId", e.target.value)} options={zones.map((z) => ({ value: z.id, label: z.name }))} />
        </Field>
        <Field label="Location" className="sm:col-span-2">
          <Input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Street, area, town" />
        </Field>
        <Field label="Use">
          <Select value={f.useGroup} onChange={(e) => set("useGroup", e.target.value)} options={USE_GROUPS.map((u) => ({ value: u.id, label: u.label }))} />
        </Field>
        <Field label="Development stage">
          <Select value={f.stage} onChange={(e) => set("stage", e.target.value as EnforcementCase["stage"])} options={["foundation", "lintel", "roofing", "completed", "occupied"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
        </Field>
        <Field label="Description of contravention" className="sm:col-span-2">
          <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Building on drainage setback without approved plan" />
        </Field>
        <label className="flex items-center gap-2.5 text-[13.5px] text-ink-2 sm:col-span-2">
          <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={f.serve} onChange={(e) => set("serve", e.target.checked)} />
          Serve Notice of Contravention now
        </label>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!f.owner.trim() || !f.location.trim() || !f.description.trim()}
          onClick={() => {
            const id = create({ zoneId: f.zoneId!, owner: f.owner, location: f.location, description: f.description, useGroup: f.useGroup, stage: f.stage });
            if (f.serve) serve(id, "contravention");
            onClose();
            router.push(`/enforcement/${id}`);
          }}
        >
          Open case
        </Button>
      </div>
    </Modal>
  );
}
