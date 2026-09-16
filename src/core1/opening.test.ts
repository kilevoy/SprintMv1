import { describe, expect, it } from "vitest";
import { calculateOpeningMass } from "./opening";
import type { FrameResult } from "./frame";
import type { WindowGirtResult } from "./window";

const frame: FrameResult = {
  frame_step_m: 6,
  beam_profile: "ПГС300/20х80х2,5",
  beam_steel: "М.п.350",
  beam_utilization: 70,
  column_profile: "ПГС300/20х80х3",
  column_steel: "М.п.350",
  column_utilization: 86,
  trace: { selected_span_dataset: "frame_12m_cells", selected_branch: "test", candidate_identifiers: [], selection_reason: "first_match" },
};

const windowGirts: WindowGirtResult = {
  lower_girt_profile: "кв.50х2",
  lower_girt_steel: "М.п.245",
  lower_girt_utilization: 0.4,
  upper_girt_profile: "пр.180х140х4",
  upper_girt_steel: "М.п.245",
  upper_girt_utilization: 0.5,
  lower_girt_mass_kg_per_m: 3,
  upper_girt_mass_kg_per_m: 17,
  window_girts_weight_kg: 20,
  trace: {
    window_type: 1,
    normative_system: "SP_20",
    wind_branch: "SP_20",
    wind_intermediate: { wind_load_kpa: 0.3, lower_wind_load_kpa: 0.3, upper_wind_load_kpa: 0.3 },
    glazing_load_kpa: 0.42,
    scheme_factor: 1,
    utilization_limit: 0.85,
    lower_load: 1,
    upper_load: 1,
    lower_candidates: 1,
    upper_candidates: 1,
    selected_lower_row: 1,
    selected_upper_row: 2,
    mass_components: { lower_kg: 3, upper_kg: 17, total_kg: 20 },
  },
};

const noWindows = { enabled: false, window_type: 1 as const, window_height_m: 0, window_strip_length_m: 0, separate_window_count: 0, glazing_construction: "2ой стеклопакет" };

describe("OpeningMassCalculator", () => {
  it("returns the zero opening baseline", () => {
    const result = calculateOpeningMass({ gate_count_le_6m: 0, gate_count_gt_6m: 0, door_count: 0, windows: noWindows, frame, span_m: 12, building_length_m: 18, windowGirts: null });
    expect(result.status).toBe("success");
    expect(result.openingMass!).toMatchObject({ gate_le_6m_mass_kg: 0, gate_gt_6m_mass_kg: 0, door_mass_kg: 0, window_mass_kg: 0, opening_mass_kg: 0, opening_mass_kg_per_m2: 0, opening_mass_t: 0 });
  });

  it("keeps windows=false as a zero window contribution", () => {
    const result = calculateOpeningMass({ gate_count_le_6m: 0, gate_count_gt_6m: 0, door_count: 0, windows: { ...noWindows, window_strip_length_m: 6, window_height_m: 1, separate_window_count: 1 }, frame, span_m: 12, building_length_m: 18, windowGirts: null });
    expect(result.status).toBe("success");
    expect(result.openingMass!.window_mass_kg).toBe(0);
    expect(result.openingMass!.trace.window_strip_length_m).toBe(0);
  });

  it("uses the <=6 m gate branch", () => {
    const result = calculateOpeningMass({ gate_count_le_6m: 1, gate_count_gt_6m: 0, door_count: 0, windows: noWindows, frame, span_m: 12, building_length_m: 18, windowGirts: null });
    expect(result.openingMass!.gate_le_6m_mass_kg).toBe(350 * 1.05);
    expect(result.openingMass!.gate_gt_6m_mass_kg).toBe(0);
  });

  it("uses the >6 m gate branch separately", () => {
    const result = calculateOpeningMass({ gate_count_le_6m: 0, gate_count_gt_6m: 1, door_count: 0, windows: noWindows, frame, span_m: 12, building_length_m: 18, windowGirts: null });
    expect(result.openingMass!.gate_gt_6m_mass_kg).toBe(450 * 1.05);
    expect(result.openingMass!.gate_le_6m_mass_kg).toBe(0);
  });

  it("calculates the door structural contribution only", () => {
    const result = calculateOpeningMass({ gate_count_le_6m: 0, gate_count_gt_6m: 0, door_count: 2, windows: noWindows, frame, span_m: 12, building_length_m: 18, windowGirts: null });
    expect(result.openingMass!.door_mass_kg).toBe((6 + 4) * 2 * 7.2 * 1.05);
  });

  it("adds separate-window girts and the proven D65 strip branch", () => {
    const result = calculateOpeningMass({
      gate_count_le_6m: 0, gate_count_gt_6m: 0, door_count: 0,
      windows: { enabled: true, window_type: 1, window_height_m: 1, window_strip_length_m: 6, separate_window_count: 2, glazing_construction: "2ой стеклопакет" },
      frame, span_m: 12, building_length_m: 18, windowGirts,
    });
    expect(result.status).toBe("success");
    expect(result.openingMass!.trace.separate_window_count).toBe(2);
    expect(result.openingMass!.trace.strip_frame_bays).toBe(3);
    expect(result.openingMass!.trace.window_girt_mass_kg).toBe(20);
    expect(result.openingMass!.trace.window_strip_mass_kg).toBe((6 * 1 * (3 + 17) + 3 * 1 * 3) * 1.05);
    expect(result.openingMass!.window_mass_kg).toBe(20 + (6 * 20 + 3 * 3) * 1.05);
  });

  it("aggregates all components deterministically and excludes secondary steel", () => {
    const input = { gate_count_le_6m: 1, gate_count_gt_6m: 1, door_count: 1, windows: { enabled: true, window_type: 2 as const, window_height_m: 1, window_strip_length_m: 0, separate_window_count: 1, glazing_construction: "2ой стеклопакет" }, frame, span_m: 12, building_length_m: 18, windowGirts, secondarySteel: { fittings_weight_kg: 999 } as never };
    const first = calculateOpeningMass(input);
    const second = calculateOpeningMass(input);
    expect(second).toEqual(first);
    expect(first.openingMass!.trace.secondary_steel_excluded).toBe(true);
    expect(first.openingMass!.trace.pricing_included).toBe(false);
    expect(first.openingMass!.trace.core2_included).toBe(false);
    expect(first.openingMass!.opening_mass_kg).toBe(first.openingMass!.gate_le_6m_mass_kg + first.openingMass!.gate_gt_6m_mass_kg + first.openingMass!.door_mass_kg + first.openingMass!.window_mass_kg);
    expect(first.openingMass!.opening_mass_kg_per_m2).toBe(first.openingMass!.opening_mass_kg / (12 * 18));
  });

  it("does not silently calculate enabled windows without WindowGirtResult", () => {
    const result = calculateOpeningMass({ gate_count_le_6m: 0, gate_count_gt_6m: 0, door_count: 0, windows: { ...noWindows, enabled: true, window_height_m: 1, separate_window_count: 1 }, frame, span_m: 12, building_length_m: 18, windowGirts: null });
    expect(result.status).toBe("invalid_input");
  });
});
