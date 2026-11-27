"use client";

import { addDays, formatISO, parseISO } from "date-fns";
import { compressToUTF16, decompressFromUTF16 } from "lz-string";
import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { ESCALATION, NOTICE_TYPES } from "./catalog";
import { DEFAULT_SETTINGS, lineTotal, makeApprovalNo, makeRegNo } from "./fees";
import { generateSeed, type SeedData } from "./seed";
import type {
  AppStatus,
  Application,
  Assignment,
  AuditEntry,
  EnforcementCase,
  FeeLine,
  NoticeType,
  Notification,
  Payment,
  Petition,
  ReportKind,
  ReportSubmission,
  SanctionType,
  Settings,
  Staff,
  Zone,
} from "./types";

export const STORAGE_KEY = "ogpdpa-prototype";

/** localStorage, LZ-compressed — the seeded year of data is ~3.6MB raw, ~0.7MB stored. */
const compressed: StateStorage = {
  getItem: (k) => {
    try {
      const v = localStorage.getItem(k);
      return v ? decompressFromUTF16(v) : null;
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, compressToUTF16(v));
    } catch (e) {
      console.warn("[ogpdpa] could not persist state", e);
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

interface State extends SeedData {
  seededAt: string | null;
  userId: string | null;
  simToday: string | null;
  settings: Settings;
  notifications: Notification[];
}

interface Actions {
  seed(): void;
  reset(): void;
  login(id: string): void;
  logout(): void;
  setToday(iso: string | null): void;
  setActing(staffId: string, on: boolean): void;

  createApplication(a: Omit<Application, "id" | "status" | "history" | "receivedAt" | "officerId"> & { officerId?: string }): string;
  transition(id: string, status: AppStatus, note?: string): void;
  assess(id: string, lines: FeeLine[]): void;
  recordPayment(id: string, channel: Payment["channel"]): void;
  approve(id: string, note?: string): void;

  createCase(c: Pick<EnforcementCase, "zoneId" | "owner" | "location" | "description" | "useGroup" | "stage">): string;
  serveNotice(caseId: string, type: NoticeType): void;
  setNoticeComplied(caseId: string, noticeId: string, complied: boolean): void;
  recordSanction(caseId: string, type: SanctionType, note?: string, fee?: number): void;
  setCaseOutcome(caseId: string, outcome: EnforcementCase["outcome"]): void;

  createPetition(p: Pick<Petition, "zoneId" | "petitioner" | "against" | "subject" | "location" | "fee">): string;
  updatePetition(id: string, patch: Partial<Petition>): void;

  createAssignment(a: Omit<Assignment, "id" | "createdAt" | "status" | "assignedBy">): void;
  updateAssignment(id: string, patch: Partial<Assignment>): void;

  saveReport(kind: ReportKind, zoneId: string, periodKey: string, patch: Partial<ReportSubmission>): void;
  submitReport(kind: ReportKind, zoneId: string, periodKey: string, snapshot: unknown): void;
  reviewReport(id: string, status: "acknowledged" | "returned", note?: string): void;

  upsertZone(z: Zone): void;
  upsertStaff(s: Staff): void;
  updateSettings(s: Partial<Settings>): void;
  markRead(ids: string[]): void;
}

export type Store = State & Actions;

const empty: State = {
  seededAt: null,
  userId: null,
  simToday: null,
  settings: DEFAULT_SETTINGS,
  notifications: [],
  zones: [],
  staff: [],
  applications: [],
  payments: [],
  cases: [],
  petitions: [],
  assignments: [],
  reports: [],
  audit: [],
};

let n = Date.now() % 100000;
const uid = (p: string) => `${p}x${(n++).toString(36)}`;

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const now = () => (get().simToday ? parseISO(get().simToday!) : new Date());
      const stamp = () => {
        const t = now();
        const real = new Date();
        // keep simulated day, real time-of-day
        t.setHours(real.getHours(), real.getMinutes(), real.getSeconds());
        return formatISO(t);
      };
      const me = () => get().staff.find((s) => s.id === get().userId);
      const log = (action: string, entity: string, entityId: string, zoneId: string | null, detail?: string): AuditEntry => ({
        id: uid("l"),
        at: stamp(),
        by: get().userId ?? "system",
        zoneId,
        action,
        entity,
        entityId,
        detail,
      });
      const notify = (to: Notification["to"], text: string, href?: string): Notification => ({ id: uid("m"), at: stamp(), to, text, href });
      const patchApp = (id: string, fn: (a: Application) => Application, audit: (a: Application) => AuditEntry, extra: Partial<State> = {}) =>
        set((s) => {
          let changed: Application | undefined;
          const applications = s.applications.map((a) => (a.id === id ? (changed = fn(a)) : a));
          return changed ? { applications, audit: [audit(changed), ...s.audit], ...extra } : {};
        });
      const nextSeq = (zoneId: string, year: number) => {
        const z = get().zones.find((x) => x.id === zoneId)!;
        const pre = `${z.code}${String(year).slice(2)}/`;
        let max = 0;
        for (const a of get().applications) if (a.regNo?.startsWith(pre)) max = Math.max(max, Number(a.regNo.split("/").pop()));
        return max + 1;
      };
      const patchCase = (id: string, fn: (c: EnforcementCase) => EnforcementCase, action: string, extra: Partial<State> = {}) =>
        set((s) => {
          let changed: EnforcementCase | undefined;
          const cases = s.cases.map((c) => (c.id === id ? (changed = fn(c)) : c));
          return changed ? { cases, audit: [log(action, "case", id, changed.zoneId, changed.caseNo), ...s.audit], ...extra } : {};
        });

      return {
        ...empty,
        seed: () => {
          const data = generateSeed(new Date());
          set({ ...empty, ...data, seededAt: formatISO(new Date()), userId: get().userId });
        },
        reset: () => {
          const data = generateSeed(new Date());
          const keepUser = get().userId;
          set({ ...empty, ...data, seededAt: formatISO(new Date()), userId: keepUser && data.staff.some((s) => s.id === keepUser) ? keepUser : null });
        },
        login: (id) => set((s) => ({ userId: id, audit: [{ ...log("signed in", "session", id, s.staff.find((x) => x.id === id)?.zoneId ?? null), by: id }, ...s.audit] })),
        logout: () => set({ userId: null }),
        setToday: (iso) => set({ simToday: iso }),
        setActing: (staffId, on) => set((s) => ({ staff: s.staff.map((x) => (x.id === staffId ? { ...x, actingZtpo: on } : x)) })),

        createApplication: (a) => {
          const id = uid("a");
          const at = stamp();
          const by = get().userId!;
          const app: Application = { ...a, id, status: "received", history: [{ status: "received", at, by }], receivedAt: at, officerId: a.officerId ?? by };
          set((s) => ({ applications: [app, ...s.applications], audit: [log("registered intake", "application", id, a.zoneId, a.applicant), ...s.audit] }));
          return id;
        },
        transition: (id, status, note) =>
          patchApp(
            id,
            (a) => ({ ...a, status, history: [...a.history, { status, at: stamp(), by: get().userId!, note }] }),
            (a) => log(`status → ${status}`, "application", id, a.zoneId, a.regNo ?? a.applicant),
          ),
        assess: (id, lines) => {
          const at = stamp();
          patchApp(
            id,
            (a) => ({
              ...a,
              status: "assessed",
              assessment: { lines, assessedAt: at, expiresAt: formatISO(addDays(parseISO(at), get().settings.assessmentValidityDays)), by: get().userId! },
              history: [...a.history, { status: "assessed", at, by: get().userId!, note: `Assessed ₦${lineTotal(lines).toLocaleString()}` }],
            }),
            (a) => log("assessed", "application", id, a.zoneId, `${a.applicant} · ₦${lineTotal(lines).toLocaleString()}`),
          );
        },
        recordPayment: (id, channel) => {
          const a = get().applications.find((x) => x.id === id);
          if (!a?.assessment) return;
          const at = stamp();
          const year = parseISO(at).getFullYear();
          const zone = get().zones.find((z) => z.id === a.zoneId)!;
          const regNo = makeRegNo(zone, year, a.useGroup, a.floors, nextSeq(a.zoneId, year));
          const pay: Payment = {
            id: uid("p"),
            zoneId: a.zoneId,
            source: "application",
            refId: id,
            lines: a.assessment.lines,
            amount: lineTotal(a.assessment.lines),
            paidAt: at,
            receiptNo: `RCT-${zone.code}-${Math.floor(Math.random() * 90000 + 10000)}`,
            channel,
            by: get().userId!,
          };
          patchApp(
            id,
            (x) => ({ ...x, status: "registered", regNo, registeredAt: at, history: [...x.history, { status: "registered", at, by: get().userId!, note: `Payment ${pay.receiptNo}` }] }),
            () => log("payment recorded; registered", "application", id, a.zoneId, regNo),
            { payments: [pay, ...get().payments] },
          );
        },
        approve: (id, note) => {
          const at = stamp();
          const a = get().applications.find((x) => x.id === id);
          if (!a?.regNo) return;
          const approvalNo = makeApprovalNo(a.regNo);
          patchApp(
            id,
            (x) => ({ ...x, status: "approved", approvalNo, approvedAt: at, history: [...x.history, { status: "approved", at, by: get().userId!, note }] }),
            () => log("approved; permit issued", "application", id, a.zoneId, approvalNo),
            { notifications: [notify(a.officerId, `${a.applicant} approved — ${approvalNo}`, `/applications/${id}`), ...get().notifications] },
          );
        },

        createCase: (c) => {
          const id = uid("e");
          const z = get().zones.find((x) => x.id === c.zoneId)!;
          const count = get().cases.filter((x) => x.zoneId === c.zoneId).length + 1;
          const ec: EnforcementCase = { ...c, id, caseNo: `${z.code}/ENF/${String(count).padStart(3, "0")}`, openedAt: stamp(), notices: [], sanctions: [], outcome: "open", officerId: get().userId! };
          set((s) => ({ cases: [ec, ...s.cases], audit: [log("opened enforcement case", "case", id, c.zoneId, ec.caseNo), ...s.audit] }));
          return id;
        },
        serveNotice: (caseId, type) => {
          const at = stamp();
          const days = NOTICE_TYPES.find((t) => t.id === type)?.days ?? 7;
          patchCase(caseId, (c) => ({ ...c, notices: [...c.notices, { id: uid("n"), type, servedAt: at, deadline: formatISO(addDays(parseISO(at), days)), by: get().userId! }] }), `notice served: ${type}`);
        },
        setNoticeComplied: (caseId, noticeId, complied) =>
          patchCase(caseId, (c) => ({ ...c, notices: c.notices.map((x) => (x.id === noticeId ? { ...x, complied } : x)) }), complied ? "notice complied" : "notice not complied"),
        recordSanction: (caseId, type, note, fee) => {
          const at = stamp();
          const c = get().cases.find((x) => x.id === caseId)!;
          const u = me();
          const payments = fee
            ? [{ id: uid("p"), zoneId: c.zoneId, source: "enforcement" as const, refId: caseId, lines: [{ head: "unsealing" as const, amount: fee }], amount: fee, paidAt: at, receiptNo: `RCT-${Math.floor(Math.random() * 90000 + 10000)}`, channel: "bank" as const, by: u!.id }, ...get().payments]
            : get().payments;
          patchCase(
            caseId,
            (x) => ({ ...x, outcome: type === "unsealing" ? x.outcome : "sanctioned", sanctions: [...x.sanctions, { id: uid("s"), type, at, by: u!.id, approvedBy: u?.role === "ZTPO" ? u.id : undefined, note }] }),
            `sanction: ${type}`,
            { payments },
          );
        },
        setCaseOutcome: (caseId, outcome) => patchCase(caseId, (c) => ({ ...c, outcome }), `outcome → ${outcome}`),

        createPetition: (p) => {
          const id = uid("t");
          const z = get().zones.find((x) => x.id === p.zoneId)!;
          const count = get().petitions.filter((x) => x.zoneId === p.zoneId).length + 1;
          const at = stamp();
          const pet: Petition = { ...p, id, petitionNo: `${z.code}/PET/${String(count).padStart(3, "0")}`, receivedAt: at, status: "registered" };
          const payments = p.fee
            ? [{ id: uid("p"), zoneId: p.zoneId, source: "petition" as const, refId: id, lines: [{ head: "petition" as const, amount: p.fee }], amount: p.fee, paidAt: at, receiptNo: `RCT-${z.code}-${Math.floor(Math.random() * 90000 + 10000)}`, channel: "bank" as const, by: get().userId! }, ...get().payments]
            : get().payments;
          set((s) => ({ petitions: [pet, ...s.petitions], payments, audit: [log("petition registered", "petition", id, p.zoneId, pet.petitionNo), ...s.audit] }));
          return id;
        },
        updatePetition: (id, patch) =>
          set((s) => {
            const p = s.petitions.find((x) => x.id === id)!;
            const next = { ...p, ...patch, ...(patch.status === "treated" ? { treatedAt: stamp() } : {}) };
            return {
              petitions: s.petitions.map((x) => (x.id === id ? next : x)),
              audit: [log(patch.status ? `petition → ${patch.status}` : "petition updated", "petition", id, p.zoneId, p.petitionNo), ...s.audit],
              notifications: patch.assignedTo ? [notify(patch.assignedTo, `Petition ${p.petitionNo} assigned to you`, `/petitions/${id}`), ...s.notifications] : s.notifications,
            };
          }),

        createAssignment: (a) =>
          set((s) => {
            const id = uid("g");
            return {
              assignments: [{ ...a, id, createdAt: stamp(), status: "open", assignedBy: get().userId! }, ...s.assignments],
              audit: [log("assignment created", "assignment", id, a.zoneId, a.title), ...s.audit],
              notifications: [notify(a.assignedTo, `New assignment: ${a.title}`, "/assignments"), ...s.notifications],
            };
          }),
        updateAssignment: (id, patch) =>
          set((s) => {
            const a = s.assignments.find((x) => x.id === id)!;
            return {
              assignments: s.assignments.map((x) => (x.id === id ? { ...x, ...patch, ...(patch.status === "done" ? { doneAt: stamp() } : {}) } : x)),
              audit: [log(`assignment → ${patch.status ?? "updated"}`, "assignment", id, a.zoneId, a.title), ...s.audit],
            };
          }),

        saveReport: (kind, zoneId, periodKey, patch) =>
          set((s) => {
            const id = `${kind}:${zoneId}:${periodKey}`;
            const ex = s.reports.find((r) => r.id === id);
            const next: ReportSubmission = { ...(ex ?? { id, kind, zoneId, periodKey, status: "draft", narrative: {} }), ...patch, narrative: { ...(ex?.narrative ?? {}), ...(patch.narrative ?? {}) } };
            return { reports: ex ? s.reports.map((r) => (r.id === id ? next : r)) : [...s.reports, next] };
          }),
        submitReport: (kind, zoneId, periodKey, snapshot) => {
          get().saveReport(kind, zoneId, periodKey, { status: "submitted", submittedAt: stamp(), submittedBy: get().userId!, snapshot, reviewNote: undefined });
          set((s) => ({
            audit: [log(`${kind} report submitted`, "report", `${kind}:${zoneId}:${periodKey}`, zoneId, periodKey), ...s.audit],
            notifications: [notify("HQ", `${s.zones.find((z) => z.id === zoneId)?.name} submitted ${kind} report ${periodKey}`, `/reports/${kind}?zone=${zoneId}&p=${periodKey}`), ...s.notifications],
          }));
        },
        reviewReport: (id, status, note) =>
          set((s) => {
            const r = s.reports.find((x) => x.id === id)!;
            return {
              reports: s.reports.map((x) => (x.id === id ? { ...x, status, reviewedAt: stamp(), reviewedBy: get().userId!, reviewNote: note } : x)),
              audit: [log(`report ${status}`, "report", id, r.zoneId, r.periodKey), ...s.audit],
              notifications: [notify(`ZONE:${r.zoneId}`, `HQ ${status} your ${r.kind} report ${r.periodKey}${note ? `: “${note}”` : ""}`, `/reports/${r.kind}?zone=${r.zoneId}&p=${r.periodKey}`), ...s.notifications],
            };
          }),

        upsertZone: (z) =>
          set((s) => ({ zones: s.zones.some((x) => x.id === z.id) ? s.zones.map((x) => (x.id === z.id ? z : x)) : [...s.zones, z], audit: [log("zone updated", "zone", z.id, z.id, z.name), ...s.audit] })),
        upsertStaff: (st) =>
          set((s) => {
            const prev = s.staff.find((x) => x.id === st.id);
            const what = !prev ? "staff created" : prev.zoneId !== st.zoneId ? `transferred ${prev.zoneId ?? "HQ"} → ${st.zoneId ?? "HQ"}` : prev.status !== st.status ? `staff ${st.status}` : prev.role !== st.role ? `role → ${st.role}` : "staff updated";
            return { staff: prev ? s.staff.map((x) => (x.id === st.id ? st : x)) : [...s.staff, st], audit: [log(what, "staff", st.id, st.zoneId, `${st.firstName} ${st.lastName}`), ...s.audit] };
          }),
        updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p }, audit: [log("settings updated", "settings", "settings", null, Object.keys(p).join(", ")), ...s.audit] })),
        markRead: (ids) => set((s) => ({ notifications: s.notifications.map((x) => (ids.includes(x.id) ? { ...x, read: true } : x)) })),
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => compressed),
      skipHydration: true,
    },
  ),
);

/** "Today" for the prototype (dev panel can simulate a date). */
export const useToday = () => {
  const sim = useStore((s) => s.simToday);
  const key = sim ?? new Date().toDateString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (sim ? parseISO(sim) : new Date()), [key]);
};
export const useMe = () => {
  const id = useStore((s) => s.userId);
  const staff = useStore((s) => s.staff);
  return staff.find((s) => s.id === id) ?? null;
};
export const useZoneMap = () => {
  const zones = useStore((s) => s.zones);
  return Object.fromEntries(zones.map((z) => [z.id, z])) as Record<string, Zone>;
};
export const useStaffMap = () => {
  const staff = useStore((s) => s.staff);
  return Object.fromEntries(staff.map((z) => [z.id, z])) as Record<string, Staff>;
};
export const nextEscalation = (c: EnforcementCase): NoticeType | null => {
  const served = new Set(c.notices.map((n) => n.type));
  return ESCALATION.find((t) => !served.has(t)) ?? null;
};
