import { describe, expect, it } from "vitest";
import { calculateColdEnclosure, projectInputToColdEnclosureInput, replayManualWallGirt } from "./index";
import type { ProjectInput } from "../project";
import type { ManualWallGirtReplayInput } from "./manualWallGirtReplay";

const project: ProjectInput = {
  countryCode: "RU",
  climate: { mode: "CITY_LOOKUP", country: "RU", city: "Роза", normative_system: "SP_20" },
  geometry: { span_m: 10.4, building_length_m: 25.7, building_height_m: 4, responsibility_factor: 1.0, frame_step_override_m: null },
  envelope: { roof_covering: "С-П 200", roof_deck_grade: "С44-1000-0,7", wall_system: "Сэндвич-панель 200 мм" },
  openings: [
    { id: "gate-1", kind: "gate", width_mm: 4000, height_mm: 4200, quantity: 1 },
    { id: "window-1", kind: "window", width_mm: 1200, height_mm: 1500, quantity: 2, window_type: 1, glazing_construction: "2ой стеклопакет" },
  ],
  special_conditions: { snow_retention_purlin: "нет", enclosure_purlin: "нет", horizontal_bracing_override: null },
  other: { selection_mode: "стандарт", building_roof_type: "двускатное", purlin_max_step_override_mm: null, purlin_min_step_mm: 0, terrain_type: "В", window_scheme_factor: 1, window_utilization_limit: 0.85 },
};

describe("Cold Enclosure skeleton", () => {
  it("maps ProjectInput without creating a second state model", () => {
    const result = projectInputToColdEnclosureInput(project, { effectiveFrameStep_m: 4.5, frameCount: 7, source: { status: "REAL_PROJECT_VALIDATED", projectId: "22318" } }, { cladding: "INSULATED_SANDWICH" });
    expect(result.wallSystem.system).toBe("Сэндвич-панель 200 мм");
    expect(result.wallSystem.cladding).toBe("INSULATED_SANDWICH");
    expect(result.frameGrid).toMatchObject({ effectiveFrameStep_m: 4.5, frameCount: 7, status: "AUTO" });
  });

  it("preserves literal geometry and detailed openings", () => {
    const result = projectInputToColdEnclosureInput(project);
    expect(result.geometry).toMatchObject({ span_m: 10.4, building_length_m: 25.7, end_wall_width_m: 10.4 });
    expect(result.openings).toEqual(project.openings);
    expect(result.frameGrid.status).toBe("UNKNOWN");
  });

  it("does not project wall-system state into Core1", () => {
    const result = projectInputToColdEnclosureInput(project);
    expect(result.wallSystem.system).toBe(project.envelope.wall_system);
    expect(result).not.toHaveProperty("gates_le_6m_count");
    expect(result).not.toHaveProperty("doors_count");
  });

  it("returns deterministic unknown engineering instead of fabricated quantities", () => {
    const input = projectInputToColdEnclosureInput(project);
    const first = calculateColdEnclosure(input);
    const second = calculateColdEnclosure(input);
    expect(first).toEqual(second);
    expect(first.result.wallGirts.items).toEqual([]);
    expect(first.result.diagnostics.map((item) => item.code)).toContain("ENCLOSURE_WALL_GIRT_NOT_PROVEN");
    expect(first.result.totals.unknownMassComponents).toContain("wallGirts");
  });

  it("distinguishes physically known zero from unknown enclosure mass", () => {
    const result = calculateColdEnclosure(projectInputToColdEnclosureInput(project));
    expect(result.result.totals.knownMass_kg).toBe(0);
    expect(result.result.totals.unknownMassComponents.length).toBeGreaterThan(0);
    expect(result.result.totals.knownCost).toBeNull();
  });

  it("keeps provenance statuses serializable", () => {
    const input = projectInputToColdEnclosureInput(project, null, { canonicalClimate: null });
    const result = calculateColdEnclosure(input);
    const serialized = JSON.stringify({ status: "REAL_PROJECT_VALIDATED", sourceWorkbook: "fixture.xlsx", fixtureId: "fixture-1" });
    expect(JSON.parse(serialized)).toMatchObject({ status: "REAL_PROJECT_VALIDATED", fixtureId: "fixture-1" });
    expect(result.result.provenance[0]?.status).toBe("UNKNOWN");
  });
});

