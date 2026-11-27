import type { AppStatus, FeeHead, NoticeType, Role, SanctionType } from "./types";

export interface UseGroup {
  id: string;
  label: string;
  code: string; // numbering code
  special: boolean; // simple vs special application
  types: { id: string; label: string }[];
}

/** Type-of-use catalogue — merged from legacy enums + quarterly "Approval by Use" sheet. */
export const USE_GROUPS: UseGroup[] = [
  {
    id: "residential",
    label: "Residential",
    code: "R",
    special: false,
    types: [
      { id: "bungalow", label: "Bungalow" },
      { id: "a_storey", label: "A-Storey" },
      { id: "two_storey", label: "2-Storey" },
      { id: "three_storey", label: "3-Storey" },
      { id: "four_storey", label: "4-Storey" },
      { id: "duplex", label: "Duplex" },
      { id: "six_plus", label: "Six Floors & Above" },
    ],
  },
  {
    id: "commercial",
    label: "Commercial",
    code: "C",
    special: true,
    types: [
      { id: "shopping_complex", label: "Shopping Complex" },
      { id: "office_complex", label: "Office Complex" },
      { id: "warehouse", label: "Warehouse" },
      { id: "shops", label: "Shops (Condonation Approval)" },
      { id: "hotel", label: "Hotel" },
      { id: "hostel", label: "Hostel" },
      { id: "banks", label: "Banks" },
      { id: "eateries", label: "Eateries" },
      { id: "petrol_station", label: "Petrol Filling Station" },
      { id: "lpg", label: "LPG" },
      { id: "cng", label: "CNG" },
    ],
  },
  {
    id: "public",
    label: "Public / Institutional",
    code: "P",
    special: true,
    types: [
      { id: "institutional", label: "Institutional" },
      { id: "nursery_primary", label: "Nursery & Primary School" },
      { id: "secondary", label: "Secondary School" },
      { id: "higher", label: "Higher Institution" },
      { id: "hospital", label: "Hospital / Clinics" },
    ],
  },
  {
    id: "religious",
    label: "Religious",
    code: "RG",
    special: true,
    types: [
      { id: "church", label: "Church" },
      { id: "mosque", label: "Mosque" },
      { id: "traditional", label: "Traditional / Shrine" },
    ],
  },
  { id: "recreational", label: "Recreational", code: "RC", special: true, types: [] },
  { id: "agricultural", label: "Agricultural", code: "AG", special: true, types: [] },
  { id: "factory", label: "Factory", code: "F", special: true, types: [] },
  { id: "industry", label: "Industry", code: "I", special: true, types: [] },
  { id: "farm_tank", label: "Farm Tank", code: "FT", special: true, types: [] },
  { id: "layout", label: "Lay-out", code: "L", special: true, types: [] },
  { id: "mixed_use", label: "Mixed-use", code: "MU", special: true, types: [] },
  { id: "fencing", label: "Fencing Permit", code: "WF", special: false, types: [] },
];

export const findUseGroup = (id: string) => USE_GROUPS.find((g) => g.id === id)!;
export const labelOfUse = (group: string, type?: string) => {
  const g = findUseGroup(group);
  if (!g) return group;
  const t = g.types.find((x) => x.id === type);
  return t ? t.label : g.label;
};

export const FEE_HEADS: { id: FeeHead; label: string; short: string }[] = [
  { id: "basic", label: "Basic Assessment (Building Plan)", short: "Basic Assessment" },
  { id: "fencing", label: "Fencing Fee", short: "Fencing" },
  { id: "layout", label: "Layout Fee", short: "Layout" },
  { id: "tp_admin", label: "10% TP Admin Charge", short: "10% TP Admin" },
  { id: "fitness", label: "Certificate of Fitness", short: "C of F" },
  { id: "stage", label: "Stage / Inspection Certification", short: "Stage Cert." },
  { id: "idc", label: "Infrastructure Development Charge", short: "I.D.C" },
  { id: "spatial", label: "Spatial Enhancement", short: "Spatial" },
  { id: "penal", label: "Penal Fee", short: "Penal" },
  { id: "petition", label: "Petition Fee", short: "Petition" },
  { id: "unsealing", label: "Unsealing Fee", short: "Unsealing" },
];
export const feeLabel = (h: FeeHead) => FEE_HEADS.find((f) => f.id === h)?.short ?? h;

