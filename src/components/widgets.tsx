"use client";

import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cx, delta, pct } from "@/lib/format";
import type { PeriodKind } from "@/lib/periods";
import { Spark } from "./charts";
import { Segmented } from "./ui";

/** KPI tile: label, big number, change vs previous period, optional sparkline. */
export function Stat({
  label,
  value,
  cur,
  prev,
  spark,
  hint,
  invert,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  cur?: number;
  prev?: number;
  spark?: number[];
  hint?: ReactNode;
  invert?: boolean; // lower is better
  icon?: ReactNode;
  className?: string;
}) {
  const ch = cur !== undefined && prev !== undefined ? delta(cur, prev) : null;
  const showDelta = ch !== null && Number.isFinite(ch);
  const good = showDelta ? (invert ? ch! <= 0 : ch! >= 0) : null;
  return (
    <div className={cx("flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        {icon && <span className="grid size-9 place-items-center rounded-full bg-brand-soft text-brand">{icon}</span>}
      </div>
      <div className="mt-2 text-[28px] leading-none font-bold tracking-[-0.02em] text-ink tnum">{value}</div>
      <div className="mt-2.5 flex items-center gap-2 text-[12px]">
        {showDelta && (
          <span className={cx("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold", good ? "bg-good-soft text-good" : "bg-crit-soft text-crit")}>
            {ch! >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {pct(Math.abs(ch!))}
          </span>
        )}
        {hint && <span className="truncate text-ink-3">{hint}</span>}
      </div>
      {spark && spark.length > 1 && (
        <div className="-mx-1 mt-auto pt-2">
          <Spark values={spark} />
        </div>
      )}
    </div>
  );
}

const PERIOD_NAMES: Record<PeriodKind, string> = { week: "Week", month: "Month", quarter: "Quarter", year: "Year" };

/** Period granularity + previous/next stepping. */
export function PeriodPicker({
  kind,
  setKind,
  label,
  offset,
  setOffset,
  kinds = ["week", "month", "quarter", "year"],
}: {
  kind: PeriodKind;
  setKind: (k: PeriodKind) => void;
  label: string;
  offset: number;
  setOffset: (n: number) => void;
  kinds?: PeriodKind[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented value={kind} onChange={setKind} options={kinds.map((k) => ({ value: k, label: PERIOD_NAMES[k] }))} />
      <div className="flex h-10 items-center rounded-full bg-surface ring-1 ring-inset ring-line">
        <button type="button" className="grid size-10 place-items-center rounded-full text-ink-3 hover:text-ink" onClick={() => setOffset(offset + 1)} aria-label="Previous period">
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-28 text-center text-[13.5px] font-semibold text-ink">{label}</span>
        <button type="button" className="grid size-10 place-items-center rounded-full text-ink-3 hover:text-ink disabled:opacity-30" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 1))} aria-label="Next period">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Compact KPI for module index pages. `accent` fills the card with the primary colour. */
export function MiniStat({ label, value, icon, accent, hint, onClick, active }: { label: string; value: ReactNode; icon: ReactNode; accent?: boolean; hint?: ReactNode; onClick?: () => void; active?: boolean }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx(
        "flex items-center gap-3.5 rounded-[var(--radius-card)] border p-4 text-left transition-all",
        accent ? "border-transparent bg-gradient-to-br from-brand to-brand-strong text-white shadow-[0_12px_28px_-14px_rgba(15,107,59,0.8)]" : "border-line bg-surface",
        onClick && !accent && "hover:border-brand/40",
        active && !accent && "border-brand ring-2 ring-brand/15",
      )}
    >
      <span className={cx("grid size-11 shrink-0 place-items-center rounded-full", accent ? "bg-white/15 text-white" : "bg-brand-soft text-brand")}>{icon}</span>
      <span className="min-w-0">
        <span className={cx("block text-[24px] leading-none font-bold tracking-[-0.02em] tnum", accent ? "text-white" : "text-ink")}>{value}</span>
        <span className={cx("mt-1 block truncate text-[12.5px] font-medium", accent ? "text-white/75" : "text-ink-2")}>
          {label}
          {hint && <span className={accent ? "text-white/60" : "text-ink-3"}> · {hint}</span>}
        </span>
      </span>
    </Tag>
  );
}

/** Primary-coloured headline card: scope name, one big figure, change and a white sparkline. */
export function HeroCard({ eyebrow, title, sub, label, value, change, spark, footer, right }: { eyebrow: string; title: string; sub?: ReactNode; label: string; value: string; change?: number | null; spark?: number[]; footer?: ReactNode; right?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[#1b9a59] via-brand to-brand-strong p-5 text-white shadow-[0_18px_40px_-20px_rgba(15,107,59,0.9)]">
      <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full bg-black/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-white/70">{eyebrow}</div>
          <div className="text-[22px] leading-tight font-bold tracking-tight">{title}</div>
          {sub && <div className="mt-1 text-[12.5px] text-white/70">{sub}</div>}
        </div>
        {right}
      </div>
      <div className="relative mt-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-[12.5px] text-white/75">{label}</div>
          <div className="text-[38px] leading-none font-bold tracking-[-0.02em] tnum">{value}</div>
          {change !== undefined && change !== null && Number.isFinite(change) && (
            <span className="mt-2 inline-flex items-center gap-0.5 rounded-full bg-white/15 px-2 py-0.5 text-[12px] font-bold">
              {change >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {pct(Math.abs(change))} vs previous
            </span>
          )}
        </div>
        {spark && spark.length > 1 && (
          <div className="w-40 shrink-0">
            <Spark values={spark} color="#ffffff" />
          </div>
        )}
      </div>
      {footer && <div className="relative mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-white/15 pt-3 text-[12.5px] text-white/80">{footer}</div>}
    </div>
  );
}
