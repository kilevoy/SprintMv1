import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BrowserCore1DataRepository } from "./data";
import type { Core1DataSource } from "./data";
import { resolveLegacyFrameStep, selectFrame } from "./frame";
import type { Core1ClimateResult } from "./types";

class TestDataSource implements Core1DataSource {
  public constructor(private readonly rootDirectory: string) {}
  public async getText(assetPath: string): Promise<string> { return readFile(resolve(this.rootDirectory, assetPath), "utf8"); }
  public async getJson<T>(assetPath: string): Promise<T> { return JSON.parse(await this.getText(assetPath)) as T; }
}

const source = new TestDataSource(resolve(import.meta.dirname, "../.."));
const repository = new BrowserCore1DataRepository(source);
const climate: Core1ClimateResult = {
  mode: "MANUAL",
  source: "MANUAL",
  climate_source: "MANUAL",
  country: "RU",
  normative_system: "SP_20",
  snow_region: "III",
  snow_load: 1.5,
  wind_region: "II",
  wind_load: 0.3,
  seismicity: null,
  source_note: null,
  units: { snow_load: "kN/m²", wind_load: "kN/m²" },
};

async function frame(span: 9 | 12 | 15 | 18 | 21 | 24) {
  return repository.loadFrameDataset(span);
}