export const STATUS_META: Record<AppStatus, { label: string; tone: Tone }> = {
  received: { label: "Received", tone: "neutral" },
  okayed: { label: "Okayed", tone: "info" },
  assessed: { label: "Assessed", tone: "info" },
  registered: { label: "Registered", tone: "brand" },
  recommended: { label: "Recommended", tone: "brand" },
  approved: { label: "Approved", tone: "good" },
  disapproved: { label: "Disapproved", tone: "critical" },
  pended: { label: "Pended", tone: "warning" },
};

export type Tone = "neutral" | "info" | "brand" | "good" | "warning" | "critical";

export const NOTICE_TYPES: { id: NoticeType; label: string; short: string; days: number }[] = [
  { id: "contravention", label: "Notice of Contravention", short: "Contravention", days: 7 },
  { id: "stop_work", label: "Notice of Stop-Work / Use", short: "Stop-Work", days: 3 },
  { id: "quit", label: "Notice to Quit Building / Structure / Site", short: "Quit", days: 7 },
  { id: "seal", label: "Notice of Sealing", short: "Sealing", days: 3 },
  { id: "demolition", label: "Notice of Demolition", short: "Demolition", days: 7 },
  { id: "condonation", label: "Letter of Condonation", short: "Condonation", days: 14 },
  { id: "revocation", label: "Revocation of Planning Permit", short: "Revocation", days: 14 },
  { id: "advice_demolish", label: "Advice to Demolish Building / Structure", short: "Advice to Demolish", days: 14 },
];
export const noticeLabel = (t: NoticeType) => NOTICE_TYPES.find((n) => n.id === t)?.short ?? t;
export const OUTCOME_TONE = { open: "info", complied: "good", regularised: "good", sanctioned: "critical", revoked: "warning" } as const satisfies Record<string, Tone>;

export const PETITION_STATUS = {
  registered: { label: "Registered", tone: "info" },
  under_review: { label: "Under review", tone: "warning" },
  treated: { label: "Treated", tone: "good" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const REPORT_STATUS = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Awaiting HQ review", tone: "info" },
  returned: { label: "Returned", tone: "critical" },
  acknowledged: { label: "Acknowledged", tone: "good" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const ESCALATION: NoticeType[] = ["contravention", "stop_work", "quit", "seal", "demolition"];

export const SANCTION_TYPES: { id: SanctionType; label: string }[] = [
  { id: "token_demolition", label: "Token Demolition" },
  { id: "total_demolition", label: "Total Demolition" },
  { id: "sealing", label: "Sealing" },
  { id: "unsealing", label: "Unsealing" },
];
export const sanctionLabel = (t: SanctionType) => SANCTION_TYPES.find((s) => s.id === t)?.label ?? t;

export const ROLE_META: Record<Role, { label: string; short: string; hq: boolean }> = {
  SUPER_ADMIN: { label: "System Administrator", short: "Super Admin", hq: true },
  HQ_ADMIN: { label: "HQ Director", short: "HQ Director", hq: true },
  HQ_RECORDS: { label: "Research & Records Officer", short: "HQ Records", hq: true },
  ZTPO: { label: "Zonal Town Planning Officer", short: "ZTPO", hq: false },
  PLANNING_OFFICER: { label: "Planning Officer", short: "Planning Officer", hq: false },
  CLERICAL: { label: "Clerical Officer", short: "Clerical", hq: false },
};

/** Categorical chart palette — validated (light, surface #fff): adjacent CVD ΔE ≥ 10.7, normal ≥ 22.4, all ≥ 3:1. */
export const SERIES = ["#178a4f", "#3b6fd8", "#c08a2e", "#8a5aa6", "#0a9c8c", "#d0583e"];
/** Sequential green ramp for map choropleth & heatmaps (near-zero → high). */
export const SEQ = ["#eef2ec", "#d4eadb", "#aedbbf", "#82c79e", "#53ad7b", "#2b9461", "#17794a", "#0d5c36"];
