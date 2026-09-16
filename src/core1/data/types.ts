import type { SpanM } from "../types";

export type DatasetFormat = "csv" | "json";

export interface DatasetManifestEntry {
  id: string;
  path: string;
  format: DatasetFormat;
  source_workbook: string;
  source_workbook_sha256: string;
  source_sheet: string;
  source_range: string;
  extraction_date: string;
  units: string;
  schema_version: string;
  record_count: number;
  mode: string;
  blank_policy: string;
  selection: string | null;
  file_sha256: string;
}

export interface Core1DataManifest {
  schema_version: string;
  source_workbook: string;
  source_workbook_sha256: string;
  extraction_date: string;
  dataset_count: number;
  record_count: number;
  datasets: DatasetManifestEntry[];
}

export interface DatasetRecord {
  schema_version: string;
  source_workbook: string;
  source_workbook_sha256: string;
  source_sheet: string;
  source_range: string;
  extraction_date: string;
  units: string;
  cell: string;
  formula_json: unknown;
  cached_value_json: unknown;
  cell_data_type: string;
}

export interface LoadedDataset<TRecord = DatasetRecord> {
  descriptor: DatasetManifestEntry;
  records: TRecord[];
}

export type PurlinDatasetId =
  | "purlin_profile_catalogue"
  | "purlin_calculation_axis"
  | "purlin_calculation_constants"
  | "purlin_literals"
  | "purlin_selection_rules"
  | "purlin_steel_grades";

export type ClimateDatasetId = "climate_cities_sparse" | "climate_lookup_sparse";
export type WindowDatasetId = "window_profile_candidates" | "window_result_layout" | "window_presentation_layout";

export interface FixtureManifestEntry {
  id: string;
  description: string;
  supported_domain: string;
  legacy_scenario: boolean;
  input_file: string;
  expected_file: string;
  excel_source_cells: string[];
  confidence: string;
  status: "READY" | "EXPECTED_LEGACY_ERROR" | "REQUIRED_MODULE_NOT_IMPLEMENTED" | "UNSUPPORTED_FOR_PARITY" | "UNKNOWN";
}

export interface Core1FixtureManifest {
  schema_version: string;
  source_workbook: string;
  extraction_date: string;
  fixture_count: number;
  fixtures: FixtureManifestEntry[];
}

export interface Core1Fixture<TInput = unknown, TExpected = unknown> {
  input: TInput;
  expected: TExpected;
}

export interface Core1DataSource {
  getText(assetPath: string): Promise<string>;
  getJson<T>(assetPath: string): Promise<T>;
}

export interface Core1DataRepository {
  loadManifest(): Promise<Core1DataManifest>;
  loadFrameDataset(span: SpanM): Promise<LoadedDataset>;
  loadPurlinDataset(id: PurlinDatasetId): Promise<LoadedDataset>;
  loadRoofProperties(): Promise<LoadedDataset>;
  loadDeckProperties(): Promise<LoadedDataset>;
  loadClimateDataset(id: ClimateDatasetId): Promise<LoadedDataset>;
  loadSecondarySteelData(): Promise<LoadedDataset>;
  loadBoltsPlatesFittings(): Promise<LoadedDataset>;
  loadConstants(): Promise<LoadedDataset>;
  loadWindowDataset(id: WindowDatasetId): Promise<LoadedDataset>;
  loadFixtureManifest(): Promise<Core1FixtureManifest>;
  loadFixture(id: string): Promise<Core1Fixture>;
}
