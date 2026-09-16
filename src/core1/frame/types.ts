import type { DatasetRecord } from "../data";
import type { Core1ClimateResult, Core1Diagnostic, ResponsibilityFactor, SpanM } from "../types";

export interface FrameDatasetView {
  records: DatasetRecord[];
}

export interface FrameSelectorInput {
  span_m: SpanM;
  building_height_m: number;
  responsibility_factor: ResponsibilityFactor;
  frame_step_override_m?: number | null;
  climate: Core1ClimateResult;
}

export interface FrameSelectionTrace {
  selected_span_dataset: string;
  selected_branch: string;
  candidate_identifiers: string[];
  selection_reason: "first_match" | "automatic_step_match" | "manual_step_match";
}

export interface FrameResult {
  frame_step_m: number;
  beam_profile: string;
  beam_steel: string;
  beam_utilization: number;
  column_profile: string;
  column_steel: string;
  column_utilization: number;
  frame_mass_kg?: number | null;
  /** Proven intermediate values used by Расчёт!O2:O14 → D69. */
  frame_tie_unit_mass_kg?: number | null;
  tube_mass_kg_per_m2?: number | null;
  trace: FrameSelectionTrace;
}

export type FrameResolveStatus = "success" | "legacy_na" | "no_match" | "unknown_domain" | "invalid_input";

export interface FrameSelectionSuccess {
  status: "success";
  frame: FrameResult;
  diagnostics: Core1Diagnostic[];
}

export interface FrameSelectionFailure {
  status: Exclude<FrameResolveStatus, "success">;
  frame: null;
  diagnostics: Core1Diagnostic[];
}

export type FrameSelectionResult = FrameSelectionSuccess | FrameSelectionFailure;
