import { addDays, addHours, differenceInCalendarDays, formatISO, startOfDay } from "date-fns";
import { ESCALATION, USE_GROUPS } from "./catalog";
import { DEFAULT_SETTINGS, defaultFees, lineTotal, makeApprovalNo, makeRegNo } from "./fees";
import { periodOf, type PeriodKind } from "./periods";
import type {
  Application,
  Assignment,
  AuditEntry,
  EnforcementCase,
  Payment,
  Petition,
  ReportSubmission,
  Staff,
  StatusEvent,
  Zone,
} from "./types";
import { initialZones, zoneSpeed, zoneTowns, zoneWeight } from "./zones";

/* Deterministic PRNG so every reviewer sees the same starting data. */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Adewale", "Olufunke", "Babatunde", "Kehinde", "Taiwo", "Funmilayo", "Oluwaseun", "Adebayo", "Yetunde", "Abiodun", "Folake", "Olumide", "Bukola", "Ganiyu", "Morenike", "Segun", "Temitope", "Adeola", "Ibrahim", "Rasheed", "Omolara", "Olatunji", "Damilola", "Kayode", "Mojisola", "Wasiu", "Toyin", "Femi", "Aisha", "Chinedu", "Ngozi", "Emeka", "Hauwa", "Tunde", "Ronke", "Sikiru", "Bolanle", "Gbenga", "Iyabo", "Lateef"];
const LAST = ["Ogunleye", "Adeyemi", "Okonkwo", "Balogun", "Ogunbiyi", "Adekunle", "Oyelaran", "Sodipo", "Akinola", "Bakare", "Onasanya", "Ogunsola", "Adesanya", "Odusanya", "Shittu", "Oladipo", "Lawal", "Ajayi", "Oduwole", "Osinuga", "Kuforiji", "Sonuga", "Akinyemi", "Olaniyan", "Oyebanji", "Fashola", "Abiodun", "Coker", "Oke", "Ilori", "Durojaiye", "Osunsanya", "Majekodunmi", "Salami", "Ojo", "Eniola"];
const STREETS = ["Along Obafemi Awolowo Avenue", "Off Church Street", "Along Old Lagos Road", "Off Grammar School Road", "Along Station Road", "Behind Central Mosque", "Along Ilaro Road", "Off Oba Adesida Street", "Along Ring Road", "Within Olorunsogo Estate", "Along Sango-Idiroko Road", "Off Market Road", "Within Unity Estate", "Along Expressway Service Lane", "Off Hospital Road", "Along Ogunfowora Street", "Within Bayeku Farmland", "Along Chief Ola Ajayi Street"];
const SUBJECTS = ["Boundary encroachment by neighbour", "Obstruction of access road", "Building on drainage setback", "Disputed ownership of plot", "Noise and nuisance from commercial use", "Illegal conversion to place of worship", "Building too close to fence line", "Blocked right of way", "Unauthorised shop on setback"];
const ASSIGN = ["Monitoring of Sango–Idiroko corridor setbacks", "Joint inspection with Bureau of Lands", "Verification of layout beacons", "Sensitisation of community leaders on permits", "Survey of shanties on highway right of way", "Inspection of petrol station sites", "Audit of approved plans (2024 files)", "Response to HQ enquiry on illegal estate"];

export interface SeedData {
  zones: Zone[];
  staff: Staff[];
  applications: Application[];
  payments: Payment[];
  cases: EnforcementCase[];
  petitions: Petition[];
  assignments: Assignment[];
  reports: ReportSubmission[];
  audit: AuditEntry[];
}

