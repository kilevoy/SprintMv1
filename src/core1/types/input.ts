export type SpanM = 9 | 12 | 15 | 18 | 21 | 24;
export type ResponsibilityFactor = 0.8 | 1.0;
export type BinaryPurlinFlag = "есть" | "нет";
export type BuildingRoofType = "двускатное" | "односкатное";
export type TerrainType = "А" | "В" | "С";
export type NormativeBranch = "по СП РК EN" | "по СП 20.13330.20ХХ";
export type CountryCode = "RU" | "KZ";
export type NormativeSystem = "SP_20" | "SP_RK_EN";
export type SeismicityClassification = "ACTIVE_CALCULATION_INPUT" | "INFORMATIONAL" | "RESERVED" | "UNKNOWN";
/** Existing Core 1 specifications do not prove seismicity in structural formulas. */
export const CORE1_SEISMICITY_CLASSIFICATION: SeismicityClassification = "UNKNOWN";
export type SelectionMode = "стандарт" | "подбор";
export type RoofDeckGrade = "С44-1000-0,5" | "С44-1000-0,7" | "Н60-845-0,7" | "Н60-845-0,8";

export type RoofCovering =
  | "наше 100 мм"
  | "наше 150 мм"
  | "наше 200 мм"
  | "наше 250 мм"
  | "наше 150 мм с 1 слоем гвл"
  | "наше 150 мм с 2 слоем гвл"
  | "наше 200 мм с 1 слоем гвл"
  | "наше 200 мм с 2 слоем гвл"
  | "наше 250 мм с 1 слоем гвл"
  | "наше 250 мм с 2 слоем гвл"
  | "С-П 50"
  | "С-П 80"
  | "С-П 100"
  | "С-П 120"
  | "С-П 150"
  | "С-П 200"
  | "С-П 250"
  | "малоуклонная кровля с подв. п."
  | "малоуклонная кровля без подв. п."
  | "профлист";

export interface WindowsInput {
  enabled: boolean;
  window_type: 1 | 2 | 3 | 4 | 5;
  window_height_m: number;
  window_strip_length_m: number;
  separate_window_count: number;
  glazing_construction: string;
}

export interface CityLookupClimateInput {
  mode: "CITY_LOOKUP";
  country: CountryCode;
  city: string;
  normative_system: NormativeSystem;
}

export interface ManualClimateInput {
  mode: "MANUAL";
  country: CountryCode;
  normative_system: NormativeSystem;
  snow_region: string | number;
  snow_load: number;
  wind_region: string | number;
  wind_load: number;
  seismicity: string | number | null;
  source_note?: string;
}

export type ClimateInput = CityLookupClimateInput | ManualClimateInput;

export interface Core1Input {
  /** @deprecated Use climate.mode=CITY_LOOKUP and climate.city. */
  city?: string;
  country?: CountryCode;
  normative_system?: NormativeSystem;
  climate?: ClimateInput;
  span_m: SpanM;
  building_length_m: number;
  building_height_m: number;
  responsibility_factor: ResponsibilityFactor;
  frame_step_override_m?: number | null;
  roof_covering: RoofCovering;
  roof_deck_grade: RoofDeckGrade;
  snow_retention_purlin: BinaryPurlinFlag;
  enclosure_purlin: BinaryPurlinFlag;
  horizontal_bracing_override?: "+" | null;
  gates_le_6m_count: number;
  gates_gt_6m_count: number;
  doors_count: number;
  /** @deprecated Use windows.window_height_m. */
  window_height_m?: number;
  /** @deprecated Use windows.window_strip_length_m. */
  window_strip_length_m?: number;
  /** @deprecated Use windows.separate_window_count. */
  separate_windows_count?: number;
  /** @deprecated Use windows.glazing_construction. */
  window_construction?: string;
  windows?: WindowsInput;
  selection_mode?: SelectionMode;
  building_roof_type?: BuildingRoofType;
  purlin_max_step_override_mm?: number | null;
  purlin_min_step_mm?: number;
  terrain_type?: TerrainType;
  window_scheme_factor?: 1.1 | 1.0 | 0.8;
  /** @deprecated Use windows.window_type. */
  window_type?: 1 | 2 | 3 | 4 | 5;
  window_utilization_limit?: number;
  normative_branch?: NormativeBranch;
}
