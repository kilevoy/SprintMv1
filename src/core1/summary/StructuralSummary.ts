import { createCore1Diagnostic } from "../diagnostics";
import type { StructuralSummaryCalculationResult, StructuralSummaryInput, StructuralSummaryResult } from "./types";

function invalid(message: string, details: Record<string, unknown>): StructuralSummaryCalculationResult {
  return {
    status: "invalid_input",
    summary: null,
    diagnostics: [createCore1Diagnostic({
      code: "INVALID_INPUT",
      severity: "error",
      classification: "error",
      module: "StructuralSummary",
      message,
      source: ["вывод!D69", "Расчёт!O2:O14", "CORE1_STRUCTURAL_SUMMARY_AUDIT.md"],
      details,
    })],
  };
}

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Aggregates already-computed Core 1 modules; it performs no engineering selection. */
export function calculateStructuralSummary(input: StructuralSummaryInput): StructuralSummaryCalculationResult {
  if (!input?.scenario || !input.frame || !input.purlin || !input.secondarySteel || !input.openings) {
    return invalid("StructuralSummary получил неполный набор upstream-результатов.", {});
  }
  const { scenario, frame, purlin, openings } = input;
  const area = scenario.span_m * scenario.building_length_m;
  const frameStep = frame.frame_step_m;
  const frameMass = frame.frame_mass_kg;
  const tieUnitMass = frame.frame_tie_unit_mass_kg;
  const tubeMass = frame.tube_mass_kg_per_m2;
  if (!finite(area) || area <= 0 || !finite(frameStep) || frameStep <= 0 || !finite(frameMass) || !finite(tieUnitMass) || !finite(tubeMass) || !finite(purlin.purlin_kg_per_m2) || !finite(openings.opening_mass_kg_per_m2)) {
    return invalid("Для StructuralSummary отсутствуют доказанные промежуточные массы или площадь.", { area_m2: area, frame_step_m: frameStep, frame_mass_kg: frameMass, tie_unit_mass_kg: tieUnitMass, tube_mass_kg_per_m2: tubeMass, purlin_kg_per_m2: purlin.purlin_kg_per_m2, opening_kg_per_m2: openings.opening_mass_kg_per_m2 });
  }
  const frameCount = Math.ceil(scenario.building_length_m / frameStep) + 1;
  const tieBays = Math.max(frameCount - 2, 0);
  const tiesMass = tieUnitMass * tieBays;
  const frameBase = (tiesMass + frameMass * frameCount) / area + tubeMass;
  const kgPerM2 = frameBase + purlin.purlin_kg_per_m2 + openings.opening_mass_kg_per_m2;
  if (!Number.isFinite(kgPerM2)) return invalid("Итоговая удельная масса StructuralSummary не является конечным числом.", { kg_per_m2: kgPerM2 });
  const summary: StructuralSummaryResult = {
    kg_per_m2: kgPerM2,
    trace: {
      source_formula: "вывод!D69 = IF(D9=0,E8,E9)+D68",
      source_cells: ["вывод!D69", "Расчёт!E2:E6", "Расчёт!G2:G14", "Расчёт!H2:H14", "Расчёт!O2:O14", "вывод!E8:E9", "вывод!D68"],
      area_m2: area,
      frame_count: frameCount,
      tie_bays: tieBays,
      frame_mass_kg_per_frame: frameMass,
      ties_mass_kg: tiesMass,
      tube_mass_kg_per_m2: tubeMass,
      frame_base_kg_per_m2: frameBase,
      purlin_kg_per_m2: purlin.purlin_kg_per_m2,
      opening_kg_per_m2: openings.opening_mass_kg_per_m2,
      included_components: ["затяжки", "основные рамы", "трубная составляющая", "прогоны", "D68 openings"],
      excluded_components: ["SecondarySteelResult components (not in D69 source formula)", "window_girts direct (already in D68)", "E68 tonnes", "pricing", "Core2"],
      purlin_weight_kg_excluded_from_summary: true,
      windows_already_in_openings: true,
      secondary_steel_recalculated: false,
      intermediate_rounding: "none_observed",
    },
  };
  return { status: "success", summary, diagnostics: [] };
}
