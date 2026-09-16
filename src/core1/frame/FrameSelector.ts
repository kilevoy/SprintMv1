import { createCore1Diagnostic } from "../diagnostics";
import type { DatasetRecord } from "../data";
import type { Core1Diagnostic, Core1ClimateResult } from "../types";
import type { FrameDatasetView, FrameSelectionResult, FrameSelectorInput } from "./types";

const FRAME_STEEL = "М.п.350";
const FRAME_TIE_UNIT_MASS_KG: Readonly<Record<9 | 12 | 15 | 18 | 21, number>> = { 9: 115, 12: 148, 15: 181, 18: 224, 21: 290 };
const SUPPORTED_SPANS = new Set([9, 12, 15, 18, 21]);
const HEIGHT_BANDS = [
  { max: 3.8, datasetHeight: 3.6 },
  { max: 5, datasetHeight: 4.8 },
  { max: 6.2, datasetHeight: 6 },
] as const;

function cellParts(cell: string): { column: string; row: number } | null {
  const match = /^([A-Z]+)(\d+)$/.exec(cell);
  return match ? { column: match[1]!, row: Number(match[2]) } : null;
}

function valueAt(records: DatasetRecord[], cell: string): unknown {
  return records.find((record) => record.cell === cell)?.cached_value_json;
}

