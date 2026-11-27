"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import { FEE_HEADS, NOTICE_TYPES, SERIES } from "@/lib/catalog";
import { naira, nairaCompact, num } from "@/lib/format";
import { QUARTER_ORDINAL } from "@/lib/periods";
import { buildQuarterly } from "@/lib/reports";
import { GroupedBars, Legend } from "../charts";
import { Caption, H, Letterhead, Narrative, Para, RTable, Sheet, Signatory } from "./doc";
import { NoticeTable, PetitionTable, PlanTable, RecordingTable, RevenueTable, TrackingTable, UseMatrix } from "./shared-tables";
import type { ReportViewProps } from "./types";

export function QuarterlyReport({ data, z, period, office, narrative, editable, onNarrative, signatory, zone }: ReportViewProps) {
  const r = useMemo(() => buildQuarterly(data, z, period), [data, z, period]);
  const q = Math.floor(period.from.getMonth() / 3);
  const range = `${format(period.from, "MMMM yyyy")} – ${format(period.to, "MMMM yyyy")}`;
  const m = r.m;
  const monthNames = r.buckets.map((b) => b.label);
  const zoneCol = z === null ? (a: { zoneId: string }) => data.zones.find((x) => x.id === a.zoneId)?.name ?? "" : undefined;

  // chart data: one row per status / notice / head, one series per month (≤ 3 → validated slots)
  const planChart = r.plan.filter((p) => !["revalidated", "renovation"].includes(p.key)).map((p) => ({ label: p.label.replace("Plan ", ""), ...Object.fromEntries(monthNames.map((mn, i) => [mn, p.cells[i]])) }));
  const noticeChart = r.notices.notices.filter((n) => n.total > 0).map((n) => ({ label: n.short, ...Object.fromEntries(monthNames.map((mn, i) => [mn, n.cells[i]])) }));
  const revChart = r.revenue.rows.filter((x) => x.total > 0).map((x) => ({ label: FEE_HEADS.find((f) => f.id === x.key)?.short ?? x.label, ...Object.fromEntries(monthNames.map((mn, i) => [mn, x.cells[i]])) }));
  const keys = monthNames.map((mn, i) => ({ key: mn, name: mn, color: SERIES[i] }));
  const legend = <Legend className="mb-2" items={keys.map((k) => ({ label: k.name, color: k.color }))} />;
  const groupedUses = r.uses.groups.filter((g) => g.total > 0);

  return (
    <Sheet>
      <Letterhead
        title={`${QUARTER_ORDINAL[q]} Quarterly Report`}
        lines={[<b key="o">{office}</b>, `From ${range}`, "Submitted to Ogun State Planning & Development Permit Authority (OGPDPA)"]}
      />

      <H n="1.0">Introduction</H>
      {zone ? (
        <Para>
          {zone.name} Zonal Planning Office was established in {zone.established} to effectively control physical developments within {zone.lgas.join(" and ")} Local Government Area{zone.lgas.length > 1 ? "s" : ""}. The area of jurisdiction covers {zone.towns}. The office
          operates from {zone.address}.
        </Para>
      ) : (
        <Para>This consolidated report covers all {data.zones.length} zonal planning offices of the Authority for the quarter.</Para>
      )}
      <Narrative editable={editable} value={narrative.intro} onChange={(v) => onNarrative("intro", v)} placeholder="Optional: additional context for the quarter" rows={2} optional />

      <H n="2.0">Staff strength, nominal roll and schedule of activities</H>
      <Para>Presently, there {r.staff.length === 1 ? "is 1 officer" : `are ${r.staff.length} officers`} in post.</Para>
      <RTable
        compact
        head={["S/N", "Name", "Designated post", "GL", "Schedule of activities"]}
        rows={r.staff.slice(0, zone ? 50 : 30).map((s, i) => [
          String(i + 1),
          `${s.title} ${s.firstName} ${s.lastName}`.toUpperCase(),
          `${s.post}${s.designation ? ` (${s.designation})` : ""}`,
          String(s.gradeLevel).padStart(2, "0"),
          <ul key="d" className="list-disc pl-4 text-left">
            {s.duties.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>,
        ])}
      />

      <H n="3.0">Activities carried out for the quarter ({range})</H>
      <H n="3.1">Analysis of plans processed</H>
      <Para>
        The total number of applications received from {range} is {m.received}. {m.approved} applications were granted approval ({m.simpleApproved} simple, {m.specialApproved} special); {m.pending} remain pending at quarter end.
      </Para>
      <PlanTable plan={r.plan} buckets={r.buckets} caption={`Table 2: Analysis of plans processed, ${range}`} />
      <div className="avoid-break mb-6">
        {legend}
        <GroupedBars data={planChart} x="label" keys={keys} fmt={num} height={220} />
        <Caption>Fig. 1: Plans processed, {range}</Caption>
      </div>

      <H n="3.2">Analysis of statutory notices served</H>
      <Para>
        The total number of statutory notices served is {m.notices}:{" "}
        {NOTICE_TYPES.filter((n) => m.noticesByType[n.id] > 0)
          .map((n) => `${m.noticesByType[n.id]} ${n.short}`)
          .join(", ") || "none"}
        . {m.sanctionsByType.token_demolition} token demolition(s) and {m.sanctionsByType.sealing} sealing(s) were carried out.
      </Para>
      <NoticeTable notices={r.notices} buckets={r.buckets} caption={`Table 3: Statutory notices served, ${range}`} />
      {noticeChart.length > 0 && (
        <div className="avoid-break mb-6">
          {legend}
          <GroupedBars data={noticeChart} x="label" keys={keys} fmt={num} height={220} />
          <Caption>Fig. 2: Statutory notices served, {range}</Caption>
        </div>
      )}

      <H n="3.3">Analysis of petitions treated</H>
      <PetitionTable rows={r.petitions} buckets={r.buckets} caption={`Table 4: Petitions, ${range}`} />

      <H n="3.4">Analysis of types of use</H>
      <Para>
        A total of {m.approved} applications were granted approval during the quarter
        {groupedUses.length ? `; year to date by use: ${groupedUses.map((g) => `${g.total} ${g.label.toLowerCase()}`).join(", ")}` : ""}.
      </Para>
      <div className="page-break" />
      <UseMatrix uses={r.uses} caption="Progress report summary sheet on approval by use" />

      <H n="3.5">Data recording</H>
      <RecordingTable rec={r.recording} caption={`Table 6: Data recording for ${zone?.name ?? "all zones"}, ${range}`} />

      <H n="4.0">7-days tracking chart for the quarter</H>
      <TrackingTable apps={r.tracking} caption={`Table 7: Permits granted, ${range}`} target={data.settings.processingTargetDays} zoneCol={zoneCol} />

      <H n="5.0">Breakdown analysis of revenue generated</H>
      <RevenueTable rev={r.revenue} buckets={r.buckets} caption={`Table 8a: Breakdown of revenue generated, ${range}`} />
      {revChart.length > 0 && (
        <div className="avoid-break mb-6">
          {legend}
          <GroupedBars data={revChart} x="label" keys={keys} fmt={nairaCompact} height={240} />
          <Caption>Fig. 3: Revenue breakdown by fee head, {range}</Caption>
        </div>
      )}
      <Caption>Table 8b: Total monthly revenue</Caption>
      <RTable head={["Month", "Total amount generated (₦)"]} rows={r.buckets.map((b, i) => [b.label, num(r.revenue.totals[i])])} foot={["Total", num(r.revenue.grand)]} />

      <H n="6.0">Achievements during the quarter</H>
      <ul className="mb-3 list-disc pl-5 text-[13px] text-ink-2">
        <li>
          Total revenue generated from {range} is <b className="text-ink">{naira(r.revenue.grand)}</b>.
        </li>
        <li>
          Total building plans approved: <b className="text-ink">{m.approved}</b>, average processing time {m.avgProcessing.toFixed(1)} days ({Math.round(m.withinTarget * 100)}% within {data.settings.processingTargetDays} days).
        </li>
      </ul>
      <Narrative editable={editable} value={narrative.achievements} onChange={(v) => onNarrative("achievements", v)} placeholder="Other achievements this quarter" rows={2} optional />

      <H n="7.0">Challenges and recommendations</H>
      <Narrative editable={editable} value={narrative.challenges} onChange={(v) => onNarrative("challenges", v)} placeholder="e.g. need for a driver for the monitoring vehicle; additional zonal officers…" rows={4} />
      <Signatory {...signatory} />
    </Sheet>
  );
}
