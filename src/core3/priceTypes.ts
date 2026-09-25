import type { ProfiledSheetTakeoffLine } from "../enclosure/profiledSheetTakeoff";
import type { Core3Diagnostic } from "./diagnostics";

export type Core3PriceUnit = "m2" | "pcs" | "m";
export type Core3CostStatus = "KNOWN_COST" | "UNKNOWN_COST" | "UNSUPPORTED";

export interface Core3PriceSource {
  workbook: string;
  sha256: string;
  effective_date: string;
  sheet: string;
  row: number;
  price_cell: string;
  unit_cell: string;
  name_cell: string;
  code_cell?: string;
  mass_cell?: string;
  mass_status?: "UNKNOWN";
}

export interface Core3PriceEntry {
  id: string;
  code_1c?: string;
  canonical_mark: string;
  aliases: string[];
  category?: string;
  profile_family?: string;
  unit: Core3PriceUnit;
  price_per_unit: number | null;
  mass_kg_per_m?: number | null;
  price_per_tonne?: number | null;
  source: Omit<Core3PriceSource, "workbook" | "sha256" | "effective_date"> & {
    workbook?: string;
    sha256?: string;
    effective_date?: string;
  };
}

export interface Core3PriceLine {
  component: ProfiledSheetTakeoffLine["component"] | "WALL_GIRT" | "PURLIN" | "FRAME" | "SECONDARY";
  orientation: ProfiledSheetTakeoffLine["orientation"];
  product: string;
  quantity: number;
  unit: Core3PriceUnit;
  unitPrice: number | null;
  lineCost: number | null;
  source: Core3PriceSource | null;
  diagnostics: Core3Diagnostic[];
  costStatus: Core3CostStatus;
}

export interface Core3CommercialResult {
  status: "PARTIAL" | "UNSUPPORTED" | "INVALID";
  costStatus: Core3CostStatus;
  datasetId: string;
  lines: Core3PriceLine[];
  knownCost: number;
  unknownCostComponents: string[];
  diagnostics: Core3Diagnostic[];
  provenance: {
    workbook: string;
    sha256: string;
    effective_date: string;
    catalogs?: Array<{ datasetId: string; workbook: string; sha256: string; effective_date: string }>;
  };
}
