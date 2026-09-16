import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BrowserCore1DataRepository, type Core1DataSource } from "./data";
import { calculatePurlin } from "./purlin";
import type { PurlinDatasetBundle, PurlinInput } from "./purlin";
import type { Core1ClimateResult } from "./types";
import type { FrameResult } from "./frame";

class TestDataSource implements Core1DataSource {
  public constructor(private readonly rootDirectory: string) {}
  public async getText(assetPath: string): Promise<string> { return readFile(resolve(this.rootDirectory, assetPath), "utf8"); }
  public async getJson<T>(assetPath: string): Promise<T> { return JSON.parse(await this.getText(assetPath)) as T; }
}

const source = new TestDataSource(resolve(import.meta.dirname, "../.."));
const repository = new BrowserCore1DataRepository(source);

async function datasets(): Promise<PurlinDatasetBundle> {
  const [selectionRules, profileCatalogue, calculationAxis, calculationConstants, literals, steelGrades, roofProperties, deckProperties] = await Promise.all([
    repository.loadPurlinDataset("purlin_selection_rules"),
    repository.loadPurlinDataset("purlin_profile_catalogue"),
    repository.loadPurlinDataset("purlin_calculation_axis"),
    repository.loadPurlinDataset("purlin_calculation_constants"),
    repository.loadPurlinDataset("purlin_literals"),
    repository.loadPurlinDataset("purlin_steel_grades"),
    repository.loadRoofProperties(),
    repository.loadDeckProperties(),
  ]);
  return { selectionRules, profileCatalogue, calculationAxis, calculationConstants, literals, steelGrades, roofProperties, deckProperties };
}

const frame: FrameResult = {
  frame_step_m: 6, beam_profile: "ПГС300/20х80х2,5", beam_steel: "М.п.350", beam_utilization: 85,
  column_profile: "ПГС245/20х80х2", column_steel: "М.п.350", column_utilization: 65,
  trace: { selected_span_dataset: "frame_12m_cells", selected_branch: "baseline", candidate_identifiers: [], selection_reason: "first_match" },
};
const climate: Core1ClimateResult = {
  mode: "CITY_LOOKUP", country: "RU", normative_system: "SP_20", climate_source: "CITY_LOOKUP", city: "Роза",
  snow_region: "III", snow_load: 1.5, wind_region: "II", wind_load: 0.3, units: { snow_load: "kN/m²", wind_load: "kN/m²" },
};
const input: PurlinInput = {
  span_m: 12, building_length_m: 18, responsibility_factor: 0.8, roof_covering: "С-П 200", roof_deck_grade: "С44-1000-0,7",
  snow_retention_purlin: "нет", enclosure_purlin: "нет", purlin_min_step_mm: 0, purlin_max_step_override_mm: null,
};

