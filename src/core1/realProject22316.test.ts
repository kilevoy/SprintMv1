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

const project22316: ProjectInput = {
  countryCode: "RU",
  climate: { mode: "CITY_LOOKUP", country: "RU", city: "Березовский", normative_system: "SP_20" },
  geometry: { span_m: 18, building_length_m: 30, building_height_m: 5, responsibility_factor: 1.0, frame_step_override_m: null },
  envelope: { system: "SANDWICH_PANEL", roof_covering: "С-П 150", roof_deck_grade: "С44-1000-0,7", wall_system: "Сэндвич-панель 200 мм" },
  supply: { scope: null },
  openings: [
    { id: "gate-22316", kind: "gate", width_mm: 3000, height_mm: 3000, quantity: 1 },
    { id: "door-22316", kind: "door", width_mm: 1000, height_mm: 2000, quantity: 1 },
  ],
  special_conditions: { snow_retention_purlin: "есть", enclosure_purlin: "нет", horizontal_bracing_override: null },
  other: { selection_mode: "стандарт", building_roof_type: "двускатное", purlin_max_step_override_mm: null, purlin_min_step_mm: 0, terrain_type: "В", window_scheme_factor: 1.0, window_utilization_limit: 0.85 },
};

describe("real project 22316 source-mapped replay", () => {
  it("closes the purlin mass difference after mapping the source input", async () => {
    const adapted = projectInputToCore1Input(project22316, { gate_boundary_dimension: "width_mm" });
    expect(adapted.status).toBe("success");
    if (adapted.status !== "success") return;

    const result = await calculateCore1(adapted.input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.context?.frame).toMatchObject({
      frame_step_m: 4.5,
      frame_mass_kg: 985,
      beam_profile: "ПГС300/20х80х3",
      column_profile: "ПГС300/20х80х2,5",
    });
    expect(result.context?.legacyFrameStep).toMatchObject({ automaticFrameStepM: 4.5 });
    expect(Math.ceil(project22316.geometry.building_length_m / result.context!.frame!.frame_step_m) + 1).toBe(8);
    expect(result.context?.purlin).toMatchObject({
      purlin_profile: "2ПС 200х65х1,5",
      purlin_steel: "М.п.350",
      purlin_step_mm: 1800,
      purlin_kg_per_m2: 6.172833333333334,
    });
    expect(result.context?.purlin?.purlin_weight_kg).toBeCloseTo(3174.6000000000004, 12);
    expect(result.context?.legacyConnection).toMatchObject({
      activeBranch: "ROW14",
      ridgeBeamBoltPattern: "10х2",
      ridgeBeamBoltQuantity: 308,
      eaveBeamBoltPattern: "10х2",
      supportColumnBoltPattern: "7х2",
      eaveColumnBoltPattern: "10х2",
      fittingsWeightKg: 264,
    });
    expect(result.result.bolts?.map((bolt) => bolt.pattern)).toEqual(["10х2", "10х2", "7х2", "10х2"]);
    expect(result.result.fittings_weight_kg).toBe(264);
    // The source flag D26=есть adds one purlin line; this is an input mapping
    // boundary, not a reason to alter the generic purlin formula.
    expect(result.result.kg_per_m2).toBeCloseTo(28.922792592592597, 12);
  });
});
