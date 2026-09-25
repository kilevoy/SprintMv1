import { describe, expect, it } from "vitest";
import fixture from "../../docs/enclosure/evidence/project-wall-girt-core2-no-stud.json";
import { createDefaultProjectInput } from "../project/defaults";
import { calculateCore2ProfiledSheetScenario } from "./calculateCore2ProfiledSheetScenario";

function scenarioInput() {
  const project = createDefaultProjectInput();
  project.geometry.span_m = fixture.project_input.span_m as 12;
  project.geometry.building_length_m = fixture.project_input.building_length_m;
  project.geometry.building_height_m = fixture.project_input.building_height_m;
  project.geometry.responsibility_factor = fixture.project_input.responsibility_factor as 0.8;
  project.other.terrain_type = fixture.project_input.terrain as "В";
  project.envelope.system = "PROFILED_SHEET_COLD";
  project.envelope.wall_system = "С-18 0,5мм";
  project.envelope.roof_covering = "профлист";
  project.openings = [];
  project.enclosure = {
    wall_girts: [],
    wall_geometry: {
      SIDE: {
        wallCalculationHeight_m: fixture.controllers.wall_calculation_height_m,
        cornerHalfLength_m: fixture.controllers.corner_half_length_m,
        supportStep_m: fixture.controllers.support_step_m,
        provenance: [{ status: "LEGACY_PROVEN", fixtureId: fixture.fixture_id }],
      },
      END: {
        wallCalculationHeight_m: fixture.controllers.wall_calculation_height_m,
        cornerHalfLength_m: fixture.controllers.corner_half_length_m,
        supportStep_m: fixture.controllers.support_step_m,
        provenance: [{ status: "LEGACY_PROVEN", fixtureId: fixture.fixture_id }],
      },
    },
  };
  return {
    project,
    climate: {
      mode: "CITY_LOOKUP" as const,
      country: "RU" as const,
      normative_system: "SP_20" as const,
      climate_source: "CITY_LOOKUP" as const,
      wind_load: fixture.climate.wind_load_kPa,
    },
    runtimeOverrides: {
      zoneType: fixture.runtime_filters.zone_type as "CORNER",
      insulationThickness_mm: fixture.runtime_filters.insulation_thickness_mm,
      utilizationOverride: 0,
      profileFamily: fixture.runtime_filters.profile_family,
      sectionType: fixture.runtime_filters.section_type,
      material: fixture.runtime_filters.material,
      minProfileHeight_mm: fixture.runtime_filters.profile_height_mm[0]!,
      maxProfileHeight_mm: fixture.runtime_filters.profile_height_mm[1]!,
      minThickness_mm: fixture.runtime_filters.thickness_mm[0]!,
      maxThickness_mm: fixture.runtime_filters.thickness_mm[1]!,
      minStep_mm: fixture.runtime_filters.step_mm[0]!,
      maxStep_mm: fixture.runtime_filters.step_mm[1]!,
      manualStepMode: fixture.runtime_filters.manual_step_mode as "none",
    },
    profiledSheetProfiles: {
      wallProfile: "С-18 0,5мм",
      roofProfile: "С-44 0,7мм",
    },
  };
}

describe("Core 2 profiled-sheet end-to-end orchestration", () => {
  it("connects ProjectInput, SIDE/END wall-girts and takeoff without changing the wall-girt golden", () => {
    const result = calculateCore2ProfiledSheetScenario(scenarioInput());
    expect(result.status).toBe("PROVEN");
    if (result.status !== "PROVEN") return;
    expect(result.side.geometry.orientation).toBe("SIDE");
    expect(result.end.geometry.orientation).toBe("END");
    expect(result.side.zone.totalKnownMass_kg).toBeCloseTo(fixture.expected.total_known_mass_kg, 10);
    expect(result.end.zone.totalKnownMass_kg).toBeCloseTo(fixture.expected.total_known_mass_kg, 10);
    expect(result.enclosure.profiledSheetTakeoff?.lines.find((line) => line.sourceCell === "12м!C41")?.quantity).toBeCloseTo(257.4, 10);
    expect(result.enclosure.profiledSheetTakeoff?.lines.find((line) => line.sourceCell === "12м!C78")?.mass_kg).toBeCloseTo(1948.716, 8);
    expect(result.enclosure.profiledSheetTakeoff?.knownMass_kg).toBeCloseTo(5038.09111337931, 8);
    expect(result.enclosure.profiledSheetTakeoff?.lines.find((line) => line.sourceCell === "12м!C80")?.mass_kg).toBeNull();
    expect(result.enclosure.profiledSheetTakeoff?.diagnostics[0]?.code).toBe("ENCLOSURE_MATERIAL_MASS_NOT_PROVEN");
    expect(result.enclosure.wallGirts.manualZones).toHaveLength(2);
    expect(result.enclosure.totals.knownMass_kg).toBeCloseTo(5977.74871337931, 8);
  });

  it("returns typed unsupported diagnostics for openings", () => {
    const input = scenarioInput();
    input.project.openings = [{ id: "gate-1", kind: "gate", width_mm: 4000, height_mm: 4000, quantity: 1 }];
    const result = calculateCore2ProfiledSheetScenario(input);
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.enclosure).toBeNull();
    expect(result.diagnostics.map((item) => item.code)).toContain("ENCLOSURE_OPENINGS_UNSUPPORTED");
  });
});
