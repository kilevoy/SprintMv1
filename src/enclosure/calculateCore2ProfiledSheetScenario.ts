import type { Core1ClimateResult } from "../core1/types";
import type { ProjectInput } from "../project/types";
import { enclosureDiagnostic, type EnclosureDiagnostic } from "./diagnostics";
import { calculateColdEnclosure } from "./calculateColdEnclosure";
import { projectInputToColdEnclosureInput } from "./inputAdapter";
import {
  calculateProjectV15WallGirtFromInputs,
  type ProjectWallGirtCalculationResult,
} from "./calculateProjectWallGirt";
import type { ProjectV15AutoRuntimeOverrides } from "./projectWallGirtRuntime";
import type { ColdEnclosureResult } from "./types";
import type { ManualWallGirtReplayInput } from "./manualWallGirtReplay";

export interface Core2ProfiledSheetScenarioInput {
  project: ProjectInput;
  climate: Core1ClimateResult | null;
  runtimeOverrides: ProjectV15AutoRuntimeOverrides | null;
  /** Required for exact mass replay; omit to retain generic-label partial mode. */
  profiledSheetProfiles?: {
    wallProfile: string;
    roofProfile: string;
  };
}

export type Core2ProfiledSheetScenarioResult =
  | {
      status: "PROVEN";
      side: Extract<ProjectWallGirtCalculationResult, { status: "PROVEN" }>;
      end: Extract<ProjectWallGirtCalculationResult, { status: "PROVEN" }>;
      enclosure: ColdEnclosureResult;
      diagnostics: EnclosureDiagnostic[];
    }
  | {
      status: "UNSUPPORTED" | "INVALID";
      side: ProjectWallGirtCalculationResult;
      end: ProjectWallGirtCalculationResult;
      enclosure: null;
      diagnostics: EnclosureDiagnostic[];
    };

/**
 * Explicit first Core 2 end-to-end boundary. It composes only the already
 * proven v1.5 SIDE/END wall-girt replay and the restricted no-opening
 * profiled-sheet takeoff; it does not infer controllers or engineering rules.
 */
export function calculateCore2ProfiledSheetScenario(
  input: Core2ProfiledSheetScenarioInput,
): Core2ProfiledSheetScenarioResult {
  const commonDiagnostics: EnclosureDiagnostic[] = [];
  if (input.project.envelope.system !== "PROFILED_SHEET_COLD") {
    commonDiagnostics.push(enclosureDiagnostic(
      "ENCLOSURE_ENVELOPE_SYSTEM_UNSUPPORTED",
      "Первый сквозной Core 2 сценарий доказан только для холодного профнастила.",
      "ENVELOPE_SYSTEM",
      { envelopeSystem: input.project.envelope.system },
    ));
  }
  if (input.climate?.normative_system !== "SP_20") {
    commonDiagnostics.push(enclosureDiagnostic(
      "ENCLOSURE_AUTO_DOMAIN_UNSUPPORTED",
      "Первый сквозной Core 2 сценарий доказан только для SP20.",
      "CLIMATE",
      { normative_system: input.climate?.normative_system ?? null },
    ));
  }
  const openingCount = input.project.openings.reduce((sum, opening) => sum + opening.quantity, 0);
  if (openingCount !== 0) {
    commonDiagnostics.push(enclosureDiagnostic(
      "ENCLOSURE_OPENINGS_UNSUPPORTED",
      "Первый сквозной Core 2 сценарий поддерживает только здание без проёмов.",
      "OPENINGS",
      { openingCount },
    ));
  }
  const side = calculateProjectV15WallGirtFromInputs({
    project: input.project,
    climate: input.climate,
    orientation: "SIDE",
    controls: null,
    runtimeOverrides: input.runtimeOverrides,
  });
  const end = calculateProjectV15WallGirtFromInputs({
    project: input.project,
    climate: input.climate,
    orientation: "END",
    controls: null,
    runtimeOverrides: input.runtimeOverrides,
  });
  const diagnostics = [
    ...commonDiagnostics,
    ...side.diagnostics,
    ...end.diagnostics,
  ];
  if (commonDiagnostics.length > 0 || side.status !== "PROVEN" || end.status !== "PROVEN") {
    return {
      status: commonDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? "INVALID" : "UNSUPPORTED",
      side,
      end,
      enclosure: null,
      diagnostics,
    };
  }
  const replayZone = (result: Extract<ProjectWallGirtCalculationResult, { status: "PROVEN" }>): ManualWallGirtReplayInput => ({
    wall: result.zone.wall,
    zoneType: result.zone.zoneType,
    wallHeight_m: result.geometry.wallCalculationHeight_m,
    zoneLength_m: result.zone.zoneLength_m,
    girtStep_m: result.zone.girtStep_m,
    structuralPostStep_m: result.geometry.supportStep_m,
    sectionType: result.zone.sectionType,
    profile: {
      profileId: result.zone.profile,
      sectionMass_kg_m: result.zone.sectionMassPerMeter_kg_m,
      provenance: result.zone.provenance,
    },
  });
  const coldInput = projectInputToColdEnclosureInput(input.project, null, { canonicalClimate: input.climate });
  const enclosureInput = {
    ...coldInput,
    ...(input.profiledSheetProfiles ? { profiledSheetProfiles: input.profiledSheetProfiles } : {}),
    wallGirts: {
      mode: "MANUAL" as const,
      zones: [replayZone(side), replayZone(end)],
    },
  };
  const enclosure = calculateColdEnclosure(enclosureInput).result;
  return {
    status: "PROVEN",
    side,
    end,
    enclosure,
    diagnostics: [...diagnostics, ...enclosure.diagnostics],
  };
}
