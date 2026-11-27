"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { periodOf } from "@/lib/periods";
import { can } from "@/lib/rbac";
import { dueDate } from "@/lib/selectors";
import { useMe, useStore, useToday } from "@/lib/store";
import { Badge } from "./ui";

interface Item {
  key: string;
  title: string;
  meta: string;
  href: string;
  tag: string;
  tone: "info" | "warning" | "critical" | "brand" | "good" | "neutral";
}

export function WorkQueue() {
  const me = useMe()!;
  const apps = useStore((s) => s.applications);
  const cases = useStore((s) => s.cases);
  const petitions = useStore((s) => s.petitions);
  const assignments = useStore((s) => s.assignments);
  const reports = useStore((s) => s.reports);
  const today = useToday();

  const items = useMemo(() => {
    const z = me.zoneId;
    const out: Item[] = [];
    const za = apps.filter((a) => a.zoneId === z);
    const age = (s: string) => differenceInCalendarDays(today, parseISO(s));
    const add = (status: string, title: string, tag: string, tone: Item["tone"]) =>
      za
        .filter((a) => a.status === status)
        .sort((a, b) => a.history[a.history.length - 1].at.localeCompare(b.history[b.history.length - 1].at))
        .slice(0, 4)
        .forEach((a) => out.push({ key: a.id + status, title: `${title}: ${a.applicant}`, meta: `${a.regNo ?? a.location} · ${age(a.history[a.history.length - 1].at)}d waiting`, href: `/applications/${a.id}`, tag, tone }));

    if (can(me, "app.approve")) add("recommended", "Approve", "Approval", "brand");
    if (can(me, "app.recommend")) add("registered", "Inspect & recommend", "Recommend", "info");
    if (can(me, "app.assess")) {
      add("okayed", "Assess fees", "Assess", "info");
      add("received", "Desk check", "Okay", "neutral");
    }
    if (me.role === "CLERICAL") {
      za.filter((a) => a.status === "assessed")
        .slice(0, 5)
        .forEach((a) => {
          const lapsed = a.assessment && parseISO(a.assessment.expiresAt) < today;
          out.push({ key: a.id, title: `Collect payment: ${a.applicant}`, meta: lapsed ? "Assessment lapsed — refer for re-assessment" : `Expires ${a.assessment?.expiresAt.slice(0, 10)}`, href: `/applications/${a.id}`, tag: lapsed ? "Lapsed" : "Payment", tone: lapsed ? "critical" : "warning" });
        });
      add("received", "Complete intake", "Intake", "neutral");
    }
    if (can(me, "enf.create")) {
      cases
        .filter((c) => c.zoneId === z && c.outcome === "open")
        .map((c) => ({ c, n: c.notices[c.notices.length - 1] }))
        .filter(({ n }) => n && n.complied === undefined && parseISO(n.deadline) < today)
        .slice(0, 4)
        .forEach(({ c, n }) => out.push({ key: c.id, title: `Notice deadline passed: ${c.owner}`, meta: `${c.caseNo} · ${n.type.replace("_", " ")} due ${n.deadline.slice(0, 10)}`, href: `/enforcement/${c.id}`, tag: "Escalate", tone: "critical" }));
    }
    if (can(me, "pet.treat"))
      petitions
        .filter((p) => p.zoneId === z && p.status !== "treated" && (me.role === "ZTPO" || p.assignedTo === me.id))
        .slice(0, 3)
        .forEach((p) => out.push({ key: p.id, title: `Petition: ${p.subject}`, meta: `${p.petitionNo} · ${age(p.receivedAt)}d open`, href: `/petitions/${p.id}`, tag: "Petition", tone: "warning" }));
    assignments
      .filter((a) => a.assignedTo === me.id && a.status !== "done")
      .slice(0, 3)
      .forEach((a) => out.push({ key: a.id, title: a.title, meta: `Due ${a.due.slice(0, 10)}`, href: "/assignments", tag: "Assignment", tone: "info" }));
    if (can(me, "report.submit") || can(me, "report.draft")) {
      for (const [kind, pk] of [["weekly", "week"], ["monthly", "month"]] as const) {
        const last = periodOf(pk, today);
        const prevKey = periodOf(pk, new Date(last.from.getTime() - 86400000)).key;
        const r = reports.find((x) => x.id === `${kind}:${z}:${prevKey}`);
        if (!r || r.status === "draft" || r.status === "returned")
          out.push({
            key: kind,
            title: `${kind === "weekly" ? "Weekly" : "Monthly"} report ${prevKey} ${r?.status === "returned" ? "returned by HQ" : "not yet submitted"}`,
            meta: `Due ${dueDate(kind, prevKey).toDateString()}`,
            href: `/reports/${kind}?zone=${z}&p=${prevKey}`,
            tag: "Report",
            tone: r?.status === "returned" ? "critical" : "warning",
          });
      }
    }
    return out;
  }, [me, apps, cases, petitions, assignments, reports, today]);

  if (!items.length) return <p className="px-5 py-8 text-center text-xs text-ink-3">Queue clear. Nice work.</p>;
  return (
    <ul className="divide-y divide-line/70 px-5 pb-3">
      {items.slice(0, 10).map((i) => (
        <li key={i.key}>
          <Link href={i.href} className="group flex items-center gap-3 py-2.5">
            <Badge tone={i.tone} className="w-20 justify-center">
              {i.tag}
            </Badge>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-ink">{i.title}</span>
              <span className="block truncate text-[11px] text-ink-3">{i.meta}</span>
            </span>
            <ArrowRight className="size-3.5 text-ink-3 group-hover:text-ink" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

