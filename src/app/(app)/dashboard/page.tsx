"use client";

import { AlertTriangle, ArrowRight, Building2, Clock3, FileCheck2, Gavel, Inbox, MapPin, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { GroupedBars, Legend, Meter, RankBars, TrendArea } from "@/components/charts";
import { Card, CardHeader, Chip, LinkButton, PageHeader, Segmented } from "@/components/ui";
import { HeroCard, PeriodPicker, Stat } from "@/components/widgets";
import { WorkQueue } from "@/components/work-queue";
import { ZoneMap } from "@/components/zone-map";
import { FEE_HEADS, NOTICE_TYPES, ROLE_META, SERIES } from "@/lib/catalog";
import { avg, fdt, nairaCompact, num } from "@/lib/format";
import { useData, usePeriod } from "@/lib/hooks";
import { monthsIn, periodOf, type Range } from "@/lib/periods";
import { isHQ } from "@/lib/rbac";
import { dueDate, metrics, series, zoneRows, type Bucket } from "@/lib/selectors";
import { useMe, useStaffMap, useStore } from "@/lib/store";

type MapMetric = "revenue" | "approved" | "avgProcessing" | "notices";
const MAP_METRICS: { value: MapMetric; label: string; fmt: (n: number) => string }[] = [
  { value: "revenue", label: "Revenue", fmt: nairaCompact },
  { value: "approved", label: "Approvals", fmt: num },
  { value: "avgProcessing", label: "Avg. processing days", fmt: (n) => n.toFixed(1) },
  { value: "notices", label: "Notices served", fmt: num },
];

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default function DashboardPage() {
  const me = useMe()!;
  const data = useData();
  const hq = isHQ(me);
  const { kind, setKind, offset, setOffset, period, prev, today } = usePeriod("quarter");
  const [selected, setSelected] = useState<string | null>(null);
  const [mapMetric, setMapMetric] = useState<MapMetric>("revenue");
  const staffMap = useStaffMap();
  const audit = useStore((s) => s.audit);

  const focus = hq ? selected : me.zoneId;
  const scope = useMemo(() => (focus ? [focus] : null), [focus]);
  const zone = data.zones.find((z) => z.id === focus);

  const rows = useMemo(() => zoneRows(data, period, prev, today), [data, period, prev, today]);
  const m = useMemo(() => metrics(data, scope, period), [data, scope, period]);
  const pm = useMemo(() => metrics(data, scope, prev), [data, scope, prev]);

  const months: Bucket[] = useMemo(() => {
    const yr: Range = { from: new Date(today.getFullYear(), 0, 1), to: today };
    return monthsIn(yr).map((mm) => {
      const p = periodOf("month", mm);
      return { label: format(mm, "MMM"), range: { ...p, to: p.to > today ? today : p.to } };
    });
  }, [today]);
  const trend = useMemo(() => {
    const own = series(data, scope, months);
    const all = focus ? series(data, null, months) : null;
    return own.map((r, i) => ({ ...r, stateAvg: all ? all[i].revenue / data.zones.length : undefined }));
  }, [data, scope, months, focus]);

  const mapValues = useMemo(() => Object.fromEntries(rows.map((r) => [r.zone.id, r.m[mapMetric] as number])), [rows, mapMetric]);
  const mm = MAP_METRICS.find((x) => x.value === mapMetric)!;
  const rank = (key: (r: (typeof rows)[number]) => number, asc = false) => {
    if (!focus) return null;
    const sorted = [...rows].sort((a, b) => (asc ? key(a) - key(b) : key(b) - key(a)));
    return sorted.findIndex((r) => r.zone.id === focus) + 1;
  };

  const ztpo = data.staff.find((s) => s.zoneId === focus && s.role === "ZTPO");
  const zoneStaff = data.staff.filter((s) => s.zoneId === focus && s.status === "active").length;
  const heads = FEE_HEADS.map((f) => ({ id: f.id, label: f.short, value: m.byHead[f.id] })).sort((a, b) => b.value - a.value);
  const topHeads = [...heads.slice(0, 6), { id: "other", label: "Other heads", value: heads.slice(6).reduce((a, h) => a + h.value, 0) }].filter((h) => h.value > 0);
  const notices = NOTICE_TYPES.map((n) => ({ id: n.id, label: n.short, value: m.noticesByType[n.id] })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);

  const scopeLabel = focus ? `${zone?.name} Zonal Planning Office` : `All ${data.zones.length} zonal planning offices`;
  const spark = (k: keyof (typeof trend)[number]) => trend.map((t) => Number(t[k]) || 0);

  return (
    <div className="rise">
      <PageHeader
        eyebrow={hq ? "Headquarters overview" : `${zone?.name} Zonal Planning Office`}
        title={`${greet()}, ${me.firstName}`}
        sub={
          <>
            {hq ? (focus ? `Viewing ${zone?.name} ZPO` : "State-wide view across all zones") : ROLE_META[me.role].label} · {period.label}
            {period.to < (periodOf(kind, today).to) && offset === 0 ? " to date" : ""}
          </>
        }
        right={<PeriodPicker kind={kind} setKind={setKind} offset={offset} setOffset={setOffset} label={period.label} />}
      />

      <div className="grid gap-5 xl:grid-cols-12">
        {/* MAP */}
        <Card className="overflow-hidden xl:col-span-7">
          <CardHeader
            title={hq ? "Ogun State planning zones" : "Your zone on the state map"}
            sub={hq ? "Tap a zone to see its summary. Tint shows the selected measure for this period." : `${zone?.lgas.join(" · ")} LGA${(zone?.lgas.length ?? 0) > 1 ? "s" : ""}`}
            right={hq && <Segmented size="sm" value={mapMetric} onChange={setMapMetric} options={MAP_METRICS.map((x) => ({ value: x.value, label: x.label.replace("Avg. processing days", "Speed") }))} />}
          />
          <div className="p-4 pt-3">
            <ZoneMap mode={hq ? "hq" : "zone"} selected={selected} onSelect={setSelected} ownZone={me.zoneId ?? undefined} values={hq ? mapValues : undefined} format={mm.fmt} metricLabel={mm.label} />
            {!hq && zone && (
              <div className="mt-4">
                <div className="mb-2 text-[12.5px] font-semibold text-ink-2">Towns covered</div>
                <div className="flex flex-wrap gap-1.5">
                  {zone.towns.split(",").map((t) => (
                    <span key={t} className="rounded-full bg-brand-tint px-3 py-1 text-[12.5px] font-medium text-brand-strong ring-1 ring-inset ring-brand/15">
                      {t.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {hq && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip active={!selected} onClick={() => setSelected(null)} color="var(--brand)">All zones</Chip>
                {data.zones.map((z) => (
                  <Chip key={z.id} active={selected === z.id} onClick={() => setSelected(selected === z.id ? null : z.id)} color="var(--brand)">{z.name}</Chip>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* SUMMARY */}
        <div className="flex flex-col gap-4 xl:col-span-5">
          <HeroCard
            eyebrow={focus ? `${zone?.code} · ${zone?.lgas.join(", ")}` : "Ogun State · all zonal offices"}
            title={focus ? `${zone?.name} ZPO` : "All zones"}
            sub={
              focus ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {zone?.address}
                </span>
              ) : (
                `${data.zones.reduce((a, z) => a + z.lgas.length, 0)} LGAs · ${data.staff.filter((s) => s.zoneId && s.status === "active").length} zonal officers`
              )
            }
            label={`Revenue collected · ${period.label}`}
            value={nairaCompact(m.revenue)}
            change={pm.revenue ? (m.revenue - pm.revenue) / pm.revenue : null}
            spark={spark("revenue")}
            right={
              hq &&
              focus && (
                <div className="flex flex-col items-end gap-1.5 text-[11.5px] font-bold">
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5">#{rank((r) => r.m.revenue)} revenue</span>
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5">#{rank((r) => r.m.avgProcessing || 99, true)} speed</span>
                </div>
              )
            }
            footer={
              focus ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" /> {zoneStaff} officers
                  </span>
                  {ztpo && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="size-3.5" /> ZTPO: {ztpo.title} {ztpo.firstName} {ztpo.lastName}
                    </span>
                  )}
                </>
              ) : undefined
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Permits approved" value={num(m.approved)} cur={m.approved} prev={pm.approved} hint={`${num(m.received)} received`} spark={spark("approved")} icon={<FileCheck2 className="size-4" />} />
            <Stat
              label="Avg. processing"
              value={
                <>
                  {m.avgProcessing.toFixed(1)}
                  <span className="ml-1 text-sm text-ink-3">days</span>
                </>
              }
              cur={m.avgProcessing}
              prev={pm.avgProcessing}
              invert
              hint={`${Math.round(m.withinTarget * 100)}% within ${data.settings.processingTargetDays}d`}
              icon={<Clock3 className="size-4" />}
            />
            <Stat label="Pending / backlog" value={`${m.pending} / ${m.backlog}`} hint={`backlog > ${data.settings.backlogDays} days`} icon={<Inbox className="size-4" />} />
            <Stat label="Notices served" value={num(m.notices)} cur={m.notices} prev={pm.notices} hint={`${m.sanctions} sanctions`} icon={<Gavel className="size-4" />} />
            <Stat label="Petitions outstanding" value={num(m.petitionsOutstanding)} hint={`${m.petitionsReceived} in · ${m.petitionsTreated} treated`} icon={<AlertTriangle className="size-4" />} />
            <Stat label="Open enforcement cases" value={num(m.openCases)} hint="awaiting compliance or sanction" icon={<ShieldAlert className="size-4" />} />
          </div>
          {hq && (
            <div className="flex gap-2">
              {focus && <LinkButton href={`/zones/${focus}`}>Zone profile <ArrowRight className="size-3.5" /></LinkButton>}
              <LinkButton href="/performance" variant="ghost">
                Compare all zones <ArrowRight className="size-3.5" />
              </LinkButton>
            </div>
          )}
        </div>

        {/* TRENDS */}
        <Card className="xl:col-span-8">
          <CardHeader
            title={`Revenue, ${today.getFullYear()} to date`}
            sub={scopeLabel}
            right={<Legend items={[{ label: focus ? zone!.name : "All zones", color: SERIES[0] }, ...(focus ? [{ label: "Average zone", color: "var(--ink-3)", dashed: true }] : [])]} />}
          />
          <div className="px-3 pt-2 pb-3">
            <TrendArea data={trend} x="label" y="revenue" name="Revenue" fmt={nairaCompact} compare={focus ? "stateAvg" : undefined} compareName="Average zone" height={240} />
          </div>
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader title="Received vs approved" sub="Building plan applications per month" right={<Legend items={[{ label: "Received", color: SERIES[1] }, { label: "Approved", color: SERIES[0] }]} />} />
          <div className="px-3 pt-2 pb-3">
            <GroupedBars data={trend} x="label" keys={[{ key: "received", name: "Received", color: SERIES[1] }, { key: "approved", name: "Approved", color: SERIES[0] }]} fmt={num} height={240} />
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader title="Revenue by fee head" sub={period.label} />
          <div className="px-3 pt-1 pb-3">{topHeads.length ? <RankBars data={topHeads} fmt={nairaCompact} /> : <p className="p-6 text-center text-xs text-ink-3">No payments this period.</p>}</div>
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader title="Application pipeline" sub="Movements this period" />
          <div className="px-5 pt-4 pb-5">
            <Meter
              fmt={num}
              rows={[
                { label: "Received", value: m.received, color: "var(--brand)" },
                { label: "Okayed", value: m.okayed, color: "var(--brand)" },
                { label: "Assessed", value: m.assessed, color: "var(--brand)" },
                { label: "Registered (paid)", value: m.registered, color: "var(--brand)" },
                { label: "Approved", value: m.approved, color: "var(--bronze)", hint: `${m.simpleApproved} simple · ${m.specialApproved} special` },
              ]}
            />
          </div>
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader title="Statutory notices served" sub={`${m.notices} notices · ${m.sanctions} sanctions`} />
          <div className="px-3 pt-1 pb-3">{notices.length ? <RankBars data={notices} fmt={num} color={SERIES[5]} /> : <p className="p-6 text-center text-xs text-ink-3">No notices this period.</p>}</div>
        </Card>

        {hq ? (
          <>
            <Card className="xl:col-span-6">
              <CardHeader title="Zones by revenue" sub={`${period.label} · tap a bar to focus the map`} right={<LinkButton href="/performance" variant="ghost">League table</LinkButton>} />
              <div className="px-3 pb-3">
                <RankBars data={[...rows].sort((a, b) => b.m.revenue - a.m.revenue).map((r) => ({ id: r.zone.id, label: r.zone.name, value: r.m.revenue }))} fmt={nairaCompact} highlight={selected} onClick={(id) => setSelected(id)} />
              </div>
            </Card>
            <Card className="xl:col-span-6">
              <CardHeader title="Needs attention" sub="Across zones, right now" />
              <Attention rows={rows} data={data} today={today} />
            </Card>
          </>
        ) : (
          <>
            <Card className="xl:col-span-7">
              <CardHeader title="Your work queue" sub="Items waiting on you or your office" />
              <WorkQueue />
            </Card>
            <Card className="xl:col-span-5">
              <CardHeader title="Recent activity" sub="Your zone" />
              <ul className="divide-y divide-line/70 px-5 pb-3">
                {audit
                  .filter((a) => a.zoneId === me.zoneId)
                  .slice(0, 9)
                  .map((a) => (
                    <li key={a.id} className="py-2.5 text-[12.5px]">
                      <span className="font-medium text-ink">{staffMap[a.by]?.firstName ?? "System"}</span> <span className="text-ink-2">{a.action}</span>
                      {a.detail && <span className="text-ink-3"> · {a.detail}</span>}
                      <div className="text-[11px] text-ink-3">{fdt(a.at)}</div>
                    </li>
                  ))}
              </ul>
            </Card>
          </>
        )}
      </div>
      <p className="mt-6 text-[11px] text-ink-3">
        Figures assemble from logged records. Revenue is counted on payment date; approvals on approval date. Avg zone processing: {avg(rows.map((r) => r.m.avgProcessing)).toFixed(1)} days.
      </p>
    </div>
  );
}


function Attention({ rows, data, today }: { rows: ReturnType<typeof zoneRows>; data: ReturnType<typeof useData>; today: Date }) {
  const awaiting = data.reports.filter((r) => r.status === "submitted").length;
  const overdue = data.reports.filter((r) => !r.submittedAt && dueDate(r.kind, r.periodKey) < today);
  const items: { tone: "critical" | "warning" | "info"; text: string; href: string }[] = [];
  if (awaiting) items.push({ tone: "info", text: `${awaiting} zonal reports submitted and awaiting HQ review`, href: "/reports" });
  const byZone = new Map<string, number>();
  overdue.forEach((r) => byZone.set(r.zoneId, (byZone.get(r.zoneId) ?? 0) + 1));
  [...byZone.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([z, n]) => items.push({ tone: "critical", text: `${data.zones.find((x) => x.id === z)?.name}: ${n} overdue report${n > 1 ? "s" : ""} not submitted`, href: "/reports" }));
  [...rows]
    .filter((r) => r.m.backlog > 0)
    .sort((a, b) => b.m.backlog - a.m.backlog)
    .slice(0, 3)
    .forEach((r) => items.push({ tone: "warning", text: `${r.zone.name}: ${r.m.backlog} registered applications past ${data.settings.backlogDays}-day backlog line`, href: `/applications?zone=${r.zone.id}&view=backlog` }));
  [...rows]
    .filter((r) => r.m.avgProcessing > data.settings.processingTargetDays)
    .forEach((r) => items.push({ tone: "warning", text: `${r.zone.name}: average processing ${r.m.avgProcessing.toFixed(1)} days (target ${data.settings.processingTargetDays})`, href: "/performance" }));
  const expired = rows.reduce((a, r) => a + r.m.expiredAssessments, 0);
  if (expired) items.push({ tone: "info", text: `${expired} assessments have lapsed unpaid across zones`, href: "/applications?view=expired" });
  return (
    <ul className="divide-y divide-line/70 px-5 pb-3">
      {items.slice(0, 8).map((i, k) => (
        <li key={k}>
          <Link href={i.href} className="flex items-center gap-3 py-2.5 text-[12.5px] text-ink-2 hover:text-ink">
            <span className={`size-2 shrink-0 rounded-full ${i.tone === "critical" ? "bg-crit" : i.tone === "warning" ? "bg-warn" : "bg-info"}`} />
            <span className="flex-1">{i.text}</span>
            <ArrowRight className="size-3.5 text-ink-3" />
          </Link>
        </li>
      ))}
      {!items.length && <li className="py-6 text-center text-xs text-ink-3">Nothing needs attention right now.</li>}
    </ul>
  );
}

