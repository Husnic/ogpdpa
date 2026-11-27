"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Tone } from "@/lib/catalog";
import { cx } from "@/lib/format";

/* ── Surfaces ─────────────────────────────────────────────────────── */

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cx("rounded-[var(--radius-card)] border border-line bg-surface", className)} {...p} />;
}

export function CardHeader({ title, sub, right, className }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold tracking-tight text-ink">{title}</h3>
        {sub && <p className="mt-0.5 text-[12.5px] text-ink-3">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, right, eyebrow }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[12px] font-semibold text-brand">{eyebrow}</div>}
        <h1 className="text-[30px] leading-tight font-bold tracking-[-0.02em] text-ink">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-ink-2">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

/* ── Buttons ──────────────────────────────────────────────────────── */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";
const btnVariant: Record<BtnVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong shadow-[0_1px_2px_rgba(15,107,59,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]",
  secondary: "bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-3/70 hover:text-ink",
  danger: "bg-surface text-crit ring-1 ring-inset ring-line-strong hover:bg-crit-soft",
  dark: "bg-ink text-white hover:bg-ink/85",
};
const btnSize = { sm: "h-8 px-3 text-[12.5px]", md: "h-10 px-4 text-[13.5px]" };
const btnBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function Button({ variant = "secondary", size = "md", className, type = "button", ...p }: ComponentProps<"button"> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return <button type={type} className={cx(btnBase, btnSize[size], btnVariant[variant], className)} {...p} />;
}
export function LinkButton({ href, variant = "secondary", size = "md", className, children }: { href: string; variant?: BtnVariant; size?: "sm" | "md"; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cx(btnBase, btnSize[size], btnVariant[variant], className)}>
      {children}
    </Link>
  );
}
export function IconButton({ className, ...p }: ComponentProps<"button">) {
  return <button type="button" className={cx("grid size-10 place-items-center rounded-full bg-surface text-ink-2 ring-1 ring-inset ring-line transition-colors hover:bg-surface-2 hover:text-ink", className)} {...p} />;
}

/* ── Status ───────────────────────────────────────────────────────── */

const tones: Record<Tone, string> = {
  neutral: "bg-surface-3 text-ink-2",
  info: "bg-info-soft text-info",
  brand: "bg-brand-soft text-brand-strong",
  good: "bg-good-soft text-good",
  warning: "bg-warn-soft text-warn",
  critical: "bg-crit-soft text-crit",
};
export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ── Form controls ────────────────────────────────────────────────── */

export const inputCls =
  "h-10 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[13.5px] text-ink placeholder:text-ink-3 transition-shadow focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:bg-surface-2 disabled:text-ink-3";
export function Input(p: ComponentProps<"input">) {
  return <input {...p} className={cx(inputCls, p.className)} />;
}
export function Select({ options, className, ...p }: ComponentProps<"select"> & { options: { value: string; label: string }[] }) {
  return (
    <select {...p} className={cx(inputCls, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2398a09b%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_12px_center] bg-no-repeat pr-9", className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
export function Textarea(p: ComponentProps<"textarea">) {
  return <textarea {...p} className={cx(inputCls, "h-auto min-h-24 py-2.5", p.className)} />;
}
export function Checkbox({ label, ...p }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink-2">
      <input type="checkbox" className="size-4 rounded accent-[var(--brand)]" {...p} />
      {label}
    </label>
  );
}
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11.5px] text-ink-3">{hint}</span>}
    </label>
  );
}

/* ── Navigation-ish ───────────────────────────────────────────────── */

export function Segmented<T extends string>({ value, onChange, options, size = "md" }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; size?: "sm" | "md" }) {
  return (
    <div className="inline-flex rounded-full bg-surface p-1 ring-1 ring-inset ring-line" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-full font-semibold whitespace-nowrap transition-all",
            size === "sm" ? "px-3 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]",
            value === o.value ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(23,138,79,0.7)]" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((t) => {
        const on = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cx("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors", on ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(23,138,79,0.7)]" : "text-ink-2 hover:bg-brand-tint hover:text-brand-strong")}
          >
            {t.label}
            {t.count !== undefined && <span className={cx("rounded-full px-1.5 text-[11px] tnum", on ? "bg-white/15 text-white" : "bg-surface-3 text-ink-3")}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx("rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors", active ? "text-white" : "bg-surface text-ink-2 ring-1 ring-inset ring-line hover:ring-line-strong")}
      style={active ? { background: color ?? "var(--brand)" } : undefined}
    >
      {children}
    </button>
  );
}

/* ── Overlays ─────────────────────────────────────────────────────── */

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  // Portal to <body>: ancestors with transforms (page enter animation) would otherwise trap position:fixed.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 p-4 pt-[8vh] backdrop-blur-[3px]" onMouseDown={onClose}>
      <div role="dialog" aria-modal className={cx("rise w-full rounded-[24px] bg-surface shadow-2xl", wide ? "max-w-3xl" : "max-w-lg")} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-6 pt-2 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Empty({ title, sub, icon }: { title: string; sub?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && <div className="text-ink-3">{icon}</div>}
      <p className="text-sm font-semibold text-ink-2">{title}</p>
      {sub && <p className="max-w-sm text-[12.5px] text-ink-3">{sub}</p>}
    </div>
  );
}

/* ── Tables ───────────────────────────────────────────────────────── */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-[13.5px]">{children}</table>
    </div>
  );
}
export function Th({ children, className, onClick, active, dir }: { children?: ReactNode; className?: string; onClick?: () => void; active?: boolean; dir?: "asc" | "desc" }) {
  return (
    <th
      onClick={onClick}
      className={cx(
        "sticky top-0 z-[1] border-y border-line bg-surface-2 px-4 py-2.5 text-left text-[12px] font-semibold whitespace-nowrap text-ink-3 first:pl-5 last:pr-5",
        onClick && "cursor-pointer select-none hover:text-ink-2",
        active && "text-ink",
        className,
      )}
    >
      {children}
      {active && <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>}
    </th>
  );
}
export function Td({ children, className, ...p }: ComponentProps<"td">) {
  return (
    <td className={cx("border-b border-line px-4 py-3 align-middle first:pl-5 last:pr-5", className)} {...p}>
      {children}
    </td>
  );
}

/* ── Misc ─────────────────────────────────────────────────────────── */

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return <span className={cx("grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-strong text-[12px] font-bold text-white", className)}>{initials}</span>;
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-line">
      {items.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4 py-2.5 text-[13.5px]">
          <dt className="text-ink-3">{k}</dt>
          <dd className="text-right font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
