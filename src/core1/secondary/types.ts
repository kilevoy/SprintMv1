import type { LoadedDataset } from "../data";
import type { Core1ClimateResult, Core1Diagnostic, Core1Input } from "../types";
import type { FrameResult } from "../frame";
import type { PurlinResultValue } from "../purlin";
import type { LegacyConnectionResolvedValue } from "../legacyConnection";

export interface SecondarySteelInput {
  span_m: Core1Input["span_m"];
  building_length_m: number;
  building_height_m: number;
  frame_step_m: number;
  horizontal_bracing_override?: Core1Input["horizontal_bracing_override"];
  legacy_connection?: LegacyConnectionResolvedValue | null;
}

export interface SecondarySteelDatasetBundle {
  rules: LoadedDataset;
  boltsPlatesFittings: LoadedDataset;
}

export interface SecondarySteelComponent {
  name: string;
  profile: string;
  steel: string;
  source_cell: string;
  status: "ok";
}

export interface SecondarySteelBolt {
  name: string;
  pattern: string;
  source_cell: string;
  quantity_unit: "pcs";
  quantity?: number;
}

export type ZeroLogicClassification =
  | "ACTIVE_ZEROED_TERM"
  | "MANUAL_SWITCH"
  | "SCENARIO_CONTROL"
  | "RESERVE_FORMULA"
  | "UNKNOWN_ZERO_LOGIC"
  | "CONFIRMED_UNUSED";

export interface ZeroControlledTerm {
  source_cell: string;
  calculated_value: number | string | null;
  inclusion_factor: number | string | null;
  effective_value: number | string | null;
  classification: ZeroLogicClassification;
}

export interface SecondarySteelTrace {
  active_branches: string[];
  selected_rules: string[];
  component_sources: string[];
  zero_controlled_terms: ZeroControlledTerm[];
  parity: "PROVEN_12M_BASELINE" | "PROVEN_LEGACY_CONNECTION" | "LOCAL_DETERMINISTIC";
}

export interface SecondarySteelResult {
  ties: SecondarySteelComponent;
  suspensions: SecondarySteelComponent;
  spacers: SecondarySteelComponent;
  horizontal_bracing: SecondarySteelComponent[];
  vertical_bracing: SecondarySteelComponent[];
  gable_posts: SecondarySteelComponent;
  portal_bracing: SecondarySteelComponent;
  secondary_beams: SecondarySteelComponent[];
  secondary_columns: SecondarySteelComponent;
  plates: SecondarySteelComponent[];
  bolts: SecondarySteelBolt[];
  M16_quantity: number;
  M16_quantity_unit: "pcs";
  fittings_weight_kg: number;
  fittings_weight_unit: "kg";
  trace: SecondarySteelTrace;
}

export type SecondarySteelStatus = "success" | "unsupported" | "invalid_input";

export interface SecondarySteelSuccess {
  status: "success";
  secondary: SecondarySteelResult;
  diagnostics: Core1Diagnostic[];
}

export interface SecondarySteelFailure {
  status: Exclude<SecondarySteelStatus, "success">;
  secondary: null;
  diagnostics: Core1Diagnostic[];
}

export type SecondarySteelCalculationResult = SecondarySteelSuccess | SecondarySteelFailure;

export type SecondarySteelCalculator = (
  input: SecondarySteelInput,
  climate: Core1ClimateResult,
  frame: FrameResult,
  purlin: PurlinResultValue,
  datasets: SecondarySteelDatasetBundle,
) => SecondarySteelCalculationResult;
