import type { ProfiledSheetTakeoffLine } from "../enclosure/profiledSheetTakeoff";
import type { Core3Diagnostic } from "./diagnostics";

export type Core3PriceUnit = "m2" | "pcs";

export interface Core3PriceSource {
  workbook: string;
  sha256: string;
  effective_date: string;
  sheet: string;
  row: number;
  price_cell: string;
  unit_cell: string;
  name_cell: string;
}

export interface Core3PriceEntry {
  id: string;
  canonical_mark: string;
  aliases: string[];
  unit: Core3PriceUnit;
  price_per_unit: number | null;
  source: Omit<Core3PriceSource, "workbook" | "sha256" | "effective_date"> & { mass_cell?: string; mass_status?: "UNKNOWN" };
}

export interface Core3PriceLine {
  component: ProfiledSheetTakeoffLine["component"];
  orientation: ProfiledSheetTakeoffLine["orientation"];
  product: string;
  quantity: number;
  unit: Core3PriceUnit;
  unitPrice: number | null;
  lineCost: number | null;
  source: Core3PriceSource | null;
  diagnostics: Core3Diagnostic[];
}

export interface Core3CommercialResult {
  status: "PARTIAL" | "UNSUPPORTED" | "INVALID";
  datasetId: string;
  lines: Core3PriceLine[];
  knownCost: number;
  unknownCostComponents: string[];
  diagnostics: Core3Diagnostic[];
  provenance: { workbook: string; sha256: string; effective_date: string };
}
