import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BrowserCore1DataRepository } from "./data";
import type { Core1DataSource } from "./data";
import { calculateCore1 } from "./engine";
import { projectInputToCore1Input } from "../project";
import type { ProjectInput } from "../project";

class TestDataSource implements Core1DataSource {
  public constructor(private readonly rootDirectory: string) {}
  public async getText(assetPath: string): Promise<string> { return readFile(resolve(this.rootDirectory, assetPath), "utf8"); }
  public async getJson<T>(assetPath: string): Promise<T> { return JSON.parse(await this.getText(assetPath)) as T; }
}

const source = new TestDataSource(resolve(import.meta.dirname, "../.."));

const project22318: ProjectInput = {
  countryCode: "RU",
  climate: { mode: "CITY_LOOKUP", country: "RU", city: "Сургут", normative_system: "SP_20" },
  geometry: { span_m: 15, building_length_m: 24, building_height_m: 5, responsibility_factor: 1.0, frame_step_override_m: null },
  envelope: { system: "SANDWICH_PANEL", roof_covering: "С-П 150", roof_deck_grade: "С44-1000-0,7", wall_system: "Сэндвич-панель 200 мм" },
  supply: { scope: null },
  openings: [
    { id: "gate-22318", kind: "gate", width_mm: 3000, height_mm: 3000, quantity: 2 },
    { id: "door-22318", kind: "door", width_mm: 1000, height_mm: 2000, quantity: 1 },
  ],
  special_conditions: { snow_retention_purlin: "нет", enclosure_purlin: "нет", horizontal_bracing_override: null },
  other: { selection_mode: "стандарт", building_roof_type: "двускатное", purlin_max_step_override_mm: null, purlin_min_step_mm: 0, terrain_type: "В", window_scheme_factor: 1.0, window_utilization_limit: 0.85 },
};

describe("real project 22318 geometry-domain regression", () => {
  it("reaches structural calculation through ProjectInput and Core1 adapter", async () => {
    const adapted = projectInputToCore1Input(project22318, { gate_boundary_dimension: "width_mm" });
    expect(adapted.status).toBe("success");
    if (adapted.status !== "success") return;

    const result = await calculateCore1(adapted.input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.context?.frame).toBeTruthy();
    expect(result.context?.purlin).toBeTruthy();
    expect(result.context?.secondarySteel).toBeTruthy();
    expect(result.context?.openings).toBeTruthy();
    expect(result.context?.frame).toMatchObject({
      frame_step_m: 4,
      frame_mass_kg: 827,
      tube_mass_kg_per_m2: 6.5257152777777767,
      beam_profile: "ПГС300/20х80х3",
      beam_utilization: 85,
      column_profile: "ПГС300/20х80х2",
      column_utilization: 79,
    });
    expect(result.context?.legacyFrameStep).toMatchObject({ automaticFrameStepM: 4 });
    expect(Math.ceil(project22318.geometry.building_length_m / result.context!.frame!.frame_step_m) + 1).toBe(7);
    expect(result.context?.purlin).toMatchObject({
      purlin_profile: "2ПС 195х45х1,5",
      purlin_steel: "М.п.390",
      purlin_step_mm: 1900,
    });
    expect(result.context?.legacyConnection).toMatchObject({
      activeBranch: "ROW14",
      ridgeBeamBoltPattern: "8х2",
      ridgeBeamBoltQuantity: 276,
      eaveBeamBoltPattern: "9х2",
      supportColumnBoltPattern: "7х2",
      eaveColumnBoltPattern: "10х2",
      fittingsWeightKg: 238,
    });
    expect(result.result.bolts?.map((bolt) => bolt.pattern)).toEqual(["8х2", "9х2", "7х2", "10х2"]);
    expect(result.result.fittings_weight_kg).toBe(238);
    // The length-dependent frame/secondary mass now reproduces the source D69.
    expect(result.result.kg_per_m2).toBeCloseTo(32.285826388888886, 12);
  });
});
