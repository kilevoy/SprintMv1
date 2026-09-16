import { describe, expect, it } from "vitest";
import { projectInputToCore1Input } from "./adapter";
import type { ProjectInput } from "./types";

function project(overrides: Partial<ProjectInput> = {}): ProjectInput {
  return {
    climate: { mode: "CITY_LOOKUP", country: "RU", city: "Роза", normative_system: "SP_20" },
    geometry: { span_m: 12, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8, frame_step_override_m: null },
    envelope: { roof_covering: "С-П 200", roof_deck_grade: "С44-1000-0,7", wall_system: "Сэндвич-панель 200 мм" },
    openings: [],
    special_conditions: { snow_retention_purlin: "нет", enclosure_purlin: "нет", horizontal_bracing_override: null },
    other: { selection_mode: "стандарт", building_roof_type: "двускатное", purlin_max_step_override_mm: null, purlin_min_step_mm: 0, terrain_type: "В", window_scheme_factor: 1.0, window_utilization_limit: 0.85 },
    ...overrides,
  };
}

describe("projectInputToCore1Input", () => {
  it("aggregates gate quantities only with an explicit, externally verified boundary dimension", () => {
    const value = project({ openings: [
      { id: "gate-a", kind: "gate", width_mm: 4000, height_mm: 4200, quantity: 2 },
      { id: "gate-b", kind: "gate", width_mm: 6500, height_mm: 5000, quantity: 1 },
    ] });
    const result = projectInputToCore1Input(value, { gate_boundary_dimension: "width_mm" });
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.input).toMatchObject({ gates_le_6m_count: 2, gates_gt_6m_count: 1 });
  });

  it("refuses to guess whether width or height controls the workbook 6 m gate boundary", () => {
    const result = projectInputToCore1Input(project({ openings: [{ id: "gate-a", kind: "gate", width_mm: 4000, height_mm: 4200, quantity: 1 }] }));
    expect(result.status).toBe("unsupported");
    expect(result.diagnostics[0]?.code).toBe("CORE1_GATE_CLASSIFICATION_UNVERIFIED");
  });

  it("aggregates all door quantities into legacy D62 while retaining dimensions in ProjectInput", () => {
    const value = project({ openings: [
      { id: "door-a", kind: "door", width_mm: 900, height_mm: 2100, quantity: 2 },
      { id: "door-b", kind: "door", width_mm: 1200, height_mm: 2200, quantity: 1 },
    ] });
    const result = projectInputToCore1Input(value);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.input.doors_count).toBe(3);
      expect(value.openings).toHaveLength(2);
      expect(value.openings[1]).toMatchObject({ width_mm: 1200, height_mm: 2200 });
    }
  });

  it("aggregates compatible window groups without putting wall_system into Core1Input", () => {
    const value = project({ openings: [
      { id: "window-a", kind: "window", width_mm: 1200, height_mm: 1500, quantity: 4, window_type: 1, glazing_construction: "2ой стеклопакет" },
      { id: "window-b", kind: "window", width_mm: 1200, height_mm: 1500, quantity: 2, window_type: 1, glazing_construction: "2ой стеклопакет" },
    ] });
    const result = projectInputToCore1Input(value);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.input.windows).toMatchObject({ enabled: true, window_height_m: 1.5, separate_window_count: 6 });
      expect(result.input).not.toHaveProperty("wall_system");
    }
  });

  it("does not silently collapse incompatible window groups", () => {
    const result = projectInputToCore1Input(project({ openings: [
      { id: "window-a", kind: "window", width_mm: 1200, height_mm: 1500, quantity: 1, window_type: 1, glazing_construction: "2ой стеклопакет" },
      { id: "window-b", kind: "window", width_mm: 1500, height_mm: 1800, quantity: 1, window_type: 2, glazing_construction: "1ой стеклопакет" },
    ] }));
    expect(result.status).toBe("unsupported");
    expect(result.diagnostics[0]?.code).toBe("CORE1_OPENINGS_NOT_REPRESENTABLE");
  });
});
