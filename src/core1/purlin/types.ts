import type { LoadedDataset } from "../data";
import type { Core1ClimateResult, Core1Diagnostic, Core1Input } from "../types";
import type { FrameResult } from "../frame";

export interface PurlinInput {
  span_m: Core1Input["span_m"];
  building_length_m: number;
  responsibility_factor: Core1Input["responsibility_factor"];
  roof_covering: Core1Input["roof_covering"];
  roof_deck_grade: Core1Input["roof_deck_grade"];
  snow_retention_purlin: Core1Input["snow_retention_purlin"];
  enclosure_purlin: Core1Input["enclosure_purlin"];
  purlin_max_step_override_mm?: number | null;
  purlin_min_step_mm?: number;
  building_roof_type?: Core1Input["building_roof_type"];
}

export interface PurlinDatasetBundle {
  selectionRules: LoadedDataset;
  profileCatalogue: LoadedDataset;
  calculationAxis: LoadedDataset;
  calculationConstants: LoadedDataset;
  literals: LoadedDataset;
  steelGrades: LoadedDataset;
  roofProperties: LoadedDataset;
  deckProperties: LoadedDataset;
}

export interface PurlinSelectionTrace {
  selected_branch: "М.п.350" | "М.п.390";
  candidate_count: number;
  evaluated_steps_mm: number[];
  selected_step_index: number;
  deck_step_limit_mm: number | null;
  configured_step_limit_mm: number | null;
  manual_step_limit_mm: number | null;
  effective_step_limit_mm: number | null;
  selected_step_mm: number | null;
  roof_self_weight_kg_per_m2: number;
  deck_key: string;
  snow_retention_purlin: "есть" | "нет";
  enclosure_purlin: "есть" | "нет";
  parity: "PROVEN_12M_BASELINE" | "LOCAL_DETERMINISTIC";
}

export interface PurlinResultValue {
  purlin_profile: string;
  purlin_steel: "М.п.350" | "М.п.390";
  purlin_assignment: string;
  purlin_step_mm: number;
  purlin_kg_per_m2: number;
  purlin_weight_kg: number;
  /** Raw compatibility-only field corresponding to Подбор прогонов 2!R28. */
  purlin_auxiliary_value: number | string | null;
  trace: PurlinSelectionTrace;
}

export type PurlinResolveStatus = "success" | "legacy_error" | "no_match" | "invalid_input";

export interface PurlinSelectionSuccess {
  status: "success";
  purlin: PurlinResultValue;
  diagnostics: Core1Diagnostic[];
}

export interface PurlinSelectionFailure {
  status: Exclude<PurlinResolveStatus, "success">;
  purlin: null;
  diagnostics: Core1Diagnostic[];
}

export type PurlinResult = PurlinSelectionSuccess | PurlinSelectionFailure;

export type PurlinCalculator = (
  input: PurlinInput,
  climate: Core1ClimateResult,
  frame: FrameResult,
  datasets: PurlinDatasetBundle,
) => PurlinResult;
