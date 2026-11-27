"use client";

import {
  Bell,
  BarChart3,
  ClipboardList,
  FileStack,
  FileText,
  Gavel,
  LayoutGrid,
  LogOut,
  Map,
  MessageSquareWarning,
  PanelLeft,
  ScrollText,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { ROLE_META } from "@/lib/catalog";
import { cx, fdt } from "@/lib/format";
import { can, isHQ, type Action } from "@/lib/rbac";
import { useMe, useStore, useToday, useZoneMap } from "@/lib/store";
import { Brand } from "./brand";
import { DevRoleSwitcher } from "./dev-switcher";
import { Avatar } from "./ui";

type NavItem = { href: string; label: string; icon: typeof Map; need?: Action };
const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Oversight",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutGrid },
      { href: "/performance", label: "Zone performance", icon: BarChart3, need: "performance.view" },
    ],
  },
  {
    group: "Operations",
    items: [
      { href: "/applications", label: "Applications", icon: FileStack },
      { href: "/revenue", label: "Revenue", icon: Wallet, need: "revenue.view" },
      { href: "/enforcement", label: "Enforcement", icon: Gavel },
      { href: "/petitions", label: "Petitions", icon: MessageSquareWarning },
      { href: "/assignments", label: "Assignments", icon: ClipboardList },
    ],
  },
  { group: "Reporting", items: [{ href: "/reports", label: "Reports", icon: FileText, need: "report.view" }] },
  {
    group: "Administration",
    items: [
      { href: "/zones", label: "Zones", icon: Map, need: "zones.manage" },
      { href: "/staff", label: "Staff & officers", icon: Users, need: "staff.view" },
      { href: "/settings", label: "Configuration", icon: Settings, need: "settings.manage" },
      { href: "/audit", label: "Audit log", icon: ScrollText, need: "audit.view" },
    ],
  },
];
const ALL_ITEMS = NAV.flatMap((g) => g.items);

function useSignOut() {
  const logout = useStore((s) => s.logout);
  const router = useRouter();
  return () => {
    logout();
    router.push("/login");
  };
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const me = useMe();
  const path = usePathname();
  const zones = useZoneMap();
  const signOut = useSignOut();
  const nav = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.need || can(me, i.need)) })).filter((g) => g.items.length);

  return (
    <aside className="side-gradient flex h-full w-[256px] flex-col rounded-[22px] text-white shadow-[0_10px_30px_-12px_rgba(9,13,11,0.6)]">
      <div className="px-6 pt-7 pb-4">
        <Brand tone="light" />
      </div>
      <div className="mx-4 mb-2 rounded-2xl bg-white/[0.06] px-3.5 py-2.5 text-[12px]">
        <div className="font-semibold text-white/90">{me && (isHQ(me) ? "Headquarters" : `${zones[me.zoneId!]?.name} ZPO`)}</div>
        <div className="text-white/45">{me && ROLE_META[me.role].label}</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        {nav.map((g) => (
          <div key={g.group} className="mt-5">
            <div className="px-3 pb-2 text-[11px] font-medium text-white/35">{g.group}</div>
            <div className="space-y-0.5">
              {g.items.map((i) => {
                const active = path === i.href || path.startsWith(i.href + "/");
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={onNavigate}
                    className={cx(
                      "flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[14px] font-medium transition-colors",
                      active ? "bg-brand text-white shadow-[0_6px_16px_-6px_rgba(23,138,79,0.8)]" : "text-white/70 hover:bg-white/[0.07] hover:text-white",
                    )}
                  >
                    <i.icon className="size-[18px]" strokeWidth={1.9} />
                    {i.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 pb-6">
        <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-[14px] font-medium text-[#ff7a66] transition-colors hover:bg-white/[0.06]">
          <LogOut className="size-[18px]" strokeWidth={1.9} /> Log out
        </button>
      </div>
    </aside>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <div className="no-print fixed inset-y-0 left-0 z-30 hidden p-3 lg:block">
        <Sidebar />
      </div>
      {open && (
        <div className="no-print fixed inset-0 z-40 bg-ink/30 p-3 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full w-fit">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="print-shell lg:pl-[280px]">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 pt-6 pb-16 sm:px-6 lg:px-8">{children}</main>
      </div>
      <DevRoleSwitcher />
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const me = useMe();
  const path = usePathname();
  const today = useToday();
  const sim = useStore((s) => s.simToday);
  const zones = useZoneMap();
  const current = ALL_ITEMS.find((i) => path === i.href || path.startsWith(i.href + "/"));
  if (!me) return null;
  return (
    <header className="no-print sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button type="button" className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <PanelLeft className="size-[18px]" />
      </button>
      <PanelLeft className="hidden size-[18px] text-ink-3 lg:block" />
      <span className="text-[14px] font-medium text-ink-2">{current?.label ?? "OGPDPA"}</span>
      <span className="hidden text-[13px] text-ink-3 md:inline">
        · {format(today, "EEE d MMM yyyy")}
        {sim && <span className="ml-1.5 rounded-full bg-bronze-soft px-2 py-0.5 text-[11px] font-semibold text-bronze">simulated</span>}
      </span>
      <div className="flex-1" />
      <Notifications />
      <div className="flex items-center gap-3 pl-1">
        <Avatar name={`${me.firstName} ${me.lastName}`} />
        <div className="hidden leading-tight sm:block">
          <div className="text-[14px] font-bold">
            {me.firstName} {me.lastName}
          </div>
          <div className="text-[12px] text-ink-3">
            {ROLE_META[me.role].short}
            {me.actingZtpo && " (acting ZTPO)"} · {isHQ(me) ? "HQ" : zones[me.zoneId!]?.name}
          </div>
        </div>
      </div>
    </header>
  );
}

function Notifications() {
  const me = useMe();
  const all = useStore((s) => s.notifications);
  const markRead = useStore((s) => s.markRead);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const mine = useMemo(
    () =>
      all
        .filter((n) => n.to === me?.id || (n.to === "HQ" && isHQ(me)) || (me?.zoneId && n.to === `ZONE:${me.zoneId}` && (me.role === "ZTPO" || me.role === "PLANNING_OFFICER")))
        .slice(0, 30),
    [all, me],
  );
  const unread = mine.filter((n) => !n.read).length;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((b) => !b)} className="relative grid size-10 place-items-center rounded-full text-ink-2 ring-1 ring-inset ring-line hover:bg-surface-2" aria-label="Notifications">
        <Bell className="size-[18px]" strokeWidth={1.9} />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full bg-crit text-[10px] font-bold text-white ring-2 ring-surface">{unread}</span>}
      </button>
      {open && (
        <div className="rise absolute right-0 mt-2 w-[340px] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[14px] font-bold">Notifications</span>
            {unread > 0 && (
              <button type="button" className="text-[12.5px] font-semibold text-brand" onClick={() => markRead(mine.map((n) => n.id))}>
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto border-t border-line">
            {mine.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-ink-3">You’re all caught up.</p>}
            {mine.map((n) => (
              <button
                type="button"
                key={n.id}
                onClick={() => {
                  markRead([n.id]);
                  setOpen(false);
                  if (n.href) router.push(n.href);
                }}
                className={cx("flex w-full gap-3 border-b border-line px-4 py-3 text-left text-[13px] hover:bg-surface-2", !n.read && "bg-brand-tint")}
              >
                <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} />
                <span>
                  <span className="block text-ink">{n.text}</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-3">{fdt(n.at)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
