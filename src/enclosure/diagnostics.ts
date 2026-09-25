import type { EnclosureProvenance } from "./provenance";

export type EnclosureDiagnosticCode =
  | "ENCLOSURE_RULE_NOT_IMPLEMENTED"
  | "ENCLOSURE_SOURCE_EVIDENCE_MISSING"
  | "ENCLOSURE_WALL_GIRT_NOT_PROVEN"
  | "ENCLOSURE_OPENING_FRAMING_NOT_PROVEN"
  | "ENCLOSURE_STUD_RULE_NOT_PROVEN"
  | "ENCLOSURE_INPUT_INVALID"
  | "ENCLOSURE_OPENINGS_UNSUPPORTED"
  | "ENCLOSURE_PLUS_STUDS_UNSUPPORTED"
  | "ENCLOSURE_AUTO_GIRT_SELECTION_NOT_IMPLEMENTED"
  | "ENCLOSURE_AUTO_NO_VALID_CANDIDATE"
  | "ENCLOSURE_AUTO_DOMAIN_UNSUPPORTED"
  | "ENCLOSURE_AUTO_PLUS_STUDS_UNSUPPORTED"
  | "ENCLOSURE_AUTO_SOURCE_INPUT_MISSING"
  | "ENCLOSURE_INVALID_MANUAL_GIRT_INPUT"
  | "ENCLOSURE_PROFILE_NOT_FOUND"
  | "ENCLOSURE_SECTION_TYPE_UNSUPPORTED"
  | "ENCLOSURE_ENVELOPE_SYSTEM_UNSUPPORTED"
  | "ENCLOSURE_GEOMETRY_INPUT_INVALID"
  | "ENCLOSURE_PROJECT_GEOMETRY_REQUIRED"
  | "ENCLOSURE_WALL_GIRT_RUNTIME_REQUIRED"
  | "ENCLOSURE_SANDWICH_HORIZONTAL_GIRTS_SKIPPED"
  | "ENCLOSURE_MATERIAL_MASS_NOT_PROVEN";

export interface EnclosureDiagnostic {
  code: EnclosureDiagnosticCode;
  severity: "unsupported" | "warning" | "error";
  message: string;
  component: string;
  source?: EnclosureProvenance[];
  details?: Record<string, unknown>;
}

export function enclosureDiagnostic(
  code: EnclosureDiagnosticCode,
  message: string,
  component: string,
  details?: Record<string, unknown>,
): EnclosureDiagnostic {
  return { code, severity: "unsupported", message, component, ...(details ? { details } : {}) };
}
