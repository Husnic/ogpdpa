"use client";

import { ArrowUpRight, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Forbidden } from "@/components/guard";
import { Card, PageHeader } from "@/components/ui";
import { ZoneMap } from "@/components/zone-map";
import { nairaCompact } from "@/lib/format";
import { useData, usePeriod } from "@/lib/hooks";
import { can } from "@/lib/rbac";
import { zoneRows } from "@/lib/selectors";
import { useMe } from "@/lib/store";
import { useRouter } from "next/navigation";

export default function ZonesPage() {
  const me = useMe();
  const data = useData();
  const router = useRouter();
  const { period, prev, today } = usePeriod("year");
  const rows = useMemo(() => zoneRows(data, period, prev, today), [data, period, prev, today]);
  if (!can(me, "zones.manage")) return <Forbidden what="zone management" />;

  return (
    <div className="rise">
      <PageHeader title="Zones" sub={`${data.zones.length} zonal planning offices · figures ${period.label} to date`} />
      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="p-4 xl:col-span-5">
          <ZoneMap mode="hq" selected={null} onSelect={(id) => id && router.push(`/zones/${id}`)} values={Object.fromEntries(rows.map((r) => [r.zone.id, r.m.revenue]))} format={nairaCompact} metricLabel="Revenue (YTD)" />
        </Card>
        <div className="grid content-start gap-3 sm:grid-cols-2 xl:col-span-7">
          {rows.map(({ zone, m, staff }) => (
            <Link key={zone.id} href={`/zones/${zone.id}`} className="group">
              <Card className="p-4 transition-shadow group-hover:shadow-[0_10px_30px_-18px_rgba(16,21,18,0.35)]">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[12px] font-semibold text-brand">{zone.code}</div>
                    <div className="text-[16px] font-bold tracking-tight">{zone.name}</div>
                  </div>
                  <ArrowUpRight className="size-4 text-ink-3 group-hover:text-ink" />
                </div>
                <div className="mt-1 flex items-center gap-1 text-[12px] text-ink-3">
                  <MapPin className="size-3.5" /> {zone.lgas.join(", ")}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[12px]">
                  <div>
                    <div className="text-ink-3">Revenue</div>
                    <div className="font-bold tnum">{nairaCompact(m.revenue)}</div>
                  </div>
                  <div>
                    <div className="text-ink-3">Approved</div>
                    <div className="font-bold tnum">{m.approved}</div>
                  </div>
                  <div>
                    <div className="text-ink-3">
                      <Users className="inline size-3" /> Staff
                    </div>
                    <div className="font-bold tnum">{staff}</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