describe("PurlinCalculator", () => {
  it("matches all proven 12 m P28:V28 values", async () => {
    const result = calculatePurlin(input, climate, frame, await datasets());
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.purlin).toMatchObject({ purlin_profile: "2ПС 200х65х2", purlin_steel: "М.п.390", purlin_assignment: "любая", purlin_step_mm: 2140, purlin_kg_per_m2: 7.539000000000001, purlin_weight_kg: 1550.88, purlin_auxiliary_value: 0 });
    expect(result.purlin.trace).toMatchObject({ deck_key: "С44-1000-0,7", deck_step_limit_mm: 2150, configured_step_limit_mm: 2150, manual_step_limit_mm: null, effective_step_limit_mm: 2150, selected_step_mm: 2140 });
    expect(result.purlin.trace.parity).toBe("PROVEN_12M_BASELINE");
  });

  it("applies the C44-0.5 deck limit and preserves the audited Scenario B result", async () => {
    const result = calculatePurlin({ ...input, roof_deck_grade: "С44-1000-0,5" }, climate, frame, await datasets());
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.purlin).toMatchObject({
      purlin_profile: "2ПС 150х65х1,5",
      purlin_steel: "М.п.390",
      purlin_step_mm: 1000,
      purlin_weight_kg: 1756.44,
    });
    expect(result.purlin.purlin_kg_per_m2).toBeCloseTo(8.53825, 12);
    expect(result.purlin.trace).toMatchObject({
      deck_key: "С44-1000-0,5",
      deck_step_limit_mm: 1150,
      configured_step_limit_mm: 2150,
      manual_step_limit_mm: null,
      effective_step_limit_mm: 1150,
      selected_step_mm: 1000,
    });
  });

  it.each([
    ["С44-1000-0,5", 1150],
    ["С44-1000-0,7", 2150],
    ["Н60-845-0,7", 2700],
    ["Н60-845-0,8", 3000],
  ] as const)("uses the audited deck lookup limit for %s", async (deck, limit) => {
    const first = calculatePurlin({ ...input, roof_deck_grade: deck }, climate, frame, await datasets());
    const second = calculatePurlin({ ...input, roof_deck_grade: deck }, climate, frame, await datasets());
    expect(first).toEqual(second);
    expect(first.status).toBe("success");
    if (first.status !== "success") return;
    expect(first.purlin.trace.deck_step_limit_mm).toBe(limit);
    expect(first.purlin.purlin_step_mm).toBeLessThanOrEqual(limit);
  });

  it.each([9, 15, 18, 21] as const)("returns deterministic local result for %dm", async (span) => {
    const result = calculatePurlin({ ...input, span_m: span }, climate, frame, await datasets());
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.purlin.trace.parity).toBe("LOCAL_DETERMINISTIC");
  });

  it("preserves the explicit 500 mm legacy REF error", async () => {
    const result = calculatePurlin({ ...input, purlin_max_step_override_mm: 500 }, climate, frame, await datasets());
    expect(result.status).toBe("legacy_error");
    expect(result.diagnostics[0]).toMatchObject({ code: "PURLIN_STEP_500_REF", excel_error: "#REF!" });
  });

  it("changes deterministic selection trace when snow retention/enclosure are enabled", async () => {
    const result = calculatePurlin({ ...input, snow_retention_purlin: "есть", enclosure_purlin: "есть" }, climate, frame, await datasets());
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.purlin.trace).toMatchObject({ snow_retention_purlin: "есть", enclosure_purlin: "есть" });
  });

  it.each([
    { snow_retention_purlin: "есть" as const, enclosure_purlin: "нет" as const },
    { snow_retention_purlin: "нет" as const, enclosure_purlin: "есть" as const },
    { snow_retention_purlin: "нет" as const, enclosure_purlin: "нет" as const },
  ])("keeps snow-retention/enclosure flags explicit (%s)", async (flags) => {
    const result = calculatePurlin({ ...input, ...flags }, climate, frame, await datasets());
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.purlin.trace).toMatchObject(flags);
  });

  it("honors the local roof/deck step limit and preserves both steel branches", async () => {
    const limited = calculatePurlin({ ...input, purlin_max_step_override_mm: 505 }, climate, frame, await datasets());
    expect(limited.status).toBe("success");
    if (limited.status === "success") expect(limited.purlin.purlin_step_mm).toBe(505);
    const lightClimate: Core1ClimateResult = { ...climate, snow_load: 0 };
    const light = calculatePurlin({ ...input, span_m: 9, roof_covering: "профлист" }, lightClimate, frame, await datasets());
    expect(light.status).toBe("success");
    if (light.status === "success") expect(["М.п.350", "М.п.390"]).toContain(light.purlin.purlin_steel);
  });

  it("returns typed #N/A when the deck is not in the local dataset", async () => {
    const result = calculatePurlin({ ...input, roof_deck_grade: "unknown-deck" as PurlinInput["roof_deck_grade"] }, climate, frame, await datasets());
    expect(result.status).toBe("no_match");
    expect(result.diagnostics[0]?.excel_error).toBe("#N/A");
  });
});
