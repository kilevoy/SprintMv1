import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BrowserCore1DataRepository } from "./data";
import type { Core1DataSource } from "./data";
import { calculateCore1 } from "./engine";
import type { Core1EngineResult } from "./engine";
import type { Core1Input } from "./types";
import { resolveClimateInput, validateCore1InputDomain } from "./validation";

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
const source = new TestDataSource(repoRoot);

function resultCode(result: Core1EngineResult): string | undefined {
  return "code" in result ? result.code : undefined;
}

async function inputFor(id: string): Promise<unknown> {
  const envelope = await source.getJson<{ input: unknown }>(`core1/fixtures/${id}.input.json`);
  return envelope.input;
}

async function canonicalInput(climate: Record<string, unknown>, windows: Record<string, unknown> = {
  enabled: false,
  window_type: 1,
  window_height_m: 0,
  window_strip_length_m: 0,
  separate_window_count: 0,
  glazing_construction: "2ой стеклопакет",
}): Promise<Record<string, unknown>> {
  const legacy = await inputFor("baseline_12m") as Record<string, unknown>;
  const {
    city: _city,
    window_height_m: _height,
    window_strip_length_m: _strip,
    separate_windows_count: _count,
    window_construction: _glazing,
    window_type: _type,
    normative_branch: _branch,
    ...structural
  } = legacy;
  return { ...structural, climate, windows };
}

