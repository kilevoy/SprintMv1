import type { Core1Diagnostic, Core1Input, DesignSpanFamily } from "../types";
import type { Core1ClimateResult } from "../types";
import type { FrameDatasetView, FrameResult } from "../frame";
import type { LegacyClimateResult, LegacyFrameBranchResult } from "../legacy";
import type { PurlinDatasetBundle, PurlinResultValue } from "../purlin";

export type LegacyConnectionBranch = "ROW14" | "ROW15";
export type LegacyConnectionScalar = number | string;

export interface LegacyConnectionSnapshotProvenance {
  /** Metadata only. It must never be used as a calculation selector. */
  projectId: string;
  sourceWorkbook: string;
  sourceWorkbookSha256: string;
  formulaFingerprint: string;
}

export interface LegacyConnectionSelectedRow {
  sourceSheet: string;
  sourceAddresses: readonly string[];
  F: LegacyConnectionScalar;
  J: LegacyConnectionScalar;
  K: string;
  L: string;
  M: string;
  N: string;
}

export interface LegacyConnectionSnapshot {
  schema_version: 1;
  designFamily: DesignSpanFamily;
  activeBranch: LegacyConnectionBranch;
  selectedRow: LegacyConnectionSelectedRow;
  provenance: LegacyConnectionSnapshotProvenance;
}

export interface LegacyConnectionResult {
  designFamily: DesignSpanFamily;
  activeBranch: LegacyConnectionBranch;
  sourceSheet: string;
  sourceAddresses: readonly string[];
  ridgeBeamBoltPattern: string;
  ridgeBeamBoltQuantity: LegacyConnectionScalar;
  eaveBeamBoltPattern: string;
  supportColumnBoltPattern: string;
  eaveColumnBoltPattern: string;
  fittingsWeightKg: LegacyConnectionScalar;
  provenance: LegacyConnectionSnapshotProvenance;
}

export type LegacyConnectionReplayStatus = "success" | "legacy_error" | "snapshot_required" | "invalid_snapshot";

export interface LegacyConnectionReplaySuccess {
  status: "success";
  result: LegacyConnectionResult;
  diagnostics: Core1Diagnostic[];
}

export interface LegacyConnectionReplayLegacyError {
  status: "legacy_error";
  result: LegacyConnectionResult;
  diagnostics: Core1Diagnostic[];
}

export interface LegacyConnectionReplayFailure {
  status: "snapshot_required" | "invalid_snapshot";
  result: null;
  diagnostics: Core1Diagnostic[];
}

export type LegacyConnectionReplayResult =
  | LegacyConnectionReplaySuccess
  | LegacyConnectionReplayLegacyError
  | LegacyConnectionReplayFailure;

export type LegacyConnectionReplayInput = Pick<Core1Input, "span_m">;

export interface LegacyConnectionLookupRow {
  designFamily: DesignSpanFamily;
  candidate: LegacyConnectionBranch;
  factor: number;
  heightBandM: number;
  branchKey: string;
  ridgeBeamBoltQuantity: number;
  fittingsWeightKg: number;
  ridgeBeamBoltPattern: LegacyConnectionScalar;
  eaveBeamBoltPattern: LegacyConnectionScalar;
  supportColumnBoltPattern: LegacyConnectionScalar;
  eaveColumnBoltPattern: LegacyConnectionScalar;
  source: {
    sheet: string;
    valueCells: Record<string, string>;
  };
}

export interface LegacyConnectionLookupDataset {
  schemaVersion: 1;
  classification: "LEGACY_CONNECTION_MODEL_COMPLETE";
  statistics: {
    rowCount: number;
    row14Count: number;
    row15Count: number;
    sharedEqualKeys: number;
    anomalyCount: number;
  };
  rows: LegacyConnectionLookupRow[];
}

export interface LegacyConnectionResolverInput extends Pick<Core1Input,
  | "span_m"
  | "building_length_m"
  | "building_height_m"
  | "responsibility_factor"
  | "frame_step_override_m"
  | "roof_covering"
  | "roof_deck_grade"
  | "snow_retention_purlin"
  | "enclosure_purlin"
  | "purlin_max_step_override_mm"
  | "purlin_min_step_mm"
  | "building_roof_type"
> {
  climate: Core1ClimateResult;
  baseLegacyClimate: LegacyClimateResult;
  baseLegacyFrameBranch: LegacyFrameBranchResult;
  baseFrame: FrameResult;
  basePurlin: PurlinResultValue;
}

export interface LegacyConnectionResolverDatasets {
  frame: FrameDatasetView;
  purlin: PurlinDatasetBundle;
}

export interface LegacyConnectionCandidateTrace {
  candidate: LegacyConnectionBranch;
  effectiveSnowLoad: number;
  lookupKey: number;
  factor: number;
  rawBranchKey: string;
  mappedBranchKey: string;
  frameStepM: number;
  frameBaseKgPerM2: number;
  purlinKgPerM2: number;
  scoreKgPerM2: number;
}

export interface LegacyConnectionResolvedValue {
  designFamily: DesignSpanFamily;
  activeBranch: LegacyConnectionBranch;
  ridgeBeamBoltPattern: string;
  ridgeBeamBoltQuantity: number;
  eaveBeamBoltPattern: string;
  supportColumnBoltPattern: string;
  eaveColumnBoltPattern: string;
  fittingsWeightKg: number;
  trace: {
    sourceFormula: "вывод!D52:D57 = IF(E8>E9, ROW15, ROW14)";
    heightBandM: number;
    equalityBehavior: "ROW14";
    row14: LegacyConnectionCandidateTrace;
    row15: LegacyConnectionCandidateTrace;
    lookupSourceSheet: string;
    lookupValueCells: Record<string, string>;
  };
}

export type LegacyConnectionResolveStatus = "success" | "legacy_error" | "unsupported" | "no_match";

export interface LegacyConnectionResolveSuccess {
  status: "success";
  connection: LegacyConnectionResolvedValue;
  diagnostics: Core1Diagnostic[];
}

export interface LegacyConnectionResolveFailure {
  status: Exclude<LegacyConnectionResolveStatus, "success">;
  connection: null;
  diagnostics: Core1Diagnostic[];
}

export type LegacyConnectionResolveResult = LegacyConnectionResolveSuccess | LegacyConnectionResolveFailure;
