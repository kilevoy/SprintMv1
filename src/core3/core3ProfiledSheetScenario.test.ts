import { describe, expect, it } from "vitest";
import fixture from "../../docs/enclosure/evidence/project-wall-girt-core2-no-stud.json";
import { createDefaultProjectInput } from "../project/defaults";
import { calculateCore2ProfiledSheetScenario } from "../enclosure/calculateCore2ProfiledSheetScenario";
import { calculateCore3ProfiledSheetScenario } from "./calculateCore3ProfiledSheetScenario";
import { resolveCore3Price } from "./priceResolver";

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
    expect(result.provenance.sha256).toBe("08ea5728ad901409b651081b849dfb6db2c182c6b71c972224674365c0372b87");
    expect(result.lines.find((line) => line.product === "С-18 0,5мм")?.unitPrice).toBe(794.65);
    expect(result.lines.find((line) => line.product === "С-44 0,7мм")?.unitPrice).toBe(691.98);
    expect(result.lines.find((line) => line.product === "Уплотнитель (2м)")?.unitPrice).toBe(612);
    expect(result.lines.find((line) => line.product === "Уплотнитель (2м)")?.lineCost).toBe(12240);
    expect(result.unknownCostComponents).toContain("wall-girts");
    expect(result.diagnostics.map((d) => d.code)).toContain("CORE3_WALL_GIRT_PRICE_NOT_PROVEN");
  });

  it("rejects generic profiled-sheet labels without a proven exact mark", () => {
    const generic = resolveCore3Price({ component: "SHEET", orientation: "PROJECT_WIDE", product: "профлист", quantity: 10, unit: "m2" });
    expect(generic.unitPrice).toBeNull();
    expect(generic.diagnostics[0]?.code).toBe("CORE3_GENERIC_PROFILE_MARK_UNSUPPORTED");
  });
});
