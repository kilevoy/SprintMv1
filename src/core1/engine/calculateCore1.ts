import { validateCore1Input } from "../compatibility";
import { BrowserCore1DataRepository, BrowserDataSource } from "../data";
import { resolveClimate } from "../climate";
import { selectFrame } from "../frame";
import { resolveDesignSpanFamily } from "../frame/designSpanFamily";
import { calculatePurlin } from "../purlin";
import { calculateSecondarySteel } from "../secondary";
import { calculateWindowGirts } from "../window";
import { calculateOpeningMass } from "../opening";
import { calculateStructuralSummary } from "../summary";
import { createCore1Diagnostic } from "../diagnostics";
import { resolveClimateInput, resolveWindowsInput, validateCore1InputDomain } from "../validation";
import type { Core1DataRepository } from "../data";
import type { Core1ClimateResult, Core1Input } from "../types";
import type { FrameResult } from "../frame";
import type { PurlinDatasetBundle, PurlinResultValue } from "../purlin";
import type { SecondarySteelResult } from "../secondary";
import type { WindowGirtResult } from "../window";
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
 * Orchestration boundary for Core 1 v1. Supported scenarios execute the
 * proven module chain through StructuralSummary and return a full result;
 * legacy/unsupported branches exit before engineering output is produced.
 */
