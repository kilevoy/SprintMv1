import type { Core1ClimateResult } from "../core1/types";
import type { ProjectInput } from "../project/types";
import { enclosureDiagnostic, type EnclosureDiagnostic } from "./diagnostics";
import type { AutoWallGirtRuntimeInput } from "./autoWallGirtSelector";
import type { EnclosureOrientation } from "./types";
import type { ProjectV15WallGeometryControls } from "./projectWallGeometry";

/** Fields that are not inferred by the adapter and must be source-backed. */
export interface ProjectV15AutoRuntimeOverrides {
  zoneType: AutoWallGirtRuntimeInput["zoneType"];
  insulationThickness_mm: number;
  utilizationOverride: number;
  profileFamily: AutoWallGirtRuntimeInput["profileFamily"];
  sectionType: AutoWallGirtRuntimeInput["sectionType"];
  material: AutoWallGirtRuntimeInput["material"];
  minProfileHeight_mm: number;
  maxProfileHeight_mm: number;
  minThickness_mm: number;
  maxThickness_mm: number;
  minStep_mm: number;
  maxStep_mm: number;
  manualStepMode: AutoWallGirtRuntimeInput["manualStepMode"];
  manualSteps_mm?: readonly number[];
}

export type ProjectV15AutoRuntimeResult =
  | { status: "READY"; runtime: AutoWallGirtRuntimeInput; diagnostics: [] }
  | { status: "MISSING_INPUT" | "UNSUPPORTED"; runtime: null; diagnostics: EnclosureDiagnostic[] };

/**
 * Builds the restricted v1.5 AUTO runtime without adding engineering rules.
 * Geometry, terrain, responsibility and wind pressure come from proven
 * project/core inputs; all profile/filter controls remain explicit.
 */
export function buildProjectV15AutoRuntime(input: {
  project: ProjectInput;
  climate: Core1ClimateResult | null;
  orientation: EnclosureOrientation;
  controls: Omit<ProjectV15WallGeometryControls, "orientation"> | null;
  overrides: ProjectV15AutoRuntimeOverrides | null;
}): ProjectV15AutoRuntimeResult {
  if (input.controls === null) {
    return {
      status: "MISSING_INPUT",
      runtime: null,
      diagnostics: [enclosureDiagnostic(
        "ENCLOSURE_PROJECT_GEOMETRY_REQUIRED",
        "Для AUTO runtime необходимы явные B12/B13/e контроллеры стены.",
        "WALL_GEOMETRY",
      )],
    };
  }
  if (input.overrides === null) {
    return {
      status: "MISSING_INPUT",
      runtime: null,
      diagnostics: [enclosureDiagnostic(
        "ENCLOSURE_AUTO_SOURCE_INPUT_MISSING",
        "Для AUTO runtime отсутствуют явные фильтры профиля, утеплитель или ограничения шага.",
        "WALL_GIRT",
      )],
    };
  }
  if (input.climate === null || input.climate.wind_load == null || !Number.isFinite(input.climate.wind_load)) {
    return {
      status: "MISSING_INPUT",
      runtime: null,
      diagnostics: [enclosureDiagnostic(
        "ENCLOSURE_AUTO_SOURCE_INPUT_MISSING",
        "Для AUTO runtime требуется разрешённая локальная ветровая нагрузка Core1.",
        "CLIMATE",
      )],
    };
  }
  if (input.climate.normative_system !== "SP_20") {
    return {
      status: "UNSUPPORTED",
      runtime: null,
      diagnostics: [enclosureDiagnostic(
        "ENCLOSURE_AUTO_DOMAIN_UNSUPPORTED",
        "Текущий доказанный AUTO selector поддерживает только ветку SP_20.",
        "WALL_GIRT",
        { normative_system: input.climate.normative_system },
      )],
    };
  }
  const runtime: AutoWallGirtRuntimeInput = {
    ...input.overrides,
    wall: input.orientation,
    buildingLength_m: input.project.geometry.building_length_m,
    wallCalculationLength_m: input.orientation === "SIDE"
      ? input.project.geometry.building_length_m
      : input.project.geometry.span_m,
    wallCalculationHeight_m: input.controls.wallCalculationHeight_m,
    postStep_m: input.controls.supportStep_m,
    cornerHalfLength_m: input.controls.cornerHalfLength_m,
    buildingHeight_m: input.project.geometry.building_height_m,
    w0_kPa: input.climate.wind_load,
    terrain: input.project.other.terrain_type,
    responsibility: input.project.geometry.responsibility_factor,
    withoutStuds: true,
    normativeSystem: "SP_20",
  };
  return { status: "READY", runtime, diagnostics: [] };
}
