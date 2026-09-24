import type { ProjectInput } from "../project/types";
import { enclosureDiagnostic, type EnclosureDiagnostic } from "./diagnostics";
import type { EnclosureOrientation } from "./types";
import type { ResolvedWallGeometry } from "./wallGeometryResolver";
import { resolveWallGeometry, type WallGeometryResolverInput } from "./wallGeometryResolver";
import type { EnclosureProvenance } from "./provenance";

/** Explicit audited geometry supplied alongside a ProjectInput. */
export interface ProjectWallGeometryOverride extends WallGeometryResolverInput {
  provenance: EnclosureProvenance[];
}
/**
 * v1.5 controller values with the one mapping proven by three orientation
 * pairs: B11 is building length for SIDE and span for END. B12/B13/B7 remain
 * explicit because their ProjectInput mappings are not proven.
 */
export interface ProjectV15WallGeometryControls {
  orientation: EnclosureOrientation;
  wallCalculationHeight_m: number;
  cornerHalfLength_m: number;
  supportStep_m: number;
  provenance: EnclosureProvenance[];
}

export type ProjectWallGeometryResolution =
  | { status: "RESOLVED"; project: ProjectInput; geometry: ResolvedWallGeometry; provenance: EnclosureProvenance[]; diagnostics: [] }
  | { status: "UNSUPPORTED" | "INVALID"; project: ProjectInput; geometry: null; provenance: EnclosureProvenance[]; diagnostics: EnclosureDiagnostic[] };

/**
 * Bridges ProjectInput to the proven wall geometry resolver only when a caller
 * supplies explicit audited B11/B12/B13-equivalent values. It deliberately
 * refuses to infer those values from span/length/height.
 */
export function resolveProjectWallGeometry(project: ProjectInput, override: ProjectWallGeometryOverride | null): ProjectWallGeometryResolution {
  if (override === null) {
    return {
      status: "UNSUPPORTED",
      project,
      geometry: null,
      provenance: [],
      diagnostics: [enclosureDiagnostic(
        "ENCLOSURE_PROJECT_GEOMETRY_REQUIRED",
        "Для EnclosureCore требуется явная доказанная геометрия расчётной стены; B11/B12/B13 нельзя выводить автоматически из общих габаритов ProjectInput.",
        "WALL_GEOMETRY",
        { projectSpan_m: project.geometry.span_m, projectLength_m: project.geometry.building_length_m, projectHeight_m: project.geometry.building_height_m },
      )],
    };
  }
  const resolved = resolveWallGeometry(override);
  if (resolved.status === "INVALID") {
    return { status: "INVALID", project, geometry: null, provenance: override.provenance, diagnostics: resolved.diagnostics };
  }
  return { status: "RESOLVED", project, geometry: resolved.geometry, provenance: override.provenance, diagnostics: [] };
}

/** Resolves only the audited v1.5 B11 orientation mapping. */
export function resolveProjectV15WallGeometry(project: ProjectInput, controls: ProjectV15WallGeometryControls): ProjectWallGeometryResolution {
  const wallCalculationLength_m = controls.orientation === "SIDE"
    ? project.geometry.building_length_m
    : project.geometry.span_m;
  return resolveProjectWallGeometry(project, { ...controls, wallCalculationLength_m });
}
