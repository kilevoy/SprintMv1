import { validateCore1Input } from "../compatibility";
import { BrowserCore1DataRepository, BrowserDataSource } from "../data";
import { resolveClimate } from "../climate";
import { deriveLegacyClimate, legacyFrameBranchDiagnostic, resolveLegacyFrameBranch } from "../legacy";
import { resolveLegacyConnection } from "../legacyConnection";
import { resolveDesignSpanFamily, resolveLegacyFrameProfile, resolveLegacyFrameStep, selectFrame } from "../frame";
import type { FrameResult, LegacyFrameStepResult } from "../frame";
import { calculatePurlin } from "../purlin";
import { calculateSecondarySteel } from "../secondary";
import { calculateWindowGirts } from "../window";
import { calculateOpeningMass } from "../opening";
import { calculateStructuralSummary } from "../summary";
import { createCore1Diagnostic } from "../diagnostics";
import { resolveClimateInput, resolveWindowsInput, validateCore1InputDomain } from "../validation";
import type { Core1DataRepository } from "../data";
import type { ClimateDatasetView } from "../climate";
import type { Core1ClimateResult, Core1Input } from "../types";
import type { LegacyClimateResult, LegacyFrameBranchResult } from "../legacy";
import type { LegacyConnectionResolvedValue } from "../legacyConnection";
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

function legacyRow(
  order: number,
  label: string,
  value1: string | number | null,
  value2: string | number | null,
  value3: string | number | null,
  unit: string | null,
  sourceCell: string | null,
  status: "CALCULATED" | "INPUT_ECHO" | "LEGACY_COMPATIBILITY" | "BLANK",
) {
  return { kind: "DATA" as const, order, label, value1, value2, value3, unit, source_cell: sourceCell, status };
}

