import Papa from "papaparse";
import type { DatasetRecord } from "./types";

interface RawCsvRecord {
  schema_version?: string;
  source_workbook?: string;
  source_workbook_sha256?: string;
  source_sheet?: string;
  source_range?: string;
  extraction_date?: string;
  units?: string;
  cell?: string;
  formula_json?: string;
  cached_value_json?: string;
  cell_data_type?: string;
}

function requiredText(value: string | undefined, field: string): string {
  if (typeof value !== "string") throw new Error(`CSV field ${field} is missing`);
  return value;
}

function parseJsonField(value: string | undefined, field: string): unknown {
  try {
    return JSON.parse(requiredText(value, field));
  } catch (error) {
    throw new Error(`CSV field ${field} is not valid JSON`, { cause: error });
  }
}

export function parseDatasetCsv(text: string): DatasetRecord[] {
  const parsed = Papa.parse<RawCsvRecord>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse failed: ${parsed.errors[0]?.message ?? "unknown error"}`);
  }
  return parsed.data.map((row) => ({
    schema_version: requiredText(row.schema_version, "schema_version"),
    source_workbook: requiredText(row.source_workbook, "source_workbook"),
    source_workbook_sha256: requiredText(row.source_workbook_sha256, "source_workbook_sha256"),
    source_sheet: requiredText(row.source_sheet, "source_sheet"),
    source_range: requiredText(row.source_range, "source_range"),
    extraction_date: requiredText(row.extraction_date, "extraction_date"),
    units: requiredText(row.units, "units"),
    cell: requiredText(row.cell, "cell"),
    formula_json: parseJsonField(row.formula_json, "formula_json"),
    cached_value_json: parseJsonField(row.cached_value_json, "cached_value_json"),
    cell_data_type: requiredText(row.cell_data_type, "cell_data_type"),
  }));
}
