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

const project22329: ProjectInput = {
  climate: { mode: "CITY_LOOKUP", country: "RU", city: "Увильды", normative_system: "SP_20" },
  geometry: { span_m: 12, building_length_m: 26, building_height_m: 4, responsibility_factor: 1.0, frame_step_override_m: null },
  envelope: { roof_covering: "С-П 150", roof_deck_grade: "С44-1000-0,7", wall_system: "Сэндвич-панель 200 мм" },
  openings: [
    { id: "gate-22329", kind: "gate", width_mm: 6000, height_mm: 3000, quantity: 1 },
    { id: "door-22329", kind: "door", width_mm: 1000, height_mm: 2000, quantity: 2 },
  ],
  special_conditions: { snow_retention_purlin: "нет", enclosure_purlin: "нет", horizontal_bracing_override: null },
  other: { selection_mode: "стандарт", building_roof_type: "двускатное", purlin_max_step_override_mm: null, purlin_min_step_mm: 0, terrain_type: "В", window_scheme_factor: 1.0, window_utilization_limit: 0.85 },
};

describe("real project 22329 source-mapped replay", () => {
  it("runs the chain after the proven Uvildy climate gate", async () => {
    const adapted = projectInputToCore1Input(project22329, { gate_boundary_dimension: "width_mm" });
    expect(adapted.status).toBe("success");
    if (adapted.status !== "success") return;

    const result = await calculateCore1(adapted.input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.context?.climate).toMatchObject({ snow_region: "III", snow_load: 1.5, wind_region: "II", wind_load: 0.3 });
    expect(result.context?.legacyClimate).toMatchObject({ lookupKey: 1.6, jRegion: "IV", kFactor: 0.8, lRegion: "III", mFactor: 0.8, activeSnowRegion: "IV", windRegion: "II" });
    expect(result.context?.legacyFrameBranch).toMatchObject({ rawBranchKey: "4/2", mappedBranchKey: "4/3" });
    expect(result.context?.frame?.frame_step_m).toBe(6);
    expect(Math.ceil(project22329.geometry.building_length_m / result.context!.frame!.frame_step_m) + 1).toBe(6);
    expect(result.context?.frame?.beam_profile).toBe("ПГС300/20х80х2,5");
  });
});
