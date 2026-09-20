import type { ProjectInput } from "./types";

/** Canonical clean project state used by both application surfaces. */
export function createDefaultProjectInput(): ProjectInput {
  return {
    countryCode: "RU",
    climate: {
      mode: "CITY_LOOKUP",
      country: "RU",
      city: "",
      normative_system: "SP_20",
    },
    geometry: {
      span_m: 12,
      building_length_m: 18,
      building_height_m: 3,
      responsibility_factor: 0.8,
      frame_step_override_m: null,
    },
    envelope: {
      roof_covering: "С-П 200",
      roof_deck_grade: "С44-1000-0,7",
      wall_system: "Сэндвич-панель 200 мм",
    },
    openings: [],
    special_conditions: {
      snow_retention_purlin: "нет",
      enclosure_purlin: "нет",
      horizontal_bracing_override: null,
    },
    other: {
      selection_mode: "стандарт",
      building_roof_type: "двускатное",
      purlin_max_step_override_mm: null,
      purlin_min_step_mm: 0,
      terrain_type: "В",
      window_scheme_factor: 1,
      window_utilization_limit: 0.85,
    },
    enclosure: { wall_girts: [] },
  };
}
