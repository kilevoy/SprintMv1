export type LegacyErrorKind = "LEGACY_NA" | "LEGACY_REF" | "LEGACY_VALUE" | "LEGACY_DIV0";
export type ExcelError = "#N/A" | "#REF!" | "#VALUE!" | "#DIV/0!";
export type DiagnosticSeverity = "warning" | "unsupported" | "error";

export type Core1DiagnosticCode =
  | "PURLIN_STEP_500_REF"
  | "SPAN_24_LEGACY_NA"
  | "WINDOW_EN_SWITCH_UNREACHABLE"
  | "WINDOW_LEGACY_SOURCE_UNAVAILABLE"
  | "WINDOW_CITY_DATASET_VERSION_CONFLICT"
  | "WINDOW_EN_INPUT_SOURCE_UNAVAILABLE"
  | "LOOKUP_NO_MATCH"
  | "NO_ELIGIBLE_PROFILE"
  | "LEGACY_VALUE_ERROR"
  | "LEGACY_DIV_ZERO"
  | "INPUT_DOMAIN_UNKNOWN";

export interface Core1Diagnostic {
  code: Core1DiagnosticCode;
  excel_error: ExcelError | null;
  module: string;
  source_cells: string[];
  trigger?: string | null;
  affected_outputs?: string[];
  severity: DiagnosticSeverity;
  message_ru: string;
}

export const LEGACY_ERROR_TO_EXCEL: Readonly<Record<LegacyErrorKind, ExcelError>> = {
  LEGACY_NA: "#N/A",
  LEGACY_REF: "#REF!",
  LEGACY_VALUE: "#VALUE!",
  LEGACY_DIV0: "#DIV/0!",
};
