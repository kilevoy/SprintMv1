import type {
  BuildingRoofType,
  CountryCode,
  NormativeSystem,
  RoofCovering,
  RoofDeckGrade,
  SpanM,
  TerrainType,
  WindowsInput,
} from "../core1/types";

export interface ProjectClimateLookup {
  mode: "CITY_LOOKUP";
  country: CountryCode;
  city: string;
  normative_system: NormativeSystem;
}

export interface ProjectClimateManual {
  mode: "MANUAL";
  country: CountryCode;
  normative_system: NormativeSystem;
  snow_region: string;
  snow_load: number;
  wind_region: string;
  wind_load: number;
  seismicity: string;
  source_note: string;
}

export type ProjectClimate = ProjectClimateLookup | ProjectClimateManual;

export interface ProjectGeometry {
  span_m: SpanM;
  building_length_m: number;
  building_height_m: number;
  responsibility_factor: 0.8 | 1.0;
  frame_step_override_m: number | null;
}

export interface ProjectEnvelope {
  roof_covering: RoofCovering;
  roof_deck_grade: RoofDeckGrade;
  wall_system: string;
}

export interface GateOpening {
  id: string;
  kind: "gate";
  width_mm: number;
  height_mm: number;
  quantity: number;
}

export interface DoorOpening {
  id: string;
  kind: "door";
  width_mm: number;
  height_mm: number;
  quantity: number;
}

export interface WindowOpening {
  id: string;
  kind: "window";
  width_mm: number;
  height_mm: number;
  quantity: number;
  window_type: WindowsInput["window_type"];
  glazing_construction: string;
}

export interface StripWindowOpening {
  id: string;
  kind: "strip_window";
  height_mm: number;
  length_mm: number;
  quantity: number;
  window_type: WindowsInput["window_type"];
  glazing_construction: string;
}

export type ProjectOpening = GateOpening | DoorOpening | WindowOpening | StripWindowOpening;

export interface ProjectSpecialConditions {
  snow_retention_purlin: "есть" | "нет";
  enclosure_purlin: "есть" | "нет";
  horizontal_bracing_override: "+" | null;
}

export interface ProjectOtherFields {
  selection_mode: "стандарт" | "подбор";
  building_roof_type: BuildingRoofType;
  purlin_max_step_override_mm: number | null;
  purlin_min_step_mm: number;
  terrain_type: TerrainType;
  window_scheme_factor: 1.1 | 1.0 | 0.8;
  window_utilization_limit: number;
}

/** Single source of truth for user-entered project data. */
export interface ProjectInput {
  climate: ProjectClimate;
  geometry: ProjectGeometry;
  envelope: ProjectEnvelope;
  openings: ProjectOpening[];
  special_conditions: ProjectSpecialConditions;
  other: ProjectOtherFields;
}

export function createOpeningId(kind: ProjectOpening["kind"]): string {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${kind}-${suffix}`;
}
