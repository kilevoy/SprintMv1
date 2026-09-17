import { createCore1Diagnostic } from "../diagnostics";
import type { DatasetRecord } from "../data";
import { LEGACY_CLIMATE_CLASSIFICATION, LEGACY_ROOF_CORRECTIONS } from "./data";
import type { LegacyClimateDeriverInput, LegacyClimateResult, LegacyScalar } from "./types";

function cellParts(cell: string): { column: string; row: number } | null {
  const match = /^([A-Z]+)(\d+)$/.exec(cell);
  return match ? { column: match[1]!, row: Number(match[2]) } : null;
}

function valueAt(records: DatasetRecord[], cell: string): unknown {
  return records.find((record) => record.cell === cell)?.cached_value_json;
}

function formulaAt(records: DatasetRecord[], cell: string): string | null {
  const record = records.find((candidate) => candidate.cell === cell);
  if (!record || !record.formula_json || typeof record.formula_json !== "object") return null;
  const formula = record.formula_json as { text?: unknown; shared_index?: unknown };
  if (typeof formula.text === "string" && formula.text.length > 0) return formula.text;
  if (typeof formula.shared_index !== "string") return null;
  const shared = records.find((candidate) => {
    if (!candidate.formula_json || typeof candidate.formula_json !== "object") return false;
    const candidateFormula = candidate.formula_json as { text?: unknown; shared_index?: unknown };
    return candidateFormula.shared_index === formula.shared_index
      && typeof candidateFormula.text === "string"
      && candidateFormula.text.length > 0;
  });
  if (!shared || !shared.formula_json || typeof shared.formula_json !== "object") return null;
  const sharedText = (shared.formula_json as { text?: unknown }).text;
  return typeof sharedText === "string" ? sharedText : null;
}

function cityRow(records: DatasetRecord[], city: string): number | null {
  for (const record of records) {
    const parts = cellParts(record.cell);
    if (parts && (parts.column === "B" || parts.column === "AR") && record.cached_value_json === city) return parts.row;
  }
  return null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function errorDiagnostic(message: string, details: Record<string, unknown>) {
  return createCore1Diagnostic({
    code: "UNSUPPORTED_FOR_PARITY",
    severity: "unsupported",
    classification: "unsupported",
    module: "LegacyClimateDeriver",
    message,
    source: ["снегветер!E:M", "снегветер!AM:AO", "снегветер!AB:AH"],
    details,
  });
}

function excelApproximateMatch(lookupKey: number, values: readonly number[]): number | null {
  if (!Number.isFinite(lookupKey) || values.length === 0 || values.some((value) => !Number.isFinite(value))) return null;
  let low = 0;
  let high = values.length - 1;
  let result = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = values[middle]!;
    if (candidate <= lookupKey) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result >= 0 ? result : null;
}

export function legacyApproximateMatch(lookupKey: number): number | null {
  return excelApproximateMatch(lookupKey, LEGACY_CLIMATE_CLASSIFICATION.map((row) => row.lookup_key));
}

export function deriveLegacyClimate(input: LegacyClimateDeriverInput): LegacyClimateResult | null {
  const row = cityRow(input.dataset.records, input.city);
  if (row === null) return null;
  const records = input.dataset.records;
  const c = valueAt(records, `C${row}`);
  const d = valueAt(records, `D${row}`);
  const e = valueAt(records, `E${row}`);
  const f = valueAt(records, `F${row}`);
  const g = valueAt(records, `G${row}`);
  const h = valueAt(records, `H${row}`);
  const eFormula = formulaAt(records, `E${row}`);
  const cIsBlank = c === null || c === undefined || c === "";
  const activeE = eFormula?.toUpperCase().includes("IF(C")
    ? (cIsBlank ? number(g) : number(d) === null ? null : number(d)! * 0.7)
    : number(e) ?? (cIsBlank ? number(g) : number(d) === null ? null : number(d)! * 0.7);
  const roof = LEGACY_ROOF_CORRECTIONS.find((candidate) => candidate.roof_covering === input.roof_covering);
  if (activeE === null || !roof || (typeof h !== "string" && typeof h !== "number")) return null;
  const lookupKey = activeE + roof.correction;
  const match = legacyApproximateMatch(lookupKey);
  if (match === null) return null;
  const classification = LEGACY_CLIMATE_CLASSIFICATION[match];
  if (!classification) return null;
  const activeSnowRegion: LegacyScalar = input.responsibility_factor === 0.8 ? classification.l_region : classification.j_region;
  const activeSnowFactor: LegacyScalar = input.responsibility_factor === 0.8 ? classification.m_factor : classification.k_factor;
  const diagnostics = (typeof activeSnowRegion === "string" && activeSnowRegion.startsWith("уточнить"))
    ? [errorDiagnostic("Legacy lookup возвращает текстовую строку превышения диапазона.", { city: input.city, row, lookupKey, source_row: classification.source_row })]
    : [];
  return {
    effectiveSnowLoad: activeE,
    roofCorrection: roof.correction,
    lookupKey,
    jRegion: classification.j_region,
    kFactor: classification.k_factor,
    lRegion: classification.l_region,
    mFactor: classification.m_factor,
    activeSnowRegion,
    activeSnowFactor,
    windRegion: h,
    city: input.city,
    sourceRow: row,
    diagnostics,
  };
}
