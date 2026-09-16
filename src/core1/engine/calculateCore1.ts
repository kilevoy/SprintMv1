import { validateCore1Input } from "../compatibility";
import { BrowserCore1DataRepository, BrowserDataSource } from "../data";
import { resolveClimate } from "../climate";
import { createCore1Diagnostic } from "../diagnostics";
import { resolveClimateInput, resolveWindowsInput, validateCore1InputDomain } from "../validation";
import type { Core1DataRepository } from "../data";
import type { Core1Input } from "../types";
import type { Core1EngineResult } from "./types";

function invalidInputResult(errors: unknown[]): Core1EngineResult {
  return {
    status: "invalid_input",
    code: "INVALID_INPUT",
    result: null,
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

function unknownDomainCode(diagnostics: Core1EngineResult["diagnostics"]): "UNKNOWN_CLIMATE_DATA" | "UNKNOWN_DOMAIN" {
  return diagnostics.some((diagnostic) => diagnostic.code === "UNKNOWN_CLIMATE_DATA")
    ? "UNKNOWN_CLIMATE_DATA"
    : "UNKNOWN_DOMAIN";
}

function datasetLoadFailureDiagnostic(error: unknown) {
  return createCore1Diagnostic({
    code: "UNSUPPORTED_FOR_PARITY",
    severity: "unsupported",
    classification: "unsupported",
    module: "DatasetLoading",
    message: "Требуемый static dataset недоступен для доказанного parity; расчёт не выполнялся.",
    source: ["core1/data/manifest.json"],
    details: { error: error instanceof Error ? error.message : String(error) },
  });
}

function datasetLoadFailureResult(error: unknown): Core1EngineResult {
  return {
    status: "unsupported",
    code: "UNSUPPORTED_FOR_PARITY",
    internal_status: "NOT_IMPLEMENTED",
    result: null,
    diagnostics: [datasetLoadFailureDiagnostic(error)],
  };
}

/**
 * Orchestration boundary for Core 1 v1. Engineering modules are intentionally
 * not called yet; supported inputs end in NOT_IMPLEMENTED after lazy loading.
 */
export async function calculateCore1(
  input: unknown,
  repository: Core1DataRepository = new BrowserCore1DataRepository(new BrowserDataSource()),
): Promise<Core1EngineResult> {
  const schemaResult = validateCore1Input(input);
  if (!schemaResult.valid) return invalidInputResult(schemaResult.errors);

  const value = schemaResult.data as Core1Input;
  const domain = validateCore1InputDomain(value);
  if (domain.state === "INVALID_INPUT") {
    return { status: "invalid_input", code: "INVALID_INPUT", result: null, diagnostics: domain.diagnostics };
  }
  if (domain.state === "UNSUPPORTED_FOR_PARITY") {
    return {
      status: "unsupported",
      code: "UNSUPPORTED_FOR_PARITY",
      result: null,
      diagnostics: domain.diagnostics,
    };
  }
  if (domain.state === "CITY_NOT_FOUND") {
    return {
      status: "city_not_found",
      code: "CITY_NOT_FOUND",
      result: null,
      diagnostics: domain.diagnostics,
    };
  }
  if (domain.state === "UNKNOWN_DOMAIN") {
    return {
      status: "unknown_domain",
      code: unknownDomainCode(domain.diagnostics),
      result: null,
      diagnostics: domain.diagnostics,
    };
  }

  const climateInput = resolveClimateInput(value);
  const climateResolution = await (async () => {
    if (climateInput.mode === "MANUAL") return resolveClimate(climateInput);
    try {
      const dataset = await repository.loadClimateDataset("climate_lookup_sparse");
      return resolveClimate(climateInput, dataset);
    } catch {
      return resolveClimate(climateInput);
    }
  })();
  if (climateResolution.status === "city_not_found") {
    return { status: "city_not_found", code: "CITY_NOT_FOUND", result: null, diagnostics: climateResolution.diagnostics };
  }
  if (climateResolution.status === "unknown_climate_data") {
    return { status: "unknown_domain", code: "UNKNOWN_CLIMATE_DATA", result: null, diagnostics: climateResolution.diagnostics };
  }
  if (climateResolution.status !== "success") {
    return { status: "unknown_domain", code: "UNKNOWN_CLIMATE_DATA", result: null, diagnostics: climateResolution.diagnostics };
  }
  const context = { climate: climateResolution.climate };

  try {
    if (domain.state === "SUPPORTED_WITH_LEGACY_ANOMALY") {
      const legacyNa = domain.diagnostics.find((diagnostic) => diagnostic.code === "LEGACY_NA");
      if (legacyNa) {
        try {
          await repository.loadFrameDataset(value.span_m);
        } catch (error) {
          return { status: "legacy_error", code: "LEGACY_NA", result: null, context, diagnostics: [...domain.diagnostics, datasetLoadFailureDiagnostic(error)] };
        }
        return { status: "legacy_error", code: "LEGACY_NA", result: null, context, diagnostics: domain.diagnostics };
      }
      const legacyRef = domain.diagnostics.find((diagnostic) => diagnostic.code === "LEGACY_REF");
      if (legacyRef) {
        try {
          await repository.loadPurlinDataset("purlin_calculation_constants");
        } catch (error) {
          return { status: "legacy_error", code: "LEGACY_REF", result: null, context, diagnostics: [...domain.diagnostics, datasetLoadFailureDiagnostic(error)] };
        }
        return { status: "legacy_error", code: "LEGACY_REF", result: null, context, diagnostics: domain.diagnostics };
      }
    }

    if (resolveWindowsInput(value).enabled) {
      return {
        status: "required_module_not_implemented",
        code: "WINDOW_GIRT_MODULE_NOT_IMPLEMENTED",
        internal_status: "REQUIRED_MODULE_NOT_IMPLEMENTED",
        result: null,
        context,
        diagnostics: [
          ...domain.diagnostics,
          createCore1Diagnostic({
            code: "WINDOW_GIRT_MODULE_NOT_IMPLEMENTED",
            severity: "warning",
            classification: "required_module_not_implemented",
            module: "WindowGirtCalculator",
            message: "Подбор оконных ригелей обязателен, но модуль ещё не реализован.",
            source: ["CORE1_WINDOWS_SUPPORT.md", "CORE1_V1_PLAN.md"],
            legacy_equivalent: null,
            trigger: "windows.enabled=true",
            affected_outputs: ["window_lower_girt_profile", "window_upper_girt_profile", "window_girts_weight_kg", "openings_weight_kg"],
            details: { module_status: "REQUIRED_MODULE_NOT_IMPLEMENTED" },
          }),
        ],
      };
    }

    await Promise.all([
      repository.loadFrameDataset(value.span_m),
      repository.loadPurlinDataset("purlin_calculation_constants"),
    ]);
  } catch (error) {
    return datasetLoadFailureResult(error);
  }

  return {
    status: "required_module_not_implemented",
    code: "NOT_IMPLEMENTED",
    internal_status: "NOT_IMPLEMENTED",
    result: null,
    context,
    diagnostics: [
      ...domain.diagnostics,
      createCore1Diagnostic({
        code: "NOT_IMPLEMENTED",
        severity: "warning",
        classification: "required_module_not_implemented",
        module: "CalculationEngine",
        message: "Расчётные модули Core 1 ещё не реализованы; инженерный результат не подставлен.",
        source: ["CORE1_V1_PLAN.md"],
        details: { next_module: "FrameSelector" },
      }),
    ],
  };
}