export async function calculateCore1(
  input: unknown,
  repository: Core1DataRepository = new BrowserCore1DataRepository(new BrowserDataSource()),
): Promise<Core1EngineResult> {
  const schemaResult = validateCore1Input(input);
  if (!schemaResult.valid) return invalidInputResult(schemaResult.errors);

  const value = schemaResult.data as Core1Input;
  const designSpanFamily = resolveDesignSpanFamily(value.span_m);
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
  if (designSpanFamily === null) {
    return {
      status: "unknown_domain",
      code: "UNKNOWN_DOMAIN",
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
  let finalContext: { climate: Core1ClimateResult; frame?: FrameResult; purlin?: PurlinResultValue; secondarySteel?: SecondarySteelResult; windows?: WindowGirtResult | null; openings?: import("../opening").OpeningMassResult | null } = context;

  try {
    if (domain.state === "SUPPORTED_WITH_LEGACY_ANOMALY") {
      const legacyNa = domain.diagnostics.find((diagnostic) => diagnostic.code === "LEGACY_NA");
      if (legacyNa) {
        try {
          await repository.loadFrameDataset(designSpanFamily);
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

    const frameDataset = await repository.loadFrameDataset(designSpanFamily);
    const frameResolution = selectFrame(
      {
        span_m: value.span_m,
        building_length_m: value.building_length_m,
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
    let windowResult: WindowGirtResult | null = null;
    if (windowsInput.enabled) {
      const windowDataset = await repository.loadWindowDataset("window_profile_candidates");
      const windowResolution = calculateWindowGirts(
        {
          windows: windowsInput,
          climate: context.climate,
          frame: frameResolution.frame,
          scheme_factor: value.window_scheme_factor ?? 1,
          utilization_limit: value.window_utilization_limit ?? 0.85,
        },
        { profileCandidates: windowDataset },
      );
      if (windowResolution.status === "invalid_input") {
        return { status: "invalid_input", code: "INVALID_INPUT", result: null, context: secondaryContext, diagnostics: [...domain.diagnostics, ...windowResolution.diagnostics] };
      }
      if (windowResolution.status !== "success" || !windowResolution.windowGirts) {
        return { status: "unsupported", code: "UNSUPPORTED_FOR_PARITY", result: null, context: secondaryContext, diagnostics: [...domain.diagnostics, ...windowResolution.diagnostics] };
      }
      windowResult = windowResolution.windowGirts;
      finalContext = { ...secondaryContext, windows: windowResult };
    } else {
      finalContext = { ...secondaryContext, windows: null };
    }
    const openingResolution = calculateOpeningMass({
      gate_count_le_6m: value.gates_le_6m_count,
      gate_count_gt_6m: value.gates_gt_6m_count,
      door_count: value.doors_count,
      windows: windowsInput,
      frame: frameResolution.frame,
      span_m: value.span_m,
      building_length_m: value.building_length_m,
      secondarySteel: secondaryResolution.secondary,
      windowGirts: windowResult,
    });
    if (openingResolution.status !== "success" || !openingResolution.openingMass) {
      return { status: "invalid_input", code: "INVALID_INPUT", result: null, context: finalContext, diagnostics: [...domain.diagnostics, ...openingResolution.diagnostics] };
    }
    finalContext = { ...finalContext, openings: openingResolution.openingMass };
    const summaryResolution = calculateStructuralSummary({
      scenario: { span_m: value.span_m, building_length_m: value.building_length_m, frame_step_override_m: value.frame_step_override_m ?? null },
      frame: frameResolution.frame,
      purlin: purlinResolution.purlin,
      secondarySteel: secondaryResolution.secondary,
      windows: windowResult,
      openings: openingResolution.openingMass,
    });
    if (summaryResolution.status !== "success") {
      return { status: "invalid_input", code: "INVALID_INPUT", result: null, context: finalContext, diagnostics: [...domain.diagnostics, ...summaryResolution.diagnostics] };
    }
    const windowOutput = windowResult
      ? [{ lower_girt_profile: windowResult.lower_girt_profile, lower_girt_steel: windowResult.lower_girt_steel, lower_girt_utilization: windowResult.lower_girt_utilization, upper_girt_profile: windowResult.upper_girt_profile, upper_girt_steel: windowResult.upper_girt_steel, upper_girt_utilization: windowResult.upper_girt_utilization, mass_kg: windowResult.window_girts_weight_kg }]
      : [];
    const result = {
      scenario: value,
      climate: context.climate,
      frame_step_m: frameResolution.frame.frame_step_m,
      beam_profile: frameResolution.frame.beam_profile,
      beam_steel: frameResolution.frame.beam_steel,
      beam_utilization: frameResolution.frame.beam_utilization,
      column_profile: frameResolution.frame.column_profile,
      column_steel: frameResolution.frame.column_steel,
      column_utilization: frameResolution.frame.column_utilization,
      purlin_profile: purlinResolution.purlin.purlin_profile,
      purlin_steel: purlinResolution.purlin.purlin_steel,
      purlin_assignment: purlinResolution.purlin.purlin_assignment,
      purlin_step_mm: purlinResolution.purlin.purlin_step_mm,
      purlin_kg_per_m2: purlinResolution.purlin.purlin_kg_per_m2,
      purlin_weight_kg: purlinResolution.purlin.purlin_weight_kg,
      ties: secondaryResolution.secondary.ties,
      suspensions: secondaryResolution.secondary.suspensions,
      spacers: secondaryResolution.secondary.spacers,
      horizontal_bracing: secondaryResolution.secondary.horizontal_bracing,
      vertical_bracing: secondaryResolution.secondary.vertical_bracing,
      gable_posts: secondaryResolution.secondary.gable_posts,
      portal_bracing: secondaryResolution.secondary.portal_bracing,
      secondary_beams: secondaryResolution.secondary.secondary_beams,
      secondary_columns: secondaryResolution.secondary.secondary_columns,
      plates: secondaryResolution.secondary.plates,
      bolts: secondaryResolution.secondary.bolts.map(({ name, pattern, source_cell }) => ({ name, pattern, source_cell })),
      M16_quantity: secondaryResolution.secondary.M16_quantity,
      fittings_weight_kg: secondaryResolution.secondary.fittings_weight_kg,
      window_girts: windowOutput,
      window_lower_girt_profile: windowResult?.lower_girt_profile ?? null,
      window_upper_girt_profile: windowResult?.upper_girt_profile ?? null,
      window_lower_girt_utilization: windowResult?.lower_girt_utilization ?? null,
      window_upper_girt_utilization: windowResult?.upper_girt_utilization ?? null,
      window_girts_weight_kg: windowResult?.window_girts_weight_kg ?? 0,
      openings_weight_kg_per_m2: openingResolution.openingMass.opening_mass_kg_per_m2,
      openings_weight_t: openingResolution.openingMass.opening_mass_t,
      openings_weight_kg: openingResolution.openingMass.opening_mass_kg,
      openings: {
        gate_le_6m_mass_kg: openingResolution.openingMass.gate_le_6m_mass_kg,
        gate_gt_6m_mass_kg: openingResolution.openingMass.gate_gt_6m_mass_kg,
        door_mass_kg: openingResolution.openingMass.door_mass_kg,
        window_mass_kg: openingResolution.openingMass.window_mass_kg,
        opening_mass_kg: openingResolution.openingMass.opening_mass_kg,
      },
      kg_per_m2: summaryResolution.summary.kg_per_m2,
      engineering_loads: null,
      compatibility_diagnostics: [...domain.diagnostics],
    };
    return { status: "success", result, context: { ...finalContext, openings: openingResolution.openingMass }, diagnostics: [...domain.diagnostics] };
  } catch (error) {
    return datasetLoadFailureResult(error);
  }

  return { status: "invalid_input", code: "INVALID_INPUT", result: null, context: finalContext, diagnostics: [createCore1Diagnostic({ code: "INVALID_INPUT", severity: "error", classification: "error", module: "CalculationEngine", message: "Не удалось завершить StructuralSummary.", source: ["CORE1_STRUCTURAL_SUMMARY_AUDIT.md"] })] };
}
