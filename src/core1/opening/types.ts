import type { FrameResult } from "../frame";
import type { SecondarySteelResult } from "../secondary";
import type { Core1Diagnostic, WindowsInput } from "../types";
import type { WindowGirtResult } from "../window";

/** Proven constants copied from Лист1!O23:O25 and Лист7!O27. */
export interface OpeningMassData {
  gate_le_6m_unit_mass_kg: number;
  gate_gt_6m_unit_mass_kg: number;
  door_extra_width_m: number;
  door_areal_mass_kg_per_m2: number;
  fabrication_factor: number;
  source_cells: string[];
}

export const DEFAULT_OPENING_MASS_DATA: OpeningMassData = {
  gate_le_6m_unit_mass_kg: 350,
  gate_gt_6m_unit_mass_kg: 450,
  door_extra_width_m: 4,
  door_areal_mass_kg_per_m2: 7.2,
  fabrication_factor: 1.05,
  source_cells: ["Лист1!Q23", "Лист1!Q24", "Лист1!O23:O25", "Лист7!O27"],
};

export interface OpeningMassInput {
  gate_count_le_6m: number;
  gate_count_gt_6m: number;
  door_count: number;
  windows: WindowsInput;
  frame: FrameResult;
  span_m: number;
  building_length_m: number;
  secondarySteel?: SecondarySteelResult;
  windowGirts: WindowGirtResult | null;
  data?: Partial<OpeningMassData>;
}

export interface OpeningMassTrace {
  source_cells: string[];
  units: {
    gate_le_6m: "kg";
    gate_gt_6m: "kg";
    door: "kg";
    windows: "kg";
    opening_total: "kg";
    specific: "kg/m²";
    tonnes: "t";
  };
  separate_window_count: number;
  window_strip_length_m: number;
  strip_frame_bays: number;
  window_girt_mass_kg: number;
  window_strip_mass_kg: number;
  secondary_steel_excluded: boolean;
  pricing_included: false;
  core2_included: false;
}

export interface OpeningMassResult {
  gate_le_6m_mass_kg: number;
  gate_gt_6m_mass_kg: number;
  door_mass_kg: number;
  window_mass_kg: number;
  opening_mass_kg: number;
  opening_mass_kg_per_m2: number;
  opening_mass_t: number;
  trace: OpeningMassTrace;
}

export interface OpeningMassSuccess {
  status: "success";
  openingMass: OpeningMassResult;
  diagnostics: Core1Diagnostic[];
}

export interface OpeningMassFailure {
  status: "invalid_input";
  openingMass: null;
  diagnostics: Core1Diagnostic[];
}

export type OpeningMassCalculationResult = OpeningMassSuccess | OpeningMassFailure;