describe("Cold Enclosure manual wall-girt integration", () => {
  const noOpeningProject = { ...project, openings: [] };
  const zone: ManualWallGirtReplayInput = {
    wall: "SIDE" as const,
    zoneType: "CORNER" as const,
    wallHeight_m: 9.3,
    zoneLength_m: 12,
    girtStep_m: 1.37,
    structuralPostStep_m: 6,
    sectionType: "]" as const,
    profile: { profileId: "]ПП 145x45x1,5", sectionMass_kg_m: 2.6716 },
  };

  function input(zones: ManualWallGirtReplayInput[] = [zone], mode: "MANUAL" | "AUTO" = "MANUAL") {
    return { ...projectInputToColdEnclosureInput(noOpeningProject), wallGirts: { mode, zones } };
  }

  it("delegates a valid corner zone to manualWallGirtReplay", () => {
    const result = calculateColdEnclosure(input()).result;
    const expected = replayManualWallGirt(zone).zone;
    expect(result.wallGirts.manualZones).toEqual([expected]);
    expect(result.wallGirts.status).toBe("PARTIAL");
    expect(result.wallGirts.provenance[0]?.status).toBe("LEGACY_PROVEN");
  });

  it("retains a valid typical zone transparently", () => {
    const typical = { ...zone, zoneType: "TYPICAL" as const, girtStep_m: 1.38 };
    const result = calculateColdEnclosure(input([typical])).result;
    expect(result.wallGirts.manualZones[0]).toMatchObject({ wall: "SIDE", zoneType: "TYPICAL", rows: 8, profileLength_m: 96 });
  });

  it.each([
    ["]", 2.6716, 8],
    ["[]", 5.3432, 7],
    ["][", 5.3432, 7],
    ["[-]", 7.3285, 7],
  ] as const)("supports section %s without duplicating formulas", (sectionType, mass, rows) => {
    const result = calculateColdEnclosure(input([{ ...zone, sectionType, profile: { profileId: `${sectionType} profile`, sectionMass_kg_m: mass } }])).result;
    expect(result.wallGirts.manualZones[0]).toMatchObject({ sectionType, rows });
  });

  it("aggregates known mass for multiple explicit zones only", () => {
    const second = { ...zone, wall: "END" as const, zoneType: "TYPICAL" as const, zoneLength_m: 6 };
    const result = calculateColdEnclosure(input([zone, second])).result;
    const expected = [replayManualWallGirt(zone).zone!, replayManualWallGirt(second).zone!];
    expect(result.wallGirts.manualZones).toEqual(expected);
    expect(result.wallGirts.knownMass_kg).toBeCloseTo(expected[0]!.totalKnownMass_kg + expected[1]!.totalKnownMass_kg, 10);
    expect(result.totals.knownMass_kg).toBe(result.wallGirts.knownMass_kg);
    expect(result.totals.unknownMassComponents).toContain("wallGirtExtraMembers");
  });

  it("rejects project openings instead of silently replaying a gross zone", () => {
    const result = calculateColdEnclosure({ ...projectInputToColdEnclosureInput(project), wallGirts: { mode: "MANUAL", zones: [zone] } }).result;
    expect(result.wallGirts.manualZones).toEqual([]);
    expect(result.diagnostics.map((item) => item.code)).toContain("ENCLOSURE_OPENINGS_UNSUPPORTED");
  });

  it("returns typed diagnostics for plus studs and AUTO", () => {
    const plusStuds = calculateColdEnclosure(input([{ ...zone, plusStands: true }])).result;
    expect(plusStuds.diagnostics.map((item) => item.code)).toContain("ENCLOSURE_PLUS_STUDS_UNSUPPORTED");
    const automatic = calculateColdEnclosure(input([zone], "AUTO")).result;
    expect(automatic.diagnostics.map((item) => item.code)).toContain("ENCLOSURE_AUTO_GIRT_SELECTION_NOT_IMPLEMENTED");
    expect(automatic.wallGirts.manualZones).toEqual([]);
  });
});
