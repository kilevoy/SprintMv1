import { enclosureDiagnostic, type EnclosureDiagnostic } from "./diagnostics";
import { replayManualWallGirt } from "./manualWallGirtReplay";
import { selectAutoWallGirt, toManualWallGirtReplayInput, type AutoWallGirtRuntimeInput } from "./autoWallGirtSelector";
import type { EnclosureProvenance } from "./provenance";
import type { ColdEnclosureInput, ColdEnclosureResult, EnclosureSectionResult, EnclosureStructuralContext, WallGirtResult, AutoWallGirtZoneResult } from "./types";
import type { ManualWallGirtZoneResult } from "./manualWallGirtReplay";

const UNKNOWN_PROVENANCE: EnclosureProvenance = { status: "UNKNOWN", note: "Правило холодного ограждения ещё не импортировано из доказанного источника." };

function section(kind: string, diagnostic: EnclosureDiagnostic): EnclosureSectionResult {
  return { status: "UNKNOWN", items: [], diagnostics: [diagnostic], provenance: [UNKNOWN_PROVENANCE] };
}

function emptyWallGirts(diagnostic: EnclosureDiagnostic): WallGirtResult {
  return { kind: "WALL_GIRT", status: "UNKNOWN", items: [], sideWalls: [], endWalls: [], manualZones: [], autoZones: [], knownMass_kg: 0, diagnostics: [diagnostic], provenance: [UNKNOWN_PROVENANCE] };
}

function manualWallGirts(input: ColdEnclosureInput): WallGirtResult {
  const configuration = input.wallGirts;
  if (!configuration) {
    return emptyWallGirts(enclosureDiagnostic("ENCLOSURE_WALL_GIRT_NOT_PROVEN", "Подбор стеновых ригелей не реализован без явной manual-конфигурации.", "WALL_GIRT"));
  }
  if (configuration.mode === "AUTO") return autoWallGirts(input, configuration.zones);
  if (configuration.zones.length === 0) {
    const diagnostic = enclosureDiagnostic("ENCLOSURE_INVALID_MANUAL_GIRT_INPUT", "Manual-конфигурация должна содержать хотя бы одну явную зону.", "WALL_GIRT");
    return emptyWallGirts(diagnostic);
  }

  const projectOpeningCount = input.openings.reduce((total, opening) => total + opening.quantity, 0);
  const manualZones: ManualWallGirtZoneResult[] = [];
  const diagnostics: EnclosureDiagnostic[] = [];
  for (const zone of configuration.zones) {
    const replayInput = projectOpeningCount > 0 ? { ...zone, openingCount: Math.max(zone.openingCount ?? 0, projectOpeningCount) } : zone;
    const replay = replayManualWallGirt(replayInput);
    if (replay.zone) manualZones.push(replay.zone);
    diagnostics.push(...replay.diagnostics);
  }

  const knownMass_kg = manualZones.reduce((total, zone) => total + zone.totalKnownMass_kg, 0);
  const provenance = manualZones.flatMap((zone) => zone.provenance);
  return {
    kind: "WALL_GIRT",
    status: manualZones.length > 0 ? "PARTIAL" : "UNKNOWN",
    items: [],
    sideWalls: [],
    endWalls: [],
    manualZones,
    autoZones: [],
    knownMass_kg,
    diagnostics,
    provenance: provenance.length > 0 ? provenance : [UNKNOWN_PROVENANCE],
  };
}

