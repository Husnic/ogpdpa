import type { Period } from "@/lib/periods";
import type { Data, ZoneFilter } from "@/lib/selectors";
import type { Zone } from "@/lib/types";

export interface ReportViewProps {
  data: Data;
  z: ZoneFilter;
  period: Period;
  /** e.g. "ODOGBOLU ZONAL PLANNING OFFICE" or consolidated label */
  office: string;
  zone?: Zone;
  narrative: Record<string, string>;
  editable: boolean;
  onNarrative: (key: string, value: string) => void;
  signatory: { name: string; role: string; office: string; date?: string };
}