function blankLegacyRow(order: number, label: string, sourceCell: string | null = null) {
  return legacyRow(order, label, null, null, null, null, sourceCell, "BLANK");
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
  let climateDataset: ClimateDatasetView | undefined;
  const climateResolution = await (async () => {
    if (climateInput.mode === "MANUAL") return resolveClimate(climateInput);
    try {
      const dataset = await repository.loadClimateDataset("climate_lookup_sparse");
      climateDataset = dataset;
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
  let legacyClimate: LegacyClimateResult | null = null;
  let legacyFrameBranch: LegacyFrameBranchResult | null = null;
  if (climateInput.mode === "CITY_LOOKUP" && climateDataset) {
    legacyClimate = deriveLegacyClimate({
      city: climateInput.city,
      responsibility_factor: value.responsibility_factor,
      roof_covering: value.roof_covering,
      climate: climateResolution.climate,
      dataset: climateDataset,
    });
    if (!legacyClimate) {
      const diagnostic = legacyFrameBranchDiagnostic("Не удалось воспроизвести proven legacy climate branch для выбранного города.", { city: climateInput.city, roof_covering: value.roof_covering });
      return { status: "unsupported", code: "UNSUPPORTED_FOR_PARITY", result: null, context, diagnostics: [...domain.diagnostics, diagnostic] };
    }
    legacyFrameBranch = resolveLegacyFrameBranch({ activeSnowRegion: legacyClimate.activeSnowRegion, windRegion: legacyClimate.windRegion });
    if (!legacyFrameBranch) {
      const diagnostic = legacyFrameBranchDiagnostic("Не удалось сопоставить legacy AJ11 с таблицей веток рамы.", { city: climateInput.city, active_snow_region: legacyClimate.activeSnowRegion, wind_region: legacyClimate.windRegion });
      return { status: "unsupported", code: "UNSUPPORTED_FOR_PARITY", result: null, context: { ...context, legacyClimate }, diagnostics: [...domain.diagnostics, ...legacyClimate.diagnostics, diagnostic] };
    }
  }
  let finalContext: { climate: Core1ClimateResult; legacyClimate?: LegacyClimateResult | null; legacyFrameBranch?: LegacyFrameBranchResult | null; legacyFrameStep?: LegacyFrameStepResult | null; legacyConnection?: LegacyConnectionResolvedValue | null; frame?: FrameResult; purlin?: PurlinResultValue; secondarySteel?: SecondarySteelResult; windows?: WindowGirtResult | null; openings?: import("../opening").OpeningMassResult | null } = { ...context, legacyClimate, legacyFrameBranch, legacyFrameStep: null, legacyConnection: null };

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
    let legacyFrameStep: LegacyFrameStepResult | null = null;
    if ((value.frame_step_override_m === null || value.frame_step_override_m === undefined) && climateInput.mode === "CITY_LOOKUP" && legacyClimate && legacyFrameBranch) {
      const frameStepResolution = resolveLegacyFrameStep({
        designSpanFamily,
        buildingHeightM: value.building_height_m,
        responsibilityFactor: value.responsibility_factor,
        legacySnowFactor: Number(legacyClimate.activeSnowFactor),
        legacyFrameBranch: legacyFrameBranch.mappedBranchKey,
      }, frameDataset);
      if (frameStepResolution.status !== "success") {
        return { status: "unsupported", code: "UNSUPPORTED_FOR_PARITY", result: null, context, diagnostics: [...domain.diagnostics, ...frameStepResolution.diagnostics] };
      }
      legacyFrameStep = frameStepResolution;
    }
    let legacyFrameProfile = null;
    if (climateInput.mode === "CITY_LOOKUP" && legacyClimate && (designSpanFamily === 9 || designSpanFamily === 12 || designSpanFamily === 15)) {
      const profileResolution = resolveLegacyFrameProfile({
        designSpanFamily,
        buildingHeightM: value.building_height_m,
        legacySnowFactor: Number(legacyClimate.activeSnowFactor),
        legacyFrameBranch: legacyFrameBranch?.mappedBranchKey ?? "",
      }, frameDataset);
      if (profileResolution.status !== "success" || !profileResolution.profile) {
        return { status: "unsupported", code: "UNSUPPORTED_FOR_PARITY", result: null, context, diagnostics: [...domain.diagnostics, ...profileResolution.diagnostics] };
      }
      legacyFrameProfile = profileResolution.profile;
    }
    const frameResolution = selectFrame(
      {
        span_m: value.span_m,
        building_length_m: value.building_length_m,
        building_height_m: value.building_height_m,
        responsibility_factor: value.responsibility_factor,
        frame_step_override_m: value.frame_step_override_m ?? null,
        climate: context.climate,
        legacy_frame_branch: legacyFrameBranch?.mappedBranchKey ?? null,
        automatic_frame_step_m: legacyFrameStep?.automaticFrameStepM ?? null,
        legacy_frame_profile: legacyFrameProfile,
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
    const frameContext = { ...finalContext, legacyFrameStep, frame: frameResolution.frame };
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
    let legacyConnection: LegacyConnectionResolvedValue | null = null;
    if ((value.frame_step_override_m === null || value.frame_step_override_m === undefined) && designSpanFamily !== 24 && legacyClimate && legacyFrameBranch) {
      const connectionResolution = resolveLegacyConnection({
        span_m: value.span_m,
        building_length_m: value.building_length_m,
        building_height_m: value.building_height_m,
        responsibility_factor: value.responsibility_factor,
        frame_step_override_m: null,
        roof_covering: value.roof_covering,
        roof_deck_grade: value.roof_deck_grade,
        snow_retention_purlin: value.snow_retention_purlin,
        enclosure_purlin: value.enclosure_purlin,
        purlin_max_step_override_mm: value.purlin_max_step_override_mm ?? null,
        purlin_min_step_mm: value.purlin_min_step_mm ?? 0,
        building_roof_type: value.building_roof_type ?? "двускатное",
        climate: context.climate,
        baseLegacyClimate: legacyClimate,
        baseLegacyFrameBranch: legacyFrameBranch,
        baseFrame: frameResolution.frame,
        basePurlin: purlinResolution.purlin,
      }, { frame: frameDataset, purlin: purlinBundle });
      if (connectionResolution.status === "legacy_error") {
        const code = connectionResolution.diagnostics.some((item) => item.code === "LEGACY_NA") ? "LEGACY_NA" : "LEGACY_VALUE_ERROR";
        return { status: "legacy_error", code, result: null, context: { ...frameContext, purlin: purlinResolution.purlin }, diagnostics: [...domain.diagnostics, ...connectionResolution.diagnostics] };
      }
      if (connectionResolution.status !== "success") {
        return { status: "unsupported", code: "UNSUPPORTED_FOR_PARITY", result: null, context: { ...frameContext, purlin: purlinResolution.purlin }, diagnostics: [...domain.diagnostics, ...connectionResolution.diagnostics] };
      }
      legacyConnection = connectionResolution.connection;
    }
    const purlinContext = { ...frameContext, purlin: purlinResolution.purlin, legacyConnection };
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
        legacy_connection: legacyConnection,
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
    const frame = frameResolution.frame;
    const purlin = purlinResolution.purlin;
    const secondary = secondaryResolution.secondary;
    const openings = openingResolution.openingMass;
    const windowOutput = windowResult
      ? [{ lower_girt_profile: windowResult.lower_girt_profile, lower_girt_steel: windowResult.lower_girt_steel, lower_girt_utilization: windowResult.lower_girt_utilization, upper_girt_profile: windowResult.upper_girt_profile, upper_girt_steel: windowResult.upper_girt_steel, upper_girt_utilization: windowResult.upper_girt_utilization, mass_kg: windowResult.window_girts_weight_kg }]
      : [];
    const effectiveFrameStepM = frame.frame_step_m;
    const bayCount = Math.ceil(value.building_length_m / effectiveFrameStepM);
    const frameCount = bayCount + 1;
    const beams = { name: "Балки", profile: frame.beam_profile, steel: frame.beam_steel, source_cell: "вывод!D33:E33", status: "ok", utilization: frame.beam_utilization };
    const columns = { name: "Колонны", profile: frame.column_profile, steel: frame.column_steel, source_cell: "вывод!D34:E34", status: "ok", utilization: frame.column_utilization };
    const roofPurlins = { name: "Прогоны", profile: purlin.purlin_profile, steel: purlin.purlin_steel, assignment: purlin.purlin_assignment, utilization: null, stepMm: purlin.purlin_step_mm, massKgPerM2: purlin.purlin_kg_per_m2, massKg: purlin.purlin_weight_kg, source_cell: "вывод!D35:E35; Подбор прогонов 2!P28:V28", status: "ok" };
    const plates = secondary.plates;
    const selectedSections = {
      beams,
      columns,
      roofPurlins,
      ties: secondary.ties,
      suspensions: secondary.suspensions,
      spacers: secondary.spacers,
      horizontalBracing: secondary.horizontal_bracing,
      verticalBracing: secondary.vertical_bracing,
      facadePosts: secondary.gable_posts,
      portalBracing: secondary.portal_bracing,
      secondaryBeams: secondary.secondary_beams,
      secondaryColumns: secondary.secondary_columns,
      eaveRidgePlate: plates[0] ?? { name: "Пластина карниз, конек", profile: null, steel: null, source_cell: "вывод!D48:E48", status: "missing" },
      basePlate: plates[1] ?? { name: "Пластина опора", profile: null, steel: null, source_cell: "вывод!D49:E49", status: "missing" },
      windowGirts: windowOutput,
    };
    const publicBolts = secondary.bolts.map((bolt) => ({ name: bolt.name, pattern: bolt.pattern, source_cell: bolt.source_cell, quantity: bolt.quantity ?? null }));
    const knownMassParts = [frame.frame_mass_kg, purlin.purlin_weight_kg, secondary.fittings_weight_kg, openings.opening_mass_kg];
    const knownMassKg = knownMassParts.every((mass): mass is number => typeof mass === "number" && Number.isFinite(mass))
      ? knownMassParts.reduce((sum, mass) => sum + mass, 0)
      : null;
    const canonical = {
      frameGrid: {
        automaticFrameStepM: legacyFrameStep?.automaticFrameStepM ?? null,
        manualFrameStepOverrideM: value.frame_step_override_m ?? null,
        effectiveFrameStepM,
        bayCount,
        frameCount,
      },
      selectedSections,
      connections: { bolts: publicBolts, m16Quantity: secondary.M16_quantity, m16LegacyValue: secondary.M16_legacy_value ?? null, fittingsMassKg: secondary.fittings_weight_kg },
      componentMasses: {
        mainFrameMassKg: frame.frame_mass_kg ?? null,
        purlinMassKg: purlin.purlin_weight_kg,
        fittingsMassKg: secondary.fittings_weight_kg,
        windowGirtsMassKg: windowResult?.window_girts_weight_kg ?? null,
        openingMassKg: openings.opening_mass_kg,
        openingComponentsKg: { gateLe6m: openings.gate_le_6m_mass_kg, gateGt6m: openings.gate_gt_6m_mass_kg, doors: openings.door_mass_kg, windows: openings.window_mass_kg },
        knownMassKg,
        unknownComponents: ["ties", "suspensions", "spacers", "bracing", "facade_posts", "plates", "bolt_mass", "unresolved_secondary_component_masses"],
        isComplete: false as const,
      },
      openingCompatibility: {
        inputEcho: { gatesLe6mCount: value.gates_le_6m_count, gatesGt6mCount: value.gates_gt_6m_count, doorsCount: value.doors_count, windows: windowsInput },
        derivedMassesKg: { gateLe6m: openings.gate_le_6m_mass_kg, gateGt6m: openings.gate_gt_6m_mass_kg, doors: openings.door_mass_kg, windows: openings.window_mass_kg, total: openings.opening_mass_kg },
        specificMassKgPerM2: openings.opening_mass_kg_per_m2,
        totalMassT: openings.opening_mass_t,
      },
      diagnostics: [...domain.diagnostics],
      provenance: {
        modules: ["ClimateResolver", "LegacyClimateDeriver", "LegacyFrameBranchResolver", "LegacyFrameStepResolver", "FrameSelector", "PurlinCalculator", "SecondarySteelCalculator", "OpeningMassCalculator", "StructuralSummary"],
        legacyOutputProjection: "calculateCore1.ts / exact ordered legacy labels and source cells",
      },
      legacyCompatibility: {
        D8: legacyFrameStep?.automaticFrameStepM ?? null,
        D68: openings.opening_mass_kg_per_m2,
        D69: summaryResolution.summary.kg_per_m2,
        units: { D8: "m" as const, D68: "kg/m²" as const, D69: "kg/m²" as const },
        D69_classification: "LEGACY_COMPATIBILITY_VALUE / REGRESSION_CHECKPOINT" as const,
      },
    };
    const excelOutput = {
      sections: [
        {
          id: "SELECTED_SECTIONS" as const,
          title: "Подбор сечений",
          rows: [
            legacyRow(1, "Балки", frame.beam_profile, frame.beam_steel, frame.beam_utilization, "%", "вывод!D33:F33", "CALCULATED"),
            legacyRow(2, "Колонны", frame.column_profile, frame.column_steel, frame.column_utilization, "%", "вывод!D34:F34", "CALCULATED"),
            legacyRow(3, "Прогоны", purlin.purlin_profile, purlin.purlin_steel, null, null, "вывод!D35:F35", "CALCULATED"),
            legacyRow(4, "Затяжки", secondary.ties.profile, secondary.ties.steel, null, null, "вывод!D36:F36", "CALCULATED"),
            legacyRow(5, "Подвески", secondary.suspensions.profile, secondary.suspensions.steel, null, null, "вывод!D37:F37", "CALCULATED"),
            legacyRow(6, "Распорки", secondary.spacers.profile, secondary.spacers.steel, null, null, "вывод!D38:F38", "CALCULATED"),
            legacyRow(7, "Связи горизонтальные", secondary.horizontal_bracing[0]?.profile ?? null, secondary.horizontal_bracing[0]?.steel ?? null, null, null, "вывод!D39:F39", "CALCULATED"),
            legacyRow(8, "Связи вертикальные", secondary.vertical_bracing[0]?.profile ?? null, secondary.vertical_bracing[0]?.steel ?? null, null, null, "вывод!D40:F40", "CALCULATED"),
            legacyRow(9, "Стойки фахверка", secondary.gable_posts.profile, secondary.gable_posts.steel, null, null, "вывод!D41:F41", "CALCULATED"),
            legacyRow(10, "Пластина карниз, конек", plates[0]?.profile ?? null, plates[0]?.steel ?? null, null, null, "вывод!D48:F48", "CALCULATED"),
            legacyRow(11, "Пластина опора", plates[1]?.profile ?? null, plates[1]?.steel ?? null, null, null, "вывод!D49:F49", "CALCULATED"),
          ],
        },
        {
          id: "BOLTS" as const,
          title: "Болты (по распоряжению №40)",
          rows: [
            ...publicBolts.map((bolt, index) => legacyRow(index + 1, bolt.name, bolt.pattern, bolt.quantity, null, bolt.quantity === null ? null : "pcs", `вывод!D${52 + index}:E${52 + index}`, "CALCULATED" as const)),
            legacyRow(5, "Затяжка, для крепления уголка к карнизной фасонке, M16", secondary.M16_quantity, secondary.M16_legacy_value ?? null, null, "pcs", "вывод!D56:E56", "CALCULATED"),
          ],
        },
        {
          id: "FITTINGS" as const,
          title: "Фасонки",
          rows: [legacyRow(1, "Вес фасонок, кг", secondary.fittings_weight_kg, null, null, "kg", "вывод!D57", "CALCULATED")],
        },
        {
          id: "OPENINGS" as const,
          title: "Проёмы",
          rows: [
            legacyRow(1, "Ворота до 6 м", value.gates_le_6m_count, openings.gate_le_6m_mass_kg, null, "pcs / kg", "вывод!D60", "CALCULATED"),
            legacyRow(2, "Ворота свыше 6 м", value.gates_gt_6m_count, openings.gate_gt_6m_mass_kg, null, "pcs / kg", "вывод!D61", "CALCULATED"),
            legacyRow(3, "Двери", value.doors_count, openings.door_mass_kg, null, "pcs / kg", "вывод!D62", "CALCULATED"),
            blankLegacyRow(4, "Окна", "вывод!D63"),
            legacyRow(5, "Высота окон (м)", windowsInput.window_height_m, null, null, "m", "Лист1!B7", "INPUT_ECHO"),
            legacyRow(6, "Длина ленты (м)", windowsInput.window_strip_length_m, null, null, "m", "Лист1!B8", "INPUT_ECHO"),
            legacyRow(7, "Количество отдельных окон", windowsInput.separate_window_count, null, null, "pcs", "Лист1!B9", "INPUT_ECHO"),
            legacyRow(8, "Конструкция окна", windowsInput.glazing_construction, null, null, null, "Лист1!B10", "INPUT_ECHO"),
            legacyRow(9, "МЕ окон, ворот, дверей", openings.opening_mass_kg_per_m2, null, null, "kg/m²", "вывод!D68", "LEGACY_COMPATIBILITY"),
            legacyRow(10, "Общая МЕ", summaryResolution.summary.kg_per_m2, null, null, "kg/m²", "вывод!D69", "LEGACY_COMPATIBILITY"),
          ],
        },
      ],
    };
    const result = {
      scenario: value,
      canonical,
      excelOutput,
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