function text(value: unknown): string | null {
  return typeof value === "string" && !value.startsWith("#") ? value : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function columnNumber(column: string): number {
  let result = 0;
  for (const character of column) result = result * 26 + character.charCodeAt(0) - 64;
  return result;
}

function columnName(value: number): string {
  let result = "";
  let current = value;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

function romanToNumber(value: string): number | null {
  const roman = value.trim().toUpperCase();
  const values: Record<string, number> = { I: 1, V: 5, X: 10 };
  if (!/^[IVX]+$/.test(roman)) return null;
  let total = 0;
  for (let index = 0; index < roman.length; index += 1) {
    const current = values[roman[index]!];
    const next = values[roman[index + 1]!];
    if (!current || (next && next > current)) total -= current ?? 0;
    else total += current ?? 0;
  }
  return total > 0 ? total : null;
}

function regionNumber(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== "string") return null;
  const numeric = Number(value.trim().replace(",", "."));
  return Number.isInteger(numeric) && numeric > 0 ? numeric : romanToNumber(value);
}

function climateBranch(climate: Core1ClimateResult): string | null {
  const snow = regionNumber(climate.snow_region);
  const wind = regionNumber(climate.wind_region);
  return snow !== null && wind !== null ? `${snow}/${wind}` : null;
}

function diagnostic(
  code: "FRAME_NO_MATCH" | "FRAME_LEGACY_NA" | "UNKNOWN_FRAME_DOMAIN" | "INVALID_FRAME_INPUT",
  severity: "unsupported" | "error" | "warning",
  message: string,
  details: Record<string, unknown>,
  excelError: "#N/A" | null = null,
): Core1Diagnostic {
  return createCore1Diagnostic({
    code,
    severity,
    classification: severity === "warning" ? "warning" : severity,
    module: "FrameSelector",
    message,
    source: ["CORE1_MODULE_SPEC.md", "core1/data/frame_selection_rules.csv"],
    legacy_equivalent: excelError,
    excel_error: excelError,
    trigger: (details.trigger as string | undefined) ?? null,
    affected_outputs: ["beam_profile", "column_profile", "frame_step_m"],
    details,
  });
}

function invalid(message: string, details: Record<string, unknown>): FrameSelectionResult {
  return { status: "invalid_input", frame: null, diagnostics: [diagnostic("INVALID_FRAME_INPUT", "error", message, details)] };
}

function findBlockStarts(records: DatasetRecord[]): string[] {
  return records
    .filter((record) => cellParts(record.cell)?.row === 3 && text(record.cached_value_json) === "с/в")
    .map((record) => cellParts(record.cell)?.column)
    .filter((column): column is string => Boolean(column));
}

function blockFactor(records: DatasetRecord[], start: string): "0.8" | "1.0" | null {
  const parts = cellParts(`${start}2`);
  if (!parts) return null;
  const value = text(valueAt(records, `${parts.column}2`));
  if (!value) return null;
  if (value.includes("0,8")) return "0.8";
  if (value.includes("1,0")) return "1.0";
  return null;
}

function selectBlock(records: DatasetRecord[], input: FrameSelectorInput, branch: string, datasetHeight: number): { start: string; row: number } | null {
  // The workbook labels the two reliability blocks opposite to the input branch
  // used by the saved baseline; retain that observed legacy mapping.
  const wantedFactor = input.responsibility_factor === 0.8 ? "1.0" : "0.8";
  for (const start of findBlockStarts(records)) {
    if (blockFactor(records, start) !== wantedFactor) continue;
    const base = columnNumber(start);
    for (let row = 6; row <= 15; row += 1) {
      const rowBranch = text(valueAt(records, `${start}${row}`));
      const height = number(valueAt(records, `${columnName(base + 1)}${row}`));
      const step = number(valueAt(records, `${columnName(base + 2)}${row}`));
      if (rowBranch === branch && height === datasetHeight && step !== null) return { start, row };
    }
  }
  return null;
}

export function selectFrame(input: FrameSelectorInput, dataset: FrameDatasetView): FrameSelectionResult {
  if (!input || !dataset || !Array.isArray(dataset.records)) return invalid("FrameSelector получил некорректный dataset или input.", {});
  if (!SUPPORTED_SPANS.has(input.span_m)) {
    if (input.span_m === 24) {
      return {
        status: "legacy_na",
        frame: null,
        diagnostics: [diagnostic("FRAME_LEGACY_NA", "unsupported", "Пролёт 24 м сохраняет активную legacy-ошибку #N/A.", { span_m: 24, trigger: "span_m=24" }, "#N/A")],
      };
    }
    return invalid("Пролёт отсутствует в типизированном домене FrameSelector.", { span_m: input.span_m });
  }
  if (!Number.isFinite(input.building_height_m) || input.building_height_m <= 0) return invalid("Высота здания должна быть положительным числом.", { building_height_m: input.building_height_m });
  if (input.frame_step_override_m !== null && input.frame_step_override_m !== undefined && (!Number.isFinite(input.frame_step_override_m) || input.frame_step_override_m <= 0)) {
    return invalid("Ручной шаг рам должен быть положительным числом или blank.", { frame_step_override_m: input.frame_step_override_m });
  }
  const branch = climateBranch(input.climate);
  if (!branch) return { status: "unknown_domain", frame: null, diagnostics: [diagnostic("UNKNOWN_FRAME_DOMAIN", "unsupported", "Районы снега/ветра не позволяют доказанно сформировать ветку рамы.", { climate: input.climate })] };
  const band = HEIGHT_BANDS.find((candidate) => input.building_height_m <= candidate.max);
  if (!band) return { status: "unknown_domain", frame: null, diagnostics: [diagnostic("UNKNOWN_FRAME_DOMAIN", "unsupported", "Высота выходит за доказанные высотные таблицы FrameSelector.", { building_height_m: input.building_height_m })] };

  const block = selectBlock(dataset.records, input, branch, band.datasetHeight);
  if (!block) return { status: "no_match", frame: null, diagnostics: [diagnostic("FRAME_NO_MATCH", "unsupported", "Для сочетания ветки климата, высоты и ответственности нет строки подбора рамы.", { branch, dataset_height_m: band.datasetHeight, responsibility_factor: input.responsibility_factor })] };
  const base = columnNumber(block.start);
  const stepColumn = columnName(base + 2);
  const rowStep = number(valueAt(dataset.records, `${stepColumn}${block.row}`));
  const requestedStep = input.frame_step_override_m ?? null;
  if (requestedStep !== null && requestedStep !== rowStep) {
    return { status: "unknown_domain", frame: null, diagnostics: [diagnostic("UNKNOWN_FRAME_DOMAIN", "unsupported", "Ручной шаг отсутствует в доказанной строке подбора рамы.", { requested_step_m: requestedStep, available_step_m: rowStep, branch })] };
  }
  const columnProfile = text(valueAt(dataset.records, `${columnName(base + 3)}${block.row}`));
  const columnUtilization = number(valueAt(dataset.records, `${columnName(base + 4)}${block.row}`));
  const beamProfile = text(valueAt(dataset.records, `${columnName(base + 5)}${block.row}`));
  const beamUtilization = number(valueAt(dataset.records, `${columnName(base + 6)}${block.row}`));
  if (!columnProfile || columnUtilization === null || !beamProfile || beamUtilization === null || rowStep === null) {
    return { status: "no_match", frame: null, diagnostics: [diagnostic("FRAME_NO_MATCH", "unsupported", "Строка рамы содержит неполные cached values.", { branch, row: block.row, start: block.start })] };
  }
  const frameMass = number(valueAt(dataset.records, `${columnName(base + 16)}${block.row}`));
  const tubeMass = number(valueAt(dataset.records, `${columnName(base + 21)}${block.row}`));
  return {
    status: "success",
    diagnostics: [],
    frame: {
      frame_step_m: rowStep,
      beam_profile: beamProfile,
      beam_steel: FRAME_STEEL,
      beam_utilization: beamUtilization,
      column_profile: columnProfile,
      column_steel: FRAME_STEEL,
      column_utilization: columnUtilization,
      frame_mass_kg: frameMass,
      frame_tie_unit_mass_kg: FRAME_TIE_UNIT_MASS_KG[input.span_m as 9 | 12 | 15 | 18 | 21] ?? null,
      tube_mass_kg_per_m2: tubeMass,
      trace: {
        selected_span_dataset: `frame_${input.span_m}m_cells`,
        selected_branch: `${block.start}${block.row}:${branch}/${band.datasetHeight}`,
        candidate_identifiers: [branch, `${band.datasetHeight}`, `${rowStep}`],
        selection_reason: requestedStep === null ? "first_match" : "manual_step_match",
      },
    },
  };
}
