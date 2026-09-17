import type { LegacyClimateClassificationRow, LegacyFrameBranchMappingRow, LegacyRoofCorrectionRow, LegacyScalar } from "./types";

const ROOF_FORMULA = "=_xlfn.CEILING.MATH(AO[row]-0.35,0.05)";

export const LEGACY_ROOF_CORRECTIONS: readonly LegacyRoofCorrectionRow[] = [
  { source_row: 6, roof_covering: "наше 100 мм", correction: 0, source_formula: ROOF_FORMULA, base_value: 0.31 },
  { source_row: 7, roof_covering: "наше 150 мм", correction: 0, source_formula: ROOF_FORMULA, base_value: 0.32 },
  { source_row: 8, roof_covering: "наше 200 мм", correction: 0, source_formula: ROOF_FORMULA, base_value: 0.33 },
  { source_row: 9, roof_covering: "наше 250 мм", correction: 0, source_formula: ROOF_FORMULA, base_value: 0.34 },
  { source_row: 10, roof_covering: "наше 150 мм с 1 слоем гвл", correction: 0.1, source_formula: ROOF_FORMULA, base_value: 0.41 },
  { source_row: 11, roof_covering: "наше 150 мм с 2 слоем гвл", correction: 0.1, source_formula: ROOF_FORMULA, base_value: 0.45 },
  { source_row: 12, roof_covering: "наше 200 мм с 1 слоем гвл", correction: 0.1, source_formula: ROOF_FORMULA, base_value: 0.42 },
  { source_row: 13, roof_covering: "наше 200 мм с 2 слоем гвл", correction: 0.15, source_formula: ROOF_FORMULA, base_value: 0.46 },
  { source_row: 14, roof_covering: "наше 250 мм с 1 слоем гвл", correction: 0.1, source_formula: ROOF_FORMULA, base_value: 0.43 },
  { source_row: 15, roof_covering: "наше 250 мм с 2 слоем гвл", correction: 0.15, source_formula: ROOF_FORMULA, base_value: 0.47 },
  { source_row: 16, roof_covering: "С-П 50", correction: -0.05, source_formula: ROOF_FORMULA, base_value: 0.29 },
  { source_row: 17, roof_covering: "С-П 80", correction: 0, source_formula: ROOF_FORMULA, base_value: 0.33 },
  { source_row: 18, roof_covering: "С-П 100", correction: 0, source_formula: ROOF_FORMULA, base_value: 0.35 },
  { source_row: 19, roof_covering: "С-П 120", correction: 0.05, source_formula: ROOF_FORMULA, base_value: 0.39 },
  { source_row: 20, roof_covering: "С-П 150", correction: 0.1, source_formula: ROOF_FORMULA, base_value: 0.42 },
  { source_row: 21, roof_covering: "С-П 200", correction: 0.15, source_formula: ROOF_FORMULA, base_value: 0.49 },
  { source_row: 22, roof_covering: "С-П 250", correction: 0.2, source_formula: ROOF_FORMULA, base_value: 0.55 },
  { source_row: 23, roof_covering: "профлист", correction: -0.1, source_formula: ROOF_FORMULA, base_value: 0.21 },
];

const LIMIT_TEXT = "уточнить при расчете у главного конструктора";
const AE_CACHED_BY_ROW: Readonly<Record<number, LegacyScalar>> = {
  5: 0.5, 6: 0.5, 7: 0.5, 8: 0.5, 9: 0.5,
  10: 0.8, 11: 0.8, 12: 0.8, 13: 0.8, 14: 0.8,
  15: 1, 16: 1, 17: 1, 18: 1, 19: 1,
  20: 1.2, 21: 1.2, 22: 1.2, 23: 1.2,
  24: 1.5, 25: 1.5, 26: 1.5, 27: 1.5, 28: 1.5,
  29: 1.6, 30: 1.6, 31: 1.6,
  32: 2, 33: 2, 34: 2, 35: 2, 36: 2, 37: 2, 38: 2, 39: 2,
  40: 2.5, 41: 2.5, 42: 2.5, 43: 2.5, 44: 2.5, 45: 2.5, 46: 2.5, 47: 2.5, 48: 2.5, 49: 2.5,
  50: "#VALUE!", 51: "#VALUE!", 52: "#VALUE!", 53: "#VALUE!",
  54: 0.5, 55: 0.8, 56: 1.2, 57: 1.6, 58: 2.5,
};

