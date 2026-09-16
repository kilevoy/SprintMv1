import { createCore1Diagnostic } from "../diagnostics";
import type { ClimateInput, Core1ClimateResult } from "../types";
import type { DatasetRecord } from "../data";
import type { ClimateDatasetView, ClimateResolveResult } from "./types";

const LOAD_UNITS = "kN/m²";
const PROVEN_LOOKUP_KEY = "RU|Роза|SP_20";

function cellParts(cell: string): { column: string; row: number } | null {
  const match = /^([A-Z]+)(\d+)$/.exec(cell);
  return match ? { column: match[1]!, row: Number(match[2]) } : null;
}

function textValue(record: DatasetRecord | undefined): string | null {
  if (!record || typeof record.cached_value_json !== "string") return null;
  const value = record.cached_value_json;
  return value.startsWith("#") ? null : value;
}

function numericValue(record: DatasetRecord | undefined): number | null {
  if (!record || typeof record.cached_value_json !== "number" || !Number.isFinite(record.cached_value_json)) return null;
  return record.cached_value_json;
}

function rowMap(records: DatasetRecord[], row: number): Map<string, DatasetRecord> {
  return new Map(
    records.flatMap((record) => {
      const parts = cellParts(record.cell);
      return parts?.row === row ? [[parts.column, record] as const] : [];
    }),
  );
}

function cityRows(records: DatasetRecord[], city: string): number[] {
  const rows = new Set<number>();
  for (const record of records) {
    const parts = cellParts(record.cell);
    if (!parts || !["B", "AR"].includes(parts.column)) continue;
    if (textValue(record) === city) rows.add(parts.row);
  }
  return [...rows];
}

function unknownData(input: ClimateInput, message: string, details: Record<string, unknown>): ClimateResolveResult {
  return {
    status: "unknown_climate_data",
    climate: null,
    diagnostics: [
      createCore1Diagnostic({
        code: "UNKNOWN_CLIMATE_DATA",
        severity: "unsupported",
        classification: "unsupported",
        module: "ClimateResolver",
        message,
        source: ["CORE1_CLIMATE_DATA_CONTRACT.md", "core1/data/climate_lookup_sparse.csv"],
        legacy_equivalent: null,
        trigger: `${input.mode}:${input.country}:${input.normative_system}`,
        affected_outputs: ["snow_region", "snow_load", "wind_region", "wind_load"],
        details,
      }),
    ],
  };
}

function cityNotFound(input: Extract<ClimateInput, { mode: "CITY_LOOKUP" }>): ClimateResolveResult {
  return {
    status: "city_not_found",
    climate: null,
    diagnostics: [
      createCore1Diagnostic({
        code: "CITY_NOT_FOUND",
        severity: "unsupported",
        classification: "unsupported",
        module: "ClimateResolver",
        message: "Населённый пункт отсутствует в доказанном климатическом наборе; перейдите на MANUAL.",
        source: ["CORE1_CLIMATE_DATA_CONTRACT.md", "core1/data/climate_lookup_sparse.csv"],
        legacy_equivalent: null,
        trigger: `city=${input.city}`,
        affected_outputs: ["snow_region", "snow_load", "wind_region", "wind_load"],
        details: { country: input.country, city: input.city, normative_system: input.normative_system, recommendation: "MANUAL" },
      }),
    ],
  };
}

export function resolveClimate(input: ClimateInput, dataset?: ClimateDatasetView): ClimateResolveResult {
  if (input.mode === "MANUAL") {
    return {
      status: "success",
      diagnostics: [],
      climate: {
        mode: "MANUAL",
        source: "MANUAL",
        climate_source: "MANUAL",
        country: input.country,
        normative_system: input.normative_system,
        snow_region: input.snow_region,
        snow_load: input.snow_load,
        wind_region: input.wind_region,
        wind_load: input.wind_load,
        seismicity: input.seismicity,
        source_note: input.source_note ?? null,
        units: { snow_load: LOAD_UNITS, wind_load: LOAD_UNITS },
      } as Core1ClimateResult,
    };
  }

  if (!dataset) return unknownData(input, "Для CITY_LOOKUP не загружен доказанный climate dataset.", { city: input.city });
  const rows = cityRows(dataset.records, input.city);
  if (rows.length === 0) return cityNotFound(input);
  if (`${input.country}|${input.city}|${input.normative_system}` !== PROVEN_LOOKUP_KEY) {
    return unknownData(input, "Для выбранной страны и нормативной ветки нет доказанного lookup-набора.", {
      country: input.country,
      city: input.city,
      normative_system: input.normative_system,
      proven_lookup: PROVEN_LOOKUP_KEY,
    });
  }

  for (const row of rows) {
    const values = rowMap(dataset.records, row);
    const city = textValue(values.get("B")) ?? textValue(values.get("AR"));
    const snowRegion = textValue(values.get("F")) ?? textValue(values.get("AV"));
    const snowLoad = numericValue(values.get("G")) ?? numericValue(values.get("AW"));
    const windRegion = textValue(values.get("H")) ?? textValue(values.get("AX"));
    const windLoad = numericValue(values.get("I")) ?? numericValue(values.get("AY"));
    if (city === input.city && snowRegion !== null && snowLoad !== null && windRegion !== null && windLoad !== null) {
      return {
        status: "success",
        diagnostics: [],
        climate: {
          mode: "CITY_LOOKUP",
          source: "CITY_LOOKUP",
          climate_source: "CITY_LOOKUP",
          country: input.country,
          city: input.city,
          normative_system: input.normative_system,
          snow_region: snowRegion,
          snow_load: snowLoad,
          wind_region: windRegion,
          wind_load: windLoad,
          seismicity: null,
          source_note: null,
          units: { snow_load: LOAD_UNITS, wind_load: LOAD_UNITS },
        } as Core1ClimateResult,
      };
    }
  }
  return unknownData(input, "Для найденного города отсутствуют все обязательные климатические поля.", { city: input.city, rows });
}
