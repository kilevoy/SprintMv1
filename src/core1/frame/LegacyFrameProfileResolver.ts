import { createCore1Diagnostic } from "../diagnostics";
import type { DatasetRecord } from "../data";
import type { Core1Diagnostic, DesignSpanFamily } from "../types";

export interface LegacyFrameProfileResolverInput {
  designSpanFamily: DesignSpanFamily;
  buildingHeightM: number;
  legacySnowFactor: number;
  legacyFrameBranch: string;
}

export interface LegacyFrameProfileTrace {
  dataset: string;
  selectorCell: string;
  selectorValue: number;
  selectorRange: string;
  matchedSelectorRow: number;
  heightKey: number;
  heightSelectorCell: string;
  heightSelectorRange: string;
  heightMatchedRow: number;
  columnSourceCell: string;
  beamSourceCell: string;
  frameMassSourceCell: string;
  formulas: Record<string, string | null>;
  lookupPath: string[];
}

export interface LegacyFrameProfileSelection {
  beamProfile: string;
  columnProfile: string;
  frameMassKg: number;
  trace: LegacyFrameProfileTrace;
}

export type LegacyFrameProfileResolveStatus = "success" | "unsupported" | "no_match";

export interface LegacyFrameProfileResolveResult {
  status: LegacyFrameProfileResolveStatus;
  profile: LegacyFrameProfileSelection | null;
  diagnostics: Core1Diagnostic[];
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
    return candidateFormula.shared_index === formula.shared_index && typeof candidateFormula.text === "string" && candidateFormula.text.length > 0;
  });
  if (!shared || !shared.formula_json || typeof shared.formula_json !== "object") return null;
  const text = (shared.formula_json as { text?: unknown }).text;
  if (typeof text !== "string") return null;
  const target = cellParts(cell);
  const anchor = cellParts(shared.cell);
  if (!target || !anchor) return text;
  const rowShift = target.row - anchor.row;
  return text.replace(/(\$?[A-Z]{1,3})(\$?)(\d+)/g, (_match, column: string, absoluteRow: string, rowText: string) => {
    const row = Number(rowText);
    return `${column}${absoluteRow}${absoluteRow ? row : row + rowShift}`;
  });
}

function cellParts(cell: string): { column: string; row: number } | null {
  const match = /^([A-Z]+)(\d+)$/.exec(cell.replace(/\$/g, ""));
  return match ? { column: match[1]!, row: Number(match[2]) } : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && !value.startsWith("#") ? value : null;
}

function heightKey(heightM: number): number | null {
  if (!Number.isFinite(heightM) || heightM <= 0 || heightM > 6.2) return null;
  if (heightM <= 3.8) return 3.6;
  if (heightM <= 5) return 4.8;
  return 6;
}

function diagnostic(message: string, details: Record<string, unknown>): Core1Diagnostic {
  return createCore1Diagnostic({
    code: "UNSUPPORTED_FOR_PARITY",
    severity: "unsupported",
    classification: "unsupported",
    module: "LegacyFrameProfileResolver",
    message,
    source: ["9м!HZ18", "9м!HZ5", "9м!IA19", "9м!IB19", "9м!IE19", "frame_*_cells.csv"],
    details,
    affected_outputs: ["beam_profile", "column_profile", "frame_mass_kg"],
  });
}

function rangeParts(range: string): { start: string; end: string } | null {
  const match = /^\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)$/.exec(range.trim());
  return match ? { start: `${match[1]}${match[2]}`, end: `${match[3]}${match[4]}` } : null;
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

function cellsInRange(range: string): string[] | null {
  const parts = rangeParts(range);
  if (!parts) return null;
  const start = cellParts(parts.start);
  const end = cellParts(parts.end);
  if (!start || !end || start.column !== end.column || end.row < start.row) return null;
  return Array.from({ length: end.row - start.row + 1 }, (_, offset) => `${start.column}${start.row + offset}`);
}

function normalizeRef(value: string): string {
  return value.trim().replace(/^[^!]+!/, "").replace(/\$/g, "");
}

function parseIndexMatch(formula: string): { resultRange: string; lookupRef: string; matchRange: string } | null {
  const match = /^=?INDEX\(([^,]+),MATCH\(([^,]+),([^,]+),0\)\)$/i.exec(formula.trim());
  if (!match) return null;
  return { resultRange: normalizeRef(match[1]!), lookupRef: normalizeRef(match[2]!), matchRange: normalizeRef(match[3]!) };
}

