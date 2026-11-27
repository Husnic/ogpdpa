"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Forbidden } from "@/components/guard";
import { Badge, Button, Card, Input, PageHeader, Select, Table, Td, Th } from "@/components/ui";
import { fdt } from "@/lib/format";
import { useScope } from "@/lib/hooks";
import { can, isHQ } from "@/lib/rbac";
import { useMe, useStaffMap, useStore, useZoneMap } from "@/lib/store";

const ENTITY_TONE = { application: "brand", case: "warning", petition: "info", report: "good", staff: "neutral", zone: "neutral", settings: "critical", session: "neutral", assignment: "info" } as const;

export default function AuditPage() {
  const me = useMe();
  const audit = useStore((s) => s.audit);
  const staff = useStaffMap();
  const zones = useZoneMap();
  const scope = useScope();
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");
  const [limit, setLimit] = useState(100);
  const list = useMemo(
    () =>
      audit
        .filter((a) => !scope || (a.zoneId && scope.includes(a.zoneId)))
        .filter((a) => entity === "all" || a.entity === entity)
        .filter((a) => !q || `${a.action} ${a.detail ?? ""} ${staff[a.by]?.firstName ?? ""} ${staff[a.by]?.lastName ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [audit, scope, entity, q, staff],
  );
  if (!can(me, "audit.view")) return <Forbidden what="the audit log" />;

  return (
    <div className="rise">
      <PageHeader title="Audit log" sub="Append-only record of every action — who, what, when" />
      <Card>
        <div className="flex flex-wrap gap-2 px-5 pt-5 pb-4">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute top-3 left-3.5 size-4 text-ink-3" />
            <Input className="pl-10" placeholder="Search actions, people, references…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select className="w-48" value={entity} onChange={(e) => setEntity(e.target.value)} options={[{ value: "all", label: "All entities" }, ...Object.keys(ENTITY_TONE).map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }))]} />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Who</Th>
              {isHQ(me) && <Th>Office</Th>}
              <Th>Entity</Th>
              <Th>Action</Th>
              <Th>Reference</Th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, limit).map((a) => (
              <tr key={a.id} className="hover:bg-surface-2/60">
                <Td className="whitespace-nowrap text-ink-2">{fdt(a.at)}</Td>
                <Td className="font-medium">{staff[a.by] ? `${staff[a.by].firstName} ${staff[a.by].lastName}` : "System"}</Td>
                {isHQ(me) && <Td className="text-ink-2">{a.zoneId ? zones[a.zoneId]?.name : "HQ"}</Td>}
                <Td>
                  <Badge tone={ENTITY_TONE[a.entity as keyof typeof ENTITY_TONE] ?? "neutral"}>{a.entity}</Badge>
                </Td>
                <Td>{a.action}</Td>
                <Td className="max-w-72 truncate text-ink-2">{a.detail}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {list.length > limit && (
          <div className="p-3 text-center">
            <Button variant="ghost" onClick={() => setLimit((l) => l + 200)}>
              Show more ({list.length - limit})
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