describe("Core 1 input validation and orchestration", () => {
  it("returns INVALID_INPUT for schema-invalid data without loading datasets", async () => {
    const repository = new BrowserCore1DataRepository(source);
    const result = await calculateCore1({ city: "Роза" }, repository);
    expect(result.status).toBe("invalid_input");
    expect(resultCode(result)).toBe("INVALID_INPUT");
  });

  it.each([9, 12, 15, 18, 21] as const)("accepts supported span %dm", async (span) => {
    const input = { ...(await inputFor("baseline_12m") as Record<string, unknown>), span_m: span };
    expect(validateCore1InputDomain(input).state).toBe("VALID");
    const result = await calculateCore1(input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result.kg_per_m2).toBeTypeOf("number");
    expect(Number.isFinite(result.result.kg_per_m2)).toBe(true);
  });

  it("preserves the span 24 m legacy #N/A contract", async () => {
    const input = await inputFor("legacy_24m_na");
    expect(validateCore1InputDomain(input).state).toBe("SUPPORTED_WITH_LEGACY_ANOMALY");
    const result = await calculateCore1(input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("legacy_error");
    expect(resultCode(result)).toBe("LEGACY_NA");
    expect(result.diagnostics.some((diagnostic) => diagnostic.excel_error === "#N/A")).toBe(true);
  });

  it("routes non-zero windows to the proven local module boundary without using J20", async () => {
    const input = await inputFor("nonzero_windows_unsupported");
    const result = await calculateCore1(input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("success");
    expect(result.context?.windows?.trace).toMatchObject({ normative_system: "SP_20", window_type: 1, wind_branch: "SP_20" });
    expect(result.context?.windows?.lower_girt_profile).toBeTruthy();
    expect(result.context?.windows?.upper_girt_profile).toBeTruthy();
    expect(result.context?.openings?.trace).toMatchObject({ window_strip_length_m: 6 });
    expect(result.context?.openings?.window_mass_kg).toBeGreaterThan(0);
  });

  it("routes KZ SP_RK_EN directly without the legacy J20 switch", async () => {
    const input = await canonicalInput(
      { mode: "MANUAL", country: "KZ", normative_system: "SP_RK_EN", snow_region: "IV", snow_load: 1.85, wind_region: "III", wind_load: 0.38, seismicity: null },
      { enabled: true, window_type: 3, window_height_m: 1, window_strip_length_m: 6, separate_window_count: 1, glazing_construction: "2ой стеклопакет" },
    );
    const first = await calculateCore1(input, new BrowserCore1DataRepository(source));
    const second = await calculateCore1(input, new BrowserCore1DataRepository(source));
    expect(second).toEqual(first);
    expect(first.status).toBe("success");
    expect(first.context?.windows?.trace).toMatchObject({ normative_system: "SP_RK_EN", window_type: 3, wind_branch: "SP_RK_EN" });
    expect(first.diagnostics.some((diagnostic) => (diagnostic.source ?? []).some((sourceCell) => sourceCell.includes("v2.0")))).toBe(false);
  });

  it("returns unknown_domain for an unproven city or climate lookup", async () => {
    const input = { ...(await inputFor("baseline_12m") as Record<string, unknown>), city: "Неизвестный город" };
    const domain = validateCore1InputDomain(input);
    expect(domain.state).toBe("VALID");
    const result = await calculateCore1(input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("city_not_found");
    expect(resultCode(result)).toBe("CITY_NOT_FOUND");
  });

  it("accepts RU city lookup with an explicit canonical climate contract", async () => {
    const input = await canonicalInput({ mode: "CITY_LOOKUP", country: "RU", city: "Роза", normative_system: "SP_20" });
    expect(validateCore1InputDomain(input).state).toBe("VALID");
    expect(resolveClimateInput(input as unknown as Core1Input).mode).toBe("CITY_LOOKUP");
    const result = await calculateCore1(input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("success");
    expect(result.context?.climate).toMatchObject({ source: "CITY_LOOKUP", snow_region: "III", snow_load: 1.5, wind_region: "II", wind_load: 0.3 });
    expect(result.context?.frame).toMatchObject({ frame_step_m: 6, beam_profile: "ПГС300/20х80х2,5", beam_utilization: 85, column_profile: "ПГС245/20х80х2", column_utilization: 65 });
    expect(result.context?.purlin).toMatchObject({ purlin_profile: "2ПС 200х65х2", purlin_steel: "М.п.390", purlin_step_mm: 2140, purlin_kg_per_m2: 7.539000000000001, purlin_weight_kg: 1550.88 });
    expect(result.context?.secondarySteel).toMatchObject({ M16_quantity: 4, fittings_weight_kg: 233 });
    expect(result.context?.openings).toMatchObject({ opening_mass_kg: 0, opening_mass_kg_per_m2: 0, opening_mass_t: 0 });
  });

  it("accepts the source-proven 24 m length and 5 m height geometry domain", async () => {
    const input = { ...(await inputFor("baseline_12m") as Record<string, unknown>), span_m: 15, building_length_m: 24, building_height_m: 5 };
    expect(validateCore1InputDomain(input).state).toBe("VALID");
  });

  it("keeps genuinely unsupported geometry in UNKNOWN_DOMAIN", async () => {
    const input = { ...(await inputFor("baseline_12m") as Record<string, unknown>), building_height_m: 6.21 };
    expect(validateCore1InputDomain(input).state).toBe("UNKNOWN_DOMAIN");
    expect(validateCore1InputDomain(input).diagnostics.some((diagnostic) => diagnostic.code === "UNKNOWN_DOMAIN")).toBe(true);
  });

  it("propagates the C44-0.5 deck limit through purlin mass into D69", async () => {
    const input = { ...(await inputFor("baseline_12m") as Record<string, unknown>), roof_deck_grade: "С44-1000-0,5" };
    const result = await calculateCore1(input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.context?.purlin).toMatchObject({ purlin_profile: "2ПС 150х65х1,5", purlin_step_mm: 1015, purlin_weight_kg: 1756.44 });
    expect(result.result.kg_per_m2).toBeCloseTo(31.25892361111111, 10);
  });

  it("requires an explicit normative system for KZ", async () => {
    const input = await canonicalInput({ mode: "MANUAL", country: "KZ", normative_system: "SP_RK_EN", snow_region: "IV", snow_load: 1.85, wind_region: "III", wind_load: 0.38, seismicity: null });
    expect(validateCore1InputDomain(input).state).toBe("VALID");
    expect(resolveClimateInput(input as unknown as Core1Input)).toMatchObject({ country: "KZ", normative_system: "SP_RK_EN" });
  });

  it("routes KZ SP_20 through the same complete Core 1 path", async () => {
    const input = await canonicalInput({ mode: "MANUAL", country: "KZ", normative_system: "SP_20", snow_region: "III", snow_load: 1.5, wind_region: "II", wind_load: 0.3, seismicity: null });
    const result = await calculateCore1(input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result.climate?.normative_system).toBe("SP_20");
    expect(Number.isFinite(result.result.kg_per_m2)).toBe(true);
  });

  it("rejects legacy flat KZ input without an explicit normative system", async () => {
    const input = { ...(await inputFor("baseline_12m") as Record<string, unknown>), country: "KZ" };
    delete (input as Record<string, unknown>).normative_system;
    expect(validateCore1InputDomain(input).state).toBe("INVALID_INPUT");
  });

  it("preserves MANUAL climate values and provenance without lookup replacement", async () => {
    const climate = {
      mode: "MANUAL",
      country: "KZ",
      normative_system: "SP_RK_EN",
      snow_region: "IV",
      snow_load: 1.85,
      wind_region: "III",
      wind_load: 0.38,
      seismicity: 7,
      source_note: "Заказчик",
    };
    const input = await canonicalInput(climate);
    expect(validateCore1InputDomain(input).state).toBe("VALID");
    expect(resolveClimateInput(input as unknown as Core1Input)).toEqual(climate);
  });

  it("does not consult city lookup datasets when MANUAL climate is selected", async () => {
    const calls: string[] = [];
    const manual = await canonicalInput({ mode: "MANUAL", country: "RU", normative_system: "SP_20", snow_region: "III", snow_load: 1.2, wind_region: "II", wind_load: 0.3, seismicity: null });
    const loggingSource: Core1DataSource = {
      getJson: async <T>(assetPath: string) => source.getJson<T>(assetPath),
      getText: async (assetPath: string) => { calls.push(assetPath); return source.getText(assetPath); },
    };
    const result = await calculateCore1(manual, new BrowserCore1DataRepository(loggingSource));
    expect(result.status).toBe("success");
    expect(calls.some((path) => path.includes("climate_"))).toBe(false);
    expect(result.context?.climate).toMatchObject({ source: "MANUAL", snow_region: "III", snow_load: 1.2, wind_region: "II", wind_load: 0.3 });
  });

  it.each([1, 2, 3, 4, 5] as const)("accepts proven window_type %d without assigning extra semantics", async (windowType) => {
    const input = await canonicalInput(
      { mode: "CITY_LOOKUP", country: "RU", city: "Роза", normative_system: "SP_20" },
      { enabled: true, window_type: windowType, window_height_m: 1, window_strip_length_m: 6, separate_window_count: 1, glazing_construction: "2ой стеклопакет" },
    );
    expect(validateCore1InputDomain(input).state).toBe("VALID");
    const result = await calculateCore1(input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("success");
    expect(result.context?.windows?.trace.window_type).toBe(windowType);
  });

  it("rejects a window_type outside 1..5 at schema validation", async () => {
    const input = await canonicalInput(
      { mode: "CITY_LOOKUP", country: "RU", city: "Роза", normative_system: "SP_20" },
      { enabled: true, window_type: 6, window_height_m: 1, window_strip_length_m: 6, separate_window_count: 1, glazing_construction: "2ой стеклопакет" },
    );
    expect(validateCore1InputDomain(input).state).toBe("INVALID_INPUT");
  });

  it("preserves manual regions, loads and seismicity as data only", async () => {
    const climate = { mode: "MANUAL", country: "RU", normative_system: "SP_20", snow_region: "III", snow_load: 1.2, wind_region: "II", wind_load: 0.3, seismicity: "не задано" };
    const resolved = resolveClimateInput(await canonicalInput(climate) as unknown as Core1Input);
    expect(resolved).toMatchObject({ snow_region: "III", snow_load: 1.2, wind_region: "II", wind_load: 0.3, seismicity: "не задано" });
  });

  it("preserves the purlin 500 mm legacy #REF contract", async () => {
    const input = await inputFor("legacy_purlin_step_500_ref");
    expect(validateCore1InputDomain(input).state).toBe("SUPPORTED_WITH_LEGACY_ANOMALY");
    const result = await calculateCore1(input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("legacy_error");
    expect(resultCode(result)).toBe("LEGACY_REF");
    expect(result.diagnostics.some((diagnostic) => diagnostic.excel_error === "#REF!")).toBe(true);
  });

  it("passes non-zero gate and door counts to OpeningMassCalculator", async () => {
    const input = await inputFor("baseline_12m") as Record<string, unknown>;
    input.gates_le_6m_count = 1;
    input.gates_gt_6m_count = 1;
    input.doors_count = 1;
    const result = await calculateCore1(input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("success");
    expect(result.context?.openings).toMatchObject({ gate_le_6m_mass_kg: 350 * 1.05, gate_gt_6m_mass_kg: 450 * 1.05, door_mass_kg: (6 + 4) * 7.2 * 1.05 });
  });

  it("keeps dataset loading lazy for a supported input", async () => {
    const calls: string[] = [];
    const loggingSource: Core1DataSource = {
      getJson: async <T>(assetPath: string) => source.getJson<T>(assetPath),
      getText: async (assetPath: string) => {
        calls.push(assetPath);
        return source.getText(assetPath);
      },
    };
    const result = await calculateCore1(await inputFor("normal_18m"), new BrowserCore1DataRepository(loggingSource));
    expect(result.status).toBe("success");
    expect(calls).toContain("core1/data/frame_18m_cells.csv");
    expect(calls).toContain("core1/data/purlin_calculation_constants.csv");
    expect(calls).toContain("core1/data/purlin_selection_rules.csv");
    expect(calls).toContain("core1/data/purlin_profile_catalogue.csv");
    expect(calls).toContain("core1/data/roof_properties.csv");
    expect(calls).toContain("core1/data/deck_properties.csv");
    expect(calls).toContain("core1/data/secondary_steel_rules.csv");
    expect(calls).toContain("core1/data/bolts_plates_fittings.csv");
    expect(calls.some((path) => path.includes("window_profile_candidates"))).toBe(false);
    expect(calls.some((path) => path.includes("external"))).toBe(false);
    expect(calls.some((path) => /frame_(9|12|15|21|24)m/.test(path))).toBe(false);
  });

  it("matches every proven field of the 12 m end-to-end golden fixture", async () => {
    const result = await calculateCore1(await inputFor("baseline_12m"), new BrowserCore1DataRepository(source));
    const expected = await source.getJson<{ expected_output: { values: Record<string, unknown> } }>("core1/fixtures/baseline_12m.expected.json");
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    const actual = result.result as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(expected.expected_output.values)) {
      const received = actual[key];
      if (typeof value === "number") expect(received).toBeCloseTo(value, 10);
      else expect(received).toEqual(value);
    }
    expect(Object.keys(expected.expected_output.values)).toHaveLength(32);
  });

  it("classifies all 17 golden fixtures without treating UNKNOWN as PASS oracle", async () => {
    const manifest = await source.getJson<{
      fixtures: Array<{ id: string; status: string; input_file: string }>;
    }>("core1/fixtures/manifest.json");
    expect(manifest.fixtures).toHaveLength(17);
    const statuses = new Map<string, number>();
    for (const fixture of manifest.fixtures) {
      const envelope = await source.getJson<{ input: unknown }>(`core1/fixtures/${fixture.input_file}`);
      const result = await calculateCore1(envelope.input, new BrowserCore1DataRepository(source));
      statuses.set(fixture.status, (statuses.get(fixture.status) ?? 0) + 1);
      if (fixture.status === "EXPECTED_LEGACY_ERROR") expect(result.status).toBe("legacy_error");
      else if (fixture.status === "READY") {
        expect(result.status).toBe("success");
      } else {
        // UNKNOWN is a fixture metadata state, not a PASS oracle; deterministic
        // success is allowed but is never compared to an expected numeric output.
        expect(["success", "unsupported", "unknown_domain", "city_not_found"]).toContain(result.status);
      }
    }
    expect(Object.fromEntries(statuses)).toEqual({ READY: 4, UNKNOWN: 11, EXPECTED_LEGACY_ERROR: 2 });
  }, 30000);
});
