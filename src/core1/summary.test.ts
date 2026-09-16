import { describe, expect, it } from "vitest";
import { calculateStructuralSummary } from "./summary";
import type { FrameResult } from "./frame";
import type { PurlinResultValue } from "./purlin";
import type { SecondarySteelResult } from "./secondary";
import type { OpeningMassResult } from "./opening";

const frame: FrameResult = {
  frame_step_m: 6, frame_mass_kg: 577, frame_tie_unit_mass_kg: 148, tube_mass_kg_per_m2: 10.665118055555556,
  beam_profile: "ПГС300/20х80х2,5", beam_steel: "М.п.350", beam_utilization: 85,
  column_profile: "ПГС245/20х80х2", column_steel: "М.п.350", column_utilization: 65,
  trace: { selected_span_dataset: "frame_12m_cells", selected_branch: "B10", candidate_identifiers: [], selection_reason: "first_match" },
};
const purlin: PurlinResultValue = { purlin_profile: "2ПС 200х65х2", purlin_steel: "М.п.390", purlin_assignment: "любая", purlin_step_mm: 2140, purlin_kg_per_m2: 7.539000000000001, purlin_weight_kg: 1550.88, purlin_auxiliary_value: 0, trace: { selected_branch: "М.п.390", candidate_count: 1, evaluated_steps_mm: [2140], selected_step_index: 0, roof_self_weight_kg_per_m2: 0, deck_key: "С44-1000-0,7", snow_retention_purlin: "нет", enclosure_purlin: "нет", parity: "PROVEN_12M_BASELINE" } };
const secondary = { fittings_weight_kg: 233 } as unknown as SecondarySteelResult;
const opening = (kgPerM2: number): OpeningMassResult => ({ gate_le_6m_mass_kg: 0, gate_gt_6m_mass_kg: 0, door_mass_kg: 0, window_mass_kg: kgPerM2 * 216, opening_mass_kg: kgPerM2 * 216, opening_mass_kg_per_m2: kgPerM2, opening_mass_t: kgPerM2 * 216 / 1000, trace: { source_cells: [], units: { gate_le_6m: "kg", gate_gt_6m: "kg", door: "kg", windows: "kg", opening_total: "kg", specific: "kg/m²", tonnes: "t" }, separate_window_count: 0, window_strip_length_m: 0, strip_frame_bays: 0, window_girt_mass_kg: 0, window_strip_mass_kg: 0, secondary_steel_excluded: true, pricing_included: false, core2_included: false } });

describe("StructuralSummary", () => {
  it("reproduces the 12 m D69 baseline exactly without intermediate rounding", () => {
    const result = calculateStructuralSummary({ scenario: { span_m: 12, building_length_m: 18, frame_step_override_m: null }, frame, purlin, secondarySteel: secondary, windows: null, openings: opening(0) });
    expect(result.status).toBe("success");
    expect(result.summary!.kg_per_m2).toBeCloseTo(30.25967361111111, 12);
    expect(result.summary!.trace.area_m2).toBe(216);
    expect(result.summary!.trace.frame_count).toBe(4);
    expect(result.summary!.trace.tie_bays).toBe(2);
  });

  it("adds D68 once and never adds E68 tonnes to kg/m²", () => {
    const result = calculateStructuralSummary({ scenario: { span_m: 12, building_length_m: 18, frame_step_override_m: null }, frame, purlin, secondarySteel: secondary, windows: null, openings: opening(2) });
    expect(result.summary!.kg_per_m2).toBeCloseTo(32.25967361111111, 12);
    expect(result.summary!.trace.opening_kg_per_m2).toBe(2);
    expect(result.summary!.trace.windows_already_in_openings).toBe(true);
  });

  it("uses only purlin kg/m², not purlin total kg", () => {
    const result = calculateStructuralSummary({ scenario: { span_m: 12, building_length_m: 18, frame_step_override_m: null }, frame, purlin: { ...purlin, purlin_weight_kg: 999999 }, secondarySteel: secondary, windows: null, openings: opening(0) });
    expect(result.summary!.kg_per_m2).toBeCloseTo(30.25967361111111, 12);
    expect(result.summary!.trace.purlin_weight_kg_excluded_from_summary).toBe(true);
  });

  it("is deterministic and exposes explicit double-count boundaries", () => {
    const input = { scenario: { span_m: 12 as const, building_length_m: 18, frame_step_override_m: null }, frame, purlin, secondarySteel: secondary, windows: null, openings: opening(0) };
    const first = calculateStructuralSummary(input);
    const second = calculateStructuralSummary(input);
    expect(second).toEqual(first);
    expect(first.summary!.trace.secondary_steel_recalculated).toBe(false);
    expect(first.summary!.trace.excluded_components).toContain("window_girts direct (already in D68)");
  });

  it("rejects missing proven frame intermediate data instead of approximating", () => {
    const incomplete = { ...frame, tube_mass_kg_per_m2: null };
    const result = calculateStructuralSummary({ scenario: { span_m: 12, building_length_m: 18, frame_step_override_m: null }, frame: incomplete, purlin, secondarySteel: secondary, windows: null, openings: opening(0) });
    expect(result.status).toBe("invalid_input");
  });
});
