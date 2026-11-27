import Image from "next/image";
import { cx } from "@/lib/format";

/** Ogun State seal + OGPDPA wordmark. `tone="light"` for dark backgrounds. */
export function Brand({ compact, tone = "dark" }: { compact?: boolean; tone?: "dark" | "light" }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image src="/brand/ogun-seal.png" alt="Ogun State seal" width={compact ? 32 : 38} height={compact ? 32 : 38} className="shrink-0 rounded-full ring-2 ring-white/10" priority />
      <div className="leading-none">
        <div className={cx("text-[21px] font-black tracking-[-0.02em]", tone === "light" ? "text-white" : "text-ink")}>
          OGPDPA
        </div>
        {!compact && <div className={cx("mt-1 text-[10px] font-medium tracking-wide", tone === "light" ? "text-white/50" : "text-ink-3")}>Planning &amp; Permit Authority</div>}
      </div>
    </div>
  );
}
