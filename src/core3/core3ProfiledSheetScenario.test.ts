import { describe, expect, it } from "vitest";
import fixture from "../../docs/enclosure/evidence/project-wall-girt-core2-no-stud.json";
import { createDefaultProjectInput } from "../project/defaults";
import { calculateCore2ProfiledSheetScenario } from "../enclosure/calculateCore2ProfiledSheetScenario";
import { calculateCore3FromEnclosureResult, calculateCore3ProfiledSheetScenario } from "./calculateCore3ProfiledSheetScenario";
import { auditCore3ProfilePriceCatalog, resolveCore3Price, resolveCore3PurlinPrice } from "./priceResolver";
import type { Core3PriceEntry } from "./priceTypes";
import priceDataset from "./data/price-dataset-v1.json";

function core2Result() {
  const project = createDefaultProjectInput();
  project.geometry.span_m = 12;
  project.geometry.building_length_m = fixture.project_input.building_length_m;
  project.geometry.building_height_m = fixture.project_input.building_height_m;
  project.geometry.responsibility_factor = 0.8;
  project.envelope.system = "PROFILED_SHEET_COLD";
  project.envelope.wall_system = "С-18 0,5мм";
  project.envelope.roof_covering = "профлист";
  project.openings = [];
  project.enclosure = { wall_girts: [], wall_geometry: {
    SIDE: { wallCalculationHeight_m: 9.3, cornerHalfLength_m: 6, supportStep_m: 6, provenance: [{ status: "LEGACY_PROVEN", fixtureId: fixture.fixture_id }] },
    END: { wallCalculationHeight_m: 9.3, cornerHalfLength_m: 6, supportStep_m: 6, provenance: [{ status: "LEGACY_PROVEN", fixtureId: fixture.fixture_id }] },
  }};
  return calculateCore2ProfiledSheetScenario({
    project,
    climate: { mode: "CITY_LOOKUP", country: "RU", normative_system: "SP_20", climate_source: "CITY_LOOKUP", wind_load: fixture.climate.wind_load_kPa },
    runtimeOverrides: { zoneType: "CORNER", insulationThickness_mm: 0, utilizationOverride: 0, profileFamily: "all", sectionType: "all", material: "all", minProfileHeight_mm: 145, maxProfileHeight_mm: 145, minThickness_mm: 0, maxThickness_mm: 100, minStep_mm: 0, maxStep_mm: 1500, manualStepMode: "none" },
    profiledSheetProfiles: { wallProfile: "С-18 0,5мм", roofProfile: "С-44 0,7мм" },
  });
}

