import type { Core1Diagnostic, Core1ClimateResult, RoofCovering, ResponsibilityFactor } from "../types";
import type { ClimateDatasetView } from "../climate";

export type LegacyScalar = string | number;

export interface LegacyRoofCorrectionRow {
  source_row: number;
  roof_covering: string;
  correction: number;
  source_formula: string;
  base_value: number;
}

export interface LegacyClimateClassificationRow {
  source_row: number;
  lookup_key: number;
  j_region: LegacyScalar;
  k_factor: LegacyScalar;
  l_region: LegacyScalar;
  m_factor: LegacyScalar;
  ae_cached: LegacyScalar;
  af_cached: number;
}

export interface LegacyFrameBranchMappingRow {
  source_row: number;
  raw_branch_key: string;
  snow_numeric: number;
  wind_numeric: number;
  mapped_branch_key: string;
}

export interface LegacyClimateResult {
  effectiveSnowLoad: number;
  roofCorrection: number;
  lookupKey: number;
  jRegion: LegacyScalar;
  kFactor: LegacyScalar;
  lRegion: LegacyScalar;
  mFactor: LegacyScalar;
  activeSnowRegion: LegacyScalar;
  activeSnowFactor: LegacyScalar;
  windRegion: string | number;
  city: string;
  sourceRow: number;
  diagnostics: Core1Diagnostic[];
}

export interface LegacyClimateDeriverInput {
  city: string;
  responsibility_factor: ResponsibilityFactor;
  roof_covering: RoofCovering;
  climate: Core1ClimateResult;
  dataset: ClimateDatasetView;
}

export interface LegacyFrameBranchResult {
  snowNumeric: number;
  windNumeric: number;
  rawBranchKey: string;
  mappedBranchKey: string;
  diagnostics: Core1Diagnostic[];
}
