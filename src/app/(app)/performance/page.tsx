"use client";

import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Bubbles, Legend, Lines, RankBars } from "@/components/charts";
import { Button, Card, CardHeader, PageHeader, Segmented, Table, Td, Th } from "@/components/ui";
import { PeriodPicker } from "@/components/widgets";
import { Forbidden } from "@/components/guard";
import { SEQ, SERIES } from "@/lib/catalog";
import { cx, delta, nairaCompact, num, pct, sum } from "@/lib/format";
import { useData, usePeriod } from "@/lib/hooks";
import { monthsIn, periodOf } from "@/lib/periods";
import { can } from "@/lib/rbac";
import { metrics, zoneRows, type ZoneRow } from "@/lib/selectors";
import { useMe } from "@/lib/store";
import { downloadCsv } from "@/lib/csv";

type Col = { key: string; label: string; get: (r: ZoneRow) => number; fmt: (n: number) => string; better: "high" | "low" };
const COLS: Col[] = [
  { key: "revenue", label: "Revenue", get: (r) => r.m.revenue, fmt: nairaCompact, better: "high" },
  { key: "approved", label: "Approved", get: (r) => r.m.approved, fmt: num, better: "high" },
  { key: "received", label: "Received", get: (r) => r.m.received, fmt: num, better: "high" },
  { key: "rate", label: "Approval rate", get: (r) => (r.m.received ? r.m.approved / r.m.received : 0), fmt: (n) => pct(n), better: "high" },
  { key: "speed", label: "Avg days", get: (r) => r.m.avgProcessing, fmt: (n) => n.toFixed(1), better: "low" },
  { key: "target", label: "≤ 7 days", get: (r) => r.m.withinTarget, fmt: (n) => pct(n), better: "high" },
  { key: "backlog", label: "Backlog", get: (r) => r.m.backlog, fmt: num, better: "low" },
  { key: "notices", label: "Notices", get: (r) => r.m.notices, fmt: num, better: "high" },
  { key: "petitions", label: "Petitions open", get: (r) => r.m.petitionsOutstanding, fmt: num, better: "low" },
  { key: "perOfficer", label: "₦ / officer", get: (r) => r.revenuePerOfficer, fmt: nairaCompact, better: "high" },
  { key: "reports", label: "Reports on time", get: (r) => r.reportsOnTime, fmt: (n) => pct(n), better: "high" },
];

