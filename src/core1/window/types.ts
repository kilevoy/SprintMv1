import type { LoadedDataset } from "../data";
import type { Core1ClimateResult, Core1Diagnostic, WindowsInput } from "../types";
import type { FrameResult } from "../frame";

export interface WindowGirtInput {
  windows: WindowsInput;
  climate: Core1ClimateResult;
  frame: FrameResult;
  scheme_factor?: number;
  utilization_limit?: number;
}

export interface WindowCandidate {
  row: number;
  steel: string;
  ry_mpa: number;
  profile: string;
  height_mm: number;
  width_mm: number;
  area_cm2: number;
  mass_kg_m: number;
}

export interface WindowGirtTrace {
  window_type: 1 | 2 | 3 | 4 | 5;
  normative_system: Core1ClimateResult["normative_system"];
  wind_branch: "SP_20" | "SP_RK_EN";
  wind_intermediate: { wind_load_kpa: number; lower_wind_load_kpa: number; upper_wind_load_kpa: number };
  glazing_load_kpa: number;
  scheme_factor: number;
  utilization_limit: number;
  lower_load: number;
  upper_load: number;
  lower_candidates: number;
  upper_candidates: number;
  selected_lower_row: number;
  selected_upper_row: number;
  mass_components: { lower_kg: number; upper_kg: number; total_kg: number };
}

export interface WindowGirtResult {
  lower_girt_profile: string;
  lower_girt_steel: string;
  lower_girt_utilization: number;
  upper_girt_profile: string;
  upper_girt_steel: string;
  upper_girt_utilization: number;
  window_girts_weight_kg: number;
  trace: WindowGirtTrace;
}

export interface WindowGirtDatasetBundle {
  profileCandidates: LoadedDataset;
}

export type WindowGirtResolveResult =
  | { status: "success"; windowGirts: WindowGirtResult; diagnostics: Core1Diagnostic[] }
  | { status: "no_match" | "invalid_input"; windowGirts: null; diagnostics: Core1Diagnostic[] };
