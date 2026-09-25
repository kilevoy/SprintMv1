import { describe, expect, it } from "vitest";
import { calculateColdEnclosure, projectInputToColdEnclosureInput, replayManualWallGirt } from "./index";
import type { ProjectInput } from "../project";
import type { ManualWallGirtReplayInput } from "./manualWallGirtReplay";
import type { AutoWallGirtRuntimeInput } from "./autoWallGirtSelector";

const project: ProjectInput = {
  countryCode: "RU",
  climate: { mode: "CITY_LOOKUP", country: "RU", city: "Роза", normative_system: "SP_20" },
  geometry: { span_m: 10.4, building_length_m: 25.7, building_height_m: 4, responsibility_factor: 1.0, frame_step_override_m: null },
  envelope: { system: "SANDWICH_PANEL", roof_covering: "С-П 200", roof_deck_grade: "С44-1000-0,7", wall_system: "Сэндвич-панель 200 мм" },
  supply: { scope: null },
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

  it("uses the explicit horizontal sandwich semantic without fabricating full enclosure parity", () => {
    const input = projectInputToColdEnclosureInput(project, null, {
      cladding: "INSULATED_SANDWICH",
      mountingOrientation: "HORIZONTAL",
    });
    const result = calculateColdEnclosure(input).result;
    expect(result.wallGirts.status).toBe("EMPTY");
    expect(result.wallGirts.knownMass_kg).toBe(0);
    expect(result.wallGirts.diagnostics).toMatchObject([{ code: "ENCLOSURE_SANDWICH_HORIZONTAL_GIRTS_SKIPPED", severity: "warning" }]);
    expect(result.totals.unknownMassComponents).not.toContain("wallGirts");
    expect(result.totals.unknownMassComponents).toContain("wallSheet");
    expect(result.totals.unknownMassComponents).toContain("roofSheet");
  });

  it("does not infer horizontal mounting or skip vertical sandwich support", () => {
    const input = projectInputToColdEnclosureInput(project, null, { cladding: "INSULATED_SANDWICH", mountingOrientation: "VERTICAL" });
    const result = calculateColdEnclosure(input).result;
    expect(result.wallGirts.diagnostics.map((item) => item.code)).toContain("ENCLOSURE_WALL_GIRT_NOT_PROVEN");
    expect(result.wallGirts.diagnostics.map((item) => item.code)).not.toContain("ENCLOSURE_SANDWICH_HORIZONTAL_GIRTS_SKIPPED");
  });

  it("keeps profiled-sheet path typed partial when full enclosure rules are absent", () => {
    const profiledProject = {
      ...project,
      envelope: { ...project.envelope, system: "PROFILED_SHEET_COLD" as const, roof_covering: "профлист" as const, wall_system: "Профнастил" },
      openings: [],
    };
    const result = calculateColdEnclosure(projectInputToColdEnclosureInput(profiledProject)).result;
    expect(result.diagnostics.map((item) => item.code)).toContain("ENCLOSURE_SOURCE_EVIDENCE_MISSING");
    expect(result.totals.unknownMassComponents).toContain("wallSheet");
    expect(result.totals.unknownCostComponents).toContain("all enclosure components");
  });

  it("keeps provenance statuses serializable", () => {
    const input = projectInputToColdEnclosureInput(project, null, { canonicalClimate: null });
    const result = calculateColdEnclosure(input);
    const serialized = JSON.stringify({ status: "REAL_PROJECT_VALIDATED", sourceWorkbook: "fixture.xlsx", fixtureId: "fixture-1" });
    expect(JSON.parse(serialized)).toMatchObject({ status: "REAL_PROJECT_VALIDATED", fixtureId: "fixture-1" });
    expect(result.result.provenance[0]?.status).toBe("UNKNOWN");
  });

  it("exposes the proven profiled-sheet quantity takeoff and known unit masses", () => {
    const profiledProject = {
      ...project,
      envelope: { ...project.envelope, system: "PROFILED_SHEET_COLD" as const, roof_covering: "профлист" as const, wall_system: "С-18 0,5мм" },
      geometry: { ...project.geometry, span_m: 15, building_length_m: 30, building_height_m: 6 },
      openings: [],
    };
    const result = calculateColdEnclosure(projectInputToColdEnclosureInput(profiledProject)).result;
    expect(result.profiledSheetTakeoff?.status).toBe("PARTIAL");
    expect(result.profiledSheetTakeoff?.lines.find((line) => line.sourceCell === "12м!C41")?.quantity).toBeCloseTo(676.5, 10);
    expect(result.profiledSheetTakeoff?.lines.find((line) => line.sourceCell === "12м!C106")?.quantity).toBeCloseTo(6765, 10);
    expect(result.profiledSheetTakeoff?.lines.find((line) => line.sourceCell === "12м!C78")?.quantity).toBeCloseTo(531.96, 10);
    expect(result.profiledSheetTakeoff?.knownMass_kg).toBeCloseTo(7153.59225075862, 8);
    expect(result.profiledSheetTakeoff?.lines.find((line) => line.sourceCell === "12м!C78")?.mass_kg).toBeNull();
    expect(result.profiledSheetTakeoff?.diagnostics[0]?.code).toBe("ENCLOSURE_MATERIAL_MASS_NOT_PROVEN");
  });

  it("does not run the profiled-sheet takeoff for an explicit plus-stud branch", () => {
    const profiledProject = {
      ...project,
      envelope: { ...project.envelope, system: "PROFILED_SHEET_COLD" as const, roof_covering: "профлист" as const, wall_system: "Профнастил" },
      openings: [],
    };
    const input = {
      ...projectInputToColdEnclosureInput(profiledProject),
      wallGirts: {
        mode: "MANUAL" as const,
        zones: [{
          wall: "SIDE" as const,
          zoneType: "CORNER" as const,
          wallHeight_m: 6,
          zoneLength_m: 12,
          girtStep_m: 1.2,
          structuralPostStep_m: 4,
          sectionType: "]" as const,
          profile: { profileId: "]ПП 145x45x1,5", sectionMass_kg_m: 2.6716 },
          plusStands: true,
        }],
      },
    };
    const result = calculateColdEnclosure(input).result;
    expect(result.profiledSheetTakeoff).toBeNull();
    expect(result.wallGirts.diagnostics.map((item) => item.code)).toContain("ENCLOSURE_PLUS_STUDS_UNSUPPORTED");
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

  function input(zones: ManualWallGirtReplayInput[] = [zone]) {
    return { ...projectInputToColdEnclosureInput(noOpeningProject), wallGirts: { mode: "MANUAL" as const, zones } };
  }

  const autoZone: AutoWallGirtRuntimeInput = {
    zoneType: "CORNER",
    wall: "SIDE",
    buildingLength_m: 24,
    wallCalculationLength_m: 24,
    wallCalculationHeight_m: 9.3,
    postStep_m: 6,
    buildingHeight_m: 10.5,
    w0_kPa: 0.3,
    terrain: "В",
    responsibility: 0.8,
    insulationThickness_mm: 0,
    utilizationOverride: 0,
    profileFamily: "all",
    sectionType: "all",
    material: "all",
    minProfileHeight_mm: 145,
    maxProfileHeight_mm: 145,
    minThickness_mm: 0,
    maxThickness_mm: 100,
    minStep_mm: 0,
    maxStep_mm: 1500,
    manualStepMode: "none",
    withoutStuds: true,
    normativeSystem: "SP_20",
  };

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
    const automatic = calculateColdEnclosure({ ...projectInputToColdEnclosureInput(noOpeningProject), wallGirts: { mode: "AUTO", zones: [autoZone] } }).result;
    expect(automatic.wallGirts.autoZones[0]?.selection.sourceRow).toBe(161);
    expect(automatic.wallGirts.manualZones).toEqual([]);
  });
});

