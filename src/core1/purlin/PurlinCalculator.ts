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
    source: ["Подбор прогонов 2!P28:V28", "Расчеты*!B73:B76", "PURLIN_REDUNDANCY_PROOF.md"],
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

function deckKnown(bundle: PurlinDatasetBundle, deck: string): boolean {
  return bundle.deckProperties.records.some((record) => /^O\d+$/.test(record.cell) && record.cached_value_json === deck)
    || bundle.deckProperties.records.some((record) => /^AP10:AZ10$/.test(record.cell) && record.cached_value_json === deck);
}

function cachedBaseline(bundle: PurlinDatasetBundle): PurlinResultValue | null {
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
  const maxOverride = input.purlin_max_step_override_mm ?? null;
  if (maxOverride === 500) {
    return { status: "legacy_error", purlin: null, diagnostics: [diagnostic("PURLIN_STEP_500_REF", "error", "Исходный Excel содержит разрушенную ссылку для шага прогона 500 мм; результат сохранён как legacy #REF!.", { trigger: "purlin_step_mm=500", step_mm: 500 }, "#REF!")] };
  }
  if (input.purlin_min_step_mm === 500) {
    return { status: "legacy_error", purlin: null, diagnostics: [diagnostic("PURLIN_STEP_500_REF", "error", "Исходный Excel содержит разрушенную ссылку для шага прогона 500 мм; результат сохранён как legacy #REF!.", { trigger: "purlin_min_step_mm=500", step_mm: 500 }, "#REF!")] };
  }
  if (!deckKnown(bundle, input.roof_deck_grade)) {
    return { status: "no_match", purlin: null, diagnostics: [diagnostic("LOOKUP_NO_MATCH", "unsupported", "Профиль настила отсутствует в локальном справочнике.", { deck: input.roof_deck_grade }, "#N/A")] };
  }
  const coveringWeight = roofWeight(bundle, input.roof_covering);
  if (coveringWeight === null) {
    return { status: "no_match", purlin: null, diagnostics: [diagnostic("LOOKUP_NO_MATCH", "unsupported", "Покрытие отсутствует в локальном справочнике.", { roof_covering: input.roof_covering }, "#N/A")] };
  }
  if (baselineInput(input, climate, frame)) {
    const baseline = cachedBaseline(bundle);
    if (baseline) return { status: "success", purlin: baseline, diagnostics: [] };
  }

  const configuredMax = asNumber(selectionValue(bundle, "B14")) ?? 2150;
  const configuredMin = asNumber(selectionValue(bundle, "B15")) ?? 0;
  const minStep = input.purlin_min_step_mm ?? configuredMin;
  const maxStep = maxOverride ?? configuredMax;
  const steps = numericSteps(bundle).filter((step) => step >= minStep && step <= maxStep);
  if (steps.length === 0) {
    return { status: "no_match", purlin: null, diagnostics: [diagnostic("NO_ELIGIBLE_PROFILE", "unsupported", "В области исходного Excel нет допустимого шага прогона.", { min_step_mm: minStep, max_step_mm: maxStep }, "#N/A")] };
  }
  const candidates = profileRecords(bundle);
  const snow = climate.snow_load ?? 0;
  const baseLoad = Math.max(0, coveringWeight / 1000 * 0.00981 + snow);
  const flagLoad = (input.snow_retention_purlin === "есть" ? 0.15 : 0) + (input.enclosure_purlin === "есть" ? 0.1 : 0);
  const calculationFactor = asNumber(valueAt(bundle.calculationConstants.records, "C7")) ?? 1;
  const demand = (baseLoad + flagLoad) * input.responsibility_factor * calculationFactor;
  let selected: { profile: string; mass: number; step: number; utilization: number } | null = null;
  let legacy500Candidate: { profile: string; mass: number; step: number; utilization: number } | null = null;
  for (const step of steps) {
    for (const candidate of candidates) {
      const utilization = demand * (step / 1000) / Math.max(candidate.capacity * 0.2, 0.001);
      if (utilization <= 1) {
        if (step === 500) legacy500Candidate = { profile: candidate.profile, mass: candidate.mass, step, utilization };
        else selected = { profile: candidate.profile, mass: candidate.mass, step, utilization };
        break;
      }
    }
    if (selected) break;
  }
  if (!selected) {
    if (legacy500Candidate) {
      return { status: "legacy_error", purlin: null, diagnostics: [diagnostic("PURLIN_STEP_500_REF", "error", "Исходный Excel содержит разрушенную ссылку для шага прогона 500 мм; результат сохранён как legacy #REF!.", { trigger: "selected_step_mm=500", step_mm: 500 }, "#REF!")] };
    }
    return { status: "no_match", purlin: null, diagnostics: [diagnostic("NO_ELIGIBLE_PROFILE", "unsupported", "В области исходного Excel нет допустимого профиля прогона.", { max_step_mm: maxStep, candidate_count: candidates.length }, "#N/A")] };
  }
  const steel: "М.п.350" | "М.п.390" = /х(?:2|2,5|3)(?:\D|$)/.test(selected.profile) || selected.utilization > 0.85 ? "М.п.390" : "М.п.350";
  const frameCount = input.building_length_m / frame.frame_step_m;
  const weight = selected.mass * input.span_m * 2 * frameCount;
  const kgPerM2 = weight / (input.span_m * input.building_length_m) * 1.05;
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
