import type { Core1ClimateResult } from "../core1/types";
import type { ProjectInput } from "../project/types";
import type { ColdEnclosureInput, EnclosureMountingOrientation, EnclosureStructuralContext } from "./types";

export interface ColdEnclosureAdapterOptions {
  canonicalClimate?: Core1ClimateResult | null;
  cladding?: ColdEnclosureInput["wallSystem"]["cladding"];
  insulation?: ColdEnclosureInput["wallSystem"]["insulation"];
  /** Explicit panel direction; never inferred from SANDWICH_PANEL. */
  mountingOrientation?: EnclosureMountingOrientation;
  enclosureOverrides?: Record<string, unknown>;
}

/** Projects the single project model into the future enclosure boundary. */
export function projectInputToColdEnclosureInput(
  project: ProjectInput,
  structuralContext: EnclosureStructuralContext | null = null,
  options: ColdEnclosureAdapterOptions = {},
): ColdEnclosureInput {
  return {
    geometry: {
      span_m: project.geometry.span_m,
      building_length_m: project.geometry.building_length_m,
      building_height_m: project.geometry.building_height_m,
      side_wall_length_m: project.geometry.building_length_m,
      end_wall_width_m: project.geometry.span_m,
    },
    climate: project.climate,
    canonicalClimate: options.canonicalClimate ?? null,
    wallSystem: {
      system: project.envelope.wall_system,
      envelopeSystem: project.envelope.system,
      cladding: options.cladding ?? (project.envelope.system === "PROFILED_SHEET_COLD" ? "COLD_PROFNASTIL" : project.envelope.system === "SANDWICH_PANEL" ? "INSULATED_SANDWICH" : "UNKNOWN"),
      ...(options.mountingOrientation ? { mountingOrientation: options.mountingOrientation } : {}),
      ...(options.insulation ? { insulation: options.insulation } : {}),
    },
    roofSystem: {
      covering: project.envelope.roof_covering,
      deck_grade: project.envelope.roof_deck_grade,
    },
    openings: project.openings.map((opening) => ({ ...opening })),
    frameGrid: structuralContext
      ? {
          effectiveFrameStep_m: structuralContext.effectiveFrameStep_m,
          frameCount: structuralContext.frameCount,
          framePositions_m: structuralContext.framePositions_m ?? null,
          status: "AUTO",
        }
      : {
          effectiveFrameStep_m: null,
          frameCount: null,
          framePositions_m: null,
          status: "UNKNOWN",
        },
    responsibility: project.geometry.responsibility_factor,
    ...(project.enclosure?.wall_girts.length
      ? {
          wallGirts: {
            mode: "MANUAL" as const,
            zones: project.enclosure.wall_girts.map((zone) => ({ ...zone })),
          },
        }
      : {}),
    ...(options.enclosureOverrides
      ? { enclosureOverrides: { ...options.enclosureOverrides } }
      : {}),
  };
}
