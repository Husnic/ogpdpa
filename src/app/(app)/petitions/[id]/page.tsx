"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Forbidden } from "@/components/guard";
import { Badge, Button, Card, CardHeader, Empty, Field, KeyValue, PageHeader, Select, Textarea } from "@/components/ui";
import { PETITION_STATUS } from "@/lib/catalog";
import { fdate, naira } from "@/lib/format";
import { can, isHQ } from "@/lib/rbac";
import { useMe, useStaffMap, useStore, useZoneMap } from "@/lib/store";

export default function PetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const me = useMe()!;
  const p = useStore((s) => s.petitions.find((x) => x.id === id));
  const staffAll = useStore((s) => s.staff);
  const update = useStore((s) => s.updatePetition);
  const staff = useStaffMap();
  const zones = useZoneMap();
  const [resolution, setResolution] = useState("");

  if (!p) return <Empty title="Petition not found" />;
  if (!isHQ(me) && p.zoneId !== me.zoneId) return <Forbidden what="petitions outside your zone" />;
  const officers = staffAll.filter((s) => s.zoneId === p.zoneId && s.role !== "CLERICAL" && s.status === "active");
  const canTreat = can(me, "pet.treat") && p.status !== "treated";

  return (
    <div className="rise">
      <Link href="/petitions" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Petitions
      </Link>
      <PageHeader
        eyebrow={`${zones[p.zoneId]?.name} ZPO · ${p.petitionNo}`}
        title={p.subject}
        sub={p.location}
        right={
          <Badge tone={PETITION_STATUS[p.status].tone} dot className="px-3 py-1 text-[12.5px]">
            {PETITION_STATUS[p.status].label}
          </Badge>
        }
      />
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          {canTreat ? (
            <Card>
              <CardHeader title="Treat petition" sub="Assign an officer, review, then record the resolution" />
              <div className="grid gap-4 px-5 pt-4 pb-5">
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Assigned officer" className="min-w-64 flex-1">
                    <Select value={p.assignedTo ?? ""} onChange={(e) => update(p.id, { assignedTo: e.target.value, status: p.status === "registered" ? "under_review" : p.status })} options={[{ value: "", label: "Unassigned" }, ...officers.map((o) => ({ value: o.id, label: `${o.title} ${o.firstName} ${o.lastName} (${o.post})` }))]} />
                  </Field>
                  {p.status === "registered" && <Button onClick={() => update(p.id, { status: "under_review" })}>Start review</Button>}
                </div>
                <Field label="Resolution">
                  <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Findings from site inspection and decision" />
                </Field>
                <div className="flex justify-end">
                  <Button variant="primary" disabled={!resolution.trim()} onClick={() => update(p.id, { status: "treated", resolution: resolution.trim() })}>
                    Mark treated
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            p.resolution && (
              <Card className="border-transparent bg-good-soft p-5">
                <div className="text-[12px] font-semibold text-good">Resolution · {fdate(p.treatedAt)}</div>
                <div className="mt-1 text-[15px] font-medium text-ink">{p.resolution}</div>
              </Card>
            )
          )}
        </div>
        <Card className="px-5 pt-4 pb-2 xl:col-span-4">
          <KeyValue
            items={[
              ["Petitioner", p.petitioner],
              ["Against", p.against],
              ["Received", fdate(p.receivedAt)],
              ["Assigned to", p.assignedTo ? `${staff[p.assignedTo]?.firstName} ${staff[p.assignedTo]?.lastName}` : "—"],
              ["Fee paid", p.fee ? naira(p.fee) : "—"],
              ["Treated", fdate(p.treatedAt)],
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
