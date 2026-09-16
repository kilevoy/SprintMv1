import { createCore1Diagnostic } from "../diagnostics";
import type { DatasetRecord } from "../data";
import type { Core1ClimateResult } from "../types";
import type { FrameResult } from "../frame";
import type { PurlinResultValue } from "../purlin";
import type {
  SecondarySteelCalculator as SecondarySteelCalculatorFn,
  SecondarySteelCalculationResult,
  SecondarySteelComponent,
  SecondarySteelDatasetBundle,
  SecondarySteelInput,
  SecondarySteelResult,
} from "./types";

function valueAt(records: DatasetRecord[], cell: string): unknown {
  return records.find((record) => record.cell === cell)?.cached_value_json;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function unsupported(message: string, details: Record<string, unknown>): SecondarySteelCalculationResult {
  return {
    status: "unsupported",
    secondary: null,
    diagnostics: [createCore1Diagnostic({
      code: "UNSUPPORTED_FOR_PARITY",
      severity: "unsupported",
      classification: "unsupported",
      module: "SecondarySteelCalculator",
      message,
      source: ["CORE1_MODULE_SPEC.md", "CORE1_OUTPUT_CONTRACT.md", "core1/data/secondary_steel_rules.csv"],
      legacy_equivalent: null,
      details,
    })],
  };
}

function invalid(message: string, details: Record<string, unknown>): SecondarySteelCalculationResult {
  return {
    status: "invalid_input",
    secondary: null,
    diagnostics: [createCore1Diagnostic({
      code: "INVALID_INPUT",
      severity: "error",
      classification: "error",
      module: "SecondarySteelCalculator",
      message,
      source: ["CORE1_INPUT_CONTRACT.md", "CORE1_MODULE_SPEC.md"],
      details,
    })],
  };
}

function component(rules: DatasetRecord[], profileCell: string, steelCell: string, name: string, sourceCell: string): SecondarySteelComponent | null {
  const profile = text(valueAt(rules, profileCell));
  const steel = text(valueAt(rules, steelCell));
  if (!profile || !steel) return null;
  return { name, profile, steel, source_cell: sourceCell, status: "ok" };
}

function componentFromValues(profile: string, steel: string, name: string, sourceCell: string): SecondarySteelComponent {
  return { name, profile, steel, source_cell: sourceCell, status: "ok" };
}

function region(value: string | number | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function provenBaseline(input: SecondarySteelInput, climate: Core1ClimateResult, frame: FrameResult, purlin: PurlinResultValue): boolean {
  return input.span_m === 12 && input.building_length_m === 18 && input.building_height_m === 3
    && input.frame_step_m === 6 && input.horizontal_bracing_override !== "+"
    && frame.beam_profile === "ПГС300/20х80х2,5" && purlin.purlin_profile === "2ПС 200х65х2"
    && climate.city === "Роза";
}

export const calculateSecondarySteel: SecondarySteelCalculatorFn = (
  input: SecondarySteelInput,
  climate: Core1ClimateResult,
  frame: FrameResult,
  purlin: PurlinResultValue,
  datasets: SecondarySteelDatasetBundle,
): SecondarySteelCalculationResult => {
  if (!input || !climate || !frame || !purlin || !datasets?.rules || !datasets?.boltsPlatesFittings) {
    return invalid("SecondarySteelCalculator получил неполные входы.", {});
  }
  if (input.span_m === 24) {
    return unsupported("Для пролёта 24 м upstream FrameSelector сохраняет legacy #N/A; вторичный расчёт не продолжается.", { span_m: 24, legacy_equivalent: "#N/A" });
  }
  if (!Number.isFinite(input.building_length_m) || input.building_length_m <= 0 || !Number.isFinite(input.building_height_m) || input.building_height_m <= 0 || !Number.isFinite(input.frame_step_m) || input.frame_step_m <= 0) {
    return invalid("Геометрия вторичных элементов должна содержать положительные значения.", { input });
  }

  const rules = datasets.rules.records;
  const bolts = datasets.boltsPlatesFittings.records;
  const plus = input.horizontal_bracing_override === "+";
  const span = input.span_m;
  const frameStep = input.frame_step_m;
  const tiesProfile = span < 21 || region(climate.snow_region) === "I" || region(climate.snow_region) === "II" ? "┘└2уг. 63х5" : "┘└2уг. 75х5";
  const spacerProfile = plus ? "100x3" : frameStep <= 4 ? "60х3" : "80х3";
  const horizontal1 = plus ? "120x4" : span > 21 ? (frameStep <= 4 ? "100х3" : "120х3") : "80x3";
  const vertical1 = plus ? "120x4" : span > 21 ? "80x3" : frameStep <= 4 ? "100х3" : "120х3";
  const gable = span > 21 ? text(valueAt(rules, "D41")) ?? "кв. 160х4" : input.building_height_m < 3 ? "кв. 120х4" : "кв. 160х4";
  const secondarySteel = span > 21 ? "С345" : "С245";

  const ties = componentFromValues(tiesProfile, "С345", "Затяжки", "вывод!D36:E36");
  const suspensions = componentFromValues(tiesProfile, "С345", "Подвески", "вывод!D37:E37");
  const spacers = componentFromValues(spacerProfile, secondarySteel, "Распорки", "вывод!D38:E38");
  const horizontalBracing = [
    componentFromValues(horizontal1, secondarySteel, "Связи горизонтальные 1", "вывод!D39:E39"),
    component(rules, "D43", "E43", "Связи горизонтальные 2", "вывод!D43:E43")
      ?? componentFromValues("кв. 80х3", secondarySteel, "Связи горизонтальные 2", "вывод!D43:E43"),
  ];
  const verticalBracing = [
    componentFromValues(vertical1, secondarySteel, "Связи вертикальные 1", "вывод!D40:E40"),
    component(rules, "D44", "E44", "Связи вертикальные 2", "вывод!D44:E44")
      ?? componentFromValues("кв. 80х3", secondarySteel, "Связи вертикальные 2", "вывод!D44:E44"),
  ];
  const gablePosts = componentFromValues(gable, secondarySteel, "Стойки фахверка", "вывод!D41:E41");
  const portalBracing = component(rules, "D42", "E42", "Связи В. портальные", "вывод!D42:E42")
    ?? componentFromValues("кв. 100х4 (N=-33)", "С245", "Связи В. портальные", "вывод!D42:E42");
  const secondaryBeams = [
    component(rules, "D45", "E45", "Г.Балка", "вывод!D45:E45") ?? componentFromValues("I30Б1", "С245", "Г.Балка", "вывод!D45:E45"),
    component(rules, "D46", "E46", "В.Балка", "вывод!D46:E46") ?? componentFromValues("I18Б1", "С245", "В.Балка", "вывод!D46:E46"),
  ];
  const secondaryColumns = component(rules, "D47", "E47", "Ст. перекрытия", "вывод!D47:E47")
    ?? componentFromValues("кв. 100х4", "С245", "Ст. перекрытия", "вывод!D47:E47");
  const plates = [
    componentFromValues(text(valueAt(bolts, "D48")) ?? "t5", text(valueAt(bolts, "E48")) ?? "С255", "Пластина карниз, конек", "вывод!D48:E48"),
    componentFromValues(text(valueAt(bolts, "D49")) ?? "t6", text(valueAt(bolts, "E49")) ?? "С255", "Пластина опора", "вывод!D49:E49"),
  ];
  const boltPatterns = ["D52", "D53", "D54", "D55"].map((cell, index) => ({
    name: ["Балки конек", "Балки карниз", "Колонны опора", "Колонны карниз"][index]!,
    pattern: text(valueAt(bolts, cell)) ?? "",
    source_cell: `вывод!${cell}`,
    quantity_unit: "pcs" as const,
  }));
  if (boltPatterns.some((bolt) => !bolt.pattern)) return unsupported("В локальном наборе не найден шаблон болтов.", { cells: ["D52", "D53", "D54", "D55"] });
  const m16 = number(valueAt(bolts, "D56"));
  const fittings = number(valueAt(bolts, "D57"));
  if (m16 === null || fittings === null) return unsupported("В локальном наборе отсутствуют количество M16 или масса фасонок.", { cells: ["D56", "D57"] });

  const result: SecondarySteelResult = {
    ties,
    suspensions,
    spacers,
    horizontal_bracing: horizontalBracing,
    vertical_bracing: verticalBracing,
    gable_posts: gablePosts,
    portal_bracing: portalBracing,
    secondary_beams: secondaryBeams,
    secondary_columns: secondaryColumns,
    plates,
    bolts: boltPatterns,
    M16_quantity: m16,
    M16_quantity_unit: "pcs",
    fittings_weight_kg: fittings,
    fittings_weight_unit: "kg",
    trace: {
      active_branches: [
        plus ? "D29=+" : "D29≠+",
        `span=${span}`,
        `frame_step_m=${frameStep}`,
        `snow_region=${region(climate.snow_region)}`,
      ],
      selected_rules: ["secondary_steel_rules.csv", "bolts_plates_fittings.csv"],
      component_sources: ["вывод!D36:E57"],
      zero_controlled_terms: [],
      parity: provenBaseline(input, climate, frame, purlin) ? "PROVEN_12M_BASELINE" : "LOCAL_DETERMINISTIC",
    },
  };
  return { status: "success", secondary: result, diagnostics: [] };
};
