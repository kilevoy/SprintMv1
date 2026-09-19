import lookupData from "../../../core1/data/legacy_connections/connection_lookup_rows.json";
import { createCore1Diagnostic } from "../diagnostics";
import { resolveDesignSpanFamily, selectFrame } from "../frame";
import { LEGACY_CLIMATE_CLASSIFICATION, legacyApproximateMatch, resolveLegacyFrameBranch } from "../legacy";
import { calculatePurlin } from "../purlin";
import type { Core1Diagnostic } from "../types";
import type {
  LegacyConnectionBranch,
  LegacyConnectionCandidateTrace,
  LegacyConnectionLookupDataset,
  LegacyConnectionLookupRow,
  LegacyConnectionResolveResult,
  LegacyConnectionResolverDatasets,
  LegacyConnectionResolverInput,
} from "./types";

const dataset = lookupData as LegacyConnectionLookupDataset;

function diagnostic(
  code: "UNSUPPORTED_FOR_PARITY" | "LOOKUP_NO_MATCH" | "LEGACY_NA" | "LEGACY_VALUE_ERROR",
  severity: "unsupported" | "error",
  message: string,
  details: Record<string, unknown>,
  excelError: "#N/A" | "#VALUE!" | null = null,
): Core1Diagnostic {
  return createCore1Diagnostic({
    code,
    severity,
    classification: excelError ? "legacy_anomaly" : "unsupported",
    module: "LegacyConnectionResolver",
    message,
    source: ["вывод!E8:E9", "вывод!D52:E52", "вывод!D53:D55", "вывод!D57", "core1/data/legacy_connections/connection_lookup_rows.json"],
    excel_error: excelError,
    legacy_equivalent: excelError,
    affected_outputs: ["D52", "E52", "D53", "D54", "D55", "D57"],
    details,
  });
}

function failure(
  status: "legacy_error" | "unsupported" | "no_match",
  code: "UNSUPPORTED_FOR_PARITY" | "LOOKUP_NO_MATCH" | "LEGACY_NA" | "LEGACY_VALUE_ERROR",
  message: string,
  details: Record<string, unknown>,
  excelError: "#N/A" | "#VALUE!" | null = null,
): LegacyConnectionResolveResult {
  return { status, connection: null, diagnostics: [diagnostic(code, status === "unsupported" || status === "no_match" ? "unsupported" : "error", message, details, excelError)] };
}

function heightBand(height: number): number | null {
  if (!Number.isFinite(height) || height <= 0) return null;
  if (height <= 3.8) return 3.6;
  if (height <= 5) return 4.8;
  if (height <= 6.2) return 6;
  return null;
}

function numericFactor(value: string | number): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function frameBase(input: LegacyConnectionResolverInput, frame: LegacyConnectionResolverInput["baseFrame"]): number | null {
  const direct = frame.structural_base_kg_per_m2;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  const mass = frame.frame_mass_kg;
  const tie = frame.frame_tie_unit_mass_kg;
  const tube = frame.tube_mass_kg_per_m2;
  if (![mass, tie, tube, frame.frame_step_m].every((value) => typeof value === "number" && Number.isFinite(value))) return null;
  const area = input.span_m * input.building_length_m;
  if (!Number.isFinite(area) || area <= 0) return null;
  const frameCount = Math.ceil(input.building_length_m / frame.frame_step_m) + 1;
  const tieBays = Math.max(frameCount - 2, 0);
  return (tie! * tieBays + mass! * frameCount) / area + tube!;
}

function lookupRow(
  designFamily: number,
  candidate: LegacyConnectionBranch,
  factor: number,
  band: number,
  branchKey: string,
): LegacyConnectionLookupRow | null {
  return dataset.rows.find((row) => row.designFamily === designFamily
    && row.candidate === candidate
    && Math.abs(row.factor - factor) < 1e-12
    && Math.abs(row.heightBandM - band) < 1e-12
    && row.branchKey === branchKey) ?? null;
}

function patternsAreText(row: LegacyConnectionLookupRow): boolean {
  return [row.ridgeBeamBoltPattern, row.eaveBeamBoltPattern, row.supportColumnBoltPattern, row.eaveColumnBoltPattern]
    .every((value) => typeof value === "string" && value.length > 0 && !value.startsWith("#"));
}

