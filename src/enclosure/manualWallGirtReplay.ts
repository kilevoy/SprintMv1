import { enclosureDiagnostic, type EnclosureDiagnostic } from "./diagnostics";
import type { EnclosureProvenance } from "./provenance";

export type ManualWallGirtZoneType = "CORNER" | "TYPICAL";
export type ManualWallGirtSectionType = "]" | "[]" | "][" | "[-]";

export interface ManualWallGirtProfile {
  profileId: string;
  sectionMass_kg_m: number;
  provenance?: EnclosureProvenance[];
}

export interface ManualWallGirtReplayInput {
  wall: "SIDE" | "END";
  zoneType: ManualWallGirtZoneType;
  wallHeight_m: number;
  zoneLength_m: number;
  girtStep_m: number;
  structuralPostStep_m: number;
  sectionType: ManualWallGirtSectionType;
  profile: ManualWallGirtProfile;
  openingCount?: number;
  plusStands?: boolean;
  selectionMode?: "MANUAL" | "AUTO";
}

export interface ManualWallGirtZoneResult {
  wall: ManualWallGirtReplayInput["wall"];
  zoneType: ManualWallGirtZoneType;
  profile: string;
  sectionType: ManualWallGirtSectionType;
  rows: number;
  girtStep_m: number;
  zoneLength_m: number;
  profileLength_m: number;
  sectionMassPerMeter_kg_m: number;
  profileMass_kg: number;
  bracketCount: number;
  bracketUnitMass_kg: number;
  bracketMass_kg: number;
  totalKnownMass_kg: number;
  provenance: EnclosureProvenance[];
  diagnostics: EnclosureDiagnostic[];
}

export interface ManualWallGirtReplayResult {
  status: "PROVEN" | "UNSUPPORTED" | "INVALID";
  zone: ManualWallGirtZoneResult | null;
  diagnostics: EnclosureDiagnostic[];
}

const SOURCE_PROVENANCE: EnclosureProvenance = {
  status: "LEGACY_PROVEN",
  sourceWorkbook: "Калькулятор ограждайки v1.5.xlsx",
  sourceSheet: "Лист1; несушки",
  note: "Ограниченный manual replay доказанных формул стеновых ригелей и кронштейнов.",
};

const SUPPORTED_SECTION_TYPES: readonly ManualWallGirtSectionType[] = ["]", "[]", "][", "[-]"];

function isPairedOrComposite(sectionType: ManualWallGirtSectionType): boolean {
  return sectionType === "[]" || sectionType === "][" || sectionType === "[-]";
}

function excelRoundPositive(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.floor(value * scale + 0.5) / scale;
}

function invalid(message: string, details?: Record<string, unknown>): ManualWallGirtReplayResult {
  return {
    status: "INVALID",
    zone: null,
    diagnostics: [enclosureDiagnostic("ENCLOSURE_INPUT_INVALID", message, "WALL_GIRT", details)],
  };
}

/**
 * Replays only the proven manual, gross-zone wall-girt formulas from the
 * authoritative enclosure workbook. It deliberately does not select a
 * profile, inspect openings, or derive extra members.
 */
export function replayManualWallGirt(input: ManualWallGirtReplayInput): ManualWallGirtReplayResult {
  if (input.selectionMode === "AUTO") {
    return {
      status: "UNSUPPORTED",
      zone: null,
      diagnostics: [enclosureDiagnostic("ENCLOSURE_AUTO_GIRT_SELECTION_NOT_IMPLEMENTED", "Автоматический выбор профиля не входит в ручной replay.", "WALL_GIRT")],
    };
  }
  if ((input.openingCount ?? 0) !== 0) {
    return {
      status: "UNSUPPORTED",
      zone: null,
      diagnostics: [enclosureDiagnostic("ENCLOSURE_OPENINGS_UNSUPPORTED", "Replay допускает только gross wall zone без проёмов.", "WALL_GIRT", { openingCount: input.openingCount })],
    };
  }
  if (input.plusStands === true) {
    return {
      status: "UNSUPPORTED",
      zone: null,
      diagnostics: [enclosureDiagnostic("ENCLOSURE_PLUS_STUDS_UNSUPPORTED", "Правило +стойки не входит в ограниченный manual replay.", "WALL_GIRT")],
    };
  }
  if (!SUPPORTED_SECTION_TYPES.includes(input.sectionType)) {
    return {
      status: "INVALID",
      zone: null,
      diagnostics: [enclosureDiagnostic("ENCLOSURE_SECTION_TYPE_UNSUPPORTED", "Тип сечения отсутствует в доказанном manual replay.", "WALL_GIRT", { sectionType: input.sectionType })],
    };
  }
  if (input.profile.profileId.trim() === "") {
    return {
      status: "INVALID",
      zone: null,
      diagnostics: [enclosureDiagnostic("ENCLOSURE_PROFILE_NOT_FOUND", "Manual replay требует явно заданный профиль.", "WALL_GIRT")],
    };
  }
  if (!Number.isFinite(input.wallHeight_m) || input.wallHeight_m <= 0 || !Number.isFinite(input.zoneLength_m) || input.zoneLength_m <= 0 || !Number.isFinite(input.girtStep_m) || input.girtStep_m <= 0 || !Number.isFinite(input.structuralPostStep_m) || input.structuralPostStep_m <= 0 || !Number.isFinite(input.profile.sectionMass_kg_m) || input.profile.sectionMass_kg_m < 0) {
    return {
      status: "INVALID",
      zone: null,
      diagnostics: [enclosureDiagnostic("ENCLOSURE_INVALID_MANUAL_GIRT_INPUT", "Manual wall-girt replay requires positive geometry/steps and a non-negative section mass.", "WALL_GIRT")],
    };
  }

  // Лист1!F49/F50:
  // CEILING.MATH(wallHeight*1000 / girtStep_mm, 1) + IF(single, 1, 0).
  const baseRows = Math.ceil(input.wallHeight_m / input.girtStep_m);
  const rows = baseRows + (isPairedOrComposite(input.sectionType) ? 0 : 1);

  // Лист1!G50: CEILING.MATH(rows * ROUND(zoneLength / supportStep, 1), 1).
  const bracketCount = Math.ceil(rows * excelRoundPositive(input.zoneLength_m / input.structuralPostStep_m, 1));
  // Расчет Угловая!AA7: paired/composite sections use 1.5 kg, single uses 0.75 kg.
  const bracketUnitMass_kg = isPairedOrComposite(input.sectionType) ? 1.5 : 0.75;
  const profileLength_m = rows * input.zoneLength_m;
  const profileMass_kg = profileLength_m * input.profile.sectionMass_kg_m;
  const bracketMass_kg = bracketCount * bracketUnitMass_kg;
  const provenance = input.profile.provenance?.length ? [...input.profile.provenance] : [SOURCE_PROVENANCE];

  return {
    status: "PROVEN",
    zone: {
      wall: input.wall,
      zoneType: input.zoneType,
      profile: input.profile.profileId,
      sectionType: input.sectionType,
      rows,
      girtStep_m: input.girtStep_m,
      zoneLength_m: input.zoneLength_m,
      profileLength_m,
      sectionMassPerMeter_kg_m: input.profile.sectionMass_kg_m,
      profileMass_kg,
      bracketCount,
      bracketUnitMass_kg,
      bracketMass_kg,
      totalKnownMass_kg: profileMass_kg + bracketMass_kg,
      provenance,
      diagnostics: [],
    },
    diagnostics: [],
  };
}
