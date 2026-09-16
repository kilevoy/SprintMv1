import { createCore1Diagnostic } from "../diagnostics";
import type { OpeningMassCalculationResult, OpeningMassData, OpeningMassInput, OpeningMassResult } from "./types";
import { DEFAULT_OPENING_MASS_DATA } from "./types";

function invalid(message: string, details: Record<string, unknown>): OpeningMassCalculationResult {
  return {
    status: "invalid_input",
    openingMass: null,
    diagnostics: [createCore1Diagnostic({
      code: "INVALID_INPUT",
      severity: "error",
      classification: "error",
      module: "OpeningMassCalculator",
      message,
      source: ["вывод!D60:D68", "Лист1!O23:O29", "Лист7!O27", "CORE1_OPENING_MASS_AUDIT.md"],
      details,
    })],
  };
}

function mergeData(overrides: Partial<OpeningMassData> | undefined): OpeningMassData {
  return { ...DEFAULT_OPENING_MASS_DATA, ...overrides };
}

function nonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * Calculates only the additional opening constructions represented by
 * Лист1!O23:O27. Existing secondary steel is deliberately not added again.
 */
export function calculateOpeningMass(input: OpeningMassInput): OpeningMassCalculationResult {
  const data = mergeData(input.data);
  const numericFields: Record<string, number> = {
    gate_count_le_6m: input.gate_count_le_6m,
    gate_count_gt_6m: input.gate_count_gt_6m,
    door_count: input.door_count,
    span_m: input.span_m,
    building_length_m: input.building_length_m,
    frame_step_m: input.frame?.frame_step_m,
  };
  if (!input || !input.frame || !input.windows || Object.values(numericFields).some((value) => !nonNegative(value))) {
    return invalid("OpeningMassCalculator получил неполные или отрицательные входные данные.", numericFields);
  }
  if (input.span_m <= 0 || input.building_length_m <= 0 || input.frame.frame_step_m <= 0) {
    return invalid("Для расчёта массы проёмов span, длина здания и шаг рам должны быть положительными.", numericFields);
  }
  if (input.windows.enabled && !input.windowGirts) {
    return invalid("При включённых окнах требуется предварительно рассчитанный WindowGirtResult.", { windows_enabled: true });
  }

  const gateLe = data.gate_le_6m_unit_mass_kg * input.gate_count_le_6m * data.fabrication_factor;
  const gateGt = data.gate_gt_6m_unit_mass_kg * input.gate_count_gt_6m * data.fabrication_factor;
  const door = (input.frame.frame_step_m + data.door_extra_width_m)
    * input.door_count * data.door_areal_mass_kg_per_m2 * data.fabrication_factor;

  let windowGirtMass = 0;
  let windowStripMass = 0;
  let stripFrameBays = 0;
  if (input.windows.enabled) {
    const result = input.windowGirts!;
    windowGirtMass = result.window_girts_weight_kg;
    const stripLength = input.windows.window_strip_length_m;
    if (stripLength > 0 && input.windows.window_height_m > 0) {
      // Лист7!O27: (D65*B6*(E24+E37)+F14*B6*E24)*1.05.
      // F14 = Расчёт!AK15-1 = number of frame bays, equivalent to ceil(L/step).
      stripFrameBays = Math.ceil(input.building_length_m / input.frame.frame_step_m);
      windowStripMass = (
        stripLength * input.windows.window_height_m
          * (result.lower_girt_mass_kg_per_m + result.upper_girt_mass_kg_per_m)
          + stripFrameBays * input.windows.window_height_m * result.lower_girt_mass_kg_per_m
      ) * data.fabrication_factor;
    }
  }
  const windowMass = windowGirtMass + windowStripMass;
  const openingMass = gateLe + gateGt + door + windowMass;
  const specific = openingMass / input.span_m / input.building_length_m;
  const result: OpeningMassResult = {
    gate_le_6m_mass_kg: gateLe,
    gate_gt_6m_mass_kg: gateGt,
    door_mass_kg: door,
    window_mass_kg: windowMass,
    opening_mass_kg: openingMass,
    opening_mass_kg_per_m2: specific,
    opening_mass_t: openingMass / 1000,
    trace: {
      source_cells: data.source_cells,
      units: { gate_le_6m: "kg", gate_gt_6m: "kg", door: "kg", windows: "kg", opening_total: "kg", specific: "kg/m²", tonnes: "t" },
      separate_window_count: input.windows.enabled ? input.windows.separate_window_count : 0,
      window_strip_length_m: input.windows.enabled ? input.windows.window_strip_length_m : 0,
      strip_frame_bays: stripFrameBays,
      window_girt_mass_kg: windowGirtMass,
      window_strip_mass_kg: windowStripMass,
      secondary_steel_excluded: true,
      pricing_included: false,
      core2_included: false,
    },
  };
  return { status: "success", openingMass: result, diagnostics: [] };
}
