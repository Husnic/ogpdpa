"use client";

import { Download, FlaskConical, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { ROLE_META } from "@/lib/catalog";
import { cx } from "@/lib/format";
import { useMe, useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { Button, Select } from "./ui";

const DEV = process.env.NEXT_PUBLIC_DEV_TOOLS !== "false";
const ROLES: Role[] = ["SUPER_ADMIN", "HQ_ADMIN", "HQ_RECORDS", "ZTPO", "PLANNING_OFFICER", "CLERICAL"];

/** Prototype-only panel: switch persona/zone, simulate today, reset data. */
export function DevRoleSwitcher() {
  const [open, setOpen] = useState(false);
  const me = useMe();
  const staff = useStore((s) => s.staff);
  const zones = useStore((s) => s.zones);
  const login = useStore((s) => s.login);
  const setToday = useStore((s) => s.setToday);
  const sim = useStore((s) => s.simToday);
  const reset = useStore((s) => s.reset);
  const setActing = useStore((s) => s.setActing);
  const router = useRouter();
  const [zone, setZone] = useState(me?.zoneId ?? zones[9]?.id ?? zones[0]?.id);
  if (!DEV || !me) return null;

  const become = (role: Role, z = zone) => {
    const hq = ROLE_META[role].hq;
    const u = staff.find((s) => s.role === role && s.status === "active" && (hq ? s.zoneId === null : s.zoneId === z));
    if (u) {
      login(u.id);
      router.push("/dashboard");
    }
  };
  const deputy = me.zoneId ? staff.find((s) => s.zoneId === me.zoneId && s.designation === "Deputy ZTPO") : undefined;

  return (
    <div className="no-print fixed right-4 bottom-4 z-50">
      {open ? (
        <div className="rise w-[300px] rounded-2xl border border-line-strong bg-surface p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <FlaskConical className="size-4 text-bronze" /> Prototype controls
            </div>
            <button onClick={() => setOpen(false)} className="text-ink-3 hover:text-ink" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>

          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Zone (for zonal roles)</div>
          <Select
            value={zone}
            onChange={(e) => {
              setZone(e.target.value);
              if (!ROLE_META[me.role].hq) become(me.role, e.target.value);
            }}
            options={zones.map((z) => ({ value: z.id, label: z.name }))}
          />

          <div className="mt-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Active role</div>
          <div className="grid grid-cols-2 gap-1.5">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => become(r)}
                className={cx(
                  "rounded-lg border px-2 py-1.5 text-left text-[11.5px] font-medium transition-colors",
                  me.role === r ? "border-brand bg-brand-soft text-brand-strong" : "border-line text-ink-2 hover:bg-surface-2",
                )}
              >
                {ROLE_META[r].short}
                <span className="block text-[10px] font-normal text-ink-3">{ROLE_META[r].hq ? "Headquarters" : "Zonal"}</span>
              </button>
            ))}
          </div>

          {deputy && (
            <label className="mt-3 flex items-center gap-2 text-[12px] text-ink-2">
              <input type="checkbox" className="accent-[var(--brand)]" checked={!!deputy.actingZtpo} onChange={(e) => setActing(deputy.id, e.target.checked)} />
              Deputy ({deputy.firstName}) is acting ZTPO
            </label>
          )}

          <div className="mt-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Simulated today</div>
          <div className="flex gap-1.5">
            <input
              type="date"
              className="h-8 flex-1 rounded-lg border border-line-strong bg-surface px-2 text-[12px]"
              value={sim ? sim.slice(0, 10) : format(new Date(), "yyyy-MM-dd")}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setToday(e.target.value ? `${e.target.value}T12:00:00` : null)}
            />
            {sim && (
              <Button size="sm" variant="ghost" onClick={() => setToday(null)}>
                Real
              </Button>
            )}
          </div>

          <div className="mt-4 flex gap-1.5 border-t border-line pt-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (confirmReset()) reset();
              }}
            >
              <RotateCcw className="size-3.5" /> Reset data
            </Button>
            <Button size="sm" variant="ghost" onClick={exportJson}>
              <Download className="size-3.5" /> Export JSON
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-line-strong bg-surface py-2 pr-3.5 pl-2.5 text-[12px] font-medium shadow-lg hover:bg-surface-2"
        >
          <FlaskConical className="size-4 text-bronze" />
          {ROLE_META[me.role].short}
        </button>
      )}
    </div>
  );
}

// Inline confirm (avoid window.confirm blocking automation): double-click-style guard
let armed = 0;
function confirmReset() {
  const now = Date.now();
  if (now - armed < 2500) return true;
  armed = now;
  alertSoft("Click “Reset data” again to restore the seeded dataset.");
  return false;
}
function alertSoft(msg: string) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.className = "fixed bottom-20 right-4 z-[60] rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}
function exportJson() {
  const s = useStore.getState();
  const data = { zones: s.zones, staff: s.staff, applications: s.applications, payments: s.payments, cases: s.cases, petitions: s.petitions, assignments: s.assignments, reports: s.reports, audit: s.audit, settings: s.settings };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `ogpdpa-prototype-${format(new Date(), "yyyyMMdd-HHmm")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
