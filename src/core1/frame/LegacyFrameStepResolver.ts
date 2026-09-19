import { createCore1Diagnostic } from "../diagnostics";
import type { DatasetRecord } from "../data";
import type { Core1Diagnostic, DesignSpanFamily, ResponsibilityFactor } from "../types";
import type { FrameDatasetView } from "./types";

export interface LegacyFrameStepResolverInput {
  designSpanFamily: DesignSpanFamily;
  buildingHeightM: number;
  responsibilityFactor: ResponsibilityFactor;
  legacySnowFactor: number;
  legacyFrameBranch: string;
}

export interface LegacyFrameStepTrace {
  designSpanFamily: DesignSpanFamily;
  heightLookupKeyM: number;
  factorLookupKey: number;
  legacyFrameBranch: string;
  sourceSheet: string;
  resultCell: string;
  formula: string | null;
  lookupRange: string;
  matchedRow: number;
  matchedKeyCell: string;
  matchedValueCell: string;
  selectorPath: readonly string[];
}

export interface LegacyFrameStepResult {
  status: "success";
  automaticFrameStepM: number;
  trace: LegacyFrameStepTrace;
  diagnostics: Core1Diagnostic[];
}

export interface LegacyFrameStepFailure {
  status: "unsupported" | "no_match";
  automaticFrameStepM: null;
  trace: null;
  diagnostics: Core1Diagnostic[];
}

export type LegacyFrameStepResolveResult = LegacyFrameStepResult | LegacyFrameStepFailure;

type LookupSpec = {
  heightM: number;
  factor: 0.8 | 1;
  keyColumn: string;
  valueColumn: string;
  rowStart: number;
  rowEnd: number;
  resultCell: string;
  selectorPath: readonly string[];
};

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
    return candidateFormula.shared_index === formula.shared_index && typeof candidateFormula.text === "string" && candidateFormula.text.length > 0;
  });
  const text = shared?.formula_json && typeof shared.formula_json === "object" ? (shared.formula_json as { text?: unknown }).text : null;
  return typeof text === "string" ? text : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function diagnostic(code: "UNKNOWN_FRAME_DOMAIN" | "LOOKUP_NO_MATCH", severity: "unsupported" | "error", message: string, details: Record<string, unknown>): Core1Diagnostic {
  return createCore1Diagnostic({
    code,
    severity,
    classification: severity,
    module: "LegacyFrameStepResolver",
    message,
    source: ["подбор!AA14", "подбор!I2:I7", "frame_*m_cells.csv"],
    affected_outputs: ["frame_step_m", "beam_profile", "column_profile", "kg_per_m2"],
    details,
  });
}

function heightKey(family: DesignSpanFamily, heightM: number): number | null {
  if (!Number.isFinite(heightM) || heightM <= 0 || heightM > 6.2) return null;
  if (family === 24) return 6;
  if (heightM <= 3.8) return 3.6;
  if (heightM <= 5) return 4.8;
  return 6;
}

function lookupSpec(family: DesignSpanFamily, heightM: number, factor: 0.8 | 1): LookupSpec | null {
  if (family === 24) {
    const rows: Record<number, { factor1: [string, string, string]; factor08: [string, string, string] }> = {
      6: { factor1: ["A", "C", "AF12"], factor08: ["AK", "AM", "BO12"] },
      7: { factor1: ["BT", "BV", "CX12"], factor08: ["DC", "DE", "EG12"] },
      8: { factor1: ["EL", "EN", "FP12"], factor08: ["FU", "FW", "GY12"] },
      9: { factor1: ["HD", "HF", "IH12"], factor08: ["IM", "IO", "JQ12"] },
    };
    const row = rows[heightM];
    if (!row) return null;
    const [keyColumn, valueColumn, resultCell] = factor === 1 ? row.factor1 : row.factor08;
    return { heightM, factor, keyColumn, valueColumn, resultCell, rowStart: 6, rowEnd: 30, selectorPath: [`24м!KS19`, factor === 1 ? "24м!KS6" : "24м!KS14", `24м!${resultCell}`, `24м!${valueColumn}6:${valueColumn}30`, `24м!${keyColumn}6:${keyColumn}30`] };
  }
  const rows: Record<number, { factor1: [string, string, string]; factor08: [string, string, string] }> = {
    3.6: { factor1: ["B", "D", "AG12"], factor08: ["AL", "AN", "BQ12"] },
    4.8: { factor1: ["BV", "BX", "DA12"], factor08: ["DF", "DH", "EK12"] },
    6: { factor1: ["EP", "ER", "FU12"], factor08: ["FZ", "GB", "HE12"] },
  };
  const row = rows[heightM];
  if (!row) return null;
  const [keyColumn, valueColumn, resultCell] = factor === 1 ? row.factor1 : row.factor08;
  return { heightM, factor, keyColumn, valueColumn, resultCell, rowStart: 6, rowEnd: 15, selectorPath: [`${family}м!${resultCell}`, `${family}м!${valueColumn}6:${valueColumn}15`, `${family}м!${keyColumn}6:${keyColumn}15`] };
}