function autoWallGirts(input: ColdEnclosureInput, zones: AutoWallGirtRuntimeInput[]): WallGirtResult {
  if (zones.length === 0) {
    return emptyWallGirts(enclosureDiagnostic("ENCLOSURE_AUTO_SOURCE_INPUT_MISSING", "AUTO-конфигурация должна содержать хотя бы одну явную зону.", "WALL_GIRT"));
  }
  const projectOpeningCount = input.openings.reduce((total, opening) => total + opening.quantity, 0);
  if (projectOpeningCount > 0) {
    return emptyWallGirts(enclosureDiagnostic("ENCLOSURE_OPENINGS_UNSUPPORTED", "Restricted AUTO не поддерживает проёмы.", "WALL_GIRT", { openingCount: projectOpeningCount }));
  }

  const autoZones: AutoWallGirtZoneResult[] = [];
  const diagnostics: EnclosureDiagnostic[] = [];
  for (const zone of zones) {
    if (zone.withoutStuds !== true) {
      diagnostics.push(enclosureDiagnostic("ENCLOSURE_AUTO_PLUS_STUDS_UNSUPPORTED", "Restricted AUTO поддерживает только ветку без стоек.", "WALL_GIRT"));
      continue;
    }
    if (zone.normativeSystem !== "SP_20") {
      diagnostics.push(enclosureDiagnostic("ENCLOSURE_AUTO_DOMAIN_UNSUPPORTED", "Restricted AUTO доказан только для SP20.", "WALL_GIRT", { normativeSystem: zone.normativeSystem }));
      continue;
    }
    const selection = selectAutoWallGirt(zone);
    if (selection.status === "INVALID") {
      diagnostics.push(enclosureDiagnostic("ENCLOSURE_AUTO_SOURCE_INPUT_MISSING", selection.diagnostics.join("; "), "WALL_GIRT"));
      continue;
    }
    if (selection.status !== "LEGACY_PROVEN" || !selection.selected) {
      diagnostics.push(enclosureDiagnostic("ENCLOSURE_AUTO_NO_VALID_CANDIDATE", selection.diagnostics.join("; ") || "Нет кандидата, удовлетворяющего legacy JW.", "WALL_GIRT"));
      continue;
    }
    const replay = replayManualWallGirt(toManualWallGirtReplayInput(zone, selection.selected));
    diagnostics.push(...replay.diagnostics);
    if (replay.zone) autoZones.push({ selection: selection.selected, replay: replay.zone });
  }

  const knownMass_kg = autoZones.reduce((total, zone) => total + zone.replay.totalKnownMass_kg, 0);
  const provenance = autoZones.flatMap((zone) => [zone.selection.provenance, ...zone.replay.provenance]);
  return {
    kind: "WALL_GIRT",
    status: autoZones.length > 0 ? "PARTIAL" : "UNKNOWN",
    items: [],
    sideWalls: [],
    endWalls: [],
    manualZones: [],
    autoZones,
    knownMass_kg,
    diagnostics,
    provenance: provenance.length > 0 ? provenance : [UNKNOWN_PROVENANCE],
  };
}

/** Calculates only explicitly configured, source-proven enclosure branches. */
export function calculateColdEnclosure(input: ColdEnclosureInput, structuralContext: EnclosureStructuralContext | null = null): { status: "success"; result: ColdEnclosureResult } {
  const wallGirts = manualWallGirts(input);
  const studDiagnostic = enclosureDiagnostic("ENCLOSURE_STUD_RULE_NOT_PROVEN", "Правила стеновых стоек и фасадных стоек не доказаны.", "WALL_STUD/FACADE_POST");
  const openingDiagnostic = enclosureDiagnostic("ENCLOSURE_OPENING_FRAMING_NOT_PROVEN", "Обрамление проёмов холодной оболочки не реализовано.", "OPENING_FRAMING");
  const sourceDiagnostic = enclosureDiagnostic("ENCLOSURE_SOURCE_EVIDENCE_MISSING", "Каталоги листов, кронштейнов, крепежа и доборных элементов отсутствуют в доказанном enclosure source set.", "SHEET/BRACKET/FASTENER/TRIM");
  const diagnostics: EnclosureDiagnostic[] = [...wallGirts.diagnostics, studDiagnostic, openingDiagnostic, sourceDiagnostic];
  const hasKnownWallGirtMass = wallGirts.manualZones.length > 0 || wallGirts.autoZones.length > 0;
  const unknownMassComponents = hasKnownWallGirtMass
    ? ["wallGirtExtraMembers", "wallStuds", "facadePosts", "openingFraming", "wallSheet", "roofSheet", "brackets", "fasteners", "trims"]
    : ["wallGirts", "wallStuds", "facadePosts", "openingFraming", "wallSheet", "roofSheet", "brackets", "fasteners", "trims"];
  const result: ColdEnclosureResult = {
    wallGirts,
    wallStuds: { kind: "WALL_STUD", ...section("WALL_STUD", studDiagnostic!) },
    facadePosts: { kind: "FACADE_POST", ...section("FACADE_POST", studDiagnostic!) },
    openingFraming: { kind: "OPENING_FRAMING", ...section("OPENING_FRAMING", openingDiagnostic!) },
    wallSheet: { kind: "SHEET", ...section("WALL_SHEET", sourceDiagnostic!) },
    roofSheet: { kind: "SHEET", ...section("ROOF_SHEET", sourceDiagnostic!) },
    brackets: { kind: "BRACKET", ...section("BRACKET", sourceDiagnostic!) },
    fasteners: { kind: "FASTENER", ...section("FASTENER", sourceDiagnostic!) },
    trims: { kind: "TRIM", ...section("TRIM", sourceDiagnostic!) },
    diagnostics,
    provenance: wallGirts.provenance.length > 0 && hasKnownWallGirtMass ? wallGirts.provenance : [UNKNOWN_PROVENANCE],
    totals: { knownMass_kg: wallGirts.knownMass_kg, unknownMassComponents, knownCost: null, unknownCostComponents: ["all enclosure components"] },
  };
  void structuralContext;
  return { status: "success", result };
}
