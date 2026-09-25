import type { Core2ProfiledSheetScenarioResult } from "../enclosure/calculateCore2ProfiledSheetScenario";
import { core3Diagnostic, type Core3Diagnostic } from "./diagnostics";
import type { Core3CommercialResult } from "./priceTypes";
import { resolveCore3Price } from "./priceResolver";

export function calculateCore3ProfiledSheetScenario(core2: Core2ProfiledSheetScenarioResult): Core3CommercialResult {
  const provenance = { workbook: "Z:\\Предварительные расчеты\\Калькуляторы\\Прайс для предрасчетов (не изменять).xlsx", sha256: "08ea5728ad901409b651081b849dfb6db2c182c6b71c972224674365c0372b87", effective_date: "2026-03-12" };
  if (core2.status !== "PROVEN" || !core2.enclosure?.profiledSheetTakeoff) {
    const diagnostics: Core3Diagnostic[] = [core3Diagnostic("CORE3_CORE2_RESULT_REQUIRED", "Core 3 требует доказанный результат Core 2 с profiled-sheet takeoff.", "CORE3")];
    return { status: "UNSUPPORTED", datasetId: "core3-price-dataset-v1-2026-03-12", lines: [], knownCost: 0, unknownCostComponents: ["core2"], diagnostics, provenance };
  }
  const takeoff = core2.enclosure.profiledSheetTakeoff;
  const lines = takeoff.lines.map(resolveCore3Price);
  const diagnostics = lines.flatMap((line) => line.diagnostics);
  if (core2.enclosure.wallGirts.manualZones.length > 0 || core2.enclosure.wallGirts.autoZones.length > 0) {
    diagnostics.push(core3Diagnostic("CORE3_WALL_GIRT_PRICE_NOT_PROVEN", "Для выбранного wall-girt profile нет доказанного коммерческого mapping в текущем dataset.", "WALL_GIRT"));
  }
  const unknownCostComponents = lines.filter((line) => line.lineCost === null).map((line) => line.product);
  if (core2.enclosure.wallGirts.manualZones.length > 0 || core2.enclosure.wallGirts.autoZones.length > 0) unknownCostComponents.push("wall-girts");
  return {
    status: unknownCostComponents.length > 0 ? "PARTIAL" : "PARTIAL",
    datasetId: "core3-price-dataset-v1-2026-03-12",
    lines,
    knownCost: lines.reduce((sum, line) => sum + (line.lineCost ?? 0), 0),
    unknownCostComponents,
    diagnostics,
    provenance,
  };
}
