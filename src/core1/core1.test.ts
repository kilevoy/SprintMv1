import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateCore1Diagnostic, validateCore1Input, validateCore1Result } from "./compatibility";
import { BrowserCore1DataRepository, buildAssetUrl, parseDatasetCsv } from "./data";
import type { Core1DataSource } from "./data";

class TestDataSource implements Core1DataSource {
  public constructor(private readonly rootDirectory: string) {}

  public async getText(assetPath: string): Promise<string> {
    return readFile(resolve(this.rootDirectory, assetPath), "utf8");
  }

  public async getJson<T>(assetPath: string): Promise<T> {
    return JSON.parse(await this.getText(assetPath)) as T;
  }
}

const repoRoot = resolve(import.meta.dirname, "../..");
const testSource = new TestDataSource(repoRoot);

async function fixtureManifest() {
  return testSource.getJson<{
    fixtures: Array<{ id: string; status: string; input_file: string; expected_file: string }>;
  }>("core1/fixtures/manifest.json");
}

describe("Core 1 TypeScript data layer", () => {
  it("loads all 22 datasets from the manifest", async () => {
    const repository = new BrowserCore1DataRepository(testSource);
    const manifest = await repository.loadManifest();
    expect(manifest.dataset_count).toBe(22);
    expect(manifest.datasets).toHaveLength(22);
    expect(new Set(manifest.datasets.map((dataset) => dataset.id)).size).toBe(22);
  });

  it("validates the baseline input, result and diagnostics through the existing schemas", async () => {
    const inputEnvelope = await testSource.getJson<{ input: unknown }>("core1/fixtures/baseline_12m.input.json");
    const expectedEnvelope = await testSource.getJson<{ expected_output: { values: Record<string, unknown> } }>("core1/fixtures/baseline_12m.expected.json");
    const inputResult = validateCore1Input(inputEnvelope.input);
    expect(inputResult.valid).toBe(true);
    const resultResult = validateCore1Result({
      scenario: inputEnvelope.input,
      climate: {
        mode: "CITY_LOOKUP",
        source: "CITY_LOOKUP",
        climate_source: "CITY_LOOKUP",
        country: "RU",
        city: "Роза",
        normative_system: "SP_20",
        snow_region: "III",
        snow_load: 1.5,
        wind_region: "II",
        wind_load: 0.3,
        seismicity: null,
        source_note: null,
        units: { snow_load: "kN/m²", wind_load: "kN/m²" },
      },
      ...expectedEnvelope.expected_output.values,
      compatibility_diagnostics: [],
    });
    expect(resultResult.valid).toBe(true);
    const diagnosticResult = validateCore1Diagnostic({
      code: "PURLIN_STEP_500_REF",
      excel_error: "#REF!",
      module: "PurlinCalculator",
      source_cells: ["Расчеты 2!B73:B76"],
      trigger: "step 500",
      affected_outputs: ["purlin_profile"],
      severity: "error",
      message_ru: "Legacy #REF!",
    });
    expect(diagnosticResult.valid).toBe(true);
    expect(validateCore1Input({ ...(inputEnvelope.input as Record<string, unknown>), span_m: 13 }).valid).toBe(true);
    expect(validateCore1Input({ ...(inputEnvelope.input as Record<string, unknown>), span_m: 0 }).valid).toBe(false);
  });

  it("validates every READY fixture and the two expected legacy-error fixtures", async () => {
    const manifest = await fixtureManifest();
    const selected = manifest.fixtures.filter((fixture) => ["READY", "EXPECTED_LEGACY_ERROR"].includes(fixture.status));
    expect(selected).toHaveLength(6);
    for (const fixture of selected) {
      const inputEnvelope = await testSource.getJson<{ input: unknown }>(`core1/fixtures/${fixture.input_file}`);
      expect(validateCore1Input(inputEnvelope.input).valid).toBe(true);
      const expected = await testSource.getJson<{ expected_diagnostics: unknown[] }>(`core1/fixtures/${fixture.expected_file}`);
      for (const diagnostic of expected.expected_diagnostics) expect(validateCore1Diagnostic(diagnostic).valid).toBe(true);
    }
  });

  it("never treats UNKNOWN fixture values as a numeric oracle", async () => {
    const manifest = await fixtureManifest();
    const unknown = manifest.fixtures.filter((fixture) => fixture.status === "UNKNOWN");
    expect(unknown).toHaveLength(12);
    for (const fixture of unknown) {
      const expected = await testSource.getJson<{ expected_output: { status: string; values: Record<string, unknown> } }>(`core1/fixtures/${fixture.expected_file}`);
      expect(expected.expected_output.status).toBe("UNKNOWN");
      expect(Object.keys(expected.expected_output.values)).toHaveLength(0);
    }
  });

  it("parses CSV with quoted fields and preserves numeric values", () => {
    const records = parseDatasetCsv([
      "schema_version,source_workbook,source_workbook_sha256,source_sheet,source_range,extraction_date,units,cell,formula_json,cached_value_json,cell_data_type",
      `1.0.0,book.xlsx,sha,Sheet1,A1,2026-09-16,mixed,A1,null,7.539000000000001,n`,
      `1.0.0,book.xlsx,sha,Sheet1,A2,2026-09-16,"kg/m²",A2,null,"""С-П 200, special""",str`,
    ].join("\n"));
    expect(records[0]?.cached_value_json).toBe(7.539000000000001);
    expect(typeof records[0]?.cached_value_json).toBe("number");
    expect(records[1]?.cached_value_json).toBe("С-П 200, special");
  });

  it("builds GitHub Pages-safe asset paths", () => {
    expect(buildAssetUrl("core1/data/manifest.json", "/SprintMv1/")).toBe("/SprintMv1/core1/data/manifest.json");
    expect(buildAssetUrl("/core1/data/manifest.json", "/SprintMv1")).toBe("/SprintMv1/core1/data/manifest.json");
  });

  it("loads only the requested span dataset and caches it", async () => {
    const calls: string[] = [];
    const source: Core1DataSource = {
      getJson: async <T>(assetPath: string) => testSource.getJson<T>(assetPath),
      getText: async (assetPath: string) => {
        calls.push(assetPath);
        return readFile(resolve(repoRoot, assetPath), "utf8");
      },
    };
    const repository = new BrowserCore1DataRepository(source);
    await repository.loadFrameDataset(18);
    await repository.loadFrameDataset(18);
    expect(calls).toEqual(["core1/data/frame_18m_cells.csv"]);
    expect(calls.some((path) => path.includes("frame_9m") || path.includes("frame_21m"))).toBe(false);
  });
});