describe("Cold Enclosure explicit AUTO wall-girt integration", () => {
  const autoZone: AutoWallGirtRuntimeInput = {
    zoneType: "CORNER",
    wall: "SIDE",
    buildingLength_m: 24,
    wallCalculationLength_m: 24,
    wallCalculationHeight_m: 9.3,
    postStep_m: 6,
    buildingHeight_m: 10.5,
    w0_kPa: 0.3,
    terrain: "В",
    responsibility: 0.8,
    insulationThickness_mm: 0,
    utilizationOverride: 0,
    profileFamily: "all",
    sectionType: "all",
    material: "all",
    minProfileHeight_mm: 145,
    maxProfileHeight_mm: 145,
    minThickness_mm: 0,
    maxThickness_mm: 100,
    minStep_mm: 0,
    maxStep_mm: 1500,
    manualStepMode: "none",
    withoutStuds: true,
    normativeSystem: "SP_20",
  };

  const input = (zones: AutoWallGirtRuntimeInput[] = [autoZone], openings: ProjectInput["openings"] = []) => ({
    ...projectInputToColdEnclosureInput({ ...project, openings }),
    wallGirts: { mode: "AUTO" as const, zones },
  });

  it("selects the corner golden and exposes selection plus replay", () => {
    const result = calculateColdEnclosure(input()).result;
    expect(result.wallGirts.autoZones[0]).toMatchObject({ selection: { sourceRow: 161, step_mm: 1370, branch: "NO_STUD" }, replay: { rows: 7, girtStep_m: 1.37, zoneLength_m: 12 } });
    expect(result.wallGirts.knownMass_kg).toBe(result.wallGirts.autoZones[0]?.replay.totalKnownMass_kg);
    expect(result.totals.unknownMassComponents).toContain("wallStuds");
  });

  it("selects the typical golden without changing the manual replay path", () => {
    const result = calculateColdEnclosure(input([{ ...autoZone, zoneType: "TYPICAL" }])).result;
    expect(result.wallGirts.autoZones[0]).toMatchObject({ selection: { sourceRow: 46, step_mm: 1380 }, replay: { zoneType: "TYPICAL" } });
  });

  it("rejects openings before selecting or replaying AUTO zones", () => {
    const result = calculateColdEnclosure(input([autoZone], [{ id: "window-1", kind: "window", width_mm: 1500, height_mm: 1200, quantity: 1, window_type: 1, glazing_construction: "2ой стеклопакет" }])).result;
    expect(result.wallGirts.autoZones).toEqual([]);
    expect(result.diagnostics.map((item) => item.code)).toContain("ENCLOSURE_OPENINGS_UNSUPPORTED");
  });

  it("is deterministic for identical explicit AUTO input", () => {
    expect(calculateColdEnclosure(input())).toEqual(calculateColdEnclosure(input()));
  });

  it("does not start AUTO from the ProjectInput adapter", () => {
    const projected = projectInputToColdEnclosureInput({ ...project, openings: [] });
    expect(projected.wallGirts).toBeUndefined();
  });
});
