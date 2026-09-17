import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BrowserCore1DataRepository } from "./data";
import type { Core1DataSource } from "./data";
import { previewClimate, resolveClimate } from "./climate";
import type { ClimateInput } from "./types";

class TestDataSource implements Core1DataSource {
  public constructor(private readonly rootDirectory: string) {}
  public async getText(assetPath: string): Promise<string> { return readFile(resolve(this.rootDirectory, assetPath), "utf8"); }
  public async getJson<T>(assetPath: string): Promise<T> { return JSON.parse(await this.getText(assetPath)) as T; }
}

const repository = new BrowserCore1DataRepository(new TestDataSource(resolve(import.meta.dirname, "../..")));

async function climateDataset() {
  return repository.loadClimateDataset("climate_lookup_sparse");
}

describe("ClimateResolver", () => {
  it("resolves the proven RU city lookup without fuzzy fallback", async () => {
    const result = resolveClimate({ mode: "CITY_LOOKUP", country: "RU", city: "Роза", normative_system: "SP_20" }, await climateDataset());
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.climate).toMatchObject({ source: "CITY_LOOKUP", country: "RU", city: "Роза", snow_region: "III", snow_load: 1.5, wind_region: "II", wind_load: 0.3 });
      expect(result.climate.units).toEqual({ snow_load: "kN/m²", wind_load: "kN/m²" });
    }
  });

  it("returns CITY_NOT_FOUND for an unknown RU city", async () => {
    const result = resolveClimate({ mode: "CITY_LOOKUP", country: "RU", city: "Несуществующий", normative_system: "SP_20" }, await climateDataset());
    expect(result.status).toBe("city_not_found");
    expect(result.diagnostics[0]?.code).toBe("CITY_NOT_FOUND");
  });

  it("returns UNKNOWN_CLIMATE_DATA when a KZ branch has no proven lookup data", async () => {
    const result = resolveClimate({ mode: "CITY_LOOKUP", country: "KZ", city: "Роза", normative_system: "SP_RK_EN" }, await climateDataset());
    expect(result.status).toBe("unknown_climate_data");
    expect(result.diagnostics[0]?.code).toBe("UNKNOWN_CLIMATE_DATA");
  });

  it.each(["SP_20", "SP_RK_EN"] as const)("returns exact MANUAL values for KZ %s", (normative_system) => {
    const input: ClimateInput = { mode: "MANUAL", country: "KZ", normative_system, snow_region: "IV", snow_load: 1.85, wind_region: "III", wind_load: 0.38, seismicity: 7, source_note: "manual source" };
    const result = resolveClimate(input);
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.climate).toMatchObject({ source: "MANUAL", ...input, units: { snow_load: "kN/m²", wind_load: "kN/m²" } });
  });

  it("resolves the source-proven Surgut lookup used by real project 22318", async () => {
    const result = resolveClimate({ mode: "CITY_LOOKUP", country: "RU", city: "Сургут", normative_system: "SP_20" }, await climateDataset());
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.climate).toMatchObject({ source: "CITY_LOOKUP", country: "RU", city: "Сургут", snow_region: "IV", snow_load: 1.8, wind_region: "I", wind_load: 0.23 });
    }
  });

  it("resolves the source-proven Berezovsky lookup used by real project 22316", async () => {
    const result = resolveClimate({ mode: "CITY_LOOKUP", country: "RU", city: "Березовский", normative_system: "SP_20" }, await climateDataset());
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.climate).toMatchObject({ source: "CITY_LOOKUP", country: "RU", city: "Березовский", snow_region: "IV", snow_load: 1.5, wind_region: "I", wind_load: 0.23 });
    }
  });

  it("previews an exact local city without widening the proven calculation gate", async () => {
    const input = { mode: "CITY_LOOKUP" as const, country: "RU" as const, city: "Челябинск", normative_system: "SP_20" as const };
    const dataset = await climateDataset();
    const preview = previewClimate(input, dataset);
    expect(preview.status).toBe("success");
    if (preview.status === "success") expect(preview.climate).toMatchObject({ city: "Челябинск", source: "CITY_LOOKUP" });
    const calculation = resolveClimate(input, dataset);
    expect(calculation.status).toBe("unknown_climate_data");
  });

  it("preserves manual RU climate and does not consult lookup data", () => {
    const input: ClimateInput = { mode: "MANUAL", country: "RU", normative_system: "SP_20", snow_region: "III", snow_load: 1.2, wind_region: "II", wind_load: 0.3, seismicity: "unknown" };
    const result = resolveClimate(input);
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.climate).toEqual({ mode: "MANUAL", source: "MANUAL", climate_source: "MANUAL", country: "RU", normative_system: "SP_20", snow_region: "III", snow_load: 1.2, wind_region: "II", wind_load: 0.3, seismicity: "unknown", source_note: null, units: { snow_load: "kN/m²", wind_load: "kN/m²" } });
  });

  it("does not infer regions or loads when the city row is incomplete", async () => {
    const result = resolveClimate({ mode: "CITY_LOOKUP", country: "RU", city: "Роза", normative_system: "SP_RK_EN" }, await climateDataset());
    expect(result.status).toBe("unknown_climate_data");
    expect(result.climate).toBeNull();
  });
});
