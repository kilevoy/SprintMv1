import { enclosureDiagnostic, type EnclosureDiagnostic } from "./diagnostics";
import type { EnclosureOrientation } from "./types";

/** Explicit geometry already resolved by a caller with project-specific evidence. */
export interface WallGeometryResolverInput {
  orientation: EnclosureOrientation;
  wallCalculationLength_m: number;
  wallCalculationHeight_m: number;
  cornerHalfLength_m: number;
  supportStep_m: number;
}

export interface ResolvedWallGeometry {
  orientation: EnclosureOrientation;
  wallCalculationLength_m: number;
  wallCalculationHeight_m: number;
  /** Raw source-backed B7/e value before the support-step rounding in C8. */
  cornerHalfLength_m: number;
  supportStep_m: number;
  cornerZoneLength_m: number;
  typicalZoneLength_m: number;
  status: "EXPLICIT_PROVEN";
}

export type WallGeometryResolution =
  | { status: "RESOLVED"; geometry: ResolvedWallGeometry; diagnostics: [] }
  | { status: "INVALID"; geometry: null; diagnostics: EnclosureDiagnostic[] };

function positiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Resolves only the source-proven explicit wall-zone geometry. It deliberately
 * does not infer wall height, orientation, roof slope, ridge height, or support
 * grids from ProjectInput; those mappings remain unproven by the evidence set.
 */
export function resolveWallGeometry(input: WallGeometryResolverInput): WallGeometryResolution {
  if (!positiveFinite(input.wallCalculationLength_m) || !positiveFinite(input.wallCalculationHeight_m) || !positiveFinite(input.cornerHalfLength_m) || !positiveFinite(input.supportStep_m)) {
    return {
      status: "INVALID",
      geometry: null,
      diagnostics: [enclosureDiagnostic(
        "ENCLOSURE_GEOMETRY_INPUT_INVALID",
        "Явная геометрия стены требует положительные длину, расчётную высоту и шаг опор.",
        "WALL_GEOMETRY",
        { input },
      )],
    };
  }

  // Расчет Угловая!C8: 2*IF(B7/B13<0.5,0,CEILING(B7/B13,1)*B13).
  // B7 is retained as an explicit source-backed corner-half length; it is not
  // inferred from the overall wall length because that mapping is unproven.
  const cornerZoneLength_m = 2 * (input.cornerHalfLength_m / input.supportStep_m < 0.5
    ? 0
    : Math.ceil(input.cornerHalfLength_m / input.supportStep_m) * input.supportStep_m);
  const typicalZoneLength_m = Math.max(0, input.wallCalculationLength_m - cornerZoneLength_m);

  return {
    status: "RESOLVED",
    geometry: {
      orientation: input.orientation,
      wallCalculationLength_m: input.wallCalculationLength_m,
      wallCalculationHeight_m: input.wallCalculationHeight_m,
      cornerHalfLength_m: input.cornerHalfLength_m,
      supportStep_m: input.supportStep_m,
      cornerZoneLength_m,
      typicalZoneLength_m,
      status: "EXPLICIT_PROVEN",
    },
    diagnostics: [],
  };
}
