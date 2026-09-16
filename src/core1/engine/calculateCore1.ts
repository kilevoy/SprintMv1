import { validateCore1Input } from "../compatibility";
import { BrowserCore1DataRepository, BrowserDataSource } from "../data";
import { resolveClimate } from "../climate";
import { selectFrame } from "../frame";
import { calculatePurlin } from "../purlin";
import { calculateSecondarySteel } from "../secondary";
import { createCore1Diagnostic } from "../diagnostics";
import { resolveClimateInput, resolveWindowsInput, validateCore1InputDomain } from "../validation";
import type { Core1DataRepository } from "../data";
import type { Core1ClimateResult, Core1Input } from "../types";
import type { FrameResult } from "../frame";
import type { PurlinDatasetBundle, PurlinResultValue } from "../purlin";
import type { SecondarySteelResult } from "../secondary";
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
 * Orchestration boundary for Core 1 v1. Climate, frame and purlin modules are
 * executed; later modules keep the typed NOT_IMPLEMENTED boundary.
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
  let finalContext: { climate: Core1ClimateResult; frame?: FrameResult; purlin?: PurlinResultValue; secondarySteel?: SecondarySteelResult } = context;

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

    const frameDataset = await repository.loadFrameDataset(value.span_m);
    const frameResolution = selectFrame(
      {
        span_m: value.span_m,
        building_height_m: value.building_height_m,
        responsibility_factor: value.responsibility_factor,
        frame_step_override_m: value.frame_step_override_m ?? null,
        climate: context.climate,
      },
      frameDataset,
    );
    if (frameResolution.status === "legacy_na") {
      return { status: "legacy_error", code: "LEGACY_NA", result: null, context, diagnostics: [...domain.diagnostics, ...frameResolution.diagnostics] };
    }
    if (frameResolution.status === "invalid_input") {
      return { status: "invalid_input", code: "INVALID_INPUT", result: null, context, diagnostics: [...domain.diagnostics, ...frameResolution.diagnostics] };
    }
    if (frameResolution.status === "unknown_domain") {
      return { status: "unknown_domain", code: "UNKNOWN_DOMAIN", result: null, context, diagnostics: [...domain.diagnostics, ...frameResolution.diagnostics] };
    }
    if (frameResolution.status === "no_match") {
      return { status: "unsupported", code: "UNSUPPORTED_FOR_PARITY", result: null, context, diagnostics: [...domain.diagnostics, ...frameResolution.diagnostics] };
    }
    if (frameResolution.status !== "success" || !frameResolution.frame) {
      return { status: "unsupported", code: "UNSUPPORTED_FOR_PARITY", result: null, context, diagnostics: [...domain.diagnostics, ...frameResolution.diagnostics] };
    }
    const frameContext = { ...context, frame: frameResolution.frame };
    let purlinBundle: PurlinDatasetBundle;
    try {
      const [selectionRules, profileCatalogue, calculationAxis, calculationConstants, literals, steelGrades, roofProperties, deckProperties] = await Promise.all([
        repository.loadPurlinDataset("purlin_selection_rules"),
        repository.loadPurlinDataset("purlin_profile_catalogue"),
        repository.loadPurlinDataset("purlin_calculation_axis"),
        repository.loadPurlinDataset("purlin_calculation_constants"),
        repository.loadPurlinDataset("purlin_literals"),
        repository.loadPurlinDataset("purlin_steel_grades"),
        repository.loadRoofProperties(),
        repository.loadDeckProperties(),
      ]);
      purlinBundle = { selectionRules, profileCatalogue, calculationAxis, calculationConstants, literals, steelGrades, roofProperties, deckProperties };
    } catch (error) {
      return datasetLoadFailureResult(error);
    }
    const purlinResolution = calculatePurlin(
      {
        span_m: value.span_m,
        building_length_m: value.building_length_m,
        responsibility_factor: value.responsibility_factor,
        roof_covering: value.roof_covering,
        roof_deck_grade: value.roof_deck_grade,
        snow_retention_purlin: value.snow_retention_purlin,
        enclosure_purlin: value.enclosure_purlin,
        purlin_max_step_override_mm: value.purlin_max_step_override_mm ?? null,
        purlin_min_step_mm: value.purlin_min_step_mm ?? 0,
        building_roof_type: value.building_roof_type,
      },
      context.climate,
      frameResolution.frame,
      purlinBundle,
    );
    if (purlinResolution.status === "legacy_error") {
      return { status: "legacy_error", code: "LEGACY_REF", result: null, context: frameContext, diagnostics: [...domain.diagnostics, ...purlinResolution.diagnostics] };
    }
    if (purlinResolution.status === "invalid_input") {
      return { status: "invalid_input", code: "INVALID_INPUT", result: null, context: frameContext, diagnostics: [...domain.diagnostics, ...purlinResolution.diagnostics] };
    }
    if (purlinResolution.status === "no_match") {
      return { status: "unsupported", code: "UNSUPPORTED_FOR_PARITY", result: null, context: frameContext, diagnostics: [...domain.diagnostics, ...purlinResolution.diagnostics] };
    }
    if (purlinResolution.status !== "success" || !purlinResolution.purlin) {
      return { status: "unsupported", code: "UNSUPPORTED_FOR_PARITY", result: null, context: frameContext, diagnostics: [...domain.diagnostics, ...purlinResolution.diagnostics] };
    }
    const purlinContext = { ...frameContext, purlin: purlinResolution.purlin };
    const [secondaryRules, boltsPlatesFittings] = await Promise.all([
      repository.loadSecondarySteelData(),
      repository.loadBoltsPlatesFittings(),
    ]);
    const secondaryResolution = calculateSecondarySteel(
      {
        span_m: value.span_m,
        building_length_m: value.building_length_m,
        building_height_m: value.building_height_m,
        frame_step_m: frameResolution.frame.frame_step_m,
        horizontal_bracing_override: value.horizontal_bracing_override,
      },
      context.climate,
      frameResolution.frame,
      purlinResolution.purlin,
      { rules: secondaryRules, boltsPlatesFittings },
    );
    if (secondaryResolution.status === "invalid_input") {
      return { status: "invalid_input", code: "INVALID_INPUT", result: null, context: purlinContext, diagnostics: [...domain.diagnostics, ...secondaryResolution.diagnostics] };
    }
    if (secondaryResolution.status !== "success") {
      return { status: "unsupported", code: "UNSUPPORTED_FOR_PARITY", result: null, context: purlinContext, diagnostics: [...domain.diagnostics, ...secondaryResolution.diagnostics] };
    }
    const secondaryContext = { ...purlinContext, secondarySteel: secondaryResolution.secondary };
    finalContext = secondaryContext;

    const windowsInput = resolveWindowsInput(value);
    if (windowsInput.enabled) {
      return {
        status: "required_module_not_implemented",
        code: "WINDOW_GIRT_MODULE_NOT_IMPLEMENTED",
        internal_status: "REQUIRED_MODULE_NOT_IMPLEMENTED",
        result: null,
        context: secondaryContext,
        diagnostics: [
          ...domain.diagnostics,
          ...frameResolution.diagnostics,
          ...purlinResolution.diagnostics,
          ...secondaryResolution.diagnostics,
          createCore1Diagnostic({
            code: "WINDOW_GIRT_MODULE_NOT_IMPLEMENTED",
            severity: "warning",
            classification: "required_module_not_implemented",
            module: "WindowGirtCalculator",
            message: "Локальная формульная цепочка окон доказана; WindowGirtCalculator ещё не реализован. Внешние книги не требуются.",
            source: ["CORE1_WINDOW_BRANCH_AUDIT.md", "WINDOW_WIND_BRANCH_AUDIT.md"],
            legacy_equivalent: null,
            excel_error: null,
            trigger: "windows.enabled=true",
            affected_outputs: ["window_lower_girt_profile", "window_upper_girt_profile", "window_girts_weight_kg", "openings_weight_kg"],
            details: {
              implementation_boundary: "LOCAL_FORMULA_CHAIN_PROVEN",
              normative_system: climateResolution.climate.normative_system,
              window_type: windowsInput.window_type,
              completed_modules: ["ClimateResolver", "FrameSelector", "PurlinCalculator", "SecondarySteelCalculator"],
            },
          }),
        ],
      };
    }
  } catch (error) {
    return datasetLoadFailureResult(error);
  }

  return {
    status: "required_module_not_implemented",
    code: "NOT_IMPLEMENTED",
    internal_status: "NOT_IMPLEMENTED",
    result: null,
    context: finalContext,
    diagnostics: [
      ...domain.diagnostics,
      createCore1Diagnostic({
        code: "NOT_IMPLEMENTED",
        severity: "warning",
        classification: "required_module_not_implemented",
        module: "CalculationEngine",
        message: "Расчётные модули Core 1 ещё не реализованы; инженерный результат не подставлен.",
        source: ["CORE1_V1_PLAN.md"],
        details: { next_module: "WindowGirtCalculator", completed_modules: ["ClimateResolver", "FrameSelector", "PurlinCalculator", "SecondarySteelCalculator"] },
      }),
    ],
  };
}
