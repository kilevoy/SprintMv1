import type { ProjectInput } from "../project/types";
import { enclosureDiagnostic, type EnclosureDiagnostic } from "./diagnostics";
import { replaySelectedAutoWallGirt, type AutoWallGirtRuntimeInput } from "./autoWallGirtSelector";
import type { EnclosureProvenance } from "./provenance";
import { resolveProjectV15WallGeometry, resolveProjectWallGeometry, type ProjectV15WallGeometryControls, type ProjectWallGeometryOverride } from "./projectWallGeometry";
import type { ResolvedWallGeometry } from "./wallGeometryResolver";
import type { ManualWallGirtZoneResult } from "./manualWallGirtReplay";

export interface ProjectWallGirtCalculationInput {
  project: ProjectInput;
  geometryOverride: ProjectWallGeometryOverride | null;
  autoRuntime: AutoWallGirtRuntimeInput | null;
}

export interface ProjectV15WallGirtCalculationInput {
  project: ProjectInput;
  orientation: ProjectV15WallGeometryControls["orientation"];
  controls: Omit<ProjectV15WallGeometryControls, "orientation"> | null;
  autoRuntime: AutoWallGirtRuntimeInput | null;
}

export type ProjectWallGirtCalculationResult =
  | { status: "PROVEN"; project: ProjectInput; geometry: ResolvedWallGeometry; zone: ManualWallGirtZoneResult; provenance: EnclosureProvenance[]; diagnostics: [] }
  | { status: "UNSUPPORTED" | "INVALID"; project: ProjectInput; geometry: ResolvedWallGeometry | null; zone: null; provenance: EnclosureProvenance[]; diagnostics: EnclosureDiagnostic[] };

/** Explicit ProjectInput → audited geometry → AUTO wall-girt replay boundary. */
export function calculateProjectWallGirt(input: ProjectWallGirtCalculationInput): ProjectWallGirtCalculationResult {
  const geometry = resolveProjectWallGeometry(input.project, input.geometryOverride);
  if (geometry.status !== "RESOLVED") {
    return { status: geometry.status, project: input.project, geometry: null, zone: null, provenance: geometry.provenance, diagnostics: geometry.diagnostics };
  }
  if (input.autoRuntime === null) {
    return {
      status: "UNSUPPORTED",
      project: input.project,
      geometry: geometry.geometry,
      zone: null,
      provenance: geometry.provenance,
      diagnostics: [enclosureDiagnostic("ENCLOSURE_WALL_GIRT_RUNTIME_REQUIRED", "Для подбора AUTO стенового ригеля необходим явный runtime-контракт ветки; параметры нельзя выводить автоматически из ProjectInput.", "WALL_GIRT")],
    };
  }
  const runtime: AutoWallGirtRuntimeInput = {
    ...input.autoRuntime,
    wall: geometry.geometry.orientation,
    wallCalculationLength_m: geometry.geometry.wallCalculationLength_m,
    wallCalculationHeight_m: geometry.geometry.wallCalculationHeight_m,
    postStep_m: geometry.geometry.supportStep_m,
    cornerHalfLength_m: geometry.geometry.cornerHalfLength_m,
  };
  const replay = replaySelectedAutoWallGirt(runtime);
  if (replay.status !== "PROVEN" || replay.zone === null) {
    const severity = replay.status === "INVALID" ? "INVALID" : "UNSUPPORTED";
    return {
      status: severity,
      project: input.project,
      geometry: geometry.geometry,
      zone: null,
      provenance: geometry.provenance,
      diagnostics: [enclosureDiagnostic("ENCLOSURE_AUTO_NO_VALID_CANDIDATE", replay.diagnostics.join("; ") || "AUTO wall-girt replay did not produce a proven zone.", "WALL_GIRT")],
    };
  }
  return { status: "PROVEN", project: input.project, geometry: geometry.geometry, zone: replay.zone, provenance: geometry.provenance, diagnostics: [] };
}

/**
 * ProjectInput orchestration for the audited v1.5 length rule. The caller must
 * still provide the literal B12/B13/e controller values and their provenance.
 */
export function calculateProjectV15WallGirt(input: ProjectV15WallGirtCalculationInput): ProjectWallGirtCalculationResult {
  const controls = input.controls ?? input.project.enclosure?.wall_geometry?.[input.orientation] ?? null;
  if (controls === null) return calculateProjectWallGirt({ project: input.project, geometryOverride: null, autoRuntime: input.autoRuntime });
  const resolved = resolveProjectV15WallGeometry(input.project, { ...controls, orientation: input.orientation });
  if (resolved.status !== "RESOLVED") {
    return {
      status: resolved.status,
      project: input.project,
      geometry: null,
      zone: null,
      provenance: resolved.provenance,
      diagnostics: resolved.diagnostics,
    };
  }
  return calculateProjectWallGirt({
    project: input.project,
    geometryOverride: {
      orientation: input.orientation,
      wallCalculationLength_m: resolved.geometry.wallCalculationLength_m,
      wallCalculationHeight_m: controls.wallCalculationHeight_m,
      cornerHalfLength_m: controls.cornerHalfLength_m,
      supportStep_m: controls.supportStep_m,
      provenance: controls.provenance,
    },
    autoRuntime: input.autoRuntime,
  });
}