export function resolveLegacyFrameStep(input: LegacyFrameStepResolverInput, dataset: FrameDatasetView): LegacyFrameStepResolveResult {
  const height = heightKey(input.designSpanFamily, input.buildingHeightM);
  const factor = input.legacySnowFactor === 1 || input.legacySnowFactor === 0.8 ? input.legacySnowFactor : null;
  if (height === null || factor === null) {
    return { status: "unsupported", automaticFrameStepM: null, trace: null, diagnostics: [diagnostic("UNKNOWN_FRAME_DOMAIN", "unsupported", "Вход выходит за доказанный generic D8 lookup domain.", { design_span_family: input.designSpanFamily, building_height_m: input.buildingHeightM, legacy_snow_factor: input.legacySnowFactor })] };
  }
  const spec = lookupSpec(input.designSpanFamily, height, factor);
  if (!spec) return { status: "unsupported", automaticFrameStepM: null, trace: null, diagnostics: [diagnostic("UNKNOWN_FRAME_DOMAIN", "unsupported", "Для семейства и высоты нет доказанной D8 таблицы.", { design_span_family: input.designSpanFamily, height_lookup_key_m: height })] };
  for (let row = spec.rowStart; row <= spec.rowEnd; row += 1) {
    const keyCell = `${spec.keyColumn}${row}`;
    if (valueAt(dataset.records, keyCell) !== input.legacyFrameBranch) continue;
    const valueCell = `${spec.valueColumn}${row}`;
    const step = number(valueAt(dataset.records, valueCell));
    if (step === null || step <= 0) break;
    return {
      status: "success",
      automaticFrameStepM: step,
      trace: {
        designSpanFamily: input.designSpanFamily,
        heightLookupKeyM: height,
        factorLookupKey: factor,
        legacyFrameBranch: input.legacyFrameBranch,
        sourceSheet: dataset.records.find((record) => record.cell === valueCell)?.source_sheet ?? `${input.designSpanFamily}м`,
        resultCell: input.designSpanFamily === 24 ? "KS19" : spec.resultCell,
        formula: formulaAt(dataset.records, input.designSpanFamily === 24 ? "KS19" : spec.resultCell),
        lookupRange: `${spec.keyColumn}${spec.rowStart}:${spec.keyColumn}${spec.rowEnd} → ${spec.valueColumn}${spec.rowStart}:${spec.valueColumn}${spec.rowEnd}`,
        matchedRow: row,
        matchedKeyCell: keyCell,
        matchedValueCell: valueCell,
        selectorPath: spec.selectorPath,
      },
      diagnostics: [],
    };
  }
  return { status: "no_match", automaticFrameStepM: null, trace: null, diagnostics: [diagnostic("LOOKUP_NO_MATCH", "error", "D8 lookup не нашёл legacy frame branch.", { design_span_family: input.designSpanFamily, height_lookup_key_m: height, factor_lookup_key: factor, legacy_frame_branch: input.legacyFrameBranch, lookup_range: `${spec.keyColumn}${spec.rowStart}:${spec.keyColumn}${spec.rowEnd}` })] };
}
