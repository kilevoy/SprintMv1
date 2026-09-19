import type { EnclosureProvenance } from "./provenance";

export type EnclosureDiagnosticCode =
  | "ENCLOSURE_RULE_NOT_IMPLEMENTED"
  | "ENCLOSURE_SOURCE_EVIDENCE_MISSING"
  | "ENCLOSURE_WALL_GIRT_NOT_PROVEN"
  | "ENCLOSURE_OPENING_FRAMING_NOT_PROVEN"
  | "ENCLOSURE_STUD_RULE_NOT_PROVEN"
  | "ENCLOSURE_INPUT_INVALID";

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

