import type { Core1Diagnostic } from "./diagnostic";

export interface Core1Component {
  name: string;
  profile: string | number | null;
  steel: string | null;
  source_cell: string;
  status: string;
}

export interface Core1Bolt {
  name: string;
  pattern: string;
  source_cell: string;
  quantity?: number | null;
}

export interface Core1ExcelOutputRow {
  kind: "DATA" | "GROUP_HEADER";
  order: number;
  label: string;
  value1: string | number | null;
  value2: string | number | null;
  value3: string | number | null;
  unit: string | null;
  source_cell: string | null;
  status: "CALCULATED" | "INPUT_ECHO" | "LEGACY_COMPATIBILITY" | "BLANK";
}

export interface Core1ExcelOutputSection {
  id: "SELECTED_SECTIONS" | "BOLTS" | "FITTINGS" | "OPENINGS";
  title: string;
  rows: Core1ExcelOutputRow[];
}

export interface Core1ExcelOutput {
  sections: Core1ExcelOutputSection[];
}

export interface Core1FrameGrid {
  automaticFrameStepM: number | null;
  manualFrameStepOverrideM: number | null;
  effectiveFrameStepM: number;
  bayCount: number;
  frameCount: number;
}

export interface Core1SectionSelection extends Core1Component {
  utilization: number | null;
}

export interface Core1PurlinSelection {
  profile: string;
  steel: string;
  assignment: string;
  utilization: number | null;
  stepMm: number;
  massKgPerM2: number;
  massKg: number;
  source_cell: string;
  status: string;
}

export interface Core1SelectedSections {
  beams: Core1SectionSelection;
  columns: Core1SectionSelection;
  roofPurlins: Core1PurlinSelection;
  ties: Core1Component;
  suspensions: Core1Component;
  spacers: Core1Component;
  horizontalBracing: Core1Component[];
  verticalBracing: Core1Component[];
  facadePosts: Core1Component;
  portalBracing: Core1Component;
  secondaryBeams: Core1Component[];
  secondaryColumns: Core1Component;
  eaveRidgePlate: Core1Component;
  basePlate: Core1Component;
  windowGirts: Array<Record<string, unknown>>;
}

export interface Core1CanonicalConnections {
  bolts: Core1Bolt[];
  m16Quantity: number | null;
  m16LegacyValue: string | null;
  fittingsMassKg: number | null;
}

export interface Core1ComponentMasses {
  mainFrameMassKg: number | null;
  purlinMassKg: number | null;
  fittingsMassKg: number | null;
  windowGirtsMassKg: number | null;
  openingMassKg: number | null;
  openingComponentsKg: {
    gateLe6m: number | null;
    gateGt6m: number | null;
    doors: number | null;
    windows: number | null;
  };
  knownMassKg: number | null;
  unknownComponents: string[];
  isComplete: false;
}

export interface Core1OpeningCompatibility {
  inputEcho: {
    gatesLe6mCount: number;
    gatesGt6mCount: number;
    doorsCount: number;
    windows: import("./input").WindowsInput;
  };
  derivedMassesKg: {
    gateLe6m: number;
    gateGt6m: number;
    doors: number;
    windows: number;
    total: number;
  };
  specificMassKgPerM2: number;
  totalMassT: number;
}

export interface Core1LegacyCompatibility {
  D8: number | null;
  D68: number | null;
  D69: number | null;
  units: { D8: "m"; D68: "kg/m²"; D69: "kg/m²" };
  D69_classification: "LEGACY_COMPATIBILITY_VALUE / REGRESSION_CHECKPOINT";
}

export interface Core1CanonicalResult {
  frameGrid: Core1FrameGrid;
  selectedSections: Core1SelectedSections;
  connections: Core1CanonicalConnections;
  componentMasses: Core1ComponentMasses;
  openingCompatibility: Core1OpeningCompatibility;
  diagnostics: Core1Diagnostic[];
  provenance: {
    modules: string[];
    legacyOutputProjection: string;
  };
  legacyCompatibility: Core1LegacyCompatibility;
}

export interface Core1ClimateResult {
  mode: import("./input").ClimateInput["mode"];
  country: import("./input").CountryCode;
  normative_system: import("./input").NormativeSystem;
  climate_source: "CITY_LOOKUP" | "MANUAL";
  city?: string | null;
  snow_region?: string | number | null;
  snow_load?: number | null;
  wind_region?: string | number | null;
  wind_load?: number | null;
  seismicity?: string | number | null;
  source?: string | null;
  source_note?: string | null;
  units?: { snow_load: "kN/m²"; wind_load: "kN/m²" };
}

export interface Core1Result {
  scenario: import("./input").Core1Input;
  canonical: Core1CanonicalResult;
  excelOutput: Core1ExcelOutput;
  climate?: Core1ClimateResult | null;
  frame_step_m?: number | null;
  beam_profile?: string | null;
  beam_steel?: string | null;
  beam_utilization?: number | null;
  column_profile?: string | null;
  column_steel?: string | null;
  column_utilization?: number | null;
  purlin_profile?: string | null;
  purlin_steel?: string | null;
  purlin_assignment?: string | null;
  purlin_step_mm?: number | null;
  purlin_kg_per_m2?: number | null;
  purlin_weight_kg?: number | null;
  ties?: Core1Component | null;
  suspensions?: Core1Component | null;
  spacers?: Core1Component | null;
  horizontal_bracing?: Core1Component[] | null;
  vertical_bracing?: Core1Component[] | null;
  gable_posts?: Core1Component | null;
  portal_bracing?: Core1Component | null;
  secondary_beams?: Core1Component[] | null;
  secondary_columns?: Core1Component | null;
  plates?: Core1Component[] | null;
  bolts?: Core1Bolt[] | null;
  M16_quantity?: number | null;
  fittings_weight_kg?: number | null;
  window_girts?: Array<Record<string, unknown>> | null;
  window_lower_girt_profile?: string | null;
  window_upper_girt_profile?: string | null;
  window_lower_girt_utilization?: number | null;
  window_upper_girt_utilization?: number | null;
  window_girts_weight_kg?: number | null;
  openings_weight_kg_per_m2?: number | null;
  openings_weight_t?: number | null;
  openings_weight_kg?: number | null;
  /** Public component summary; detailed provenance remains in engine context. */
  openings?: {
    gate_le_6m_mass_kg: number;
    gate_gt_6m_mass_kg: number;
    door_mass_kg: number;
    window_mass_kg: number;
    opening_mass_kg: number;
  } | null;
  kg_per_m2?: number | null;
  engineering_loads?: Record<string, unknown> | null;
  compatibility_diagnostics: import("./diagnostic").Core1Diagnostic[];
}
