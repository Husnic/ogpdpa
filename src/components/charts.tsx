"use client";

/* Chart kit. One measure per axis, categorical colours in fixed order (SERIES),
   dark tooltip chips, recessive dashed grid, pill-shaped bars. */

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { SERIES } from "@/lib/catalog";
import { cx } from "@/lib/format";

type Fmt = (n: number) => string;
type Row = Record<string, unknown>;

const AXIS = { stroke: "transparent", tickLine: false, tick: { fontSize: 12, fill: "var(--ink-3)" } } as const;
const Grid = () => <CartesianGrid vertical={false} stroke="var(--line-strong)" strokeDasharray="4 6" />;
const ACTIVE_DOT = { r: 5.5, fill: "var(--ink)", stroke: "var(--surface)", strokeWidth: 2.5 };

/* ── Tooltip ──────────────────────────────────────────────────────── */

function TipChip({ title, rows }: { title?: ReactNode; rows: { color?: string; label: string; value: string }[] }) {
  return (
    <div className="min-w-32 rounded-xl bg-tip px-3 py-2 text-[12.5px] text-white shadow-xl">
      {title && <div className="mb-0.5 text-[11.5px] text-white/55">{title}</div>}
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-white/80">
            {rows.length > 1 && r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
            {rows.length > 1 ? r.label : null}
          </span>
          <span className="font-semibold tnum">
            {r.value}
            {rows.length === 1 && <span className="ml-1 font-normal text-white/70">{r.label.toLowerCase()}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

// Recharts passes a loosely-typed payload to custom tooltips.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TipProps = { active?: boolean; label?: ReactNode; payload?: readonly any[] };
function tooltip(fmt: Fmt, names?: Record<string, string>) {
  function ChartTooltip({ active, label, payload }: TipProps) {
    if (!active || !payload?.length) return null;
    return <TipChip title={label} rows={payload.map((x) => ({ color: x.color ?? x.payload?.fill, label: names?.[x.dataKey] ?? x.name, value: fmt(x.value) }))} />;
  }
  return ChartTooltip;
}

/* ── Legend ───────────────────────────────────────────────────────── */

export function Legend({ items, className }: { items: { label: string; color: string; dashed?: boolean }[]; className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-2", className)}>
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          {i.dashed ? <span className="w-3.5 border-t-2 border-dashed" style={{ borderColor: i.color }} /> : <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />}
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* ── Area trend ───────────────────────────────────────────────────── */

export function TrendArea({
  data,
  x,
  y,
  fmt,
  name,
  height = 240,
  color = SERIES[0],
  compare,
  compareName = "Previous",
}: {
  data: Row[];
  x: string;
  y: string;
  fmt: Fmt;
  name: string;
  height?: number;
  color?: string;
  compare?: string;
  compareName?: string;
}) {
  const id = `fill-${y}-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Grid />
        <XAxis dataKey={x} {...AXIS} dy={8} interval="preserveStartEnd" minTickGap={16} />
        <YAxis {...AXIS} width={56} tickFormatter={fmt} />
        <Tooltip content={tooltip(fmt, { [y]: name, ...(compare ? { [compare]: compareName } : {}) })} cursor={{ stroke: "var(--line-strong)", strokeDasharray: "4 4" }} />
        {compare && <Area type="monotone" dataKey={compare} stroke="var(--ink-3)" strokeDasharray="5 5" strokeWidth={1.75} fill="none" dot={false} activeDot={false} />}
        <Area type="monotone" dataKey={y} stroke={color} strokeWidth={2.75} fill={`url(#${id})`} dot={false} activeDot={ACTIVE_DOT} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Vertical bars ────────────────────────────────────────────────── */

export function GroupedBars({ data, x, keys, fmt, height = 240, stacked }: { data: Row[]; x: string; keys: { key: string; name: string; color?: string }[]; fmt: Fmt; height?: number; stacked?: boolean }) {
  const single = keys.length === 1;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barGap={4} barCategoryGap={single ? "28%" : "24%"}>
        <Grid />
        <XAxis dataKey={x} {...AXIS} dy={8} interval="preserveStartEnd" minTickGap={8} />
        <YAxis {...AXIS} width={40} tickFormatter={fmt} allowDecimals={false} />
        <Tooltip content={tooltip(fmt, Object.fromEntries(keys.map((k) => [k.key, k.name])))} cursor={{ fill: "var(--surface-2)", radius: 10 }} />
        {keys.map((k, i) => (
          <Bar
            key={k.key}
            dataKey={k.key}
            name={k.name}
            fill={k.color ?? SERIES[i]}
            stackId={stacked ? "s" : undefined}
            radius={stacked ? (i === keys.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]) : [99, 99, 99, 99]}
            stroke={stacked ? "var(--surface)" : undefined}
            strokeWidth={stacked ? 2 : 0}
            maxBarSize={single ? 30 : 14}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Horizontal ranked bars ───────────────────────────────────────── */

export function RankBars({
  data,
  fmt,
  height,
  highlight,
  onClick,
  color = SERIES[0],
  labelWidth = 120,
}: {
  data: { id: string; label: string; value: number }[];
  fmt: Fmt;
  height?: number;
  highlight?: string | null;
  onClick?: (id: string) => void;
  color?: string;
  labelWidth?: number;
}) {
  const h = height ?? Math.max(150, data.length * 30 + 16);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 64, left: 0, bottom: 4 }} barCategoryGap={7}>
        <XAxis type="number" dataKey="value" hide />
        <YAxis type="category" dataKey="label" {...AXIS} width={labelWidth} tick={{ fontSize: 12.5, fill: "var(--ink-2)" }} />
        <Tooltip content={tooltip(fmt)} cursor={{ fill: "var(--surface-2)", radius: 8 }} />
        <Bar
          dataKey="value"
          name="Value"
          radius={[99, 99, 99, 99]}
          maxBarSize={14}
          background={{ fill: "var(--surface-2)", radius: 99 }}
          // Recharts hands back the bar's data entry; shape differs across versions.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(d: any) => {
            const id = d?.id ?? d?.payload?.id;
            if (id) onClick?.(id);
          }}
          className={onClick ? "cursor-pointer" : undefined}
        >
          {data.map((d) => (
            <Cell key={d.id} fill={highlight && d.id === highlight ? "var(--bronze)" : color} fillOpacity={highlight && d.id !== highlight ? 0.4 : 1} />
          ))}
          <LabelList dataKey="value" position="right" offset={10} formatter={(v: unknown) => fmt(Number(v))} style={{ fontSize: 12, fontWeight: 600, fill: "var(--ink-2)" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Multi-line comparison ────────────────────────────────────────── */

export function Lines({ data, x, keys, fmt, height = 260 }: { data: Row[]; x: string; keys: { key: string; name: string; color: string; width?: number; dashed?: boolean }[]; fmt: Fmt; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <Grid />
        <XAxis dataKey={x} {...AXIS} dy={8} minTickGap={14} />
        <YAxis {...AXIS} width={56} tickFormatter={fmt} />
        <Tooltip content={tooltip(fmt, Object.fromEntries(keys.map((k) => [k.key, k.name])))} cursor={{ stroke: "var(--line-strong)", strokeDasharray: "4 4" }} />
        {keys.map((k) => (
          <Line key={k.key} type="monotone" dataKey={k.key} name={k.name} stroke={k.color} strokeWidth={k.width ?? 2.5} strokeDasharray={k.dashed ? "5 5" : undefined} dot={false} activeDot={k.dashed ? false : { ...ACTIVE_DOT, fill: k.color }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Bubble scatter (two measures + size) ─────────────────────────── */

export function Bubbles({
  data,
  xName,
  yName,
  fmtX,
  fmtY,
  height = 320,
  onClick,
  highlight,
  xRef,
}: {
  data: { id: string; label: string; x: number; y: number; z: number }[];
  xName: string;
  yName: string;
  fmtX: Fmt;
  fmtY: Fmt;
  height?: number;
  onClick?: (id: string) => void;
  highlight?: string | null;
  xRef?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 20, right: 28, left: 4, bottom: 14 }}>
        <CartesianGrid stroke="var(--line-strong)" strokeDasharray="4 6" />
        <XAxis type="number" dataKey="x" name={xName} {...AXIS} dy={6} tickFormatter={fmtX} domain={[0, "auto"]} label={{ value: xName, position: "insideBottomRight", offset: -10, fontSize: 11.5, fill: "var(--ink-3)" }} />
        <YAxis type="number" dataKey="y" name={yName} {...AXIS} width={60} tickFormatter={fmtY} />
        <ZAxis type="number" dataKey="z" range={[80, 600]} />
        {xRef !== undefined && <ReferenceLine x={xRef} stroke="var(--bronze)" strokeDasharray="5 4" label={{ value: "target", fontSize: 11, fill: "var(--bronze)", position: "top" }} />}
        <Tooltip
          cursor={{ strokeDasharray: "4 4" }}
          content={({ active, payload }: TipProps) =>
            active && payload?.[0] ? (
              <TipChip title={payload[0].payload.label} rows={[{ label: xName, value: fmtX(payload[0].payload.x), color: SERIES[0] }, { label: yName, value: fmtY(payload[0].payload.y), color: SERIES[0] }]} />
            ) : null
          }
        />
        <Scatter
          data={data}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(d: any) => d?.payload?.id && onClick?.(d.payload.id)}
          className="cursor-pointer"
        >
          {data.map((d) => (
            <Cell key={d.id} fill={d.id === highlight ? "var(--bronze)" : SERIES[0]} fillOpacity={highlight && d.id !== highlight ? 0.3 : 0.8} stroke="var(--surface)" strokeWidth={2} />
          ))}
          <LabelList dataKey="label" position="top" offset={8} style={{ fontSize: 11.5, fontWeight: 600, fill: "var(--ink-2)" }} />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/* ── Small pieces ─────────────────────────────────────────────────── */

export function Spark({ values, color = SERIES[0] }: { values: number[]; color?: string }) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 3, right: 0, left: 0, bottom: 2 }}>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.08} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Stage/proportion meter with pill tracks. */
export function Meter({ rows, fmt }: { rows: { label: string; value: number; color?: string; hint?: string }[]; fmt: Fmt }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
            <span className="text-ink-2">{r.label}</span>
            <span className="font-bold text-ink tnum">
              {fmt(r.value)}
              {r.hint && <span className="ml-1.5 text-[12px] font-normal text-ink-3">{r.hint}</span>}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? SERIES[0] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Half-donut gauge (e.g. % within processing target). */
export function Gauge({ value, label, color = SERIES[0] }: { value: number; label: string; color?: string }) {
  const v = Math.max(0, Math.min(1, value));
  const r = 80;
  const c = Math.PI * r;
  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 200 112" className="w-full">
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--surface-3)" strokeWidth={26} strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth={26} strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} style={{ transition: "stroke-dasharray .8s ease" }} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-[30px] leading-none font-bold tracking-tight tnum">{Math.round(v * 100)}%</div>
        <div className="mt-1 text-[12.5px] text-ink-2">{label}</div>
      </div>
    </div>
  );
}
