"use client";

import { ArrowRight, Building2, ClipboardCheck, Crown, FileSearch, ShieldCheck, UserCog, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Brand } from "@/components/brand";
import { Button, Field, Input, Select } from "@/components/ui";
import { ZoneMap } from "@/components/zone-map";
import { ROLE_META } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

const PERSONAS: { role: Role; icon: LucideIcon; blurb: string }[] = [
  { role: "HQ_ADMIN", icon: Crown, blurb: "State-wide oversight" },
  { role: "HQ_RECORDS", icon: FileSearch, blurb: "Reviews zonal reports" },
  { role: "SUPER_ADMIN", icon: UserCog, blurb: "Users & configuration" },
  { role: "ZTPO", icon: Building2, blurb: "Approves permits" },
  { role: "PLANNING_OFFICER", icon: ClipboardCheck, blurb: "Assesses & inspects" },
  { role: "CLERICAL", icon: ShieldCheck, blurb: "Intake & payments" },
];

export default function LoginPage() {
  const staff = useStore((s) => s.staff);
  const zones = useStore((s) => s.zones);
  const login = useStore((s) => s.login);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [zone, setZone] = useState("odo");

  const enter = (id: string) => {
    login(id);
    router.replace("/dashboard");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const u = staff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return setErr("No account found for that email. Accounts are issued by HQ — or continue as a demo persona below.");
    if (u.status !== "active") return setErr("This account is suspended. Contact HQ ICT.");
    enter(u.id);
  };
  const personaFor = (role: Role) => {
    const hq = ROLE_META[role].hq;
    return staff.find((s) => s.role === role && s.status === "active" && (hq ? s.zoneId === null : s.zoneId === zone));
  };

  return (
    <div className="grid min-h-screen gap-3 p-3 lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="side-gradient relative hidden overflow-hidden rounded-[28px] p-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-brand/25 blur-3xl" />
        <Brand tone="light" />
        <div className="relative mt-10">
          <h2 className="max-w-lg text-[40px] leading-[1.08] font-bold tracking-[-0.02em]">
            Every permit, notice and naira — <span className="text-[#7fd8a7]">one view across Ogun State.</span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] text-white/60">Zonal offices log operations once. Weekly, monthly and quarterly reports assemble themselves, and HQ sees everything as it happens.</p>
        </div>
        <div className="relative mx-auto mt-auto w-full max-w-[520px] rounded-3xl bg-white/95 p-3 shadow-2xl">
          <ZoneMap mode="hq" selected={zone} zoomOnSelect={false} onSelect={(id) => id && setZone(id)} />
        </div>
        <div className="relative mt-5 flex gap-8 text-[13px] text-white/55">
          <span>
            <b className="block text-xl text-white">{zones.length}</b>zonal offices
          </span>
          <span>
            <b className="block text-xl text-white">20</b>LGAs covered
          </span>
          <span>
            <b className="block text-xl text-white">{staff.length}</b>officers
          </span>
        </div>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center rounded-[28px] bg-surface px-6 py-10">
        <div className="w-full max-w-[440px]">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <h1 className="text-[32px] font-bold tracking-[-0.02em]">Welcome back</h1>
          <p className="mt-1 text-[15px] text-ink-2">Sign in with your OGPDPA staff account.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Work email">
              <Input type="email" value={email} onChange={(e) => (setEmail(e.target.value), setErr(""))} placeholder="name@ogpdpa.og.gov.ng" autoComplete="username" />
            </Field>
            <Field label="Password">
              <Input type="password" placeholder="••••••••" autoComplete="current-password" />
            </Field>
            {err && <p className="rounded-xl bg-crit-soft px-3.5 py-2.5 text-[12.5px] text-crit">{err}</p>}
            <Button variant="primary" className="w-full" type="submit">
              Sign in <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="my-8 flex items-center gap-3 text-[12px] font-medium text-ink-3">
            <span className="h-px flex-1 bg-line" /> Prototype · continue as <span className="h-px flex-1 bg-line" />
          </div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[12.5px] font-semibold text-ink-2">Zonal personas for</span>
            <Select className="h-9 w-52 rounded-full text-[13px]" value={zone} onChange={(e) => setZone(e.target.value)} options={zones.map((z) => ({ value: z.id, label: `${z.name} ZPO` }))} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PERSONAS.map(({ role, icon: Icon, blurb }) => {
              const p = personaFor(role);
              return (
                <button
                  key={role}
                  type="button"
                  disabled={!p}
                  onClick={() => p && enter(p.id)}
                  className="group flex flex-col items-start gap-2 rounded-2xl border border-line p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_8px_20px_-12px_rgba(23,138,79,0.5)]"
                >
                  <span className={`grid size-8 place-items-center rounded-full ${ROLE_META[role].hq ? "bg-ink text-white" : "bg-brand-soft text-brand"}`}>
                    <Icon className="size-4" />
                  </span>
                  <span>
                    <span className="block text-[13px] font-bold text-ink">{ROLE_META[role].short}</span>
                    <span className="block text-[11.5px] leading-snug text-ink-3">{blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-10 text-center text-[11.5px] text-ink-3">Ogun State Planning and Development Permit Authority · prototype, no live data</p>
        </div>
      </section>
    </div>
  );
}
