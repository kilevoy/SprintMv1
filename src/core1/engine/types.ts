import type { Core1ClimateResult, Core1Diagnostic, Core1Result } from "../types";
import type { FrameResult } from "../frame";
import type { PurlinResultValue } from "../purlin";
import type { SecondarySteelResult } from "../secondary";
import type { WindowGirtResult } from "../window";
import type { OpeningMassResult } from "../opening";
import type { LegacyClimateResult, LegacyFrameBranchResult } from "../legacy";
import type { LegacyConnectionResolvedValue } from "../legacyConnection";

export type Core1EngineStatus =
  | "success"
  | "legacy_error"
  | "unsupported"
  | "invalid_input"
  | "unknown_domain"
  | "city_not_found"
  | "required_module_not_implemented";

export type Core1EngineCode =
  | "LEGACY_NA"
  | "LEGACY_REF"
  | "LEGACY_VALUE_ERROR"
  | "UNSUPPORTED_WINDOWS"
  | "UNKNOWN_CLIMATE_DATA"
  | "UNKNOWN_DOMAIN"
  | "CITY_NOT_FOUND"
  | "INVALID_INPUT"
  | "NOT_IMPLEMENTED"
  | "UNSUPPORTED_FOR_PARITY";

export interface Core1EngineBase {
  status: Core1EngineStatus;
  diagnostics: Core1Diagnostic[];
  context?: { climate: Core1ClimateResult; legacyClimate?: LegacyClimateResult | null; legacyFrameBranch?: LegacyFrameBranchResult | null; legacyConnection?: LegacyConnectionResolvedValue | null; frame?: FrameResult; purlin?: PurlinResultValue; secondarySteel?: SecondarySteelResult; windows?: WindowGirtResult | null; openings?: OpeningMassResult | null };
}

export interface Core1EngineSuccess extends Core1EngineBase {
  status: "success";
  result: Core1Result;
}

export interface Core1EngineLegacyError extends Core1EngineBase {
  status: "legacy_error";
  code: "LEGACY_NA" | "LEGACY_REF" | "LEGACY_VALUE_ERROR";
  result: null;
}

export interface Core1EngineUnsupported extends Core1EngineBase {
  status: "unsupported";
  code: "UNSUPPORTED_FOR_PARITY" | "NOT_IMPLEMENTED";
  internal_status?: "NOT_IMPLEMENTED";
  result: null;
}

export interface Core1EngineInvalidInput extends Core1EngineBase {
  status: "invalid_input";
  code: "INVALID_INPUT";
  result: null;
}

export interface Core1EngineUnknownDomain extends Core1EngineBase {
  status: "unknown_domain";
  code: "UNKNOWN_CLIMATE_DATA" | "UNKNOWN_DOMAIN";
  result: null;
}

export interface Core1EngineCityNotFound extends Core1EngineBase {
  status: "city_not_found";
  code: "CITY_NOT_FOUND";
  result: null;
}

export interface Core1EngineRequiredModuleNotImplemented extends Core1EngineBase {
  status: "required_module_not_implemented";
  code: "NOT_IMPLEMENTED";
  internal_status: "REQUIRED_MODULE_NOT_IMPLEMENTED" | "NOT_IMPLEMENTED";
  result: null;
}

export type Core1EngineResult =
  | Core1EngineSuccess
  | Core1EngineLegacyError
  | Core1EngineUnsupported
  | Core1EngineInvalidInput
  | Core1EngineUnknownDomain
  | Core1EngineCityNotFound
  | Core1EngineRequiredModuleNotImplemented;
