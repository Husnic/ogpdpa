"use client";

import { BadgeCheck, Download, FileStack, Hourglass, Plus, Search, Stamp } from "lucide-react";
import { MiniStat } from "@/components/widgets";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { differenceInCalendarDays, parseISO, startOfMonth } from "date-fns";
import { Badge, Button, Card, Empty, Input, LinkButton, PageHeader, Select, Table, Tabs, Td, Th } from "@/components/ui";
import { STATUS_META, USE_GROUPS, findUseGroup } from "@/lib/catalog";
import { downloadCsv } from "@/lib/csv";
import { fdate, naira } from "@/lib/format";
import { lineTotal } from "@/lib/fees";
import { useScope } from "@/lib/hooks";
import { can, isHQ } from "@/lib/rbac";
import { processingDays, describeUse } from "@/lib/selectors";
import { useMe, useStore, useToday, useZoneMap } from "@/lib/store";
import type { AppStatus } from "@/lib/types";

type View = "all" | "active" | "approved" | "backlog" | "expired" | "mine";

export default function Page() {
  return (
    <Suspense>
      <ApplicationsPage />
    </Suspense>
  );
}

function ApplicationsPage() {
  const me = useMe()!;
  const sp = useSearchParams();
  const router = useRouter();
  const apps = useStore((s) => s.applications);
  const settings = useStore((s) => s.settings);
  const zones = useZoneMap();
  const scope = useScope();
  const today = useToday();
  const [q, setQ] = useState("");
  const [zone, setZone] = useState(sp.get("zone") ?? "all");
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState<AppStatus | "all">("all");
  const [view, setView] = useState<View>((sp.get("view") as View) ?? "active");
  const [limit, setLimit] = useState(60);

  const base = useMemo(() => apps.filter((a) => !scope || scope.includes(a.zoneId)), [apps, scope]);
  const views: Record<View, (a: (typeof apps)[number]) => boolean> = {
    all: () => true,
    active: (a) => !["approved", "disapproved"].includes(a.status),
    approved: (a) => a.status === "approved",
    backlog: (a) => ["registered", "recommended"].includes(a.status) && !!a.registeredAt && differenceInCalendarDays(today, parseISO(a.registeredAt)) > settings.backlogDays,
    expired: (a) => a.status === "assessed" && !!a.assessment && parseISO(a.assessment.expiresAt) < today,
    mine: (a) => a.officerId === me.id || a.history.some((h) => h.by === me.id),
  };
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return base
      .filter(views[view])
      .filter((a) => zone === "all" || a.zoneId === zone)
      .filter((a) => group === "all" || a.useGroup === group)
      .filter((a) => status === "all" || a.status === status)
      .filter((a) => !s || [a.applicant, a.location, a.regNo, a.approvalNo, a.phone].some((x) => x?.toLowerCase().includes(s)))
      .sort((a, b) => b.history[b.history.length - 1].at.localeCompare(a.history[a.history.length - 1].at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, view, zone, group, status, q, today]);

  const hq = isHQ(me);
  const counts = Object.fromEntries((Object.keys(views) as View[]).map((v) => [v, base.filter(views[v]).length]));

  return (
    <div className="rise">
      <PageHeader
        eyebrow={hq ? "All zones" : zones[me.zoneId!]?.name}
        title="Applications"
        sub="Building plan permits from intake to approval"
        right={
          <>
            <Button
              onClick={() =>
                downloadCsv(
                  "applications.csv",
                  ["Applicant", "Zone", "Location", "Use", "Status", "Reg No", "Approval No", "Received", "Approved", "Assessed (₦)", "Processing days"],
                  list.map((a) => [a.applicant, zones[a.zoneId]?.name, a.location, describeUse(a), a.status, a.regNo ?? "", a.approvalNo ?? "", fdate(a.receivedAt), fdate(a.approvedAt), a.assessment ? lineTotal(a.assessment.lines) : "", processingDays(a) ?? ""]),
                )
              }
            >
              <Download className="size-4" /> CSV
            </Button>
            {can(me, "app.create") && (
              <LinkButton href="/applications/new" variant="primary">
                <Plus className="size-4" /> New application
              </LinkButton>
            )}
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat accent label="In progress" value={counts.active} icon={<FileStack className="size-5" />} onClick={() => setView("active")} />
        <MiniStat label="Awaiting approval" value={base.filter((a) => a.status === "recommended").length} icon={<Stamp className="size-5" />} onClick={() => (setView("active"), setStatus("recommended"))} active={status === "recommended"} />
        <MiniStat label="Backlog" value={counts.backlog} hint={`> ${settings.backlogDays} days`} icon={<Hourglass className="size-5" />} onClick={() => setView("backlog")} active={view === "backlog"} />
        <MiniStat label="Approved this month" value={base.filter((a) => a.approvedAt && parseISO(a.approvedAt) >= startOfMonth(today)).length} icon={<BadgeCheck className="size-5" />} onClick={() => setView("approved")} active={view === "approved"} />
      </div>
      <Card>
        <div className="overflow-x-auto px-5 py-4">
          <Tabs
            value={view}
            onChange={(v) => (setView(v), setLimit(60))}
            tabs={[
              { value: "active", label: "In progress", count: counts.active },
              { value: "approved", label: "Approved", count: counts.approved },
              { value: "backlog", label: "Backlog", count: counts.backlog },
              { value: "expired", label: "Lapsed assessments", count: counts.expired },
              { value: "mine", label: "Handled by me", count: counts.mine },
              { value: "all", label: "All", count: counts.all },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-3 left-3.5 size-4 text-ink-3" />
            <Input className="pl-10" placeholder="Search name, Reg No, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {hq && <Select className="w-auto min-w-40" value={zone} onChange={(e) => setZone(e.target.value)} options={[{ value: "all", label: "All zones" }, ...Object.values(zones).map((z) => ({ value: z.id, label: z.name }))]} />}
          <Select className="w-auto min-w-40" value={group} onChange={(e) => setGroup(e.target.value)} options={[{ value: "all", label: "All uses" }, ...USE_GROUPS.map((g) => ({ value: g.id, label: g.label }))]} />
          <Select className="w-auto min-w-36" value={status} onChange={(e) => setStatus(e.target.value as AppStatus)} options={[{ value: "all", label: "Any status" }, ...Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label }))]} />
          <span className="ml-auto text-[12.5px] text-ink-3 tnum">{list.length.toLocaleString()} result{list.length === 1 ? "" : "s"}</span>
        </div>
        {list.length === 0 ? (
          <Empty title="No applications match" sub="Adjust the filters or search." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Applicant</Th>
                {hq && <Th>Zone</Th>}
                <Th>Use</Th>
                <Th>Status</Th>
                <Th>Reg No</Th>
                <Th className="text-right">Assessed</Th>
                <Th>Received</Th>
                <Th className="text-right">Days</Th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, limit).map((a) => {
                const pd = processingDays(a);
                const open = a.registeredAt && !a.approvedAt ? differenceInCalendarDays(today, parseISO(a.registeredAt)) : null;
                const days = pd ?? open;
                return (
                  <tr key={a.id} className="cursor-pointer hover:bg-surface-2/60" onClick={() => router.push(`/applications/${a.id}`)}>
                    <Td>
                      <div className="font-medium text-ink">{a.applicant}</div>
                      <div className="max-w-72 truncate text-[11.5px] text-ink-3">{a.location}</div>
                    </Td>
                    {hq && <Td className="whitespace-nowrap text-ink-2">{zones[a.zoneId]?.name}</Td>}
                    <Td className="text-ink-2">
                      {describeUse(a)}
                      {findUseGroup(a.useGroup).special && <Badge className="ml-1.5" tone="neutral">special</Badge>}
                    </Td>
                    <Td>
                      <Badge tone={STATUS_META[a.status].tone} dot>
                        {STATUS_META[a.status].label}
                      </Badge>
                      {a.devStatus === "developed" && <Badge className="ml-1" tone="warning">non-compliance</Badge>}
                    </Td>
                    <Td className="font-mono text-[12px] whitespace-nowrap text-ink-2">{a.regNo ?? "—"}</Td>
                    <Td className="text-right whitespace-nowrap tnum">{a.assessment ? naira(lineTotal(a.assessment.lines)) : "—"}</Td>
                    <Td className="whitespace-nowrap text-ink-2">{fdate(a.receivedAt, "d MMM")}</Td>
                    <Td className={`text-right tnum ${days !== null && days > settings.processingTargetDays ? "font-semibold text-crit" : "text-ink-2"}`}>{days ?? "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {list.length > limit && (
          <div className="border-t border-line p-3 text-center">
            <Button variant="ghost" onClick={() => setLimit((l) => l + 100)}>
              Show more ({list.length - limit} remaining)
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
