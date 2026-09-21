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
import type { ManualWallGirtReplayInput } from "../enclosure/manualWallGirtReplay";

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

/** Supported modern envelope systems plus the explicit historical-only system. */
export type ProjectEnvelopeSystem =
  | "PROFILED_SHEET_COLD"
  | "SANDWICH_PANEL";

export type LegacyEnvelopeSystem = "INSI_BUILT_UP_PANEL_LEGACY";

export type EnvelopeSystem = ProjectEnvelopeSystem | LegacyEnvelopeSystem;

export type SupplyScope = "FRAME_ONLY" | "FULL_BUILDING";

export interface ProjectGeometry {
  span_m: SpanM;
  building_length_m: number;
  building_height_m: number;
  responsibility_factor: 0.8 | 1.0;
  frame_step_override_m: number | null;
}

export interface ProjectEnvelope {
  /** Product-domain meaning; kept separate from the legacy D20 compatibility value. */
  system: EnvelopeSystem;
  roof_covering: RoofCovering;
  roof_deck_grade: RoofDeckGrade;
  wall_system: string;
}

export interface ProjectSupply {
  /** null means a v1 file had no proven commercial-scope value. */
  scope: SupplyScope | null;
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

export type ProjectOpening =
  GateOpening | DoorOpening | WindowOpening | StripWindowOpening;

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

export interface ProjectEnclosure {
  wall_girts: ManualWallGirtReplayInput[];
}

/** Single source of truth for user-entered project data. */
export interface ProjectInput {
  /** Explicit project country selector; climate.country mirrors this value. */
  countryCode: CountryCode;
  climate: ProjectClimate;
  geometry: ProjectGeometry;
  envelope: ProjectEnvelope;
  supply: ProjectSupply;
  openings: ProjectOpening[];
  special_conditions: ProjectSpecialConditions;
  other: ProjectOtherFields;
  enclosure?: ProjectEnclosure;
}

export function createOpeningId(kind: ProjectOpening["kind"]): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${kind}-${suffix}`;
}