describe("Core 3 profiled-sheet commercial path", () => {
  it("prices every proven takeoff line and preserves unknown wall-girt cost", () => {
    const result = calculateCore3ProfiledSheetScenario(core2Result());
    expect(result.status).toBe("PARTIAL");
    expect(result.costStatus).toBe("KNOWN_COST");
    expect(result.provenance.sha256).toBe("08ea5728ad901409b651081b849dfb6db2c182c6b71c972224674365c0372b87");
    expect(result.provenance.catalogs?.map((catalog) => catalog.datasetId)).toEqual([
      "core3-price-dataset-v1-2026-03-12",
      "core3-profile-price-catalog-v1-2026-09-23",
    ]);
    expect(result.lines.find((line) => line.product === "С-18 0,5мм")?.unitPrice).toBe(794.65);
    expect(result.lines.find((line) => line.product === "С-18 0,5мм")?.costStatus).toBe("KNOWN_COST");
    expect(result.lines.find((line) => line.product === "С-44 0,7мм")?.unitPrice).toBe(691.98);
    expect(result.lines.find((line) => line.product === "Уплотнитель (2м)")?.unitPrice).toBe(612);
    expect(result.lines.find((line) => line.product === "Уплотнитель (2м)")?.lineCost).toBe(12240);
    expect(result.lines.find((line) => line.product === "Уголок 50х50 нар")?.unitPrice).toBe(640);
    expect(result.lines.find((line) => line.product === "Уголок 50х50 нар")?.source?.price_cell).toBe("E50");
    for (const line of result.lines.filter((candidate) => candidate.component !== "WALL_GIRT")) {
      expect(line.unitPrice, line.product).not.toBeNull();
      expect(line.source, line.product).not.toBeNull();
    }
    const wallGirtLine = result.lines.find((line) => line.component === "WALL_GIRT");
    expect(wallGirtLine?.unitPrice).toBe(396);
    expect(wallGirtLine?.quantity).toBe(168);
    expect(wallGirtLine?.lineCost).toBe(66528);
    const bracketLine = result.lines.find((line) => line.product === "wall-girt-brackets");
    expect(bracketLine?.unit).toBe("m");
    expect(bracketLine?.unitPrice).toBe(2278);
    expect(bracketLine?.quantity).toBeGreaterThan(0);
    expect(bracketLine?.source?.code_cell).toBe("D861");
    expect(bracketLine?.source?.sha256).toBe("2f3a9ea415801dc4a93d6c4e3a1f95f95d429c8fd6100cd5d459806ec11433fe");
    expect(bracketLine?.source?.effective_date).toBe("2026-09-23");
    expect(result.unknownCostComponents).not.toContain("wall-girt-brackets");
    expect(result.diagnostics.map((d) => d.code)).not.toContain("CORE3_WALL_GIRT_BRACKET_PRICE_NOT_PROVEN");
  });

  it("rejects generic profiled-sheet labels without a proven exact mark", () => {
    const generic = resolveCore3Price({ component: "SHEET", orientation: "PROJECT_WIDE", product: "профлист", quantity: 10, unit: "m2" });
    expect(generic.unitPrice).toBeNull();
    expect(generic.diagnostics[0]?.code).toBe("CORE3_GENERIC_PROFILE_MARK_UNSUPPORTED");
  });

  it("resolves an imported profile by its exact 1C code", () => {
    const resolved = resolveCore3Price({ component: "WALL_GIRT", orientation: "SIDE", product: "119085", quantity: 10, unit: "m" });
    expect(resolved.unitPrice).toBe(396);
    expect(resolved.lineCost).toBe(3960);
    expect(resolved.source?.sheet).toBe("TDSheet");
    expect(resolved.source?.price_cell).toBe("G927");
  });

  it("returns typed diagnostics for missing prices and unit mismatches", () => {
    const missing: Core3PriceEntry = {
      id: "missing", canonical_mark: "Тест без цены", aliases: [], unit: "pcs", price_per_unit: null,
      source: { sheet: "test", row: 1, price_cell: "E1", unit_cell: "F1", name_cell: "B1" },
    };
    const missingResult = resolveCore3Price({ component: "TRIM", orientation: "ROOF", product: "Тест без цены", quantity: 1, unit: "pcs" }, [missing]);
    expect(missingResult.diagnostics[0]?.code).toBe("CORE3_PRICE_NOT_FOUND");
    const unitResult = resolveCore3Price({ component: "TRIM", orientation: "ROOF", product: "Тест без цены", quantity: 1, unit: "m2" }, [{ ...missing, price_per_unit: 10 }]);
    expect(unitResult.diagnostics[0]?.code).toBe("CORE3_UNIT_UNKNOWN");
  });

  it("prices proven Core1 purlin aliases from total mass without double-counting a 2ПС pair", () => {
    const result = resolveCore3PurlinPrice({
      purlin_profile: "2ПС 195х45х1,5",
      purlin_steel: "М.п.390",
      purlin_weight_kg: 1699.2,
    });
    expect(result.component).toBe("PURLIN");
    expect(result.unit).toBe("m");
    expect(result.quantity).toBeCloseTo(1699.2 / 3.5396, 10);
    expect(result.unitPrice).toBe(525);
    expect(result.lineCost).toBeCloseTo((1699.2 / 3.5396) * 525, 8);
    expect(result.source?.code_cell).toBe("D947");
    expect(result.diagnostics).toEqual([]);
    expect(result.costStatus).toBe("KNOWN_COST");
  });

  it("keeps an unproven Core1 purlin mark unknown instead of fuzzy matching", () => {
    const result = resolveCore3PurlinPrice({
      purlin_profile: "2ПС 999х99х9",
      purlin_steel: "М.п.390",
      purlin_weight_kg: 100,
    });
    expect(result.lineCost).toBeNull();
    expect(result.diagnostics[0]?.code).toBe("CORE3_PURLIN_PRICE_NOT_PROVEN");
  });

  it("adds a proven purlin line when the Core1 result is supplied and keeps frame gaps explicit", () => {
    const core2 = core2Result();
    expect(core2.status).toBe("PROVEN");
    if (core2.status !== "PROVEN" || !core2.enclosure) return;
    const result = calculateCore3FromEnclosureResult(core2.enclosure, {
      purlin_profile: "2ПС 195х45х1,5",
      purlin_steel: "М.п.390",
      purlin_weight_kg: 1699.2,
      beam_profile: "ПГС300/20х80х3",
      column_profile: "ПГС300/20х80х2",
    } as never);
    expect(result.lines.find((line) => line.component === "PURLIN")?.lineCost).not.toBeNull();
    expect(result.unknownCostComponents).toContain("frame-beam:ПГС300/20х80х3");
    expect(result.unknownCostComponents).toContain("secondary-steel");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("CORE3_FRAME_PROFILE_PRICE_NOT_PROVEN");
  });

  it("audits the imported profile catalog without conflicts or missing masses", () => {
    const diagnostics = auditCore3ProfilePriceCatalog();
    expect(diagnostics.filter((diagnostic) => diagnostic.code === "CORE3_PROFILE_MASS_NOT_PROVEN")).toHaveLength(4);
    expect(diagnostics.some((diagnostic) => diagnostic.code === "CORE3_PROFILE_PRICE_CONFLICT")).toBe(false);
    expect(diagnostics.some((diagnostic) => diagnostic.code === "CORE3_PROFILE_PRICE_CATALOG_DUPLICATE")).toBe(false);
  });

  it("keeps workbook provenance on every legacy price entry", () => {
    for (const entry of priceDataset.entries) {
      expect(entry.source.workbook, entry.id).toEqual(expect.any(String));
      expect(entry.source.sha256, entry.id).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.source.effective_date, entry.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
