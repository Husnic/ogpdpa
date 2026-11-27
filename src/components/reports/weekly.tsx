"use client";

import { addDays, format } from "date-fns";
import { useMemo } from "react";
import { noticeLabel } from "@/lib/catalog";
import { fdate, num } from "@/lib/format";
import { lineTotal } from "@/lib/fees";
import { buildWeekly } from "@/lib/reports";
import { feeOf, describeUse } from "@/lib/selectors";
import { H, Letterhead, M, N, Narrative, RTable, Sheet, Signatory } from "./doc";
import type { ReportViewProps } from "./types";

export function WeeklyReport({ data, z, period, office, narrative, editable, onNarrative, signatory }: ReportViewProps) {
  const r = useMemo(() => buildWeekly(data, z, period), [data, z, period]);
  const range = `From ${format(period.from, "do MMMM")} to ${format(addDays(period.from, 4), "do MMMM, yyyy")}`;

  return (
    <div className="space-y-6">
      <Sheet>
        <Letterhead dept="PLANNING PERMIT DEPARTMENT" title="Weekly Progress Report" lines={[<b key="o">{office}</b>, range]} />
        <RTable
          head={["S/N", "Item", "Count / Amount"]}
          rows={[
            ["1", "Application registered", N(r.items.registered)],
            ["2", "Application approved", N(r.items.approved)],
            ["3", "Fence permit", N(r.items.fence)],
            ["4", "Petition received", N(r.items.petitionsReceived)],
            ["5", "Petition treated", N(r.items.petitionsTreated)],
            ["6", "Revenue generated (₦)", M(r.items.revenue)],
            ["7", "Penal fee generated (₦)", M(r.items.penal)],
          ]}
        />
        <RTable head={["8", "Notices served", ""]} rows={r.notices.map((n) => ["", n.label, N(n.count)])} />

        <H n="9.">Information on each illegal development served</H>
        {r.illegal.length ? (
          <RTable
            compact
            head={["S/N", "Owner / developer", "Location", "Contravention", "Notice(s) served"]}
            rows={r.illegal.map(({ c, served }, i) => [String(i + 1), c.owner, c.location, c.description, served.map((n) => noticeLabel(n.type)).join(", ")])}
          />
        ) : (
          <p className="mb-3 text-[13px]">NIL</p>
        )}

        <RTable
          head={["10", "Sanction carried out", ""]}
          rows={[
            ["", "Token demolition", N(r.sanctions.token)],
            ["", "Total demolition", N(r.sanctions.total)],
            ["", "Sealing", N(r.sanctions.sealing)],
          ]}
        />

        <H n="11.">Special assignment carried out</H>
        {r.special.length ? (
          <ul className="mb-3 list-disc pl-5 text-[13px] text-ink-2">
            {r.special.map((a) => (
              <li key={a.id}>
                <b className="text-ink">{a.title}</b> — {a.outcome}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-[13px]">NIL</p>
        )}
        <H n="12.">HC’s remark</H>
        <Narrative editable={editable} value={narrative.hcRemark} onChange={(v) => onNarrative("hcRemark", v)} placeholder="Head of zone’s remark for the week" />
        <H n="13.">Any other information</H>
        <Narrative editable={editable} value={narrative.other} onChange={(v) => onNarrative("other", v)} placeholder="Anything else HQ should know" />
        <Signatory {...signatory} />
      </Sheet>

      <Sheet>
        <div className="page-break" />
        <Letterhead title="Profile for Every Application" lines={[<b key="o">{office}</b>, `Week: ${format(period.from, "do MMMM")} – ${format(addDays(period.from, 4), "do MMMM yyyy")}`]} />
        {r.profile.length ? (
          <RTable
            compact
            head={["S/N", "Name of applicant", "Location", "Type of use", "Amount assessed (₦)", "Fence (₦)", "Telephone (applicant / consultant)", "Date assessed", "Expiry of assessment", "Remarks"]}
            rows={r.profile.map((a, i) => [
              String(i + 1),
              a.applicant,
              a.location,
              describeUse(a),
              a.assessment ? num(lineTotal(a.assessment.lines)) : "—",
              M(feeOf(a, "fencing")),
              `${a.phone} / ${a.consultantPhone || "—"}`,
              fdate(a.assessment?.assessedAt, "dd/MM/yyyy"),
              fdate(a.assessment?.expiresAt, "dd/MM/yyyy"),
              a.status === "assessed" ? "Awaiting payment" : a.regNo ? `Paid · ${a.regNo}` : a.status,
            ])}
          />
        ) : (
          <p className="text-[13px]">NIL — no application was assessed this week.</p>
        )}
        <Signatory {...signatory} />
      </Sheet>
    </div>
  );
}
