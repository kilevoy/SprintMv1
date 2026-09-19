import { describe, expect, it } from "vitest";
import { calculateColdEnclosure, projectInputToColdEnclosureInput } from "./index";
import type { ProjectInput } from "../project";

const project: ProjectInput = {
  climate: { mode: "CITY_LOOKUP", country: "RU", city: "Роза", normative_system: "SP_20" },
  geometry: { span_m: 10.4, building_length_m: 25.7, building_height_m: 4, responsibility_factor: 1.0, frame_step_override_m: null },
  envelope: { roof_covering: "С-П 200", roof_deck_grade: "С44-1000-0,7", wall_system: "Сэндвич-панель 200 мм" },
  openings: [
    { id: "gate-1", kind: "gate", width_mm: 4000, height_mm: 4200, quantity: 1 },
    { id: "window-1", kind: "window", width_mm: 1200, height_mm: 1500, quantity: 2, window_type: 1, glazing_construction: "2ой стеклопакет" },
  ],
  special_conditions: { snow_retention_purlin: "нет", enclosure_purlin: "нет", horizontal_bracing_override: null },
  other: { selection_mode: "стандарт", building_roof_type: "двускатное", purlin_max_step_override_mm: null, purlin_min_step_mm: 0, terrain_type: "В", window_scheme_factor: 1, window_utilization_limit: 0.85 },
};

describe("Cold Enclosure skeleton", () => {
  it("maps ProjectInput without creating a second state model", () => {
    const result = projectInputToColdEnclosureInput(project, { effectiveFrameStep_m: 4.5, frameCount: 7, source: { status: "REAL_PROJECT_VALIDATED", projectId: "22318" } }, { cladding: "INSULATED_SANDWICH" });
    expect(result.wallSystem.system).toBe("Сэндвич-панель 200 мм");
    expect(result.wallSystem.cladding).toBe("INSULATED_SANDWICH");
    expect(result.frameGrid).toMatchObject({ effectiveFrameStep_m: 4.5, frameCount: 7, status: "AUTO" });
  });

  it("preserves literal geometry and detailed openings", () => {
    const result = projectInputToColdEnclosureInput(project);
    expect(result.geometry).toMatchObject({ span_m: 10.4, building_length_m: 25.7, end_wall_width_m: 10.4 });
    expect(result.openings).toEqual(project.openings);
    expect(result.frameGrid.status).toBe("UNKNOWN");
  });

  it("does not project wall-system state into Core1", () => {
    const result = projectInputToColdEnclosureInput(project);
    expect(result.wallSystem.system).toBe(project.envelope.wall_system);
    expect(result).not.toHaveProperty("gates_le_6m_count");
    expect(result).not.toHaveProperty("doors_count");
  });

  it("returns deterministic unknown engineering instead of fabricated quantities", () => {
    const input = projectInputToColdEnclosureInput(project);
    const first = calculateColdEnclosure(input);
    const second = calculateColdEnclosure(input);
    expect(first).toEqual(second);
    expect(first.result.wallGirts.items).toEqual([]);
    expect(first.result.diagnostics.map((item) => item.code)).toContain("ENCLOSURE_WALL_GIRT_NOT_PROVEN");
    expect(first.result.totals.unknownMassComponents).toContain("wallGirts");
  });

  it("distinguishes physically known zero from unknown enclosure mass", () => {
    const result = calculateColdEnclosure(projectInputToColdEnclosureInput(project));
    expect(result.result.totals.knownMass_kg).toBe(0);
    expect(result.result.totals.unknownMassComponents.length).toBeGreaterThan(0);
    expect(result.result.totals.knownCost).toBeNull();
  });

  it("keeps provenance statuses serializable", () => {
    const input = projectInputToColdEnclosureInput(project, null, { canonicalClimate: null });
    const result = calculateColdEnclosure(input);
    const serialized = JSON.stringify({ status: "REAL_PROJECT_VALIDATED", sourceWorkbook: "fixture.xlsx", fixtureId: "fixture-1" });
    expect(JSON.parse(serialized)).toMatchObject({ status: "REAL_PROJECT_VALIDATED", fixtureId: "fixture-1" });
    expect(result.result.provenance[0]?.status).toBe("UNKNOWN");
  });
});