/**
 * Reproduces the proven automatic 9–21 m Excel connection-output path.
 * Canonical climate is never changed: the adjusted snow path exists only to
 * select the alternate legacy structural candidate used by E9/ROW15.
 */
export function resolveLegacyConnection(
  input: LegacyConnectionResolverInput,
  datasets: LegacyConnectionResolverDatasets,
): LegacyConnectionResolveResult {
  const designFamily = resolveDesignSpanFamily(input.span_m);
  if (designFamily === null) return failure("unsupported", "UNSUPPORTED_FOR_PARITY", "Пролёт не относится к доказанному connection domain.", { span_m: input.span_m });
  if (designFamily === 24) return failure("legacy_error", "LEGACY_NA", "24-метровая connection-ветка сохраняет legacy #N/A.", { design_family: designFamily }, "#N/A");
  if (input.frame_step_override_m !== null && input.frame_step_override_m !== undefined) {
    return failure("unsupported", "UNSUPPORTED_FOR_PARITY", "Ручной шаг рам ещё не входит в доказанный generic connection contract.", { frame_step_override_m: input.frame_step_override_m });
  }
  const band = heightBand(input.building_height_m);
  if (band === null) return failure("unsupported", "UNSUPPORTED_FOR_PARITY", "Высота не входит в доказанные connection lookup bands.", { building_height_m: input.building_height_m });

  const row14Factor = numericFactor(input.baseLegacyClimate.activeSnowFactor);
  const scale = (input.span_m / designFamily) ** 2;
  const adjustedSnowLoad = input.baseLegacyClimate.effectiveSnowLoad * scale;
  const adjustedLookupKey = adjustedSnowLoad + input.baseLegacyClimate.roofCorrection;
  const adjustedMatch = legacyApproximateMatch(adjustedLookupKey);
  const adjustedClassification = adjustedMatch === null ? null : LEGACY_CLIMATE_CLASSIFICATION[adjustedMatch] ?? null;
  if (row14Factor === null || !adjustedClassification) {
    return failure("no_match", "LOOKUP_NO_MATCH", "Не удалось классифицировать одну из двух legacy connection climate-веток.", { row14_factor: input.baseLegacyClimate.activeSnowFactor, adjusted_lookup_key: adjustedLookupKey });
  }
  const adjustedSnowRegion = input.responsibility_factor === 0.8 ? adjustedClassification.l_region : adjustedClassification.j_region;
  const adjustedFactorRaw = input.responsibility_factor === 0.8 ? adjustedClassification.m_factor : adjustedClassification.k_factor;
  const row15Factor = numericFactor(adjustedFactorRaw);
  const row15Branch = resolveLegacyFrameBranch({ activeSnowRegion: adjustedSnowRegion, windRegion: input.baseLegacyClimate.windRegion });
  if (row15Factor === null || !row15Branch) {
    return failure("no_match", "LOOKUP_NO_MATCH", "Не удалось сформировать adjusted W7 connection branch.", { adjusted_snow_region: adjustedSnowRegion, adjusted_factor: adjustedFactorRaw, wind_region: input.baseLegacyClimate.windRegion });
  }

  const row15FrameResolution = selectFrame({
    span_m: input.span_m,
    building_length_m: input.building_length_m,
    building_height_m: input.building_height_m,
    responsibility_factor: input.responsibility_factor,
    frame_step_override_m: null,
    climate: input.climate,
    legacy_frame_branch: row15Branch.mappedBranchKey,
  }, datasets.frame);
  if (row15FrameResolution.status !== "success") {
    return failure(row15FrameResolution.status === "legacy_na" ? "legacy_error" : "no_match", row15FrameResolution.status === "legacy_na" ? "LEGACY_NA" : "LOOKUP_NO_MATCH", "Не удалось рассчитать ROW15 frame candidate.", { status: row15FrameResolution.status, diagnostics: row15FrameResolution.diagnostics }, row15FrameResolution.status === "legacy_na" ? "#N/A" : null);
  }
  const row15PurlinResolution = calculatePurlin({
    span_m: input.span_m,
    building_length_m: input.building_length_m,
    responsibility_factor: input.responsibility_factor,
    roof_covering: input.roof_covering,
    roof_deck_grade: input.roof_deck_grade,
    snow_retention_purlin: input.snow_retention_purlin,
    enclosure_purlin: input.enclosure_purlin,
    purlin_max_step_override_mm: input.purlin_max_step_override_mm ?? null,
    purlin_min_step_mm: input.purlin_min_step_mm ?? 0,
    building_roof_type: input.building_roof_type,
  }, input.climate, row15FrameResolution.frame, datasets.purlin);
  if (row15PurlinResolution.status !== "success") {
    return failure(row15PurlinResolution.status === "legacy_error" ? "legacy_error" : "no_match", row15PurlinResolution.status === "legacy_error" ? "LEGACY_VALUE_ERROR" : "LOOKUP_NO_MATCH", "Не удалось рассчитать ROW15 purlin candidate.", { status: row15PurlinResolution.status, diagnostics: row15PurlinResolution.diagnostics }, row15PurlinResolution.status === "legacy_error" ? "#VALUE!" : null);
  }

  const row14Base = frameBase(input, input.baseFrame);
  const row15Base = frameBase(input, row15FrameResolution.frame);
  if (row14Base === null || row15Base === null) {
    return failure("no_match", "LOOKUP_NO_MATCH", "Для E8/E9 отсутствуют доказанные frame-base intermediates.", { row14_frame: input.baseFrame, row15_frame: row15FrameResolution.frame });
  }
  const row14Score = row14Base + input.basePurlin.purlin_kg_per_m2;
  const row15Score = row15Base + row15PurlinResolution.purlin.purlin_kg_per_m2;
  const activeBranch: LegacyConnectionBranch = row14Score > row15Score ? "ROW15" : "ROW14";
  const row14Trace: LegacyConnectionCandidateTrace = {
    candidate: "ROW14",
    effectiveSnowLoad: input.baseLegacyClimate.effectiveSnowLoad,
    lookupKey: input.baseLegacyClimate.lookupKey,
    factor: row14Factor,
    rawBranchKey: input.baseLegacyFrameBranch.rawBranchKey,
    mappedBranchKey: input.baseLegacyFrameBranch.mappedBranchKey,
    frameStepM: input.baseFrame.frame_step_m,
    frameBaseKgPerM2: row14Base,
    purlinKgPerM2: input.basePurlin.purlin_kg_per_m2,
    scoreKgPerM2: row14Score,
  };
  const row15Trace: LegacyConnectionCandidateTrace = {
    candidate: "ROW15",
    effectiveSnowLoad: adjustedSnowLoad,
    lookupKey: adjustedLookupKey,
    factor: row15Factor,
    rawBranchKey: row15Branch.rawBranchKey,
    mappedBranchKey: row15Branch.mappedBranchKey,
    frameStepM: row15FrameResolution.frame.frame_step_m,
    frameBaseKgPerM2: row15Base,
    purlinKgPerM2: row15PurlinResolution.purlin.purlin_kg_per_m2,
    scoreKgPerM2: row15Score,
  };
  const activeTrace = activeBranch === "ROW14" ? row14Trace : row15Trace;
  const row = lookupRow(designFamily, activeBranch, activeTrace.factor, band, activeTrace.mappedBranchKey);
  if (!row) return failure("no_match", "LOOKUP_NO_MATCH", "Connection lookup row отсутствует в точной legacy-матрице.", { design_family: designFamily, active_branch: activeBranch, factor: activeTrace.factor, height_band_m: band, branch_key: activeTrace.mappedBranchKey });
  if (!patternsAreText(row)) return failure("legacy_error", "LEGACY_VALUE_ERROR", "Legacy connection row содержит нетекстовый или ошибочный шаблон болтов.", { row }, "#VALUE!");

  return {
    status: "success",
    diagnostics: [],
    connection: {
      designFamily,
      activeBranch,
      ridgeBeamBoltPattern: row.ridgeBeamBoltPattern as string,
      ridgeBeamBoltQuantity: row.ridgeBeamBoltQuantity,
      eaveBeamBoltPattern: row.eaveBeamBoltPattern as string,
      supportColumnBoltPattern: row.supportColumnBoltPattern as string,
      eaveColumnBoltPattern: row.eaveColumnBoltPattern as string,
      fittingsWeightKg: row.fittingsWeightKg,
      trace: {
        sourceFormula: "вывод!D52:D57 = IF(E8>E9, ROW15, ROW14)",
        heightBandM: band,
        equalityBehavior: "ROW14",
        row14: row14Trace,
        row15: row15Trace,
        lookupSourceSheet: row.source.sheet,
        lookupValueCells: row.source.valueCells,
      },
    },
  };
}
