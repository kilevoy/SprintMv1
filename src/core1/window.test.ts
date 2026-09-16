import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BrowserCore1DataRepository } from "./data";
import type { Core1DataSource } from "./data";
import { calculateWindowGirts } from "./window";
import type { Core1ClimateResult, WindowsInput } from "./types";
import type { FrameResult } from "./frame";

class Source implements Core1DataSource {
  public constructor(private readonly root: string) {}
  public getText(path: string): Promise<string> { return readFile(resolve(this.root, path), "utf8"); }
  public async getJson<T>(path: string): Promise<T> { return JSON.parse(await this.getText(path)) as T; }
}

const source = new Source(resolve(import.meta.dirname, "../.."));
const climate = (normative_system: "SP_20" | "SP_RK_EN"): Core1ClimateResult => ({ mode: "MANUAL", country: "KZ", normative_system, climate_source: "MANUAL", snow_region: "IV", snow_load: 1.85, wind_region: "III", wind_load: 0.38 });
const frame: FrameResult = { frame_step_m: 6, beam_profile: "x", beam_steel: "С245", beam_utilization: 0.5, column_profile: "x", column_steel: "С245", column_utilization: 0.5, trace: { selected_span_dataset: "frame_12m_cells", selected_branch: "test", candidate_identifiers: [], selection_reason: "first_match" } };
const windows = (window_type: 1 | 2 | 3 | 4 | 5): WindowsInput => ({ enabled: true, window_type, window_height_m: 1, window_strip_length_m: 6, separate_window_count: 1, glazing_construction: "2ой стеклопакет" });

describe("WindowGirtCalculator", () => {
  it.each([1, 2, 3, 4, 5] as const)("calculates deterministic type %d", async (window_type) => {
    const repo = new BrowserCore1DataRepository(source);
    const result = calculateWindowGirts({ windows: windows(window_type), climate: climate("SP_20"), frame }, { profileCandidates: await repo.loadWindowDataset("window_profile_candidates") });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.windowGirts.lower_girt_profile).toBeTruthy();
      expect(result.windowGirts.upper_girt_profile).toBeTruthy();
      expect(Number.isFinite(result.windowGirts.lower_girt_utilization)).toBe(true);
      expect(Number.isFinite(result.windowGirts.upper_girt_utilization)).toBe(true);
      expect(result.windowGirts.trace.window_type).toBe(window_type);
    }
  });

  it("selects the SP_RK_EN branch directly and keeps the branch in trace", async () => {
    const repo = new BrowserCore1DataRepository(source);
    const result = calculateWindowGirts({ windows: windows(3), climate: climate("SP_RK_EN"), frame }, { profileCandidates: await repo.loadWindowDataset("window_profile_candidates") });
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.windowGirts.trace.wind_branch).toBe("SP_RK_EN");
  });

  it("applies scheme factor, utilization limit and glazing mapping deterministically", async () => {
    const repo = new BrowserCore1DataRepository(source);
    const dataset = { profileCandidates: await repo.loadWindowDataset("window_profile_candidates") };
    const base = calculateWindowGirts({ windows: windows(1), climate: climate("SP_20"), frame, scheme_factor: 1, utilization_limit: 0.85 }, dataset);
    const changed = calculateWindowGirts({ windows: { ...windows(1), glazing_construction: "3ой стеклопакет" }, climate: climate("SP_20"), frame, scheme_factor: 0.8, utilization_limit: 0.95 }, dataset);
    expect(base.status).toBe("success");
    expect(changed.status).toBe("success");
    if (base.status === "success" && changed.status === "success") {
      expect(base.windowGirts.trace.scheme_factor).toBe(1);
      expect(changed.windowGirts.trace.scheme_factor).toBe(0.8);
      expect(changed.windowGirts.trace.glazing_load_kpa).toBe(0.54);
      expect(changed.windowGirts.trace.utilization_limit).toBe(0.95);
    }
  });

  it("does not mutate inputs or depend on external workbooks", async () => {
    const repo = new BrowserCore1DataRepository(source);
    const input = { windows: windows(2), climate: climate("SP_20"), frame };
    const snapshot = JSON.stringify(input);
    const result = calculateWindowGirts(input, { profileCandidates: await repo.loadWindowDataset("window_profile_candidates") });
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.windowGirts.trace).not.toHaveProperty("J20");
  });
});
