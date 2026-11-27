"use client";

import { Download, Receipt, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { GroupedBars, Legend } from "@/components/charts";
import { Badge, Button, Card, CardHeader, PageHeader, Select, Table, Td, Th } from "@/components/ui";
import { PeriodPicker, Stat } from "@/components/widgets";
import { FEE_HEADS, SERIES } from "@/lib/catalog";
import { downloadCsv } from "@/lib/csv";
import { fdate, naira, nairaCompact, pct, sum } from "@/lib/format";
import { useData, usePeriod, useScope } from "@/lib/hooks";
import { monthsIn, periodOf, inRange } from "@/lib/periods";
import { isHQ } from "@/lib/rbac";
import { metrics } from "@/lib/selectors";
import { useMe, useZoneMap } from "@/lib/store";
import type { FeeHead } from "@/lib/types";

const GROUPS: { key: string; name: string; heads: FeeHead[] }[] = [
  { key: "building", name: "Building & layout", heads: ["basic", "fencing", "layout"] },
  { key: "certs", name: "Certificates", heads: ["fitness", "stage"] },
  { key: "charges", name: "Admin & charges", heads: ["tp_admin", "idc", "spatial"] },
  { key: "enforce", name: "Penal & enforcement", heads: ["penal", "petition", "unsealing"] },
];

export default function RevenuePage() {
  const me = useMe()!;
  const data = useData();
  const scope = useScope();
  const zones = useZoneMap();
  const { kind, setKind, offset, setOffset, period, prev, today } = usePeriod("month");
  const [zone, setZone] = useState("all");
  const [limit, setLimit] = useState(50);
  const z = useMemo(() => (zone === "all" ? scope : [zone]), [zone, scope]);

  const m = useMemo(() => metrics(data, z, period), [data, z, period]);
  const pm = useMemo(() => metrics(data, z, prev), [data, z, prev]);
  const monthly = useMemo(
    () =>
      monthsIn({ from: new Date(today.getFullYear(), 0, 1), to: today }).map((mm) => {
        const mt = metrics(data, z, periodOf("month", mm));
        return { label: format(mm, "MMM"), ...Object.fromEntries(GROUPS.map((g) => [g.key, sum(g.heads.map((h) => mt.byHead[h]))])) };
      }),
    [data, z, today],
  );
  const ledger = useMemo(
    () => data.payments.filter((p) => (!z || z.includes(p.zoneId)) && inRange(p.paidAt, period)).sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
    [data.payments, z, period],
  );
  const bySource = (s: string) => sum(ledger.filter((p) => p.source === s).map((p) => p.amount));
  const appName = useMemo(() => Object.fromEntries(data.applications.map((a) => [a.id, a])), [data.applications]);

  return (
    <div className="rise">
      <PageHeader
        title="Revenue"
        sub="Every naira collected, counted on payment date"
        right={
          <>
            {isHQ(me) && <Select className="w-44 rounded-full" value={zone} onChange={(e) => setZone(e.target.value)} options={[{ value: "all", label: "All zones" }, ...data.zones.map((x) => ({ value: x.id, label: x.name }))]} />}
            <PeriodPicker kind={kind} setKind={setKind} offset={offset} setOffset={setOffset} label={period.label} />
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total collected" value={nairaCompact(m.revenue)} cur={m.revenue} prev={pm.revenue} hint="vs prev." icon={<Wallet className="size-4" />} />
        <Stat label="From applications" value={nairaCompact(bySource("application"))} hint={`${ledger.filter((p) => p.source === "application").length} payments`} icon={<Receipt className="size-4" />} />
        <Stat label="Penal fees" value={nairaCompact(m.penal)} cur={m.penal} prev={pm.penal} hint="non-compliance" />
        <Stat label="Petitions & unsealing" value={nairaCompact(bySource("petition") + bySource("enforcement"))} hint="enforcement revenue" />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader title={`Monthly revenue mix, ${today.getFullYear()}`} sub="Stacked by fee group" right={<Legend items={GROUPS.map((g, i) => ({ label: g.name, color: SERIES[i] }))} />} />
          <div className="px-3 pt-3 pb-4">
            <GroupedBars data={monthly} x="label" keys={GROUPS.map((g) => ({ key: g.key, name: g.name }))} fmt={nairaCompact} stacked height={280} />
          </div>
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader title="By fee head" sub={period.label} />
          <div className="px-5 pt-3 pb-4">
            {FEE_HEADS.map((f) => {
              const v = m.byHead[f.id];
              const share = m.revenue ? v / m.revenue : 0;
              return (
                <div key={f.id} className="flex items-center gap-3 py-1.5 text-[13px]">
                  <span className="w-36 shrink-0 truncate text-ink-2">{f.short}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${share * 100}%` }} />
                  </div>
                  <span className="w-16 text-right font-semibold tnum">{nairaCompact(v)}</span>
                  <span className="w-10 text-right text-[12px] text-ink-3 tnum">{pct(share)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Payment ledger"
          sub={`${ledger.length} payments · ${naira(sum(ledger.map((p) => p.amount)))}`}
          right={
            <Button size="sm" onClick={() => downloadCsv(`revenue-${period.key}.csv`, ["Date", "Receipt", "Zone", "Source", "Reference", "Channel", ...FEE_HEADS.map((f) => f.short), "Total"], ledger.map((p) => [fdate(p.paidAt), p.receiptNo, zones[p.zoneId]?.name, p.source, appName[p.refId]?.regNo ?? p.refId, p.channel, ...FEE_HEADS.map((f) => sum(p.lines.filter((l) => l.head === f.id).map((l) => l.amount))), p.amount]))}>
              <Download className="size-3.5" /> CSV
            </Button>
          }
        />
        <Table className="mt-4">
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Receipt</Th>
              {isHQ(me) && <Th>Zone</Th>}
              <Th>Source</Th>
              <Th>Reference</Th>
              <Th>Channel</Th>
              <Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {ledger.slice(0, limit).map((p) => {
              const a = appName[p.refId];
              return (
                <tr key={p.id} className="hover:bg-surface-2/60">
                  <Td className="whitespace-nowrap text-ink-2">{fdate(p.paidAt)}</Td>
                  <Td className="font-mono text-[12px]">{p.receiptNo}</Td>
                  {isHQ(me) && <Td className="text-ink-2">{zones[p.zoneId]?.name}</Td>}
                  <Td>
                    <Badge tone={p.source === "application" ? "brand" : p.source === "petition" ? "info" : "warning"}>{p.source}</Badge>
                  </Td>
                  <Td>{a ? <Link href={`/applications/${a.id}`} className="font-medium hover:text-brand">{a.regNo} · {a.applicant}</Link> : <span className="text-ink-3">{p.lines.map((l) => l.head).join(", ")}</span>}</Td>
                  <Td className="text-ink-2 uppercase">{p.channel}</Td>
                  <Td className="text-right font-semibold tnum">{naira(p.amount)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {ledger.length > limit && (
          <div className="p-3 text-center">
            <Button variant="ghost" onClick={() => setLimit((l) => l + 100)}>
              Show more ({ledger.length - limit})
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
