import type { Core2ProfiledSheetScenarioResult } from "../enclosure/calculateCore2ProfiledSheetScenario";
import type { ColdEnclosureResult } from "../enclosure/types";
import type { Core1Result } from "../core1/types";
import { core3Diagnostic, type Core3Diagnostic } from "./diagnostics";
import type { Core3CommercialResult } from "./priceTypes";
import { resolveCore3FramePrices, resolveCore3Price, resolveCore3PurlinPrice, resolveCore3WallGirtBracketPrice, resolveCore3WallGirtPrice } from "./priceResolver";

const DATASET_ID = "core3-price-dataset-v1-2026-03-12";
const provenance = {
  workbook: "Z:\\Предварительные расчеты\\Калькуляторы\\Прайс для предрасчетов (не изменять).xlsx",
  sha256: "08ea5728ad901409b651081b849dfb6db2c182c6b71c972224674365c0372b87",
  effective_date: "2026-03-12",
  catalogs: [
    {
      datasetId: DATASET_ID,
      workbook: "Z:\\Предварительные расчеты\\Калькуляторы\\Прайс для предрасчетов (не изменять).xlsx",
      sha256: "08ea5728ad901409b651081b849dfb6db2c182c6b71c972224674365c0372b87",
      effective_date: "2026-03-12",
    },
    {
      datasetId: "core3-profile-price-catalog-v1-2026-09-23",
      workbook: "ПРАЙС ПОЛНЫЙ на 23.09.2026.xlsx",
      sha256: "2f3a9ea415801dc4a93d6c4e3a1f95f95d429c8fd6100cd5d459806ec11433fe",
      effective_date: "2026-09-23",
    },
  ],
};

function core2RequiredResult(): Core3CommercialResult {
  return {
    status: "UNSUPPORTED",
    costStatus: "UNSUPPORTED",
    datasetId: DATASET_ID,
    lines: [],
    knownCost: 0,
    unknownCostComponents: ["core2"],
    diagnostics: [core3Diagnostic("CORE3_CORE2_RESULT_REQUIRED", "Core 3 требует доказанный результат Core 2 с profiled-sheet takeoff.", "CORE3")],
    provenance,
  };
}

export function calculateCore3FromEnclosureResult(enclosure: ColdEnclosureResult, core1?: Core1Result | null): Core3CommercialResult {
  if (!enclosure.profiledSheetTakeoff) {
    return core2RequiredResult();
  }
  const takeoff = enclosure.profiledSheetTakeoff;
  const lines = takeoff.lines.map((line) => resolveCore3Price(line));
  const wallGirtZones = [
    ...enclosure.wallGirts.manualZones,
    ...enclosure.wallGirts.autoZones.map((zone) => zone.replay),
  ];
  const wallGirtLines = wallGirtZones.map((zone) => resolveCore3WallGirtPrice(zone));
  lines.push(...wallGirtLines);
  const wallGirtBracketLines = wallGirtZones.map((zone) => resolveCore3WallGirtBracketPrice(zone));
  lines.push(...wallGirtBracketLines);
  const structuralDiagnostics: Core3Diagnostic[] = [];
  if (core1) {
    if (core1.purlin_profile && core1.purlin_steel && core1.purlin_weight_kg != null) {
      lines.push(resolveCore3PurlinPrice(core1));
    } else {
      structuralDiagnostics.push(core3Diagnostic("CORE3_STRUCTURAL_QUANTITY_NOT_PROVEN", "Core 1 не предоставил полную массу выбранных кровельных прогонов.", "PURLIN"));
    }
    const frameLines = resolveCore3FramePrices(core1);
    lines.push(...frameLines);
    structuralDiagnostics.push(core3Diagnostic("CORE3_STRUCTURAL_QUANTITY_NOT_PROVEN", "Коммерческие количества вторичной стали Core 1 ещё не имеют доказанного профильно-метражного контракта.", "SECONDARY", { source: "Core1Result.secondarySteel" }));
  }
  const diagnostics = [...lines.flatMap((line) => line.diagnostics), ...structuralDiagnostics];
  const wallGirtCostUnknown = enclosure.wallGirts.status !== "EMPTY";
  if (wallGirtCostUnknown && wallGirtZones.length === 0) {
    diagnostics.push(core3Diagnostic("CORE3_WALL_GIRT_PRICE_NOT_PROVEN", "Для выбранного wall-girt profile нет доказанного коммерческого mapping в текущем dataset.", "WALL_GIRT"));
  }
  const unknownCostComponents = lines.filter((line) => line.lineCost === null).map((line) => line.product);
  if (core1) {
    for (const frameLine of lines.filter((line) => line.component === "FRAME" && line.lineCost === null)) {
      const [role, ...profileParts] = frameLine.product.split(":");
      unknownCostComponents.push(`${role === "beam" || role === "column" ? `frame-${role}` : role}:${profileParts.join(":")}`);
    }
    unknownCostComponents.push("secondary-steel");
  }
  if (wallGirtCostUnknown && wallGirtZones.length === 0) unknownCostComponents.push("wall-girts");
  if (wallGirtZones.length > 0 && wallGirtBracketLines.some((line) => line.lineCost === null)) {
    diagnostics.push(core3Diagnostic("CORE3_WALL_GIRT_BRACKET_PRICE_NOT_PROVEN", "Цена кронштейнов wall-girt не доказана для выбранного dataset.", "WALL_GIRT_BRACKET"));
  }
  return {
    status: unknownCostComponents.length > 0 ? "PARTIAL" : "PARTIAL",
    costStatus: unknownCostComponents.length > 0 ? "UNKNOWN_COST" : "KNOWN_COST",
    datasetId: DATASET_ID,
    lines,
    knownCost: lines.reduce((sum, line) => sum + (line.lineCost ?? 0), 0),
    unknownCostComponents,
    diagnostics,
    provenance,
  };
}

export function calculateCore3ProfiledSheetScenario(core2: Core2ProfiledSheetScenarioResult): Core3CommercialResult {
  if (core2.status !== "PROVEN" || !core2.enclosure) {
    return core2RequiredResult();
  }
  return calculateCore3FromEnclosureResult(core2.enclosure);
}
