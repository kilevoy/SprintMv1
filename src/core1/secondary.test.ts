import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BrowserCore1DataRepository, type Core1DataSource } from "./data";
import { calculateSecondarySteel, type SecondarySteelDatasetBundle, type SecondarySteelInput } from "./secondary";
import type { Core1ClimateResult } from "./types";
import type { FrameResult } from "./frame";

class Source implements Core1DataSource {
  public constructor(private readonly root: string) {}
  public async getText(path: string): Promise<string> { return readFile(resolve(this.root, path), "utf8"); }
  public async getJson<T>(path: string): Promise<T> { return JSON.parse(await this.getText(path)) as T; }
}
const repository = new BrowserCore1DataRepository(new Source(resolve(import.meta.dirname, "../..")));
async function data(): Promise<SecondarySteelDatasetBundle> {
  const [rules, boltsPlatesFittings] = await Promise.all([repository.loadSecondarySteelData(), repository.loadBoltsPlatesFittings()]);
  return { rules, boltsPlatesFittings };
}
const climate: Core1ClimateResult = { mode: "CITY_LOOKUP", country: "RU", normative_system: "SP_20", climate_source: "CITY_LOOKUP", city: "Роза", snow_region: "III", snow_load: 1.5, wind_region: "II", wind_load: 0.3 };
const frame: FrameResult = { frame_step_m: 6, beam_profile: "ПГС300/20х80х2,5", beam_steel: "М.п.350", beam_utilization: 85, column_profile: "ПГС245/20х80х2", column_steel: "М.п.350", column_utilization: 65, trace: { selected_span_dataset: "frame_12m_cells", selected_branch: "baseline", candidate_identifiers: [], selection_reason: "first_match" } };
const input: SecondarySteelInput = { span_m: 12, building_length_m: 18, building_height_m: 3, frame_step_m: 6 };
const purlin = { purlin_profile: "2ПС 200х65х2", purlin_steel: "М.п.390" as const, purlin_assignment: "любая", purlin_step_mm: 2140, purlin_kg_per_m2: 7.539, purlin_weight_kg: 1550.88, purlin_auxiliary_value: 0, trace: {} as never };

describe("SecondarySteelCalculator", () => {
  it("matches proven 12 m secondary baseline outputs", async () => {
    const result = calculateSecondarySteel(input, climate, frame, purlin, await data());
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.secondary.ties).toMatchObject({ profile: "┘└2уг. 63х5", steel: "С345" });
    expect(result.secondary.suspensions).toMatchObject({ profile: "┘└2уг. 63х5", steel: "С345" });
    expect(result.secondary.spacers).toMatchObject({ profile: "80х3", steel: "С245" });
    expect(result.secondary.horizontal_bracing.map((x) => x.profile)).toEqual(["80x3", "кв. 80х3"]);
    expect(result.secondary.vertical_bracing.map((x) => x.profile)).toEqual(["120х3", "кв. 80х3"]);
    expect(result.secondary.gable_posts.profile).toBe("кв. 160х4");
    expect(result.secondary.plates.map((x) => x.profile)).toEqual(["t5", "t6"]);
    expect(result.secondary.bolts.map((x) => x.pattern)).toEqual(["7х2", "9х2", "6х2", "9х2"]);
    expect(result.secondary.M16_quantity).toBe(4);
    expect(result.secondary.fittings_weight_kg).toBe(233);
    expect(result.secondary.trace.parity).toBe("PROVEN_12M_BASELINE");
  });

  it("reproduces D29=+ branch without changing purlin/window scope", async () => {
    const result = calculateSecondarySteel({ ...input, horizontal_bracing_override: "+" }, climate, frame, purlin, await data());
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.secondary.spacers.profile).toBe("100x3");
      expect(result.secondary.horizontal_bracing[0]?.profile).toBe("120x4");
      expect(result.secondary.trace.active_branches).toContain("D29=+");
    }
  });

  it("is deterministic and has no pricing or window-girt outputs", async () => {
    const datasets = await data();
    const first = calculateSecondarySteel(input, climate, frame, purlin, datasets);
    const second = calculateSecondarySteel(input, climate, frame, purlin, datasets);
    expect(second).toEqual(first);
    if (first.status === "success") {
      expect(first.secondary).not.toHaveProperty("price");
      expect(first.secondary).not.toHaveProperty("window_girts");
    }
  });
});