function numericExpression(expression: string): number | null {
  const matchedTokens = expression.match(/\d+(?:\.\d+)?|[()+\-*/]/g);
  if (!matchedTokens || matchedTokens.join("") !== expression.replace(/\s+/g, "")) return null;
  const tokens = matchedTokens;
  let position = 0;
  const primary = (): number | null => {
    const token = tokens[position];
    if (token === "(") {
      position += 1;
      const value = additive();
      if (tokens[position] !== ")") return null;
      position += 1;
      return value;
    }
    if (token === "+" || token === "-") {
      position += 1;
      const value = primary();
      return value === null ? null : token === "-" ? -value : value;
    }
    if (!token || !/^\d/.test(token)) return null;
    position += 1;
    return Number(token);
  };
  const multiplicative = (): number | null => {
    let value = primary();
    while (value !== null && (tokens[position] === "*" || tokens[position] === "/")) {
      const operator = tokens[position++];
      const right = primary();
      if (right === null || (operator === "/" && right === 0)) return null;
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };
  function additive(): number | null {
    let value = multiplicative();
    while (value !== null && (tokens[position] === "+" || tokens[position] === "-")) {
      const operator = tokens[position++];
      const right = multiplicative();
      if (right === null) return null;
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }
  const result = additive();
  return result !== null && position === tokens.length && Number.isFinite(result) ? result : null;
}

function sameValue(left: unknown, right: unknown): boolean {
  if (typeof left === "number" && typeof right === "number") return left === right;
  return String(left) === String(right);
}

function resolveCell(
  records: DatasetRecord[],
  cell: string,
  overrides: Readonly<Record<string, unknown>>,
  stack: readonly string[] = [],
): unknown {
  const normalized = normalizeRef(cell);
  if (normalized in overrides) return overrides[normalized];
  if (stack.includes(normalized)) return undefined;
  const record = records.find((candidate) => candidate.cell === normalized);
  if (!record) return undefined;
  const formula = formulaAt(records, normalized);
  if (!formula) return record.cached_value_json;
  const direct = /^=?([A-Z]+\d+)$/i.exec(formula.trim());
  if (direct) {
    const directResult = resolveCell(records, direct[1]!, overrides, [...stack, normalized]);
    return directResult;
  }
  const sum = /^=?SUM\(([^)]+)\)$/i.exec(formula.trim());
  if (sum) {
    const values = sum[1]!.split(",").map((part) => number(resolveCell(records, part.trim(), overrides, [...stack, normalized])));
    return values.every((value): value is number => value !== null) ? values.reduce((total, value) => total + value, 0) : undefined;
  }
  const arithmetic = formula.trim().replace(/^=/, "").replace(/([A-Z]+\d+)/gi, (ref) => {
    const resolved = number(resolveCell(records, ref, overrides, [...stack, normalized]));
    return resolved === null ? ref : String(resolved);
  });
  const arithmeticValue = numericExpression(arithmetic);
  if (arithmeticValue !== null) return arithmeticValue;
  const indexMatch = parseIndexMatch(formula);
  if (!indexMatch) return undefined;
  const lookupValue = resolveCell(records, indexMatch.lookupRef, overrides, [...stack, normalized]);
  const matchCells = cellsInRange(indexMatch.matchRange);
  const resultCells = cellsInRange(indexMatch.resultRange);
  if (!matchCells || !resultCells || matchCells.length !== resultCells.length) return undefined;
  const matchIndex = matchCells.findIndex((candidate) => sameValue(resolveCell(records, candidate, overrides, [...stack, normalized]), lookupValue));
  const result = matchIndex < 0 ? undefined : resolveCell(records, resultCells[matchIndex]!, overrides, [...stack, normalized]);
  return result;
}

function selectedRow(records: DatasetRecord[], factor: number): number | null {
  for (let row = 6; row <= 14; row += 1) {
    if (sameValue(valueAt(records, `HZ${row}`), factor)) return row;
  }
  return null;
}

function heightRow(records: DatasetRecord[], startRow: number, height: number): number | null {
  for (let row = startRow; row <= startRow + 2; row += 1) {
    if (sameValue(valueAt(records, `HJ${row}`), height)) return row;
  }
  return null;
}

export function resolveLegacyFrameProfile(input: LegacyFrameProfileResolverInput, dataset: { records: DatasetRecord[] }): LegacyFrameProfileResolveResult {
  if (![9, 12, 15].includes(input.designSpanFamily)) {
    return { status: "unsupported", profile: null, diagnostics: [diagnostic("Profile resolver is proven only for 9 m, 12 m and 15 m families.", { design_span_family: input.designSpanFamily })] };
  }
  const key = heightKey(input.buildingHeightM);
  if (key === null || (input.legacySnowFactor !== 0.8 && input.legacySnowFactor !== 1)) {
    return { status: "unsupported", profile: null, diagnostics: [diagnostic("Profile resolver input is outside the proven legacy lookup domain.", { design_span_family: input.designSpanFamily, building_height_m: input.buildingHeightM, legacy_snow_factor: input.legacySnowFactor })] };
  }
  const records = dataset.records;
  const selectorRow = selectedRow(records, input.legacySnowFactor);
  if (selectorRow === null) {
    return { status: "no_match", profile: null, diagnostics: [diagnostic("HZ18 snow-factor selector has no exact matching row.", { legacy_snow_factor: input.legacySnowFactor, selector_range: "HZ6:HZ14" })] };
  }
  const selectedColumnRow = selectorRow <= 9 ? 6 : 14;
  const heightRowNumber = heightRow(records, selectedColumnRow === 6 ? 7 : 15, key);
  if (heightRowNumber === null) {
    return { status: "no_match", profile: null, diagnostics: [diagnostic("Profile height lookup has no exact matching row.", { height_key: key, height_range: selectedColumnRow === 6 ? "HJ7:HJ9" : "HJ15:HJ17" })] };
  }
  const overrides = { HZ18: input.legacySnowFactor, HZ5: key, HZ13: key, AE5: input.legacyFrameBranch, BO5: input.legacyFrameBranch, CY5: input.legacyFrameBranch, EI5: input.legacyFrameBranch, HC5: input.legacyFrameBranch };
  const columnCell = `IA${selectorRow}`;
  const beamCell = `IB${selectorRow}`;
  const massCell = `IE${selectorRow}`;
  const columnProfile = text(resolveCell(records, columnCell, overrides));
  const beamProfile = text(resolveCell(records, beamCell, overrides));
  const frameMassKg = number(resolveCell(records, massCell, overrides));
  if (!columnProfile || !beamProfile || frameMassKg === null) {
    return { status: "no_match", profile: null, diagnostics: [diagnostic("Profile lookup returned incomplete or error values.", { selector_row: selectorRow, column_cell: columnCell, beam_cell: beamCell, mass_cell: massCell })] };
  }
  return {
    status: "success",
    profile: {
      beamProfile,
      columnProfile,
      frameMassKg,
      trace: {
        dataset: `frame_${input.designSpanFamily}m_cells`,
        selectorCell: "HZ18",
        selectorValue: input.legacySnowFactor,
        selectorRange: "HZ6:HZ14",
        matchedSelectorRow: selectorRow,
        heightKey: key,
        heightSelectorCell: selectedColumnRow === 6 ? "HZ5" : "HZ13",
        heightSelectorRange: selectedColumnRow === 6 ? "HJ7:HJ9" : "HJ15:HJ17",
        heightMatchedRow: heightRowNumber,
        columnSourceCell: columnCell,
        beamSourceCell: beamCell,
        frameMassSourceCell: massCell,
        formulas: { column: formulaAt(records, columnCell), beam: formulaAt(records, beamCell), frame_mass: formulaAt(records, massCell) },
        lookupPath: [
          "legacyClimate.activeSnowFactor → HZ18",
          "HZ18 → INDEX(IA6:IA14 / IB6:IB14 / IE6:IE14, MATCH(HZ18,HZ6:HZ14,0))",
          `${selectedColumnRow === 6 ? "HZ5" : "HZ13"} → ${selectedColumnRow === 6 ? "IA6/IB6/IE6" : "IA14/IB14/IE14"}`,
          `height key ${key} → HJ${selectedColumnRow === 6 ? "7:HJ9" : "15:HJ17"}`,
        ],
      },
    },
    diagnostics: [],
  };
}
