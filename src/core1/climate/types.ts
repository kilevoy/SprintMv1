import type { Core1Diagnostic, Core1ClimateResult } from "../types";
import type { DatasetRecord } from "../data";

export type ClimateResult = Core1ClimateResult;

export interface ClimateDatasetView {
  records: DatasetRecord[];
}

export interface ClimateResolveSuccess {
  status: "success";
  climate: ClimateResult;
  diagnostics: Core1Diagnostic[];
}

export interface ClimateResolveFailure {
  status: "city_not_found" | "unknown_climate_data";
  climate: null;
  diagnostics: Core1Diagnostic[];
}

export type ClimateResolveResult = ClimateResolveSuccess | ClimateResolveFailure;
