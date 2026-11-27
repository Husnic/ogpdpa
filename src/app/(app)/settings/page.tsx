"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Forbidden } from "@/components/guard";
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Table, Td, Th } from "@/components/ui";
import { FEE_HEADS, NOTICE_TYPES, USE_GROUPS } from "@/lib/catalog";
import { DEFAULT_SETTINGS, defaultFees, lineTotal } from "@/lib/fees";
import { naira } from "@/lib/format";
import { can } from "@/lib/rbac";
import { useMe, useStore } from "@/lib/store";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const me = useMe();
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const [f, setF] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);
  if (!can(me, "settings.manage")) return <Forbidden what="configuration" />;
  const dirty = JSON.stringify(f) !== JSON.stringify(settings);
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: Number(e.target.value) }));

  return (
    <div className="rise">
      <PageHeader
        title="Configuration"
        sub="Service levels, fee schedule and catalogues used across every zone"
        right={
          <>
            <Button variant="ghost" onClick={() => setF(DEFAULT_SETTINGS)}>
              Restore defaults
            </Button>
            <Button
              variant="primary"
              disabled={!dirty}
              onClick={() => {
                update(f);
                setSaved(true);
                setTimeout(() => setSaved(false), 1800);
              }}
            >
              {saved ? <Check className="size-4" /> : null} {saved ? "Saved" : "Save changes"}
            </Button>
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader title="Service levels" sub="Drive SLAs, backlog flags and lapsed assessments" />
          <div className="grid gap-4 px-5 pt-4 pb-5">
            <Field label="Assessment validity (days)" hint="Unpaid assessments lapse after this">
              <Input type="number" min={1} value={f.assessmentValidityDays} onChange={num("assessmentValidityDays")} />
            </Field>
            <Field label="Processing target (days)" hint="Registration → approval; the 7-day tracking chart">
              <Input type="number" min={1} value={f.processingTargetDays} onChange={num("processingTargetDays")} />
            </Field>
            <Field label="Backlog threshold (days)" hint="Registered but unapproved beyond this counts as backlog">
              <Input type="number" min={1} value={f.backlogDays} onChange={num("backlogDays")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="TP admin charge (%)">
                <Input type="number" min={0} value={f.tpAdminPct} onChange={num("tpAdminPct")} />
              </Field>
              <Field label="Penal fee (% of base)">
                <Input type="number" min={0} value={f.penalPct} onChange={num("penalPct")} />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-7">
          <CardHeader title="Fee schedule — base rate by use" sub="Base fee = rate × (0.55 + 0.45 × floors). Other heads derive from base. Illustrative pending the official schedule." />
          <Table className="mt-4">
            <thead>
              <tr>
                <Th>Use</Th>
                <Th>Class</Th>
                <Th className="text-right">Base rate (₦)</Th>
                <Th className="text-right">Example (2 floors)</Th>
              </tr>
            </thead>
            <tbody>
              {USE_GROUPS.map((g) => (
                <tr key={g.id}>
                  <Td className="font-medium">{g.label}</Td>
                  <Td>
                    <Badge tone={g.special ? "info" : "neutral"}>{g.special ? "Special" : "Simple"}</Badge>
                  </Td>
                  <Td className="text-right">
                    <Input type="number" className="ml-auto h-9 w-36 text-right tnum" value={f.feeRates[g.id] ?? 0} onChange={(e) => setF((x) => ({ ...x, feeRates: { ...x.feeRates, [g.id]: Number(e.target.value) } }))} />
                  </Td>
                  <Td className="text-right text-ink-2 tnum">{naira(lineTotal(defaultFees({ useGroup: g.id, floors: 2, devStatus: "undeveloped" }, f)))}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader title="Fee heads" sub="Revenue lines used on assessments and reports" />
          <ul className="divide-y divide-line px-5 pt-2 pb-3 text-[13.5px]">
            {FEE_HEADS.map((h) => (
              <li key={h.id} className="flex justify-between py-2">
                <span>{h.label}</span>
                <span className="text-ink-3">{h.short}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader title="Statutory notices" sub="Compliance window per notice type" />
          <ul className="divide-y divide-line px-5 pt-2 pb-3 text-[13.5px]">
            {NOTICE_TYPES.map((n) => (
              <li key={n.id} className="flex justify-between py-2">
                <span>{n.label}</span>
                <span className="text-ink-3">{n.days} days</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader title="Numbering" sub="Generated automatically per zone, per year" />
          <div className="space-y-3 px-5 pt-3 pb-5 text-[13px]">
            <div>
              <div className="text-ink-3">Registration No</div>
              <code className="font-semibold">{"{ZONECODE}{YY}/{USE}/{SERIES}/{SEQ}"}</code>
              <div className="text-ink-3">e.g. ODZPO26/R/B/37</div>
            </div>
            <div>
              <div className="text-ink-3">Approval No</div>
              <code className="font-semibold">OGPDPA/{"{RegNo}"}</code>
            </div>
            <div>
              <div className="text-ink-3">Enforcement / petition</div>
              <code className="font-semibold">{"{ZONECODE}/ENF/001 · {ZONECODE}/PET/001"}</code>
            </div>
            <p className="rounded-xl bg-warn-soft px-3 py-2 text-[12px] text-warn">Series letter (A–D) is a placeholder until OGPDPA confirms its meaning.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
