import type { Core1ClimateResult } from "../core1/types";
import type { ProjectClimate, ProjectInput, ProjectOpening } from "../project/types";
import type { EnclosureDiagnostic } from "./diagnostics";
import type { EnclosureProvenance, EnclosureEvidenceStatus } from "./provenance";
import type { ManualWallGirtReplayInput, ManualWallGirtZoneResult } from "./manualWallGirtReplay";
import type { AutoWallGirtRuntimeInput, AutoWallGirtSelectedCandidate } from "./autoWallGirtSelector";

export type EnclosureOrientation = "SIDE" | "END";
export type EnclosureComponent = "MAIN_FRAME_COLUMN" | "WALL_GIRT" | "WALL_STUD" | "FACADE_POST" | "OPENING_JAMB" | "SHEET" | "BRACKET" | "FASTENER" | "TRIM";
export type EnclosureSelectionStatus = EnclosureEvidenceStatus | "NOT_APPLICABLE";

export type WallGirtConfiguration =
  | {
      mode: "MANUAL";
      zones: ManualWallGirtReplayInput[];
    }
  | {
      mode: "AUTO";
      zones: AutoWallGirtRuntimeInput[];
    };

export interface ManualWallGirtConfiguration {
  mode: "MANUAL";
  zones: ManualWallGirtReplayInput[];
}

export interface AutoWallGirtZoneResult {
  selection: AutoWallGirtSelectedCandidate;
  replay: ManualWallGirtZoneResult;
}

export interface ColdEnclosureInput {
  geometry: {
    span_m: number;
    building_length_m: number;
    building_height_m: number;
    side_wall_length_m: number;
    end_wall_width_m: number;
  };
  climate: ProjectClimate;
  canonicalClimate: Core1ClimateResult | null;
  wallSystem: {
    system: string;
    cladding: "COLD_PROFNASTIL" | "INSULATED_SANDWICH" | "UNKNOWN";
    insulation?: { thickness_mm?: number; material?: string; status: "AUTO" | "LEGACY_MANUAL" | "ENGINEERING_OVERRIDE" | "UNKNOWN" };
  };
  roofSystem: {
    covering: ProjectInput["envelope"]["roof_covering"];
    deck_grade: ProjectInput["envelope"]["roof_deck_grade"];
  };
  openings: ProjectOpening[];
  frameGrid: {
    effectiveFrameStep_m: number | null;
    frameCount: number | null;
    framePositions_m: number[] | null;
    status: "AUTO" | "UNKNOWN";
  };
  responsibility: ProjectInput["geometry"]["responsibility_factor"];
  wallGirts?: WallGirtConfiguration;
  enclosureOverrides?: Record<string, unknown>;
}

export interface EnclosureStructuralContext {
  effectiveFrameStep_m: number;
  frameCount: number;
  framePositions_m?: number[];
  source: EnclosureProvenance;
}

export interface EnclosureLineItem {
  component: EnclosureComponent;
  orientation: EnclosureOrientation | "ROOF" | "OPENING" | "PROJECT_WIDE";
  profile_or_product: string | null;
  section_type: string | null;
  single_or_paired: "SINGLE" | "PAIRED" | "NOT_APPLICABLE" | "UNKNOWN";
  step_m: number | null;
  rows: number | null;
  quantity: number | null;
  length_m: number | null;
  unit_mass_kg_m: number | null;
  mass_kg: number | null;
  selectionStatus: EnclosureSelectionStatus;
  provenance: EnclosureProvenance[];
  diagnostics: EnclosureDiagnostic[];
}

export interface EnclosureSectionResult {
  status: "EMPTY" | "UNKNOWN" | "PARTIAL";
  items: EnclosureLineItem[];
  diagnostics: EnclosureDiagnostic[];
  provenance: EnclosureProvenance[];
}

export type WallGirtResult = EnclosureSectionResult & {
  kind: "WALL_GIRT";
  sideWalls: EnclosureLineItem[];
  endWalls: EnclosureLineItem[];
  manualZones: ManualWallGirtZoneResult[];
  autoZones: AutoWallGirtZoneResult[];
  knownMass_kg: number;
};
export type WallStudResult = EnclosureSectionResult & { kind: "WALL_STUD" };
export type FacadePostResult = EnclosureSectionResult & { kind: "FACADE_POST" };
export type OpeningFramingResult = EnclosureSectionResult & { kind: "OPENING_FRAMING" };
export type SheetResult = EnclosureSectionResult & { kind: "SHEET" };
export type BracketResult = EnclosureSectionResult & { kind: "BRACKET" };
export type FastenerResult = EnclosureSectionResult & { kind: "FASTENER" };
export type TrimResult = EnclosureSectionResult & { kind: "TRIM" };

export interface EnclosureTotals {
  knownMass_kg: number;
  unknownMassComponents: string[];
  knownCost: number | null;
  unknownCostComponents: string[];
}

export interface ColdEnclosureResult {
  wallGirts: WallGirtResult;
  wallStuds: WallStudResult;
  facadePosts: FacadePostResult;
  openingFraming: OpeningFramingResult;
  wallSheet: SheetResult;
  roofSheet: SheetResult;
  brackets: BracketResult;
  fasteners: FastenerResult;
  trims: TrimResult;
  diagnostics: EnclosureDiagnostic[];
  provenance: EnclosureProvenance[];
  totals: EnclosureTotals;
}

export type EnclosureFixtureClass = "GOLDEN_A" | "GOLDEN_B" | "REFERENCE_ONLY";
export interface ColdEnclosureFixture {
  schema_version: "1.0.0";
  projectId: string;
  source: { archive: string; driveFileId?: string; classification: "CLEAN_SPRINT" | "OTHER"; sourceHash?: string };
  geometry: { span_m: number; length_m: number; height_m: number };
  enclosure: { cladding: ColdEnclosureInput["wallSystem"]["cladding"]; wallSystem: string };
  expected: Record<string, unknown>;
  evidenceLevel: EnclosureFixtureClass;
}
