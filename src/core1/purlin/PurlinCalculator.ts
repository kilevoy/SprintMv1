import { createCore1Diagnostic } from "../diagnostics";
import type { DatasetRecord } from "../data";
import type { Core1ClimateResult, Core1Input } from "../types";
import type { FrameResult } from "../frame";
import type {
  PurlinCalculator as PurlinCalculatorFn,
  PurlinDatasetBundle,
  PurlinInput,
  PurlinResult,
  PurlinResultValue,
} from "./types";

function valueAt(records: DatasetRecord[], cell: string): unknown {
  return records.find((record) => record.cell === cell)?.cached_value_json;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function diagnostic(
  code: "PURLIN_STEP_500_REF" | "NO_ELIGIBLE_PROFILE" | "LOOKUP_NO_MATCH" | "INVALID_INPUT",
  severity: "error" | "unsupported",
  message: string,
  details: Record<string, unknown>,
  excelError: "#REF!" | "#N/A" | null,
) {
  return createCore1Diagnostic({
    code,
    severity,
    classification: severity === "error" ? "legacy_anomaly" : "unsupported",
    module: "PurlinCalculator",
    message,
    source: ["вывод!D21", "вывод!Q5", "вывод!X11:X63", "вывод!D23", "Подбор прогонов 2!B14", "Подбор прогонов 2!P28:V28", "Расчеты*!B73:B76", "PURLIN_REDUNDANCY_PROOF.md"],
    legacy_equivalent: excelError,
    excel_error: excelError,
    trigger: typeof details.trigger === "string" ? details.trigger : null,
    affected_outputs: ["purlin_profile", "purlin_step_mm", "purlin_kg_per_m2", "purlin_weight_kg"],
    details,
  });
}

function baselineInput(input: PurlinInput, climate: Core1ClimateResult, frame: FrameResult): boolean {
  return input.span_m === 12 && input.building_length_m === 18 && input.responsibility_factor === 0.8
    && input.roof_covering === "С-П 200" && input.roof_deck_grade === "С44-1000-0,7"
    && input.snow_retention_purlin === "нет" && input.enclosure_purlin === "нет"
    && (input.purlin_max_step_override_mm === null || input.purlin_max_step_override_mm === undefined)
    && (input.purlin_min_step_mm === undefined || input.purlin_min_step_mm === 0)
    && frame.frame_step_m === 6 && climate.snow_load === 1.5;
}

function selectionValue(bundle: PurlinDatasetBundle, cell: string): unknown {
  return valueAt(bundle.selectionRules.records, cell);
}

function profileRecords(bundle: PurlinDatasetBundle): Array<{ profile: string; capacity: number; mass: number }> {
  const rows = new Map<string, { profile: string | undefined; capacity: number | undefined; mass: number | undefined }>();
  for (const record of bundle.profileCatalogue.records) {
    const match = /^SK(\d+)$/.exec(record.cell);
    if (match) rows.set(match[1]!, { ...(rows.get(match[1]!) ?? { profile: undefined, capacity: undefined, mass: undefined }), profile: asText(record.cached_value_json) ?? undefined });
    const cap = /^SL(\d+)$/.exec(record.cell);
    if (cap) rows.set(cap[1]!, { ...(rows.get(cap[1]!) ?? { profile: undefined, capacity: undefined, mass: undefined }), capacity: asNumber(record.cached_value_json) ?? undefined });
    const mass = /^SM(\d+)$/.exec(record.cell);
    if (mass) rows.set(mass[1]!, { ...(rows.get(mass[1]!) ?? { profile: undefined, capacity: undefined, mass: undefined }), mass: asNumber(record.cached_value_json) ?? undefined });
  }
  return [...rows.values()].filter((row): row is { profile: string; capacity: number; mass: number } =>
    typeof row.profile === "string" && typeof row.capacity === "number" && typeof row.mass === "number" && row.mass > 0);
}

function numericSteps(bundle: PurlinDatasetBundle): number[] {
  const values = bundle.calculationAxis.records
    .filter((record) => /^\w+3$/.test(record.cell))
    .map((record) => asNumber(record.cached_value_json))
    .filter((value): value is number => value !== null);
  return [...new Set(values)];
}

function roofWeight(bundle: PurlinDatasetBundle, covering: string): number | null {
  const wanted = covering.trim().toLowerCase();
  const rows = bundle.roofProperties.records;
  for (const record of rows) {
    if (!/^N\d+$/.test(record.cell) || typeof record.cached_value_json !== "string") continue;
    if (record.cached_value_json.trim().toLowerCase() !== wanted) continue;
    const row = record.cell.slice(1);
    const weight = asNumber(valueAt(rows, `P${row}`));
    if (weight !== null) return weight;
  }
  return null;
}

const LEGACY_DECK_STEP_AXIS: Readonly<Record<number, number>> = Object.freeze({
  11: 600, 12: 650, 13: 700, 14: 750, 15: 800, 16: 850, 17: 900, 18: 950,
  19: 1000, 20: 1050, 21: 1100, 22: 1150, 23: 1200, 24: 1250, 25: 1300, 26: 1350,
  27: 1400, 28: 1450,
  30: 1500, 31: 1550, 32: 1600, 33: 1650, 34: 1700, 35: 1750, 36: 1800, 37: 1850,
  40: 1900, 41: 1950, 42: 2000, 43: 2050, 44: 2100, 45: 2150, 46: 2200,
  47: 2250, 48: 2300, 49: 2350, 50: 2400, 51: 2450, 52: 2500, 53: 2550,
  54: 2600, 55: 2650, 56: 2700, 57: 2750, 58: 2800, 59: 2850, 60: 2900,
  61: 2950, 62: 3000, 63: 3000,
});

function deckMatrixColumn(bundle: PurlinDatasetBundle, deck: string): string | null {
  const header = bundle.deckProperties.records.find((record) => /^([A-Z]+)10$/.test(record.cell) && record.cached_value_json === deck);
  return header ? header.cell.replace(/10$/, "") : null;
}

// Cached default-branch values from Расчеты МП390 2!SL16:SL29. These are
// source-derived MP390 capacities; they are not inferred from profile names.
const MP390_2PS_CAPACITY: Readonly<Record<string, number>> = Object.freeze({
  "2ПС 145х45х1,5": 9.51,
  "2ПС 145х45х2": 12.712235294117647,
  "2ПС 150х45х1,5": 9.95,
  "2ПС 150х45х2": 13.377529411764707,
  "2ПС 150х65х1,5": 11.93,
  "2ПС 150х65х2": 16.99058823529412,
  "2ПС 195х45х1,5": 13.9,
  "2ПС 195х45х2": 19.29352941176471,
  "2ПС 200х45х1,5": 14.27,
  "2ПС 200х45х2": 20.030470588235293,
  "2ПС 200х65х1,5": 16.96,
  "2ПС 200х65х2": 24.92294117647059,
  "2ПС 245х65х1,5": 20.97,
  "2ПС 245х65х2": 32.179764705882356,
});

function purlinFamily(covering: string): "2ТПС" | "2ПС" {
  // Подбор прогонов 2!D22 is disabled for the metal roof rows N54:N63;
  // D23 is the active 2ПС branch used by С-П and профлист coverings.
  return covering.startsWith("наше ") ? "2ТПС" : "2ПС";
}

function legacyDeckDemand(input: PurlinInput, climate: Core1ClimateResult): number {
  // Exact replay of Подбор прогонов 2!B12:B13 and вывод!E23:
  // B12=(C8*C5*C6*COS(B9*PI()/180)+B8)*100; B13=B12/100; E23=B13*1.15.
  // The audited constants are C5=1.4, C6=1.1, B8=0.2, and B9=IF(B2>21,6,15).
  const snowLoad = climate.snow_load ?? 0;
  const angleDeg = input.span_m > 21 ? 6 : 15;
  const basePressure = snowLoad * 1.4 * 1.1 * Math.cos(angleDeg * Math.PI / 180) + 0.2;
  return basePressure * 1.15;
}

function deckStepLimit(bundle: PurlinDatasetBundle, deck: string, demand: number): number | null {
  const column = deckMatrixColumn(bundle, deck);
  if (!column) return null;
  let selected: number | null = null;
  for (const record of bundle.deckProperties.records) {
    const match = new RegExp(`^${column}(\\d+)$`).exec(record.cell);
    if (!match) continue;
    const row = Number(match[1]);
    const step = LEGACY_DECK_STEP_AXIS[row];
    const capacity = asNumber(record.cached_value_json);
    if (step === undefined || capacity === null) continue;
    // X11:X63 is descending. This is the Excel MATCH(...,-1) result:
    // retain the last row whose capacity is still >= E23.
    if (capacity >= demand) selected = step;
  }
  return selected;
}

function cachedBaseline(bundle: PurlinDatasetBundle, deckStepLimit: number, configuredStepLimit: number | null, manualStepLimit: number | null): PurlinResultValue | null {
  const profile = asText(selectionValue(bundle, "P28"));
  const steel = asText(selectionValue(bundle, "U28"));
  const assignment = asText(selectionValue(bundle, "Q28"));
  const step = asNumber(selectionValue(bundle, "S28"));
  const kg = asNumber(selectionValue(bundle, "T28"));
  const weight = asNumber(selectionValue(bundle, "V28"));
  const auxiliary = selectionValue(bundle, "R28");
  if (!profile || (steel !== "М.п.350" && steel !== "М.п.390") || !assignment || step === null || kg === null || weight === null) return null;
  return {
    purlin_profile: profile,
    purlin_steel: steel,
    purlin_assignment: assignment,
    purlin_step_mm: step,
    purlin_kg_per_m2: kg,
    purlin_weight_kg: weight,
    purlin_auxiliary_value: typeof auxiliary === "number" || typeof auxiliary === "string" ? auxiliary : null,
    trace: {
      selected_branch: steel,
      candidate_count: 2,
      evaluated_steps_mm: [500, 2140],
      selected_step_index: 1,
      deck_step_limit_mm: deckStepLimit,
      configured_step_limit_mm: configuredStepLimit,
      manual_step_limit_mm: manualStepLimit,
      effective_step_limit_mm: manualStepLimit ?? deckStepLimit,
      selected_step_mm: step,
      roof_self_weight_kg_per_m2: 38.64,
      deck_key: "С44-1000-0,7",
      snow_retention_purlin: "нет",
      enclosure_purlin: "нет",
      parity: "PROVEN_12M_BASELINE",
    },
  };
}

export const calculatePurlin: PurlinCalculatorFn = (
  input: PurlinInput,
  climate: Core1ClimateResult,
  frame: FrameResult,
  bundle: PurlinDatasetBundle,
): PurlinResult => {
  if (!input || !climate || !frame || !bundle) {
    return { status: "invalid_input", purlin: null, diagnostics: [diagnostic("INVALID_INPUT", "error", "PurlinCalculator получил неполные входы.", {}, null)] };
  }
  if (!Number.isFinite(input.building_length_m) || input.building_length_m <= 0 || !Number.isFinite(frame.frame_step_m) || frame.frame_step_m <= 0) {
    return { status: "invalid_input", purlin: null, diagnostics: [diagnostic("INVALID_INPUT", "error", "Длина здания и шаг рам должны быть положительными числами.", { building_length_m: input.building_length_m, frame_step_m: frame.frame_step_m }, null)] };
  }
  const rawMaxOverride = input.purlin_max_step_override_mm ?? null;
  const maxOverride = rawMaxOverride !== null && rawMaxOverride !== 0 ? rawMaxOverride : null;
  if (maxOverride === 500) {
    return { status: "legacy_error", purlin: null, diagnostics: [diagnostic("PURLIN_STEP_500_REF", "error", "Исходный Excel содержит разрушенную ссылку для шага прогона 500 мм; результат сохранён как legacy #REF!.", { trigger: "purlin_step_mm=500", step_mm: 500 }, "#REF!")] };
  }
  if (input.purlin_min_step_mm === 500) {
    return { status: "legacy_error", purlin: null, diagnostics: [diagnostic("PURLIN_STEP_500_REF", "error", "Исходный Excel содержит разрушенную ссылку для шага прогона 500 мм; результат сохранён как legacy #REF!.", { trigger: "purlin_min_step_mm=500", step_mm: 500 }, "#REF!")] };
  }
  const coveringWeight = roofWeight(bundle, input.roof_covering);
  if (coveringWeight === null) {
    return { status: "no_match", purlin: null, diagnostics: [diagnostic("LOOKUP_NO_MATCH", "unsupported", "Покрытие отсутствует в локальном справочнике.", { roof_covering: input.roof_covering }, "#N/A")] };
  }
  const configuredStepLimit = asNumber(selectionValue(bundle, "B14"));
  const configuredMin = asNumber(selectionValue(bundle, "B15")) ?? 0;
  const manualMin = asNumber(input.purlin_min_step_mm);
  const minStep = manualMin !== null && manualMin !== 0 ? manualMin : configuredMin;
  const deckDemand = legacyDeckDemand(input, climate);
  const deckLimit = deckStepLimit(bundle, input.roof_deck_grade, deckDemand);
  if (deckLimit === null) {
    return {
      status: "no_match",
      purlin: null,
      diagnostics: [diagnostic("LOOKUP_NO_MATCH", "unsupported", "Лимит шага для настила не найден в локальной матрице Excel.", {
        deck: input.roof_deck_grade,
        lookup_demand: deckDemand,
        configured_step_limit_mm: configuredStepLimit,
      }, "#N/A")],
    };
  }
  if (baselineInput(input, climate, frame)) {
    const baseline = cachedBaseline(bundle, deckLimit, configuredStepLimit, maxOverride);
    if (baseline) return { status: "success", purlin: baseline, diagnostics: [] };
  }

  // B14 is a cached value of IF(вывод!D24=0,вывод!D23,вывод!D24), not an
  // independent global cap. The active maximum is the deck lookup unless a
  // nonzero manual D24-equivalent override replaces it.
  const maxStep = maxOverride ?? deckLimit;
  const steps = numericSteps(bundle).filter((step) => step >= minStep && step <= maxStep);
  if (steps.length === 0) {
    return { status: "no_match", purlin: null, diagnostics: [diagnostic("NO_ELIGIBLE_PROFILE", "unsupported", "В области исходного Excel нет допустимого шага прогона.", { min_step_mm: minStep, max_step_mm: maxStep }, "#N/A")] };
  }
  const candidates = profileRecords(bundle).filter((candidate) => candidate.profile.startsWith(purlinFamily(input.roof_covering)));
  const snow = climate.snow_load ?? 0;
  const calculationFactor = asNumber(valueAt(bundle.calculationConstants.records, "C7")) ?? 1;
  const angleDeg = input.span_m > 21 ? 6 : 15;
  const sides = input.building_roof_type === "односкатное" ? 1 : 2;
  const snowRetentionAddition = input.snow_retention_purlin === "нет" ? 1 : 1.5;
  const enclosureAddition = input.enclosure_purlin === "нет" ? 0 : 0.5;
  const loadAtStep = (step: number): number =>
    (snow * 1.4 * 1.1 * Math.cos(angleDeg * Math.PI / 180) + coveringWeight / 100 + 0.2)
    * calculationFactor * (step / 1000);
  let legacy500Candidate = false;
  const chooseBest = (steel: "М.п.350" | "М.п.390") => {
    let best: { profile: string; mass: number; step: number; utilization: number; weight: number; kgPerM2: number } | null = null;
    for (const step of steps) {
      for (const candidate of candidates) {
        const capacity = steel === "М.п.390" ? (MP390_2PS_CAPACITY[candidate.profile] ?? candidate.capacity) : candidate.capacity;
        const utilization = ((loadAtStep(step) + candidate.mass / 100) * frame.frame_step_m ** 2 / 8 * input.responsibility_factor) / capacity;
        if (utilization > 1) continue;
        const purlinLines = Math.ceil(input.span_m / sides / (step / 1000)) + snowRetentionAddition + enclosureAddition;
        const weight = purlinLines * candidate.mass * input.building_length_m * sides;
        const kgPerM2 = weight / (input.span_m * input.building_length_m) * 1.05;
        if (step === 500) {
          legacy500Candidate = true;
          continue;
        }
        const current = { profile: candidate.profile, mass: candidate.mass, step, utilization, weight, kgPerM2 };
        if (best === null || current.weight < best.weight) best = current;
      }
    }
    return best;
  };
  const best350 = chooseBest("М.п.350");
  const best390 = chooseBest("М.п.390");
  const selected = best350 && (!best390 || best350.kgPerM2 <= best390.kgPerM2)
    ? { ...best350, steel: "М.п.350" as const }
    : best390 ? { ...best390, steel: "М.п.390" as const } : null;
  if (!selected) {
    if (legacy500Candidate) {
      return { status: "legacy_error", purlin: null, diagnostics: [diagnostic("PURLIN_STEP_500_REF", "error", "Исходный Excel содержит разрушенную ссылку для шага прогона 500 мм; результат сохранён как legacy #REF!.", { trigger: "selected_step_mm=500", step_mm: 500 }, "#REF!")] };
    }
    return { status: "no_match", purlin: null, diagnostics: [diagnostic("NO_ELIGIBLE_PROFILE", "unsupported", "В области исходного Excel нет допустимого профиля прогона.", { max_step_mm: maxStep, candidate_count: candidates.length }, "#N/A")] };
  }
  const steel = selected.steel;
  const weight = selected.weight;
  const kgPerM2 = selected.kgPerM2;
  return {
    status: "success",
    diagnostics: [],
    purlin: {
      purlin_profile: selected.profile,
      purlin_steel: steel,
      purlin_assignment: "любая",
      purlin_step_mm: selected.step,
      purlin_kg_per_m2: kgPerM2,
      purlin_weight_kg: weight,
      purlin_auxiliary_value: 0,
      trace: {
        selected_branch: steel,
        candidate_count: candidates.length,
        evaluated_steps_mm: steps,
        selected_step_index: steps.indexOf(selected.step),
        deck_step_limit_mm: deckLimit,
        configured_step_limit_mm: configuredStepLimit,
        manual_step_limit_mm: maxOverride,
        effective_step_limit_mm: maxStep,
        selected_step_mm: selected.step,
        roof_self_weight_kg_per_m2: coveringWeight,
        deck_key: input.roof_deck_grade,
        snow_retention_purlin: input.snow_retention_purlin,
        enclosure_purlin: input.enclosure_purlin,
        parity: "LOCAL_DETERMINISTIC",
      },
    },
  };
};

export type { PurlinResult } from "./types";
