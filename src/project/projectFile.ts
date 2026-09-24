import type { ProjectInput, ProjectOpening } from "./types";
import type { RoofCovering } from "../core1/types";
import { classifyRoofCoveringEnvelopeSystem, isProjectEnvelopeSystem, isSupplyScope, validateEnvelopeSystemRoofCovering } from "./envelopeSemantics";

export interface SprintMProjectFile {
  format: "SPRINT_M_PROJECT";
  version: 2;
  savedAt?: string;
  project: ProjectInput;
}

export type ProjectFileParseResult =
  | { ok: true; file: SprintMProjectFile }
  | { ok: false; message: string };

export function serializeProjectFile(project: ProjectInput, savedAt = new Date()): SprintMProjectFile {
  return {
    format: "SPRINT_M_PROJECT",
    version: 2,
    savedAt: savedAt.toISOString(),
    project: JSON.parse(JSON.stringify(project)) as ProjectInput,
  };
}

function safeFilePart(value: string): string {
  return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^\.+|\.+$/g, "") || "project";
}

export function projectFileName(project: ProjectInput, savedAt = new Date()): string {
  const city = project.climate.mode === "CITY_LOOKUP" ? project.climate.city : "manual";
  const date = savedAt.toISOString().slice(0, 10);
  return `sprint-m_${safeFilePart(project.countryCode)}_${safeFilePart(city)}_${project.geometry.span_m}x${project.geometry.building_length_m}x${project.geometry.building_height_m}_${date}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCountry(value: unknown): value is ProjectInput["countryCode"] {
  return value === "RU" || value === "KZ";
}

function isOpening(value: unknown): value is ProjectOpening {
  if (!isRecord(value) || typeof value.id !== "string" || !isFiniteNumber(value.quantity) || value.quantity < 0) return false;
  if (value.kind === "gate" || value.kind === "door" || value.kind === "window") {
    if (!isFiniteNumber(value.width_mm) || !isFiniteNumber(value.height_mm) || value.width_mm <= 0 || value.height_mm <= 0) return false;
  } else if (value.kind === "strip_window") {
    if (!isFiniteNumber(value.height_mm) || !isFiniteNumber(value.length_mm) || value.height_mm <= 0 || value.length_mm <= 0) return false;
  } else return false;
  if (value.kind === "window" || value.kind === "strip_window") {
    if (![1, 2, 3, 4, 5].includes(value.window_type as number) || typeof value.glazing_construction !== "string") return false;
  }
  return true;
}

function isWallGirt(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (value.wall === "SIDE" || value.wall === "END")
    && (value.zoneType === "CORNER" || value.zoneType === "TYPICAL")
    && ["]", "[]", "][", "[-]"].includes(value.sectionType as string)
    && typeof value.profile === "object" && value.profile !== null
    && typeof (value.profile as Record<string, unknown>).profileId === "string"
    && isFiniteNumber((value.profile as Record<string, unknown>).sectionMass_kg_m)
    && isFiniteNumber(value.wallHeight_m) && value.wallHeight_m > 0
    && isFiniteNumber(value.zoneLength_m) && value.zoneLength_m > 0
    && isFiniteNumber(value.girtStep_m) && value.girtStep_m > 0
    && isFiniteNumber(value.structuralPostStep_m) && value.structuralPostStep_m > 0;
}

function validateProject(value: unknown): value is ProjectInput {
  if (!isRecord(value) || (value.construction_scheme !== undefined && !["SPRINT", "SPRINT_WITH_TIE"].includes(value.construction_scheme as string)) || !isCountry(value.countryCode) || !isRecord(value.climate) || !isRecord(value.geometry) || !isRecord(value.envelope) || !isRecord(value.supply) || !Array.isArray(value.openings) || !isRecord(value.special_conditions) || !isRecord(value.other)) return false;
  const climate = value.climate;
  if (!((climate.mode === "CITY_LOOKUP" && typeof climate.city === "string") || (climate.mode === "MANUAL" && isFiniteNumber(climate.snow_load) && isFiniteNumber(climate.wind_load) && typeof climate.snow_region === "string" && typeof climate.wind_region === "string"))) return false;
  if (!isCountry(climate.country) || climate.country !== value.countryCode || !["SP_20", "SP_RK_EN"].includes(climate.normative_system as string)) return false;
  const geometry = value.geometry;
  if (!isFiniteNumber(geometry.span_m) || geometry.span_m <= 0 || !isFiniteNumber(geometry.building_length_m) || geometry.building_length_m <= 0 || !isFiniteNumber(geometry.building_height_m) || geometry.building_height_m <= 0 || ![0.8, 1].includes(geometry.responsibility_factor as number) || (geometry.frame_step_override_m !== null && (!isFiniteNumber(geometry.frame_step_override_m) || geometry.frame_step_override_m <= 0))) return false;
  if (!isProjectEnvelopeSystem(value.envelope.system) || !validateEnvelopeSystemRoofCovering(value.envelope.system, value.envelope.roof_covering as RoofCovering).valid || typeof value.envelope.roof_deck_grade !== "string" || typeof value.envelope.wall_system !== "string") return false;
  if (!isSupplyScope(value.supply.scope) && value.supply.scope !== null) return false;
  if (!value.openings.every(isOpening)) return false;
  const special = value.special_conditions;
  if (!["есть", "нет"].includes(special.snow_retention_purlin as string) || !["есть", "нет"].includes(special.enclosure_purlin as string) || !(special.horizontal_bracing_override === null || special.horizontal_bracing_override === "+")) return false;
  const other = value.other;
  if (!["стандарт", "подбор"].includes(other.selection_mode as string) || !["двускатное", "односкатное"].includes(other.building_roof_type as string) || (other.purlin_max_step_override_mm !== null && !isFiniteNumber(other.purlin_max_step_override_mm)) || !isFiniteNumber(other.purlin_min_step_mm) || !isFiniteNumber(other.window_scheme_factor) || !isFiniteNumber(other.window_utilization_limit) || typeof other.terrain_type !== "string") return false;
  if (value.enclosure !== undefined) {
    if (!isRecord(value.enclosure) || !Array.isArray(value.enclosure.wall_girts) || !value.enclosure.wall_girts.every(isWallGirt)) return false;
    const wallGeometry = value.enclosure.wall_geometry;
    if (wallGeometry !== undefined && (!isRecord(wallGeometry) || (wallGeometry.SIDE !== undefined && !isWallGeometryController(wallGeometry.SIDE)) || (wallGeometry.END !== undefined && !isWallGeometryController(wallGeometry.END)))) return false;
  }
  return true;
}

function migrateV1Project(value: unknown): ProjectInput | null {
  if (!isRecord(value) || !isRecord(value.envelope)) return null;
  // Some callers labelled an already-extended ProjectInput as v1 while the
  // file envelope was still v1. Preserve it when it satisfies the v2 schema.
  if ("system" in value.envelope && "supply" in value) return validateProject(value) ? value : null;
  if ("system" in value.envelope || "supply" in value) return null;
  const covering = value.envelope.roof_covering;
  if (typeof covering !== "string") return null;
  const migrated = { ...value, envelope: { ...value.envelope, system: classifyRoofCoveringEnvelopeSystem(covering as RoofCovering) }, supply: { scope: null } };
  return validateProject(migrated) ? migrated : null;
}

function isWallGeometryController(value: unknown): boolean {
  if (!isRecord(value) || !isFiniteNumber(value.wallCalculationHeight_m) || value.wallCalculationHeight_m <= 0 || !isFiniteNumber(value.cornerHalfLength_m) || value.cornerHalfLength_m <= 0 || !isFiniteNumber(value.supportStep_m) || value.supportStep_m <= 0 || !Array.isArray(value.provenance)) return false;
  return value.provenance.length > 0 && value.provenance.every((item) => isRecord(item) && typeof item.status === "string");
}

export function parseSprintMProjectFile(text: string): ProjectFileParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "Не удалось загрузить расчёт: некорректный JSON-файл." };
  }
  if (!isRecord(parsed) || parsed.format !== "SPRINT_M_PROJECT") return { ok: false, message: "Файл не является расчётом Sprint-M." };
  if (parsed.version === 1) {
    const project = migrateV1Project(parsed.project);
    if (!project) return { ok: false, message: "Не удалось загрузить расчёт: ProjectInput не соответствует контракту v1." };
    return { ok: true, file: { format: "SPRINT_M_PROJECT", version: 2, ...(typeof parsed.savedAt === "string" ? { savedAt: parsed.savedAt } : {}), project } };
  }
  if (parsed.version !== 2 || !validateProject(parsed.project)) return { ok: false, message: `Версия файла расчёта не поддерживается или ProjectInput не соответствует контракту: файл v${String(parsed.version)}.` };
  return { ok: true, file: { format: "SPRINT_M_PROJECT", version: 2, ...(typeof parsed.savedAt === "string" ? { savedAt: parsed.savedAt } : {}), project: parsed.project } };
}
