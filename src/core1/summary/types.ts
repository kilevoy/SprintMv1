import type { Core1Diagnostic, Core1Input } from "../types";
import type { FrameResult } from "../frame";
import type { PurlinResultValue } from "../purlin";
import type { SecondarySteelResult } from "../secondary";
import type { WindowGirtResult } from "../window";
import type { OpeningMassResult } from "../opening";

export interface StructuralSummaryInput {
  scenario: Pick<Core1Input, "span_m" | "building_length_m" | "frame_step_override_m">;
  frame: FrameResult;
  purlin: PurlinResultValue;
  secondarySteel: SecondarySteelResult;
  windows: WindowGirtResult | null;
  openings: OpeningMassResult;
}

export interface StructuralSummaryTrace {
  source_formula: "вывод!D69 = IF(D9=0,E8,E9)+D68";
  source_cells: string[];
  area_m2: number;
  frame_count: number;
  tie_bays: number;
  frame_mass_kg_per_frame: number;
  ties_mass_kg: number;
  tube_mass_kg_per_m2: number;
  frame_base_kg_per_m2: number;
  purlin_kg_per_m2: number;
  opening_kg_per_m2: number;
  included_components: string[];
  excluded_components: string[];
  purlin_weight_kg_excluded_from_summary: true;
  windows_already_in_openings: true;
  secondary_steel_recalculated: false;
  intermediate_rounding: "none_observed";
}

export interface StructuralSummaryResult {
  kg_per_m2: number;
  trace: StructuralSummaryTrace;
}

export type StructuralSummaryCalculationResult =
  | { status: "success"; summary: StructuralSummaryResult; diagnostics: Core1Diagnostic[] }
  | { status: "invalid_input"; summary: null; diagnostics: Core1Diagnostic[] };