describe("FrameSelector", () => {
  it("reproduces the controlled legacy D8 matrix for Роза at height 3 m and factor 0.8", async () => {
    const expected = new Map([[9, 6], [12, 6], [15, 6], [18, 5], [21, 4], [24, 4.3]] as const);
    for (const [span, step] of expected) {
      const result = resolveLegacyFrameStep({ designSpanFamily: span, buildingHeightM: 3, responsibilityFactor: 0.8, legacySnowFactor: 1, legacyFrameBranch: "3/2" }, await frame(span));
      expect(result.status).toBe("success");
      if (result.status === "success") expect(result.automaticFrameStepM).toBe(step);
    }
  });

  const frameCountControls = [
    [6, 18, 4], [6, 20, 5], [6, 24, 5], [6, 25.7, 6], [6, 26, 6], [6, 30, 6],
    [5, 18, 5], [5, 20, 5], [5, 24, 6], [5, 25.7, 7], [5, 26, 7], [5, 30, 7],
    [4, 18, 6], [4, 20, 6], [4, 24, 7], [4, 25.7, 8], [4, 26, 8], [4, 30, 9],
  ] as const;
  for (const [step, length, expectedFrames] of frameCountControls) {
    it(`uses CEILING(length / D8) + 1 for D8=${step}m and length=${length}m`, () => {
      expect(Math.ceil(length / step) + 1).toBe(expectedFrames);
    });
  }

  it("matches every proven 12 m baseline frame field", async () => {
    const result = selectFrame({ span_m: 12, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8, frame_step_override_m: null, climate }, await frame(12));
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.frame).toMatchObject({ frame_step_m: 6, beam_profile: "ПГС300/20х80х2,5", beam_steel: "М.п.350", beam_utilization: 85, column_profile: "ПГС245/20х80х2", column_steel: "М.п.350", column_utilization: 65 });
      expect(result.frame.trace.selected_span_dataset).toBe("frame_12m_cells");
    }
  });

  it.each([9, 15, 18, 21] as const)("returns a deterministic implemented result for %d m", async (span) => {
    const dataset = await frame(span);
    const input = { span_m: span, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8 as const, frame_step_override_m: null, climate };
    const first = selectFrame(input, dataset);
    const second = selectFrame(input, dataset);
    expect(first.status).toBe("success");
    expect(second).toEqual(first);
    if (first.status === "success") expect(first.frame.trace.selected_span_dataset).toBe(`frame_${span}m_cells`);
  });

  it("selects the proven 24 m automatic row from the local 24 m table", async () => {
    const result = selectFrame({ span_m: 24, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8, frame_step_override_m: null, climate }, await frame(24));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.frame).toMatchObject({
      frame_step_m: 4.3,
      beam_profile: "ПГС300/20х80х3",
      column_profile: "ПГС300/20х80х2,5",
      frame_mass_kg: 1451.568496,
      structural_base_kg_per_m2: 31.396287367283954,
    });
  });

  it("keeps unproven 24 m upper-height rows typed as unknown", async () => {
    const result = selectFrame({ span_m: 24, building_length_m: 18, building_height_m: 5, responsibility_factor: 0.8, frame_step_override_m: null, climate }, await frame(24));
    expect(result.status).toBe("unknown_domain");
    expect(result.diagnostics[0]?.code).toBe("UNKNOWN_FRAME_DOMAIN");
  });

  it("supports an exact proven manual frame step", async () => {
    const result = selectFrame({ span_m: 12, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8, frame_step_override_m: 6, climate }, await frame(12));
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.frame.trace.selection_reason).toBe("manual_step_match");
  });

  it("keeps the opposite reliability block mapping for responsibility 1.0", async () => {
    const result = selectFrame({ span_m: 12, building_length_m: 18, building_height_m: 3, responsibility_factor: 1.0, frame_step_override_m: null, climate }, await frame(12));
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.frame).toMatchObject({ column_profile: "ПГС300/20х80х1,5", column_utilization: 75, beam_profile: "ПГС245/20х80х2", beam_utilization: 80 });
  });

  it("returns UNKNOWN_FRAME_DOMAIN for a manual step absent from the table", async () => {
    const result = selectFrame({ span_m: 12, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8, frame_step_override_m: 5, climate }, await frame(12));
    expect(result.status).toBe("unknown_domain");
    expect(result.diagnostics[0]?.code).toBe("UNKNOWN_FRAME_DOMAIN");
  });

  it("returns FRAME_NO_MATCH for a climate branch not present in the selected table", async () => {
    const result = selectFrame({ span_m: 12, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8, frame_step_override_m: null, climate: { ...climate, snow_region: "IV", wind_region: "II" } }, await frame(12));
    expect(result.status).toBe("no_match");
    expect(result.diagnostics[0]?.code).toBe("FRAME_NO_MATCH");
  });

  it("returns INVALID_FRAME_INPUT for a non-positive building height", async () => {
    const result = selectFrame({ span_m: 12, building_length_m: 18, building_height_m: 0, responsibility_factor: 0.8, frame_step_override_m: null, climate }, await frame(12));
    expect(result.status).toBe("invalid_input");
    expect(result.diagnostics[0]?.code).toBe("INVALID_FRAME_INPUT");
  });

  it("selects beam and column independently from the same first-match row", async () => {
    const result = selectFrame({ span_m: 12, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8, frame_step_override_m: null, climate }, await frame(12));
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.frame.column_profile).toBe("ПГС245/20х80х2");
      expect(result.frame.beam_profile).toBe("ПГС300/20х80х2,5");
      expect(result.frame.column_utilization).toBe(65);
      expect(result.frame.beam_utilization).toBe(85);
    }
  });

  it("does not contaminate a 9 m selection with the 12 m dataset", async () => {
    const nine = selectFrame({ span_m: 9, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8, frame_step_override_m: null, climate }, await frame(9));
    const twelve = selectFrame({ span_m: 12, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8, frame_step_override_m: null, climate }, await frame(12));
    expect(nine.status).toBe("success");
    expect(twelve.status).toBe("success");
    if (nine.status === "success" && twelve.status === "success") {
      expect(nine.frame.trace.selected_span_dataset).toBe("frame_9m_cells");
      expect(twelve.frame.trace.selected_span_dataset).toBe("frame_12m_cells");
    }
  });

  it("recomputes the length-dependent tube mass for a 15 m frame row", async () => {
    const projectClimate: Core1ClimateResult = { ...climate, snow_region: "IV", wind_region: "I" };
    const dataset = await frame(15);
    const length18 = selectFrame({ span_m: 15, building_length_m: 18, building_height_m: 5, responsibility_factor: 1.0, frame_step_override_m: null, automatic_frame_step_m: 4, climate: projectClimate }, dataset);
    const length24 = selectFrame({ span_m: 15, building_length_m: 24, building_height_m: 5, responsibility_factor: 1.0, frame_step_override_m: null, automatic_frame_step_m: 4, climate: projectClimate }, dataset);
    expect(length18.status).toBe("success");
    expect(length24.status).toBe("success");
    if (length18.status !== "success" || length24.status !== "success") return;
    expect(length18.frame).toMatchObject({ frame_step_m: 4, frame_mass_kg: 827, beam_profile: "ПГС300/20х80х3", column_profile: "ПГС300/20х80х2" });
    expect(length24.frame).toMatchObject({ frame_step_m: 4, frame_mass_kg: 827, beam_profile: "ПГС300/20х80х3", column_profile: "ПГС300/20х80х2" });
    expect(length18.frame.tube_mass_kg_per_m2).toBeCloseTo(8.172953703703705, 12);
    expect(length24.frame.tube_mass_kg_per_m2).toBeCloseTo(6.5257152777777767, 12);
    expect(length18.frame.tube_mass_kg_per_m2).not.toBe(length24.frame.tube_mass_kg_per_m2);
  });

  it("uses the proven generic family-18 automatic step", async () => {
    const result = selectFrame({
      span_m: 18,
      building_length_m: 30,
      building_height_m: 5,
      responsibility_factor: 1.0,
      frame_step_override_m: null,
      automatic_frame_step_m: 4.5,
      climate: { ...climate, snow_region: "IV", wind_region: "I" },
    }, await frame(18));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.frame).toMatchObject({
      frame_step_m: 4.5,
      beam_profile: "ПГС300/20х80х3",
      column_profile: "ПГС300/20х80х2,5",
    });
    expect(Math.ceil(30 / result.frame.frame_step_m) + 1).toBe(8);
  });
});
