export type LegacyErrorKind = "LEGACY_NA" | "LEGACY_REF" | "LEGACY_VALUE" | "LEGACY_DIV0";
export type ExcelError = "#N/A" | "#REF!" | "#VALUE!" | "#DIV/0!";
export type DiagnosticSeverity = "warning" | "unsupported" | "error";
export type DiagnosticClassification =
  | "legacy_anomaly"
  | "error"
  | "warning"
  | "unsupported"
  | "required_module_not_implemented";

export type Core1DiagnosticCode =
  | "LEGACY_NA"
  | "LEGACY_REF"
  | "UNSUPPORTED_WINDOWS"
  | "UNKNOWN_CLIMATE_DATA"
  | "UNKNOWN_DOMAIN"
  | "INVALID_INPUT"
  | "NOT_IMPLEMENTED"
  | "CITY_NOT_FOUND"
  | "UNKNOWN_WINDOW_DOMAIN"
  | "UNSUPPORTED_FOR_PARITY"
  | "PURLIN_STEP_500_REF"
  | "SPAN_24_LEGACY_NA"
  | "WINDOW_EN_SWITCH_UNREACHABLE"
  | "WINDOW_CITY_DATASET_VERSION_CONFLICT"
  | "WINDOW_EN_INPUT_SOURCE_UNAVAILABLE"
  | "LOOKUP_NO_MATCH"
  | "NO_ELIGIBLE_PROFILE"
  | "LEGACY_VALUE_ERROR"
  | "LEGACY_DIV_ZERO"
  | "INPUT_DOMAIN_UNKNOWN"
  | "FRAME_NO_MATCH"
  | "FRAME_LEGACY_NA"
  | "UNKNOWN_FRAME_DOMAIN"
  | "INVALID_FRAME_INPUT"
  | "CORE1_OPENINGS_NOT_REPRESENTABLE"
  | "CORE1_GATE_CLASSIFICATION_UNVERIFIED";

export interface Core1Diagnostic {
  code: Core1DiagnosticCode;
  excel_error: ExcelError | null;
  module: string;
  source_cells: string[];
  trigger?: string | null;
  affected_outputs?: string[];
  severity: DiagnosticSeverity;
  message_ru: string;
  message?: string;
  source?: string[];
  legacy_equivalent?: string | null;
  details?: Record<string, unknown>;
  classification?: DiagnosticClassification;
}

export const LEGACY_ERROR_TO_EXCEL: Readonly<Record<LegacyErrorKind, ExcelError>> = {
  LEGACY_NA: "#N/A",
  LEGACY_REF: "#REF!",
  LEGACY_VALUE: "#VALUE!",
  LEGACY_DIV0: "#DIV/0!",
};
