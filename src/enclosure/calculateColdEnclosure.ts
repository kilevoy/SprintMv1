import { enclosureDiagnostic, type EnclosureDiagnostic } from "./diagnostics";
import type { EnclosureProvenance } from "./provenance";
import type { ColdEnclosureInput, ColdEnclosureResult, EnclosureSectionResult, EnclosureStructuralContext, WallGirtResult } from "./types";

const UNKNOWN_PROVENANCE: EnclosureProvenance = { status: "UNKNOWN", note: "Правило холодного ограждения ещё не импортировано из доказанного источника." };

function section(kind: string, diagnostic: EnclosureDiagnostic): EnclosureSectionResult {
  return { status: "UNKNOWN", items: [], diagnostics: [diagnostic], provenance: [UNKNOWN_PROVENANCE] };
}

function emptyWallGirts(diagnostic: EnclosureDiagnostic): WallGirtResult {
  return { kind: "WALL_GIRT", status: "UNKNOWN", items: [], sideWalls: [], endWalls: [], diagnostics: [diagnostic], provenance: [UNKNOWN_PROVENANCE] };
}

/** Zero-engineering skeleton: no enclosure quantity is fabricated. */
export function calculateColdEnclosure(input: ColdEnclosureInput, structuralContext: EnclosureStructuralContext | null = null): { status: "success"; result: ColdEnclosureResult } {
  const diagnostics: EnclosureDiagnostic[] = [
    enclosureDiagnostic("ENCLOSURE_WALL_GIRT_NOT_PROVEN", "Подбор стеновых ригелей не реализован без source-backed правила.", "WALL_GIRT"),
    enclosureDiagnostic("ENCLOSURE_STUD_RULE_NOT_PROVEN", "Правила стеновых стоек и фасадных стоек не доказаны.", "WALL_STUD/FACADE_POST"),
    enclosureDiagnostic("ENCLOSURE_OPENING_FRAMING_NOT_PROVEN", "Обрамление проёмов холодной оболочки не реализовано.", "OPENING_FRAMING"),
    enclosureDiagnostic("ENCLOSURE_SOURCE_EVIDENCE_MISSING", "Каталоги листов, кронштейнов, крепежа и доборных элементов отсутствуют в доказанном enclosure source set.", "SHEET/BRACKET/FASTENER/TRIM"),
  ];
  const [wallGirtDiagnostic, studDiagnostic, openingDiagnostic, sourceDiagnostic] = diagnostics;
  const result: ColdEnclosureResult = {
    wallGirts: emptyWallGirts(wallGirtDiagnostic!),
    wallStuds: { kind: "WALL_STUD", ...section("WALL_STUD", studDiagnostic!) },
    facadePosts: { kind: "FACADE_POST", ...section("FACADE_POST", studDiagnostic!) },
    openingFraming: { kind: "OPENING_FRAMING", ...section("OPENING_FRAMING", openingDiagnostic!) },
    wallSheet: { kind: "SHEET", ...section("WALL_SHEET", sourceDiagnostic!) },
    roofSheet: { kind: "SHEET", ...section("ROOF_SHEET", sourceDiagnostic!) },
    brackets: { kind: "BRACKET", ...section("BRACKET", sourceDiagnostic!) },
    fasteners: { kind: "FASTENER", ...section("FASTENER", sourceDiagnostic!) },
    trims: { kind: "TRIM", ...section("TRIM", sourceDiagnostic!) },
    diagnostics,
    provenance: [UNKNOWN_PROVENANCE],
    totals: { knownMass_kg: 0, unknownMassComponents: ["wallGirts", "wallStuds", "facadePosts", "openingFraming", "wallSheet", "roofSheet", "brackets", "fasteners", "trims"], knownCost: null, unknownCostComponents: ["all enclosure components"] },
  };
  void input;
  void structuralContext;
  return { status: "success", result };
}