export default function PerformancePage() {
  const me = useMe();
  const data = useData();
  const router = useRouter();
  const { kind, setKind, offset, setOffset, period, prev, today } = usePeriod("quarter");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "revenue", dir: "desc" });
  const [pick, setPick] = useState<string[]>(["atn", "ifo", "odo"]);
  const [heat, setHeat] = useState<"approved" | "revenue" | "notices">("approved");
  const [hl, setHl] = useState<string | null>(null);

  const rows = useMemo(() => zoneRows(data, period, prev, today), [data, period, prev, today]);
  const months = useMemo(() => monthsIn({ from: new Date(today.getFullYear(), 0, 1), to: today }), [today]);
  const monthly = useMemo(() => {
    const per: Record<string, ReturnType<typeof metrics>[]> = {};
    for (const z of data.zones) per[z.id] = months.map((m) => metrics(data, [z.id], periodOf("month", m)));
    return per;
  }, [data, months]);

  if (!can(me, "performance.view")) return <Forbidden />;

  const col = COLS.find((c) => c.key === sort.key)!;
  const sorted = [...rows].sort((a, b) => (sort.dir === "desc" ? col.get(b) - col.get(a) : col.get(a) - col.get(b)));
  const extremes = Object.fromEntries(
    COLS.map((c) => {
      const vs = rows.map(c.get);
      return [c.key, { best: c.better === "high" ? Math.max(...vs) : Math.min(...vs), worst: c.better === "high" ? Math.min(...vs) : Math.max(...vs) }];
    }),
  );

  const lineData = months.map((m, i) => {
    const row: Record<string, unknown> = { label: format(m, "MMM") };
    pick.forEach((z) => (row[z] = monthly[z][i].revenue));
    row.avg = sum(data.zones.map((z) => monthly[z.id][i].revenue)) / data.zones.length;
    return row;
  });
  const heatVals = data.zones.map((z) => monthly[z.id].map((m) => m[heat]));
  const heatMax = Math.max(1, ...heatVals.flat());
  const totals = metrics(data, null, period);

  const exportCsv = () =>
    downloadCsv(
      `zone-performance-${period.key}.csv`,
      ["Zone", ...COLS.map((c) => c.label)],
      sorted.map((r) => [r.zone.name, ...COLS.map((c) => c.fmt(c.get(r)))]),
    );

  return (
    <div className="rise">
      <PageHeader
        eyebrow="Headquarters"
        title="Zone performance"
        sub={`Comparative view of all ${data.zones.length} zonal planning offices · ${period.label}`}
        right={
          <>
            <PeriodPicker kind={kind} setKind={setKind} offset={offset} setOffset={setOffset} label={period.label} />
            <Button onClick={exportCsv}>
              <Download className="size-4" /> CSV
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["State revenue", nairaCompact(totals.revenue)],
          ["Permits approved", num(totals.approved)],
          ["Avg. processing", `${totals.avgProcessing.toFixed(1)} days`],
          ["Top zone", sorted[0]?.zone.name ?? "—"],
        ].map(([l, v]) => (
          <Card key={l} className="px-5 py-4">
            <div className="text-[12px] text-ink-2">{l}</div>
            <div className="mt-1 text-[22px] font-bold tracking-tight tnum">{v}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-5">
        <CardHeader title="League table" sub="Click a column to rank. Best value per column in green, weakest in red. Δ compares the same elapsed span of the previous period." />
        <Table className="mt-3 max-h-[560px]">
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Zone</Th>
              {COLS.map((c) => (
                <Th key={c.key} className="text-right" active={sort.key === c.key} dir={sort.dir} onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === "desc" ? "asc" : "desc" }))}>
                  {c.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.zone.id} className="cursor-pointer hover:bg-surface-2/60" onClick={() => router.push(`/zones/${r.zone.id}`)} onMouseEnter={() => setHl(r.zone.id)} onMouseLeave={() => setHl(null)}>
                <Td className="text-ink-3 tnum">{i + 1}</Td>
                <Td className="font-medium whitespace-nowrap">{r.zone.name}</Td>
                {COLS.map((c) => {
                  const v = c.get(r);
                  const ex = extremes[c.key];
                  const d = c.key === "revenue" ? delta(r.m.revenue, r.prev.revenue) : null;
                  return (
                    <Td key={c.key} className={cx("text-right whitespace-nowrap tnum", v === ex.best && "font-semibold text-good", v === ex.worst && ex.best !== ex.worst && "text-crit")}>
                      {c.fmt(v)}
                      {d !== null && Number.isFinite(d) && <span className={cx("ml-1.5 text-[11px]", d >= 0 ? "text-good" : "text-crit")}>{d >= 0 ? "▲" : "▼"}{Math.abs(Math.round(d * 100))}%</span>}
                    </Td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader title="Revenue vs speed" sub="Each bubble is a zone · size = permits approved · dashed line = 7-day target" />
          <div className="px-2 pb-3">
            <Bubbles
              data={rows.map((r) => ({ id: r.zone.id, label: r.zone.name, x: +r.m.avgProcessing.toFixed(1), y: r.m.revenue, z: r.m.approved }))}
              xName="Avg processing days"
              yName="Revenue"
              fmtX={(n) => `${n}d`}
              fmtY={nairaCompact}
              highlight={hl}
              xRef={data.settings.processingTargetDays}
              onClick={(id) => router.push(`/zones/${id}`)}
              height={340}
            />
          </div>
        </Card>
        <Card className="xl:col-span-5">
          <CardHeader title="Report submission discipline" sub="Share of weekly, monthly and quarterly reports filed on time (last 120 days)" />
          <div className="px-3 pb-3">
            <RankBars data={[...rows].sort((a, b) => b.reportsOnTime - a.reportsOnTime).map((r) => ({ id: r.zone.id, label: r.zone.name, value: Math.round(r.reportsOnTime * 100) }))} fmt={(n) => `${n}%`} highlight={hl} color={SERIES[1]} />
          </div>
        </Card>

        <Card className="xl:col-span-12">
          <CardHeader
            title="Monthly revenue — compare zones"
            sub="Pick up to three zones; dashed line is the average zone"
            right={<Legend items={[...pick.map((z, i) => ({ label: data.zones.find((x) => x.id === z)!.name, color: SERIES[i] })), { label: "Average zone", color: "var(--ink-3)", dashed: true }]} />}
          />
          <div className="flex flex-wrap gap-1.5 px-5 pt-3">
            {data.zones.map((z) => {
              const on = pick.includes(z.id);
              return (
                <button
                  key={z.id}
                  onClick={() => setPick((p) => (on ? p.filter((x) => x !== z.id) : p.length >= 3 ? [...p.slice(1), z.id] : [...p, z.id]))}
                  className={cx("rounded-full border px-2.5 py-1 text-[11.5px] font-medium", on ? "border-transparent text-white" : "border-line text-ink-2 hover:border-line-strong")}
                  style={on ? { background: SERIES[pick.indexOf(z.id)] } : undefined}
                >
                  {z.name}
                </button>
              );
            })}
          </div>
          <div className="px-3 pt-2 pb-3">
            <Lines data={lineData} x="label" fmt={nairaCompact} keys={[...pick.map((z, i) => ({ key: z, name: data.zones.find((x) => x.id === z)!.name, color: SERIES[i] })), { key: "avg", name: "Average zone", color: "var(--ink-3)", dashed: true, width: 1.5 }]} height={280} />
          </div>
        </Card>

        <Card className="xl:col-span-12">
          <CardHeader
            title="Activity heatmap"
            sub="Zones × months, darker = more"
            right={<Segmented size="sm" value={heat} onChange={setHeat} options={[{ value: "approved", label: "Approvals" }, { value: "revenue", label: "Revenue" }, { value: "notices", label: "Notices" }]} />}
          />
          <div className="overflow-x-auto px-5 pt-3 pb-5">
            <table className="w-full border-separate border-spacing-[3px] text-[11.5px]">
              <thead>
                <tr>
                  <th />
                  {months.map((m) => (
                    <th key={m.toISOString()} className="pb-1 font-medium text-ink-3">
                      {format(m, "MMM")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.zones.map((z, zi) => (
                  <tr key={z.id}>
                    <td className="pr-3 whitespace-nowrap text-ink-2">{z.name}</td>
                    {heatVals[zi].map((v, mi) => {
                      const t = v / heatMax;
                      const c = SEQ[Math.min(SEQ.length - 1, Math.round(t * (SEQ.length - 1)))];
                      return (
                        <td key={mi} title={`${z.name} · ${format(months[mi], "MMM")}: ${heat === "revenue" ? nairaCompact(v) : v}`} className="h-8 min-w-12 rounded-md text-center tnum" style={{ background: c, color: t > 0.55 ? "#fff" : "var(--ink-2)" }}>
                          {heat === "revenue" ? nairaCompact(v).replace("₦", "") : v || ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