export function generateSeed(today: Date, seed = 20260101): SeedData {
  const rnd = mulberry32(seed);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
  const int = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1));
  const chance = (p: number) => rnd() < p;
  const person = () => `${pick(FIRST)} ${pick(LAST)}`;
  const phone = () => `080${int(1, 9)}${String(int(1000000, 9999999))}`;
  const iso = (dt: Date) => formatISO(dt);
  const work = (dt: Date, h = int(8, 16)) => addHours(startOfDay(dt), h + rnd());
  let idc = 0;
  const id = (p: string) => `${p}${(++idc).toString(36)}`;

  const zones = initialZones();
  const staff: Staff[] = [];
  const hq = (role: Staff["role"], post: Staff["post"], t: string, f: string, l: string, gl: number, duties: string[]): Staff => ({
    id: id("u"), title: t, firstName: f, lastName: l, email: `${f}.${l}@ogpdpa.og.gov.ng`.toLowerCase(), phone: phone(), role, post, gradeLevel: gl, zoneId: null, duties, status: "active", joinedAt: "2019-03-01",
  });
  staff.push(hq("SUPER_ADMIN", "ADMIN", "Mr", "Tolu", "Adebanjo", 12, ["System administration", "User & access management"]));
  staff.push(hq("HQ_ADMIN", "DIRECTOR", "TPL", "Olusegun", "Akinwale", 16, ["Oversight of zonal planning offices", "Approval of exceptions"]));
  staff.push(hq("HQ_RECORDS", "RECORDS", "Mrs", "Kemi", "Oyewole", 13, ["Receipt and review of zonal reports", "State-wide consolidation"]));
  staff.push(hq("HQ_RECORDS", "RECORDS", "Mr", "Daniel", "Okoro", 10, ["Report tracking", "Data quality checks"]));

  const roster: { role: Staff["role"]; post: Staff["post"]; gl: number; des?: string; duties: string[] }[] = [
    { role: "ZTPO", post: "PTPO", gl: 12, des: "ZTPO", duties: ["Granting of final approvals and issuance of development permits", "Enforcement of state planning regulations within the zone", "Assigning of assignments to officers and monitoring delivery", "Interface with HQ on matters affecting the zonal office"] },
    { role: "PLANNING_OFFICER", post: "STPO", gl: 10, des: "Deputy ZTPO", duties: ["Calculation of assessment fees", "Inspection and monitoring of assigned sectors", "Recommendation of applications to the ZTPO", "Treating of petitions", "Acting on behalf of the ZTPO if unavailable"] },
    { role: "PLANNING_OFFICER", post: "STPO", gl: 10, duties: ["Inspection and monitoring of assigned sectors", "Recommendation of applications to the ZTPO", "Preparation of weekly and monthly reports", "Preparation of quarterly reports"] },
    { role: "PLANNING_OFFICER", post: "TPO II", gl: 8, duties: ["Inspection and monitoring of assigned sectors", "Preparation of weekly reports", "Registration of building plans and approved plans"] },
    { role: "PLANNING_OFFICER", post: "HTO", gl: 8, duties: ["Inspection and monitoring of assigned sectors", "Treating of petitions", "Registration of building plans and approved plans"] },
    { role: "CLERICAL", post: "CCO", gl: 7, duties: ["Administrative and clerical functions", "Stamping of drawings", "Quoting registration numbers on drawings", "Registration of petitions", "Dispatching of applications"] },
  ];
  for (const z of zones) {
    for (const r of roster) {
      const f = pick(FIRST), l = pick(LAST);
      staff.push({
        id: id("u"), title: r.post.includes("TPO") ? "TPL" : pick(["Mr", "Mrs", "Miss"]), firstName: f, lastName: l,
        email: `${f}.${l}.${z.id}@ogpdpa.og.gov.ng`.toLowerCase(), phone: phone(), role: r.role, post: r.post, designation: r.des,
        gradeLevel: r.gl, zoneId: z.id, duties: r.duties, status: "active", joinedAt: `20${int(12, 23)}-0${int(1, 9)}-1${int(0, 9)}`,
      });
    }
  }
  const zStaff = (z: string) => staff.filter((s) => s.zoneId === z);
  const ztpo = (z: string) => zStaff(z).find((s) => s.role === "ZTPO")!;
  const officers = (z: string) => zStaff(z).filter((s) => s.role === "PLANNING_OFFICER");
  const clerk = (z: string) => zStaff(z).find((s) => s.role === "CLERICAL")!;

  const start = new Date(today.getFullYear(), 0, 1);
  const days = differenceInCalendarDays(today, start);
  const applications: Application[] = [];
  const payments: Payment[] = [];
  const cases: EnforcementCase[] = [];
  const petitions: Petition[] = [];
  const s = DEFAULT_SETTINGS;
  const groupWeights: [string, number][] = [["residential", 62], ["fencing", 9], ["commercial", 11], ["public", 3], ["religious", 3], ["mixed_use", 3], ["layout", 2], ["industry", 2], ["factory", 2], ["agricultural", 1], ["recreational", 1], ["farm_tank", 1]];
  const gw = groupWeights.reduce((a, [, w]) => a + w, 0);
  const pickGroup = () => {
    let r = rnd() * gw;
    for (const [g, w] of groupWeights) if ((r -= w) < 0) return g;
    return "residential";
  };
  const seqs: Record<string, number> = {};
  const rcpt = { n: 1000 };

  for (const z of zones) {
    const w = zoneWeight(z.id);
    const speed = zoneSpeed(z.id);
    const towns = zoneTowns(z.id);
    const offs = officers(z.id);
    for (let day = 0; day <= days; day++) {
      const date = addDays(start, day);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue;
      // seasonality: slow Jan, busier mid-year, gentle growth through the year
      const season = 0.75 + 0.35 * Math.sin(((date.getMonth() + 1) / 12) * Math.PI) + day / 900;
      const lambda = 0.48 * w * season;
      const n = Math.floor(lambda) + (chance(lambda % 1) ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const g = pickGroup();
        const grp = USE_GROUPS.find((x) => x.id === g)!;
        const sub = grp.types.length ? pick(grp.types).id : "";
        const floors = g === "fencing" || g === "layout" || g === "farm_tank" ? 1 : g === "residential" ? (sub === "six_plus" ? int(6, 8) : sub === "bungalow" ? 1 : sub === "a_storey" ? 2 : sub === "two_storey" ? 3 : sub === "duplex" ? 2 : sub === "three_storey" ? 4 : 5) : int(1, 4);
        const dev = chance(0.16) ? "developed" : "undeveloped";
        const officer = pick(offs);
        const received = work(date);
        const hist: StatusEvent[] = [{ status: "received", at: iso(received), by: clerk(z.id).id }];
        const app: Application = {
          id: id("a"), zoneId: z.id, applicant: chance(0.12) ? `${pick(LAST)} ${pick(["Ventures", "Properties Ltd", "Holdings", "Ministries", "Estates Ltd"])}` : `${pick(["Mr", "Mrs", "Dr", "Chief", "Miss", "Alhaji"])} ${person()}`,
          phone: phone(), consultant: `TPL ${person()}`, consultantPhone: phone(), location: `${pick(STREETS)}, ${pick(towns)}`,
          useGroup: g, useType: sub, floors, kind: chance(0.06) ? "renovation" : chance(0.04) ? "revalidation" : "new", devStatus: dev,
          status: "received", history: hist, receivedAt: iso(received), officerId: officer.id,
        };
        let t = received;
        const step = (status: StatusEvent["status"], addD: number, by: string, note?: string) => {
          t = work(addDays(t, addD));
          if (t > today) return false;
          hist.push({ status, at: iso(t), by, note });
          if (status !== "expired" && status !== "revalidated") app.status = status;
          return true;
        };
        const flow = () => {
          if (chance(0.04)) { step("pended", int(1, 3), officer.id, "Incomplete documents — survey plan and title missing"); return; }
          if (!step("okayed", int(0, 1), officer.id)) return;
          const fees = defaultFees(app, s, 0.85 + rnd() * 0.4);
          if (!step("assessed", int(0, 1), officer.id)) return;
          app.assessment = { lines: fees, assessedAt: iso(t), expiresAt: iso(addDays(t, s.assessmentValidityDays)), by: officer.id };
          if (chance(0.05)) {
            // lapsed assessment, then reassessed
            if (!step("expired", s.assessmentValidityDays + 1, officer.id, "Assessment lapsed unpaid")) return;
            if (!step("assessed", int(1, 6), officer.id, "Re-assessed")) return;
            app.assessment = { ...app.assessment, assessedAt: iso(t), expiresAt: iso(addDays(t, s.assessmentValidityDays)) };
          }
          if (!step("registered", int(0, 2), clerk(z.id).id, "Payment confirmed")) return;
          const y = t.getFullYear();
          const sk = `${z.id}${y}`;
          seqs[sk] = (seqs[sk] ?? int(10, 30)) + 1;
          app.regNo = makeRegNo(z, y, g, floors, seqs[sk]);
          app.registeredAt = iso(t);
          payments.push({ id: id("p"), zoneId: z.id, source: "application", refId: app.id, lines: fees, amount: lineTotal(fees), paidAt: iso(t), receiptNo: `RCT-${z.code}-${++rcpt.n}`, channel: pick(["bank", "remita", "transfer", "pos"]), by: clerk(z.id).id });
          const slow = (g !== "residential" && g !== "fencing" ? 2 : 0) + (chance(0.12) ? int(3, 9) : 0);
          if (chance(0.025)) { step("pended", int(1, 3), officer.id, "Conditions of approval not met"); return; }
          if (!step("recommended", Math.round(int(0, 3) * speed), officer.id)) return;
          if (chance(0.03)) { step("disapproved", int(0, 2), ztpo(z.id).id, "Contravenes zoning — setback below minimum"); return; }
          if (!step("approved", Math.round(int(0, 3) * speed) + slow, ztpo(z.id).id)) return;
          app.approvalNo = makeApprovalNo(app.regNo);
          app.approvedAt = iso(t);
        };
        flow();
        applications.push(app);
      }

      // Enforcement: illegal developments discovered during sector monitoring
      const el = 0.32 * w * (0.8 + rnd() * 0.4);
      if (chance(el)) {
        const off = pick(offs);
        const opened = work(date);
        const c: EnforcementCase = {
          id: id("e"), caseNo: `${z.code}/ENF/${String(cases.filter((x) => x.zoneId === z.id).length + 1).padStart(3, "0")}`, zoneId: z.id,
          owner: chance(0.3) ? "Unknown developer" : person(), location: `${pick(STREETS)}, ${pick(towns)}`,
          description: pick(["Building without approved plan", "Construction on drainage setback", "Shop erected on road setback", "Unapproved additional floor", "Development on right of way", "Change of use without permit"]),
          useGroup: pick(["residential", "residential", "commercial", "mixed_use", "religious"]), stage: pick(["foundation", "lintel", "roofing", "completed", "occupied"]),
          openedAt: iso(opened), notices: [], sanctions: [], outcome: "open", officerId: off.id,
        };
        let t = opened;
        const depth = chance(0.45) ? 1 : chance(0.55) ? 2 : chance(0.6) ? 3 : chance(0.6) ? 4 : 5;
        for (let i = 0; i < depth; i++) {
          if (t > today) break;
          const type = ESCALATION[i];
          const deadline = addDays(t, type === "stop_work" || type === "seal" ? 3 : 7);
          const complied = deadline < today ? (i === depth - 1 ? chance(0.6) : false) : undefined;
          c.notices.push({ id: id("n"), type, servedAt: iso(t), deadline: iso(deadline), by: off.id, complied });
          t = work(addDays(deadline, int(0, 3)));
        }
        if (chance(0.06) && t <= today) c.notices.push({ id: id("n"), type: pick(["condonation", "revocation", "advice_demolish"] as const), servedAt: iso(t), deadline: iso(addDays(t, 14)), by: off.id });
        const last = c.notices[c.notices.length - 1];
        if (last?.complied) c.outcome = chance(0.5) ? "regularised" : "complied";
        if (depth >= 4 && t <= today) {
          const st = depth === 4 ? "sealing" : chance(0.7) ? "token_demolition" : "total_demolition";
          c.sanctions.push({ id: id("s"), type: st, at: iso(t), by: off.id, approvedBy: ztpo(z.id).id });
          c.outcome = "sanctioned";
          if (st === "sealing" && chance(0.4) && addDays(t, 10) < today) {
            const ut = work(addDays(t, int(5, 15)));
            if (ut <= today) {
              c.sanctions.push({ id: id("s"), type: "unsealing", at: iso(ut), by: off.id, approvedBy: ztpo(z.id).id, note: "Unsealed after payment and regularisation" });
              const fee = int(10, 40) * 5000;
              payments.push({ id: id("p"), zoneId: z.id, source: "enforcement", refId: c.id, lines: [{ head: "unsealing", amount: fee }], amount: fee, paidAt: iso(ut), receiptNo: `RCT-${z.code}-${++rcpt.n}`, channel: "bank", by: clerk(z.id).id });
            }
          }
        }
        cases.push(c);
      }

      // Petitions
      if (chance(0.07 * w)) {
        const rec = work(date);
        const p: Petition = {
          id: id("t"), petitionNo: `${z.code}/PET/${String(petitions.filter((x) => x.zoneId === z.id).length + 1).padStart(3, "0")}`, zoneId: z.id,
          petitioner: person(), against: chance(0.5) ? person() : "Unknown developer", subject: pick(SUBJECTS), location: `${pick(STREETS)}, ${pick(towns)}`,
          receivedAt: iso(rec), status: "registered", assignedTo: pick(offs).id,
        };
        if (chance(0.5)) {
          const fee = 10000;
          p.fee = fee;
          payments.push({ id: id("p"), zoneId: z.id, source: "petition", refId: p.id, lines: [{ head: "petition", amount: fee }], amount: fee, paidAt: iso(rec), receiptNo: `RCT-${z.code}-${++rcpt.n}`, channel: "bank", by: clerk(z.id).id });
        }
        const tt = work(addDays(rec, int(3, 40)));
        if (tt <= today && chance(0.85)) {
          p.status = "treated";
          p.treatedAt = iso(tt);
          p.resolution = pick(["Parties reconciled; setback restored", "Petition upheld; contravention notice served", "Petition dismissed after site inspection", "Referred to Bureau of Lands for title verification"]);
        } else if (chance(0.6)) p.status = "under_review";
        petitions.push(p);
      }
    }
  }

  // Assignments
  const assignments: Assignment[] = [];
  for (const z of zones) {
    for (let i = 0; i < int(5, 9); i++) {
      const created = addDays(start, int(0, days));
      const due = addDays(created, int(3, 21));
      const done = due < today && chance(0.8);
      const fromHQ = chance(0.25);
      assignments.push({
        id: id("g"), zoneId: z.id, title: pick(ASSIGN), description: "Carry out and report findings with photographs and recommendations.",
        assignedBy: fromHQ ? staff[1].id : ztpo(z.id).id, assignedTo: pick(officers(z.id)).id, createdAt: iso(created), due: iso(due),
        status: done ? "done" : due < today ? "in_progress" : chance(0.5) ? "open" : "in_progress", special: chance(0.6),
        outcome: done ? "Completed; findings documented and forwarded." : undefined, doneAt: done ? iso(addDays(due, -int(0, 2))) : undefined,
      });
    }
  }

  // Report submissions for past periods
  const reports: ReportSubmission[] = [];
  const addReports = (kind: PeriodKind, rkind: ReportSubmission["kind"], dueLag: number) => {
    let p = periodOf(kind, start);
    while (p.to < today) {
      for (const z of zones) {
        const dueAt = addDays(p.to, dueLag);
        const r = rnd();
        const late = r < 0.12 + (zoneSpeed(z.id) - 1) * 0.3;
        const status: ReportSubmission["status"] = dueAt > today ? (chance(0.5) ? "submitted" : "draft") : r < 0.04 ? "returned" : r > 0.93 ? "draft" : chance(0.85) ? "acknowledged" : "submitted";
        const sub = addDays(dueAt, late ? int(1, 6) : -int(0, 2));
        reports.push({
          id: `${rkind}:${z.id}:${p.key}`, kind: rkind, zoneId: z.id, periodKey: p.key, status, narrative: {},
          submittedAt: status === "draft" || sub > today ? undefined : iso(sub), submittedBy: ztpo(z.id).id,
          reviewedAt: status === "acknowledged" || status === "returned" ? iso(addDays(sub, int(1, 4))) : undefined,
          reviewedBy: status === "acknowledged" || status === "returned" ? staff[2].id : undefined,
          reviewNote: status === "returned" ? "Revenue narrative inconsistent with Table 4; please review and resubmit." : undefined,
        });
      }
      p = periodOf(kind, addDays(p.to, 1));
    }
  };
  addReports("week", "weekly", 3);
  addReports("month", "monthly", 5);
  addReports("quarter", "quarterly", 15);
  for (const r of reports) if (r.submittedAt && r.status === "draft") r.submittedAt = undefined;

  // Audit trail (recent activity only, to keep storage light)
  const audit: AuditEntry[] = [];
  const since = addDays(today, -21);
  for (const a of applications) {
    for (const h of a.history) {
      if (new Date(h.at) >= since) audit.push({ id: id("l"), at: h.at, by: h.by, zoneId: a.zoneId, action: `status → ${h.status}`, entity: "application", entityId: a.id, detail: a.regNo ?? a.applicant });
    }
  }
  for (const c of cases) for (const n of c.notices) if (new Date(n.servedAt) >= since) audit.push({ id: id("l"), at: n.servedAt, by: n.by, zoneId: c.zoneId, action: `notice served: ${n.type}`, entity: "case", entityId: c.id, detail: c.caseNo });
  audit.sort((a, b) => b.at.localeCompare(a.at));

  return { zones, staff, applications, payments, cases, petitions, assignments, reports, audit };
}
