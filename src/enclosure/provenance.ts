export type EnclosureEvidenceStatus =
  | "LEGACY_PROVEN"
  | "REAL_PROJECT_VALIDATED"
  | "ENHANCED"
  | "MANUAL"
  | "PROJECT_SPECIFIC"
  | "PARTIAL"
  | "UNKNOWN";

export interface EnclosureProvenance {
  status: EnclosureEvidenceStatus;
  sourceWorkbook?: string;
  sourceSheet?: string;
  sourceCell?: string;
  formula?: string;
  projectId?: string;
  fixtureId?: string;
  note?: string;
}