const climateRows = [
  [5, 0.4, "I", 1, "I", 1, 0.32], [6, 0.45, "I", 1, "I", 0.8, 0.36], [7, 0.5, "I", 1, "I", 0.8, 0.4], [8, 0.55, "I", 1, "I", 0.8, 0.44], [9, 0.6, "I", 1, "I", 0.8, 0.48],
  [10, 0.65, "II", 0.8, "I", 1, 0.52], [11, 0.7, "II", 0.8, "I", 1, 0.56], [12, 0.75, "II", 0.8, "I", 1, 0.6], [13, 0.8, "II", 0.8, "II", 0.8, 0.64], [14, 0.85, "II", 0.8, "II", 0.8, 0.68],
  [15, 0.9, "II", 1, "II", 0.8, 0.72], [16, 0.95, "II", 1, "II", 0.8, 0.76], [17, 1, "II", 1, "II", 0.8, 0.8], [18, 1.05, "II", 1, "II", 0.8, 0.84], [19, 1.1, "II", 1, "II", 0.8, 0.88],
  [20, 1.15, "III", 0.8, "III", 0.8, 0.92], [21, 1.2, "III", 0.8, "III", 0.8, 0.96], [22, 1.25, "III", 0.8, "III", 0.8, 1], [23, 1.3, "III", 0.8, "III", 0.8, 1.04],
  [24, 1.35, "III", 1, "III", 0.8, 1.08], [25, 1.4, "III", 1, "III", 0.8, 1.12], [26, 1.45, "III", 1, "III", 0.8, 1.16], [27, 1.5, "III", 1, "III", 0.8, 1.2], [28, 1.55, "III", 1, "III", 0.8, 1.24],
  [29, 1.6, "IV", 0.8, "III", 0.8, 1.28], [30, 1.65, "IV", 0.8, "III", 1, 1.32], [31, 1.7, "IV", 0.8, "III", 1, 1.36],
  [32, 1.75, "IV", 1, "III", 1, 1.4], [33, 1.8, "IV", 1, "III", 1, 1.44], [34, 1.85, "IV", 1, "III", 1, 1.48], [35, 1.9, "IV", 1, "III", 1, 1.52],
  [36, 1.95, "IV", 1, "IV", 0.8, 1.56], [37, 2, "IV", 1, "IV", 0.8, 1.6], [38, 2.05, "IV", 1, "IV", 0.8, 1.64], [39, 2.1, "IV", 1, "IV", 0.8, 1.68],
  [40, 2.15, "V", 1, "IV", 0.8, 1.72], [41, 2.2, "V", 1, "V", 0.8, 1.76], [42, 2.25, "V", 1, "V", 0.8, 1.8], [43, 2.3, "V", 1, "V", 0.8, 1.84], [44, 2.35, "V", 1, "V", 0.8, 1.88], [45, 2.4, "V", 1, "V", 0.8, 1.92], [46, 2.45, "V", 1, "V", 0.8, 1.96], [47, 2.5, "V", 1, "V", 0.8, 2], [48, 2.55, "V", 1, "V", 0.8, 2.04], [49, 2.6, "V", 1, "V", 0.8, 2.08],
  [50, 3.2, LIMIT_TEXT, LIMIT_TEXT, LIMIT_TEXT, LIMIT_TEXT, 2.56], [51, 3.5, LIMIT_TEXT, LIMIT_TEXT, LIMIT_TEXT, LIMIT_TEXT, 2.8], [52, 3.85, LIMIT_TEXT, LIMIT_TEXT, LIMIT_TEXT, LIMIT_TEXT, 3.08], [53, 4.1, LIMIT_TEXT, LIMIT_TEXT, LIMIT_TEXT, LIMIT_TEXT, 3.28],
  [54, 0.56, "I", 1, "I", 1, 0.448], [55, 0.84, "II", 0.8, "II", 0.8, 0.672], [56, 1.26, "III", 0.8, "III", 0.8, 1.008], [57, 1.68, "IV", 0.8, "III", 1, 1.344], [58, 2.24, "V", 1, "IV", 1, 1.792],
] as const;

export const LEGACY_CLIMATE_CLASSIFICATION: readonly LegacyClimateClassificationRow[] = climateRows.map(([source_row, lookup_key, j_region, k_factor, l_region, m_factor, af_cached]) => ({
  source_row,
  lookup_key,
  j_region,
  k_factor,
  l_region,
  m_factor,
  ae_cached: AE_CACHED_BY_ROW[source_row]!,
  af_cached,
}));

export const LEGACY_FRAME_BRANCH_MAPPING: readonly LegacyFrameBranchMappingRow[] = [
  [19, "1/1", 1, 1, "1/3"], [20, "1/2", 1, 2, "1/3"], [21, "1/3", 1, 3, "1/3"], [22, "1/4", 1, 4, "1/3"],
  [23, "2/1", 2, 1, "2/2"], [24, "2/2", 2, 2, "2/2"], [25, "2/3", 2, 3, "2/3"], [26, "2/4", 2, 4, "2/4"], [27, "2/5", 2, 5, "2/4"],
  [28, "3/1", 3, 1, "3/1"], [29, "3/2", 3, 2, "3/2"], [30, "3/3", 3, 3, "3/2"], [31, "4/1", 4, 1, "4/1"], [32, "4/2", 4, 2, "4/3"],
  [33, "4/3", 4, 3, "4/3"], [34, "4/4", 4, 4, "4/3"], [35, "5/1", 5, 1, "5/1"], [36, "5/2", 5, 2, "5/3"], [37, "5/3", 5, 3, "5/3"], [38, "5/4", 5, 4, "5/3"],
  [39, "3/3", 3, 3, "3/4"],
].map(([source_row, raw_branch_key, snow_numeric, wind_numeric, mapped_branch_key]): LegacyFrameBranchMappingRow => ({
  source_row: source_row as number,
  raw_branch_key: raw_branch_key as string,
  snow_numeric: snow_numeric as number,
  wind_numeric: wind_numeric as number,
  mapped_branch_key: mapped_branch_key as string,
}));

export { LIMIT_TEXT };
