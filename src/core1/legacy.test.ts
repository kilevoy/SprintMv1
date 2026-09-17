import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BrowserCore1DataRepository } from "./data";
import type { Core1DataSource } from "./data";
import { deriveLegacyClimate, LEGACY_CLIMATE_CLASSIFICATION, LEGACY_ROOF_CORRECTIONS, legacyApproximateMatch, resolveLegacyFrameBranch } from "./legacy";

class TestDataSource implements Core1DataSource {
  public constructor(private readonly rootDirectory: string) {}
  public async getText(assetPath: string): Promise<string> { return readFile(resolve(this.rootDirectory, assetPath), "utf8"); }
  public async getJson<T>(assetPath: string): Promise<T> { return JSON.parse(await this.getText(assetPath)) as T; }
}

const source = new TestDataSource(resolve(import.meta.dirname, "../.."));

describe("proven legacy climate and frame branch pipeline", () => {
  it("matches Excel approximate MATCH characterization on the ordered, non-monotonic AB range", () => {
    const cases: Array<[number, number]> = [
      [0.4, 1], [0.5, 3], [0.505, 3], [0.56, 4], [0.6, 5], [0.605, 5],
      [0.84, 9], [0.845, 9], [1.26, 18], [1.265, 18], [1.5, 23], [1.55, 24],
      [1.6, 25], [1.605, 25], [1.68, 26], [1.685, 26], [1.75, 28], [1.9, 31],
      [1.95, 32], [2.15, 36], [2.24, 37], [2.6, 45], [2.605, 45], [3.2, 46], [4.1, 54],
    ];
    for (const [lookupKey, excelIndex] of cases) expect(legacyApproximateMatch(lookupKey)).toBe(excelIndex - 1);
  });

  it("keeps the exact source row order, text limit rows, and first duplicate mapping", () => {
    expect(LEGACY_CLIMATE_CLASSIFICATION).toHaveLength(54);
    expect(LEGACY_CLIMATE_CLASSIFICATION[49]).toMatchObject({ source_row: 54, lookup_key: 0.56 });
    expect(LEGACY_CLIMATE_CLASSIFICATION[45]?.j_region).toBe("уточнить при расчете у главного конструктора");
    expect(resolveLegacyFrameBranch({ activeSnowRegion: "III", windRegion: "III" })).toMatchObject({ rawBranchKey: "3/3", mappedBranchKey: "3/2" });
  });

  it("uses the extracted roof corrections and reproduces Uvildy J/K/L/M", async () => {
    const repository = new BrowserCore1DataRepository(source);
    const dataset = await repository.loadClimateDataset("climate_lookup_sparse");
    const climate = { mode: "CITY_LOOKUP", country: "RU", normative_system: "SP_20", climate_source: "CITY_LOOKUP", city: "Увильды", snow_region: "III", snow_load: 1.5, wind_region: "II", wind_load: 0.3 } as const;
    expect(LEGACY_ROOF_CORRECTIONS.find((row) => row.roof_covering === "С-П 150")?.correction).toBe(0.1);
    const one = deriveLegacyClimate({ city: "Увильды", responsibility_factor: 1.0, roof_covering: "С-П 150", climate, dataset });
    const eight = deriveLegacyClimate({ city: "Увильды", responsibility_factor: 0.8, roof_covering: "С-П 150", climate, dataset });
    expect(one).toMatchObject({ effectiveSnowLoad: 1.5, roofCorrection: 0.1, lookupKey: 1.6, jRegion: "IV", kFactor: 0.8, lRegion: "III", mFactor: 0.8, activeSnowRegion: "IV", activeSnowFactor: 0.8, windRegion: "II", sourceRow: 335 });
    expect(eight).toMatchObject({ activeSnowRegion: "III", activeSnowFactor: 0.8 });
  });
});
