export type Core3DiagnosticCode =
  | "CORE3_UNKNOWN_PRODUCT_MARK"
  | "CORE3_GENERIC_PROFILE_MARK_UNSUPPORTED"
  | "CORE3_PRICE_NOT_FOUND"
  | "CORE3_UNIT_UNKNOWN"
  | "CORE3_WALL_GIRT_PRICE_NOT_PROVEN"
  | "CORE3_CORE2_RESULT_REQUIRED"
  | "CORE3_SCOPE_UNSUPPORTED";

export interface Core3Diagnostic {
  code: Core3DiagnosticCode;
  severity: "unsupported" | "warning" | "error";
  message: string;
  component: string;
  details?: Record<string, unknown>;
}

export function core3Diagnostic(
  code: Core3DiagnosticCode,
  message: string,
  component: string,
  details?: Record<string, unknown>,
): Core3Diagnostic {
  return { code, severity: "unsupported", message, component, ...(details ? { details } : {}) };
}
