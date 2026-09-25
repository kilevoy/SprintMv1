import { describe, expect, it } from "vitest";
import fixture from "../../docs/enclosure/evidence/project-wall-girt-core2-no-stud.json";
import { createDefaultProjectInput } from "../project/defaults";
import { calculateProjectV15WallGirtFromInputs } from "./calculateProjectWallGirt";

const controls = {
  wallCalculationHeight_m: fixture.controllers.wall_calculation_height_m,
  cornerHalfLength_m: fixture.controllers.corner_half_length_m,
  supportStep_m: fixture.controllers.support_step_m,
  provenance: [{ status: "LEGACY_PROVEN" as const, fixtureId: fixture.fixture_id }],
};

const runtimeOverrides = {
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
};

function project() {
  const value = createDefaultProjectInput();
  value.geometry.span_m = fixture.project_input.span_m as 12;
  value.geometry.building_length_m = fixture.project_input.building_length_m;
  value.geometry.building_height_m = fixture.project_input.building_height_m;
  value.geometry.responsibility_factor = fixture.project_input.responsibility_factor as 0.8;
  value.other.terrain_type = fixture.project_input.terrain as "В";
  value.envelope.system = "PROFILED_SHEET_COLD";
  value.envelope.wall_system = "Профнастил";
  value.envelope.roof_covering = "профлист";
  value.openings = [];
  value.enclosure = {
    wall_girts: [],
    wall_geometry: {
      SIDE: controls,
      END: controls,
    },
  };
  return value;
}

describe("Core 2 profiled-sheet wall-girt vertical load path", () => {
  it.each(["SIDE", "END"] as const)("reaches proven geometry, zone and mass for %s", (orientation) => {
    const result = calculateProjectV15WallGirtFromInputs({
      project: project(),
      climate: {
        mode: "CITY_LOOKUP",
        country: "RU",
        normative_system: "SP_20",
        climate_source: "CITY_LOOKUP",
        wind_load: fixture.climate.wind_load_kPa,
      },
      orientation,
      controls: null,
      runtimeOverrides,
    });
    expect(result.status).toBe("PROVEN");
    if (result.status !== "PROVEN") return;
    expect(result.geometry).toMatchObject({
      orientation,
      wallCalculationLength_m: orientation === "SIDE" ? 18 : 12,
      cornerZoneLength_m: fixture.expected.corner_zone_length_m,
      typicalZoneLength_m: fixture.expected.typical_zone_length_m[orientation],
    });
    expect(result.zone).toMatchObject({
      wall: orientation,
      zoneType: "CORNER",
      profile: fixture.expected.selected_profile,
      sectionType: fixture.expected.section_type,
      girtStep_m: fixture.expected.girt_step_m,
      rows: fixture.expected.rows,
      profileLength_m: fixture.expected.profile_length_m,
      bracketCount: fixture.expected.bracket_count,
    });
    expect(result.zone.totalKnownMass_kg).toBeCloseTo(fixture.expected.total_known_mass_kg, 10);
  });

  it("returns typed diagnostics instead of inventing a ProjectInput geometry mapping", () => {
    const result = calculateProjectV15WallGirtFromInputs({
      project: { ...project(), enclosure: { wall_girts: [] } },
      climate: null,
      orientation: "SIDE",
      controls: null,
      runtimeOverrides,
    });
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.diagnostics[0]?.code).toBe("ENCLOSURE_PROJECT_GEOMETRY_REQUIRED");
  });
});
