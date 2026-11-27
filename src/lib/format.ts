import { clsx, type ClassValue } from "clsx";
import { format, parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
export const nairaCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return "₦" + (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (a >= 1e6) return "₦" + (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (a >= 1e3) return "₦" + (n / 1e3).toFixed(0) + "K";
  return "₦" + Math.round(n);
};
export const num = (n: number) => Math.round(n).toLocaleString("en-NG");
export const nil = (n: number, money = false) => (n ? (money ? num(n) : String(n).padStart(2, "0")) : "NIL");
export const fdate = (s?: string, f = "d MMM yyyy") => (s ? format(parseISO(s), f) : "—");
export const fdt = (s?: string) => (s ? format(parseISO(s), "d MMM yyyy, HH:mm") : "—");
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
export const delta = (cur: number, prev: number) => (prev === 0 ? (cur ? 1 : 0) : (cur - prev) / prev);
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
/** Class names with Tailwind conflict resolution — later utilities win (w-48 overrides w-full). */
export const cx = (...c: ClassValue[]) => twMerge(clsx(c));
