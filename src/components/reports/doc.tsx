"use client";

/* Print-faithful building blocks for the official OGPDPA report layouts. */

import Image from "next/image";
import type { ReactNode } from "react";
import { cx, nil } from "@/lib/format";
import { Textarea } from "../ui";

export function Sheet({ children }: { children: ReactNode }) {
  return <article className="print-area mx-auto max-w-[920px] rounded-[var(--radius-card)] border border-line bg-white px-6 py-8 text-[13px] text-ink sm:px-12 sm:py-12">{children}</article>;
}

export function Letterhead({ dept, title, lines }: { dept?: string; title: string; lines: ReactNode[] }) {
  return (
    <header className="mb-8 text-center">
      <Image src="/brand/ogun-seal.png" alt="" width={56} height={56} className="mx-auto mb-3" />
      <div className="text-[15px] font-black tracking-wide">OGUN STATE PLANNING AND DEVELOPMENT PERMIT AUTHORITY</div>
      {dept && <div className="mt-0.5 text-[13px] font-bold">{dept}</div>}
      <div className="mt-2 text-[14px] font-bold text-brand-strong uppercase">{title}</div>
      {lines.map((l, i) => (
        <div key={i} className="mt-0.5 text-[12.5px] text-ink-2">
          {l}
        </div>
      ))}
    </header>
  );
}

export function H({ n, children }: { n?: string; children: ReactNode }) {
  return (
    <h3 className="avoid-break mt-8 mb-2 text-[14px] font-bold uppercase">
      {n && <span className="mr-2">{n}</span>}
      {children}
    </h3>
  );
}
export function Caption({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[12.5px] font-bold">{children}</p>;
}
export function Para({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[13px] leading-relaxed text-ink-2">{children}</p>;
}

type Cell = ReactNode;
/** Bordered table matching the paper forms. Numeric cells right-aligned. */
export function RTable({ head, rows, foot, className, compact }: { head: Cell[]; rows: Cell[][]; foot?: Cell[]; className?: string; compact?: boolean }) {
  const pad = compact ? "px-1.5 py-1" : "px-2.5 py-1.5";
  return (
    <div className={cx("avoid-break mb-4 overflow-x-auto", className)}>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={cx("border border-[#c9ccc4] bg-[#f3f5f1] text-left font-bold", pad, i > 0 && "text-center")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td key={ci} className={cx("border border-[#d9dcd4]", pad, ci > 0 && typeof c !== "object" && "text-center tnum", ci === 0 && "font-medium")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr>
              {foot.map((c, i) => (
                <td key={i} className={cx("border border-[#c9ccc4] bg-[#f3f5f1] font-bold", pad, i > 0 && "text-center tnum")}>
                  {c}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/** Count cell in the paper convention: 06, NIL. */
export const N = (n: number) => nil(n);
/** Money cell: 1,786,370 or NIL. */
export const M = (n: number) => nil(n, true);

/** Narrative block: editable textarea while drafting, plain text otherwise. */
export function Narrative({ value, editable, onChange, placeholder, rows = 3, optional }: { value?: string; editable: boolean; onChange: (v: string) => void; placeholder: string; rows?: number; optional?: boolean }) {
  if (editable)
    return (
      <div className="mb-3">
        <Textarea rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-brand-tint/60" />
      </div>
    );
  if (optional && !value?.trim()) return null;
  return <p className="mb-3 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2">{value?.trim() || "NIL"}</p>;
}

export function Signatory({ name, role, office, date }: { name: string; role: string; office: string; date?: string }) {
  return (
    <footer className="avoid-break mt-12 flex items-end justify-between gap-6 border-t border-line pt-6 text-[12.5px]">
      <div>
        <div className="text-[14px] font-bold uppercase">{name}</div>
        <div className="italic">{role}</div>
        <div className="italic">{office}</div>
      </div>
      <div className="text-right text-ink-3">
        <div className="mb-6 w-44 border-b border-dashed border-ink-3" />
        Signature{date ? ` · ${date}` : ""}
      </div>
    </footer>
  );
}
