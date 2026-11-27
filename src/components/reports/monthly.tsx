"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import { buildMonthly } from "@/lib/reports";
import { naira } from "@/lib/format";
import { H, Letterhead, Narrative, Para, Sheet, Signatory } from "./doc";
import { NoticeTable, PerformanceTable, PetitionTable, PlanTable, RecordingTable, RevenueTable, TrackingTable, UseMatrix } from "./shared-tables";
import type { ReportViewProps } from "./types";

export function MonthlyReport({ data, z, period, office, narrative, editable, onNarrative, signatory, zone }: ReportViewProps) {
  const r = useMemo(() => buildMonthly(data, z, period), [data, z, period]);
  const label = format(period.from, "MMMM, yyyy");
  const m = r.m;
  const zoneCol = z === null ? (a: { zoneId: string }) => data.zones.find((x) => x.id === a.zoneId)?.name ?? "" : undefined;

  return (
    <Sheet>
      <Letterhead title={`Monthly Report (${label})`} lines={[<b key="o">{office}</b>, "Submitted to: Department of Research and Records"]} />

      <H n="1.0">Analysis of plans processed for {label}</H>
      <Para>
        A total of {m.received} application{m.received === 1 ? " was" : "s were"} received, {m.okayed} okayed, {m.assessed} assessed and {m.registered} registered in {label}. {m.approved} application
        {m.approved === 1 ? "" : "s"} ({m.simpleApproved} simple, {m.specialApproved} special) completed the conditions of approval; {m.pending} remain pending at month end.
      </Para>
      <PlanTable plan={r.plan} buckets={r.buckets} caption={`Table 1: Analysis of plans processed for ${label}`} />

      <H>Analysis of statutory notices served</H>
      <Para>
        A total of {m.notices} statutory notice{m.notices === 1 ? " was" : "s were"} served during the month and {m.sanctions} sanction{m.sanctions === 1 ? " was" : "s were"} carried out.
      </Para>
      <NoticeTable notices={r.notices} buckets={r.buckets} caption={`Table 2: Statutory notices served for ${label}`} />

      <H n="2.1">Petitions and disputes resolution</H>
      <Para>{m.petitionsReceived ? `${m.petitionsReceived} petition(s) were received and ${m.petitionsTreated} treated in ${label}.` : `No petition was officially received for the month of ${label}.`}</Para>
      <PetitionTable rows={r.petitions} buckets={r.buckets} caption={`Table 3: Analysis of petitions treated for ${label}`} />

      <H n="2.2">Revenue generated</H>
      <Para>Total revenue for the month is {naira(r.revenue.grand)}.</Para>
      <RevenueTable rev={r.revenue} buckets={r.buckets} caption={`Table 4: Revenue generated for ${label}`} />

      <div className="page-break" />
      <UseMatrix uses={r.uses} caption={`Table 5: Type of use (approvals, ${period.from.getFullYear()} to date)`} />
      <TrackingTable apps={r.tracking} caption={`Table 6: 7-days tracking chart for ${label} (${office})`} target={data.settings.processingTargetDays} zoneCol={zoneCol} />
      <PerformanceTable apps={r.paid} caption={`Table 7: Monthly revenue performance report (${label})`} />
      <RecordingTable rec={r.recording} caption={`Table 8: Data recording for ${zone?.name ?? "all"} zonal planning office${zone ? "" : "s"} for ${label}`} />

      <H>Remarks</H>
      <Narrative editable={editable} value={narrative.remarks} onChange={(v) => onNarrative("remarks", v)} placeholder="Observations, challenges and anything HQ should note for the month" />
      <Signatory {...signatory} />
    </Sheet>
  );
}
