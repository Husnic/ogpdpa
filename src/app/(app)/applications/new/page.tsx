"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Forbidden } from "@/components/guard";
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { USE_GROUPS, findUseGroup } from "@/lib/catalog";
import { can, isHQ } from "@/lib/rbac";
import { useMe, useStore } from "@/lib/store";
import type { AppKind, DevStatus } from "@/lib/types";

const DOCS = ["Application form", "Survey plan", "Evidence of title", "Architectural drawings", "Structural drawings (≥ 2 floors)", "Tax clearance", "EIA (special uses)"];

export default function NewApplication() {
  const me = useMe()!;
  const zones = useStore((s) => s.zones);
  const staff = useStore((s) => s.staff);
  const create = useStore((s) => s.createApplication);
  const router = useRouter();
  const [f, setF] = useState({
    applicant: "",
    phone: "",
    consultant: "",
    consultantPhone: "",
    location: "",
    zoneId: me.zoneId ?? zones[0]?.id,
    useGroup: "residential",
    useType: "bungalow",
    floors: 1,
    kind: "new" as AppKind,
    devStatus: "undeveloped" as DevStatus,
    remarks: "",
    officerId: "",
  });
  const [docs, setDocs] = useState<string[]>([]);
  const [err, setErr] = useState("");
  if (!can(me, "app.create")) return <Forbidden what="application intake" />;
  const g = findUseGroup(f.useGroup);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const officers = staff.filter((s) => s.zoneId === f.zoneId && s.role === "PLANNING_OFFICER" && s.status === "active");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.applicant.trim() || !f.location.trim() || !f.phone.trim()) return setErr("Applicant name, phone and site location are required.");
    if (g.types.length && !f.useType) return setErr("Choose a sub-type for this use.");
    const id = create({
      ...f,
      useType: g.types.length ? f.useType : "",
      floors: Number(f.floors) || 1,
      officerId: f.officerId || officers[0]?.id || me.id,
      remarks: [f.remarks, docs.length ? `Documents: ${docs.join(", ")}` : ""].filter(Boolean).join(" · "),
    });
    router.push(`/applications/${id}`);
  };

  return (
    <div className="rise mx-auto max-w-3xl">
      <PageHeader eyebrow="Intake" title="New building plan application" sub="Capture the applicant and site. Fees are assessed after the desk check." />
      <form onSubmit={submit}>
        <Card className="p-6">
          <Section title="Applicant">
            <Field label="Applicant name(s)">
              <Input value={f.applicant} onChange={(e) => set("applicant", e.target.value)} placeholder="e.g. Mr Adewale Ogunleye" />
            </Field>
            <Field label="Applicant phone">
              <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="080…" />
            </Field>
            <Field label="Consultant / architect">
              <Input value={f.consultant} onChange={(e) => set("consultant", e.target.value)} placeholder="TPL / Arc. …" />
            </Field>
            <Field label="Consultant phone">
              <Input value={f.consultantPhone} onChange={(e) => set("consultantPhone", e.target.value)} />
            </Field>
          </Section>
          <Section title="Site">
            <Field label="Location / address" className="sm:col-span-2">
              <Input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Street, area, town" />
            </Field>
            <Field label="Zonal planning office" hint={isHQ(me) ? undefined : "Locked to your zone"}>
              <Select value={f.zoneId!} disabled={!isHQ(me)} onChange={(e) => set("zoneId", e.target.value)} options={zones.map((z) => ({ value: z.id, label: z.name }))} />
            </Field>
            <Field label="Development status" hint="Developed = built before permit (non-compliance, penal fee applies)">
              <Select value={f.devStatus} onChange={(e) => set("devStatus", e.target.value as DevStatus)} options={[{ value: "undeveloped", label: "Undeveloped (compliance)" }, { value: "developed", label: "Developed (non-compliance)" }]} />
            </Field>
          </Section>
          <Section title="Proposed use">
            <Field label="Type of use">
              <Select value={f.useGroup} onChange={(e) => setF((x) => ({ ...x, useGroup: e.target.value, useType: findUseGroup(e.target.value).types[0]?.id ?? "" }))} options={USE_GROUPS.map((u) => ({ value: u.id, label: `${u.label}${u.special ? " · special" : ""}` }))} />
            </Field>
            <Field label="Sub-type">
              <Select disabled={!g.types.length} value={f.useType} onChange={(e) => set("useType", e.target.value)} options={g.types.length ? g.types.map((t) => ({ value: t.id, label: t.label })) : [{ value: "", label: "—" }]} />
            </Field>
            <Field label="Number of floors">
              <Input type="number" min={1} max={30} value={f.floors} onChange={(e) => set("floors", Number(e.target.value))} />
            </Field>
            <Field label="Application kind">
              <Select value={f.kind} onChange={(e) => set("kind", e.target.value as AppKind)} options={[{ value: "new", label: "New" }, { value: "renovation", label: "Renovation" }, { value: "revalidation", label: "Re-validation" }]} />
            </Field>
            <Field label="Handling officer">
              <Select value={f.officerId} onChange={(e) => set("officerId", e.target.value)} options={[{ value: "", label: "Auto-assign" }, ...officers.map((o) => ({ value: o.id, label: `${o.title} ${o.firstName} ${o.lastName} (${o.post})` }))]} />
            </Field>
          </Section>
          <Section title="Documents received">
            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
              {DOCS.map((d) => (
                <label key={d} className="flex items-center gap-2 text-[13px] text-ink-2">
                  <input type="checkbox" className="accent-[var(--brand)]" checked={docs.includes(d)} onChange={(e) => setDocs((x) => (e.target.checked ? [...x, d] : x.filter((y) => y !== d)))} />
                  {d}
                </label>
              ))}
            </div>
            <Field label="Remarks" className="sm:col-span-2">
              <Textarea value={f.remarks} onChange={(e) => set("remarks", e.target.value)} />
            </Field>
          </Section>
          {err && <p className="mb-3 rounded-lg bg-crit-soft px-3 py-2 text-xs text-crit">{err}</p>}
          <div className="flex justify-end gap-2 border-t border-line pt-5">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register intake
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-6">
      <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-bronze">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
