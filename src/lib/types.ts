export type ID = string;
export type ISODate = string; // yyyy-MM-dd or full ISO timestamp

export type Role = "SUPER_ADMIN" | "HQ_ADMIN" | "HQ_RECORDS" | "ZTPO" | "PLANNING_OFFICER" | "CLERICAL";

export type Post = "PTPO" | "STPO" | "TPO I" | "TPO II" | "HTO" | "CCO" | "DIRECTOR" | "ADMIN" | "RECORDS";

export interface Staff {
  id: ID;
  title: string; // TPL, Mr, Mrs, Miss, Dr
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  post: Post;
  designation?: string; // ZTPO, Deputy ZTPO
  gradeLevel: number;
  zoneId: ID | null; // null = HQ
  duties: string[];
  status: "active" | "suspended";
  actingZtpo?: boolean;
  joinedAt: ISODate;
}

export interface Zone {
  id: ID;
  name: string;
  code: string;
  office: string;
  lgas: string[];
  established: string;
  address: string;
  phone: string;
  towns: string;
  boundaries: string;
}

export type AppStatus = "received" | "okayed" | "assessed" | "registered" | "recommended" | "approved" | "disapproved" | "pended";
export type AppKind = "new" | "renovation" | "revalidation";
export type DevStatus = "undeveloped" | "developed";

export interface StatusEvent {
  status: AppStatus | "expired" | "revalidated";
  at: ISODate;
  by: ID;
  note?: string;
}

export interface FeeLine {
  head: FeeHead;
  amount: number;
}

export type FeeHead =
  | "basic"
  | "fencing"
  | "layout"
  | "tp_admin"
  | "fitness"
  | "stage"
  | "idc"
  | "spatial"
  | "penal"
  | "petition"
  | "unsealing";

export interface Assessment {
  lines: FeeLine[];
  assessedAt: ISODate;
  expiresAt: ISODate;
  by: ID;
}

export interface Payment {
  id: ID;
  zoneId: ID;
  source: "application" | "petition" | "enforcement";
  refId: ID;
  lines: FeeLine[];
  amount: number;
  paidAt: ISODate;
  receiptNo: string;
  channel: "bank" | "pos" | "transfer" | "remita";
  by: ID;
}

export interface Application {
  id: ID;
  zoneId: ID;
  applicant: string;
  phone: string;
  consultant: string;
  consultantPhone: string;
  location: string;
  useGroup: string; // catalog group id
  useType: string; // catalog sub-type id
  floors: number;
  kind: AppKind;
  devStatus: DevStatus;
  status: AppStatus;
  history: StatusEvent[];
  assessment?: Assessment;
  regNo?: string;
  approvalNo?: string;
  receivedAt: ISODate;
  registeredAt?: ISODate;
  approvedAt?: ISODate;
  officerId: ID;
  remarks?: string;
}

export type NoticeType =
  | "contravention"
  | "stop_work"
  | "quit"
  | "seal"
  | "demolition"
  | "condonation"
  | "revocation"
  | "advice_demolish";

export type SanctionType = "token_demolition" | "total_demolition" | "sealing" | "unsealing";

export interface Notice {
  id: ID;
  type: NoticeType;
  servedAt: ISODate;
  deadline: ISODate;
  by: ID;
  complied?: boolean;
}

export interface Sanction {
  id: ID;
  type: SanctionType;
  at: ISODate;
  by: ID;
  approvedBy?: ID;
  note?: string;
}

export interface EnforcementCase {
  id: ID;
  caseNo: string;
  zoneId: ID;
  owner: string;
  location: string;
  description: string;
  useGroup: string;
  stage: "foundation" | "lintel" | "roofing" | "completed" | "occupied";
  openedAt: ISODate;
  notices: Notice[];
  sanctions: Sanction[];
  outcome: "open" | "complied" | "regularised" | "sanctioned" | "revoked";
  officerId: ID;
}

export interface Petition {
  id: ID;
  petitionNo: string;
  zoneId: ID;
  petitioner: string;
  against: string;
  subject: string;
  location: string;
  receivedAt: ISODate;
  status: "registered" | "under_review" | "treated";
  assignedTo?: ID;
  resolution?: string;
  treatedAt?: ISODate;
  fee?: number;
}

export interface Assignment {
  id: ID;
  zoneId: ID | null;
  title: string;
  description: string;
  assignedBy: ID;
  assignedTo: ID;
  createdAt: ISODate;
  due: ISODate;
  status: "open" | "in_progress" | "done";
  special: boolean;
  outcome?: string;
  doneAt?: ISODate;
}

export type ReportKind = "weekly" | "monthly" | "quarterly";
export type ReportStatus = "draft" | "submitted" | "returned" | "acknowledged";

export interface ReportSubmission {
  id: ID; // `${kind}:${zoneId}:${periodKey}`
  kind: ReportKind;
  zoneId: ID;
  periodKey: string; // 2026-W47 | 2026-09 | 2026-Q3
  status: ReportStatus;
  narrative: Record<string, string>;
  submittedAt?: ISODate;
  submittedBy?: ID;
  reviewedAt?: ISODate;
  reviewedBy?: ID;
  reviewNote?: string;
  snapshot?: unknown;
}

export interface AuditEntry {
  id: ID;
  at: ISODate;
  by: ID;
  zoneId: ID | null;
  action: string;
  entity: string;
  entityId: ID;
  detail?: string;
}

export interface Settings {
  assessmentValidityDays: number;
  processingTargetDays: number;
  backlogDays: number;
  feeRates: Record<string, number>; // per use group base rate per floor (₦)
  tpAdminPct: number;
  penalPct: number;
}

export interface Notification {
  id: ID;
  at: ISODate;
  to: ID | "HQ" | `ZONE:${string}`;
  text: string;
  href?: string;
  read?: boolean;
}
