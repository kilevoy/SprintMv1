import { validateCore1Input } from "../compatibility";
import { createCore1Diagnostic } from "../diagnostics";
import type { ClimateInput, Core1Diagnostic, Core1Input, NormativeSystem, WindowsInput } from "../types";

export type Core1InputDomainState =
  | "VALID"
  | "SUPPORTED_WITH_LEGACY_ANOMALY"
  | "UNSUPPORTED_FOR_PARITY"
  | "UNKNOWN_DOMAIN"
  | "CITY_NOT_FOUND"
  | "INVALID_INPUT";

export interface Core1InputDomainResult {
  state: Core1InputDomainState;
  diagnostics: Core1Diagnostic[];
}

export function resolveWindowsInput(input: Core1Input): WindowsInput {
  if (input.windows) return input.windows;
  const height = input.window_height_m ?? 0;
  const stripLength = input.window_strip_length_m ?? 0;
  const separateCount = input.separate_windows_count ?? 0;
  return {
    enabled: height > 0 || stripLength > 0 || separateCount > 0,
    window_type: input.window_type ?? 1,
    window_height_m: height,
    window_strip_length_m: stripLength,
    separate_window_count: separateCount,
    glazing_construction: input.window_construction ?? "2ой стеклопакет",
  };
}

function legacyNormativeSystem(input: Core1Input): NormativeSystem {
  if (input.normative_system) return input.normative_system;
  return input.normative_branch === "по СП РК EN" ? "SP_RK_EN" : "SP_20";
}

export function resolveClimateInput(input: Core1Input): ClimateInput {
  if (input.climate) return input.climate;
  return {
    mode: "CITY_LOOKUP",
    country: input.country ?? "RU",
    city: input.city ?? "",
    normative_system: legacyNormativeSystem(input),
  };
}

function invalidInputResult(errors: unknown[]): Core1InputDomainResult {
  return {
    state: "INVALID_INPUT",
    diagnostics: [
      createCore1Diagnostic({
        code: "INVALID_INPUT",
        severity: "error",
        classification: "error",
        module: "InputValidation",
        message: "Входные данные не соответствуют схеме Core1Input.",
        source: ["Core1Input.schema.json"],
        details: { schema_errors: errors },
      }),
    ],
  };
}

export function validateCore1InputDomain(input: unknown): Core1InputDomainResult {
  const schemaResult = validateCore1Input(input);
  if (!schemaResult.valid) return invalidInputResult(schemaResult.errors);
  const value = schemaResult.data as Core1Input;
  const diagnostics: Core1Diagnostic[] = [];
  if (value.span_m === 24) {
    diagnostics.push(
      createCore1Diagnostic({
        code: "LEGACY_NA",
        severity: "error",
        classification: "legacy_anomaly",
        module: "FrameSelector",
        message: "Для пролёта 24 м сохраняется активная legacy-ветка #N/A.",
        source: ["24м", "LEGACY_ERROR_CONTRACT.md"],
        legacy_equivalent: "#N/A",
        excel_error: "#N/A",
        trigger: "span_m=24",
        affected_outputs: ["beam_profile", "column_profile", "kg_per_m2"],
        details: { span_m: 24 },
      }),
    );
  }

  if (value.purlin_max_step_override_mm === 500) {
    diagnostics.push(
      createCore1Diagnostic({
        code: "LEGACY_REF",
        severity: "error",
        classification: "legacy_anomaly",
        module: "PurlinCalculator",
        message: "При шаге прогона 500 мм сохраняется legacy-условие #REF!.",
        source: ["Расчеты*!B73:B76", "Расчеты*!B128:B131", "LEGACY_ERROR_CONTRACT.md"],
        legacy_equivalent: "#REF!",
        excel_error: "#REF!",
        trigger: "purlin_max_step_override_mm=500",
        affected_outputs: ["purlin_profile", "purlin_step_mm", "purlin_kg_per_m2", "purlin_weight_kg", "kg_per_m2"],
        details: { purlin_max_step_override_mm: 500 },
      }),
    );
  }

  const unknownNumericDomain =
    value.building_length_m !== 18 ||
    value.building_height_m !== 3 ||
    value.gates_le_6m_count !== 0 ||
    value.gates_gt_6m_count !== 0 ||
    value.doors_count !== 0 ||
    (value.frame_step_override_m !== undefined && value.frame_step_override_m !== null && value.frame_step_override_m !== 0) ||
    (value.purlin_max_step_override_mm !== undefined && value.purlin_max_step_override_mm !== null && value.purlin_max_step_override_mm !== 0 && value.purlin_max_step_override_mm !== 500) ||
    (value.purlin_min_step_mm !== undefined && value.purlin_min_step_mm !== 0);
  if (unknownNumericDomain) {
    diagnostics.push(
      createCore1Diagnostic({
        code: "UNKNOWN_DOMAIN",
        severity: "unsupported",
        classification: "unsupported",
        module: "InputValidation",
        message: "Числовое значение находится вне доказанного domain Core 1 v1.",
        source: ["CORE1_SUPPORTED_DOMAIN.md", "CORE1_INPUT_CONTRACT.md"],
        legacy_equivalent: null,
        trigger: "length/height/opening counts/manual frame step/purlin override is outside proven fixture domain",
        affected_outputs: ["frame_step_m", "beam_profile", "column_profile", "purlin_profile", "openings_weight_kg", "kg_per_m2"],
        details: {
          building_length_m: value.building_length_m,
          building_height_m: value.building_height_m,
          gates_le_6m_count: value.gates_le_6m_count,
          gates_gt_6m_count: value.gates_gt_6m_count,
          doors_count: value.doors_count,
          frame_step_override_m: value.frame_step_override_m ?? null,
          purlin_max_step_override_mm: value.purlin_max_step_override_mm ?? null,
          purlin_min_step_mm: value.purlin_min_step_mm ?? null,
        },
      }),
    );
  }

  if (diagnostics.some((diagnostic) => diagnostic.code === "UNKNOWN_DOMAIN")) return { state: "UNKNOWN_DOMAIN", diagnostics };
  if (diagnostics.some((diagnostic) => diagnostic.classification === "legacy_anomaly")) return { state: "SUPPORTED_WITH_LEGACY_ANOMALY", diagnostics };
  return { state: "VALID", diagnostics };
}
