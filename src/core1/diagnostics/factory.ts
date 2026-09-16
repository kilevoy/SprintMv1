import type {
  Core1Diagnostic,
  Core1DiagnosticCode,
  DiagnosticClassification,
  DiagnosticSeverity,
  ExcelError,
} from "../types";

export interface DiagnosticInput {
  code: Core1DiagnosticCode;
  severity: DiagnosticSeverity;
  message: string;
  source: string[];
  legacy_equivalent?: string | null;
  details?: Record<string, unknown>;
  excel_error?: ExcelError | null;
  classification?: DiagnosticClassification;
  affected_outputs?: string[];
  trigger?: string | null;
  module: string;
}

export function createCore1Diagnostic(input: DiagnosticInput): Core1Diagnostic {
  return {
    code: input.code,
    excel_error: input.excel_error ?? null,
    module: input.module,
    source_cells: input.source,
    trigger: input.trigger ?? null,
    affected_outputs: input.affected_outputs ?? [],
    severity: input.severity,
    message_ru: input.message,
    message: input.message,
    source: input.source,
    legacy_equivalent: input.legacy_equivalent ?? null,
    details: input.details ?? {},
    classification: input.classification ?? input.severity,
  };
}
