import { createCore1Diagnostic } from "../diagnostics";
import type { DatasetRecord } from "../data";
import type { WindowGirtInput, WindowGirtDatasetBundle, WindowGirtResolveResult, WindowCandidate } from "./types";

const TYPE_COEFFICIENTS = {
  1: { moment: 0.125, length: 1, deflection: 1 },
  2: { moment: 0.055, length: 5 / 6, deflection: 0.13 },
  3: { moment: 0.062, length: 0.33, deflection: 0.24 },
  4: { moment: 0.078, length: 0.5, deflection: 0.5 },
  5: { moment: 0.073, length: 0.75, deflection: 0.2 },
} as const;

function valueAt(records: DatasetRecord[], cell: string): unknown {
  return records.find((record) => record.cell === cell)?.cached_value_json;
}

function numberAt(records: DatasetRecord[], cell: string): number | null {
  const value = valueAt(records, cell);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textAt(records: DatasetRecord[], cell: string): string | null {
  const value = valueAt(records, cell);
  return typeof value === "string" && value.length > 0 ? value : null;
}

function thicknessFromProfile(profile: string): number | null {
  const values = profile.replace(/90°\s*$/u, "").replace(/,/g, ".").match(/(\d+(?:\.\d+)?)$/u);
  return values ? Number(values[1]) : null;
}

function geometryFromProfile(profile: string): { height_mm: number; width_mm: number; thickness_mm: number } | null {
  const numbers = profile.replace(/90°\s*$/u, "").replace(/,/g, ".").match(/\d+(?:\.\d+)?/gu)?.map(Number) ?? [];
  if (numbers.length >= 3) return { height_mm: numbers[0]!, width_mm: numbers[1]!, thickness_mm: numbers[2]! };
  if (numbers.length >= 2) return { height_mm: numbers[0]!, width_mm: numbers[0]!, thickness_mm: numbers[1]! };
  return null;
}

function candidates(bundle: WindowGirtDatasetBundle): WindowCandidate[] {
  type PartialWindowCandidate = { row: number; steel?: string | undefined; ry_mpa?: number | undefined; profile?: string | undefined; height_mm?: number | undefined; width_mm?: number | undefined; area_cm2?: number | undefined; mass_kg_m?: number | undefined };
  const rows = new Map<number, PartialWindowCandidate>();
  for (const record of bundle.profileCandidates.records) {
    const match = /^([PQRSTXY])(\d+)$/.exec(record.cell);
    if (!match) continue;
    const row = Number(match[2]);
    const entry = rows.get(row) ?? { row };
    switch (match[1]) {
      case "P": entry.steel = textAt(bundle.profileCandidates.records, record.cell) ?? undefined; break;
      case "Q": entry.ry_mpa = numberAt(bundle.profileCandidates.records, record.cell) ?? undefined; break;
      case "R": entry.profile = textAt(bundle.profileCandidates.records, record.cell) ?? undefined; break;
      case "S": entry.height_mm = numberAt(bundle.profileCandidates.records, record.cell) ?? undefined; break;
      case "T": entry.width_mm = numberAt(bundle.profileCandidates.records, record.cell) ?? undefined; break;
      case "X": entry.area_cm2 = numberAt(bundle.profileCandidates.records, record.cell) ?? undefined; break;
      case "Y": entry.mass_kg_m = numberAt(bundle.profileCandidates.records, record.cell) ?? undefined; break;
    }
    rows.set(row, entry);
  }
  return [...rows.values()].filter((entry): entry is WindowCandidate =>
    Number.isInteger(entry.row) && typeof entry.steel === "string" && typeof entry.ry_mpa === "number"
    && typeof entry.profile === "string" && typeof entry.height_mm === "number" && typeof entry.width_mm === "number"
    && typeof entry.area_cm2 === "number" && typeof entry.mass_kg_m === "number" && entry.mass_kg_m > 0,
  ).sort((a, b) => a.row - b.row);
}

function sectionProperties(candidate: WindowCandidate) {
  const parsed = geometryFromProfile(candidate.profile);
  const thickness = parsed?.thickness_mm ?? thicknessFromProfile(candidate.profile);
  const h = parsed?.height_mm ?? candidate.height_mm;
  const b = parsed?.width_mm ?? candidate.width_mm;
  if (!thickness || thickness <= 0 || h <= 2 * thickness || b <= 2 * thickness) return null;
  const ix = (b * h ** 3 - (b - 2 * thickness) * (h - 2 * thickness) ** 3) / 12 / 1e4;
  const iy = (h * b ** 3 - (h - 2 * thickness) * (b - 2 * thickness) ** 3) / 12 / 1e4;
  return { ix, iy, wx: ix / (h / 2 / 10), wy: iy / (b / 2 / 10) };
}

function glazingLoad(construction: string): number {
  const normalized = construction.toLowerCase();
  if (normalized.includes("3")) return 0.54;
  if (normalized.includes("1")) return 0.30;
  return 0.42;
}

function diagnostic(code: "INVALID_INPUT" | "NO_ELIGIBLE_PROFILE", message: string, details: Record<string, unknown>) {
  return createCore1Diagnostic({
    code,
    severity: code === "INVALID_INPUT" ? "error" : "unsupported",
    classification: code === "INVALID_INPUT" ? "error" : "unsupported",
    module: "WindowGirtCalculator",
    message,
    source: ["Расчет!P4:AX413", "CORE1_WINDOW_BRANCH_AUDIT.md"],
    details,
  });
}

export function calculateWindowGirts(input: WindowGirtInput, bundle: WindowGirtDatasetBundle): WindowGirtResolveResult {
  const windows = input.windows;
  if (!windows.enabled) {
    return { status: "invalid_input", windowGirts: null, diagnostics: [diagnostic("INVALID_INPUT", "WindowGirtCalculator вызван при отключённых окнах.", { enabled: false })] };
  }
  const coefficients = TYPE_COEFFICIENTS[windows.window_type];
  const frameStep = input.frame.frame_step_m;
  const schemeFactor = input.scheme_factor ?? 1;
  const utilizationLimit = input.utilization_limit ?? 0.85;
  const glazing = glazingLoad(windows.glazing_construction);
  const wind = input.climate.wind_load ?? 0;
  const windLower = wind * schemeFactor;
  const windUpper = wind * schemeFactor;
  const d8 = glazing;
  const f8 = d8 / 1.2;
  const g8 = 0.125;
  const lowerLoad = (d8 * windows.window_height_m + 0.6 * 0.32 * 0.5) * frameStep ** 2 * coefficients.moment;
  const upperLoad = (0.6 * 0.32 * 0.5) * frameStep ** 2 * coefficients.moment;
  const lowerWindLoad = (windLower * (windows.window_height_m + 1.2) / 2) * frameStep ** 2 * g8;
  const upperWindLoad = (windUpper * (windows.window_height_m + 1.2) / 2) * frameStep ** 2 * g8;
  const deflectionLower = f8 * windows.window_height_m + 0.6 * 0.3 * 0.5;
  const deflectionUpper = 0.6 * 0.3 * 0.5;
  const effectiveLength = frameStep * coefficients.length;
  const all = candidates(bundle);
  const evaluated = all.map((candidate, index) => {
    const props = sectionProperties(candidate);
    if (!props) return null;
    const slenderness = Math.max(frameStep * 100 / props.wx, effectiveLength * 100 / props.wy) / 200;
    const strengthLower = ((lowerLoad + candidate.mass_kg_m * frameStep ** 2 * g8 / 100) / (props.wx / 1e6) + lowerWindLoad / (props.wy / 1e6)) / 1000 / (candidate.ry_mpa * 1);
    const strengthUpper = ((upperLoad + candidate.mass_kg_m * frameStep ** 2 * g8 / 100) / (props.wx / 1e6) + upperWindLoad / (props.wy / 1e6)) / 1000 / (candidate.ry_mpa * 1);
    const deflectionLowerUtil = Math.max(
      (5 / 384 * (deflectionLower + candidate.mass_kg_m / 100) * frameStep ** 4 / (2.06e8 * props.ix / 1e8)) / (frameStep / 300) * coefficients.deflection,
      (5 / 384 * (deflectionLower) * frameStep ** 4 / (2.06e8 * props.iy / 1e8)) / (frameStep / 200),
    );
    const deflectionUpperUtil = Math.max(
      (5 / 384 * (deflectionUpper + candidate.mass_kg_m / 100) * frameStep ** 4 / (2.06e8 * props.ix / 1e8)) / (frameStep / 300) * coefficients.deflection,
      (5 / 384 * (deflectionUpper) * frameStep ** 4 / (2.06e8 * props.iy / 1e8)) / (frameStep / 200),
    );
    return { candidate, index, lowerUtil: Math.max(slenderness, strengthLower, deflectionLowerUtil), upperUtil: Math.max(slenderness, strengthUpper, deflectionUpperUtil) };
  }).filter((value): value is NonNullable<typeof value> => value !== null && Number.isFinite(value.lowerUtil) && Number.isFinite(value.upperUtil));
  const lower = evaluated.filter((value) => value.lowerUtil <= utilizationLimit).sort((a, b) => a.candidate.mass_kg_m - b.candidate.mass_kg_m || a.index - b.index)[0];
  const upper = evaluated.filter((value) => value.upperUtil <= utilizationLimit).sort((a, b) => a.candidate.mass_kg_m - b.candidate.mass_kg_m || a.index - b.index)[0];
  if (!lower || !upper) {
    return { status: "no_match", windowGirts: null, diagnostics: [diagnostic("NO_ELIGIBLE_PROFILE", "Для оконной ветки нет допустимого локального кандидата.", { lower_candidates: lower ? 1 : 0, upper_candidates: upper ? 1 : 0 })] };
  }
  const lowerMass = lower.candidate.mass_kg_m * frameStep;
  const upperMass = upper.candidate.mass_kg_m * (windows.window_height_m * 2 + frameStep);
  const totalMass = (lowerMass + upperMass) * windows.separate_window_count;
  return {
    status: "success",
    diagnostics: [],
    windowGirts: {
      lower_girt_profile: lower.candidate.profile,
      lower_girt_steel: lower.candidate.steel,
      lower_girt_utilization: lower.lowerUtil,
      upper_girt_profile: upper.candidate.profile,
      upper_girt_steel: upper.candidate.steel,
      upper_girt_utilization: upper.upperUtil,
      lower_girt_mass_kg_per_m: lower.candidate.mass_kg_m,
      upper_girt_mass_kg_per_m: upper.candidate.mass_kg_m,
      window_girts_weight_kg: totalMass,
      trace: {
        window_type: windows.window_type,
        normative_system: input.climate.normative_system,
        wind_branch: input.climate.normative_system,
        wind_intermediate: { wind_load_kpa: wind, lower_wind_load_kpa: windLower, upper_wind_load_kpa: windUpper },
        glazing_load_kpa: glazing,
        scheme_factor: schemeFactor,
        utilization_limit: utilizationLimit,
        lower_load: lowerLoad + lowerWindLoad,
        upper_load: upperLoad + upperWindLoad,
        lower_candidates: evaluated.filter((value) => value.lowerUtil <= utilizationLimit).length,
        upper_candidates: evaluated.filter((value) => value.upperUtil <= utilizationLimit).length,
        selected_lower_row: lower.candidate.row,
        selected_upper_row: upper.candidate.row,
        mass_components: { lower_kg: lowerMass * windows.separate_window_count, upper_kg: upperMass * windows.separate_window_count, total_kg: totalMass },
      },
    },
  };
}

export { TYPE_COEFFICIENTS };
