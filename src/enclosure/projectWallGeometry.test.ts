import { describe, expect, it } from "vitest";
import { createDefaultProjectInput } from "../project/defaults";
import { resolveProjectV15WallGeometry, resolveProjectWallGeometry } from "./projectWallGeometry";
import { calculateProjectV15WallGirt, calculateProjectWallGirt } from "./calculateProjectWallGirt";

describe("ProjectInput wall geometry boundary", () => {
  it("returns a typed diagnostic when B11/B12/B13-equivalent geometry is absent", () => {
    const result = resolveProjectWallGeometry(createDefaultProjectInput(), null);
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.diagnostics[0]?.code).toBe("ENCLOSURE_PROJECT_GEOMETRY_REQUIRED");
  });

  it("does not run AUTO without an explicit runtime contract", () => {
    const result = calculateProjectWallGirt({ project: createDefaultProjectInput(), geometryOverride: null, autoRuntime: null });
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.diagnostics[0]?.code).toBe("ENCLOSURE_PROJECT_GEOMETRY_REQUIRED");
  });

  it("requires the audited AUTO runtime after geometry is resolved", () => {
    const result = calculateProjectWallGirt({
      project: createDefaultProjectInput(),
      geometryOverride: {
        orientation: "SIDE",
        wallCalculationLength_m: 10,
        wallCalculationHeight_m: 4.7,
        cornerHalfLength_m: 2,
        supportStep_m: 5,
        provenance: [{ status: "LEGACY_PROVEN", fixtureId: "runtime-gate" }],
      },
      autoRuntime: null,
    });
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.diagnostics[0]?.code).toBe("ENCLOSURE_WALL_GIRT_RUNTIME_REQUIRED");
  });

  it("passes explicit audited geometry to the proven resolver", () => {
    const project = createDefaultProjectInput();
    const result = resolveProjectWallGeometry(project, {
      orientation: "SIDE",
      wallCalculationLength_m: 10,
      wallCalculationHeight_m: 4.7,
      cornerHalfLength_m: 2,
      supportStep_m: 5,
      provenance: [{ status: "LEGACY_PROVEN", sourceWorkbook: "Калькулятор ограждайки v1.5.xlsx", sourceSheet: "Лист1", sourceCell: "B11:B13", fixtureId: "enclosure-calculator-v15-default" }],
    });
    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") {
      expect(result.geometry).toMatchObject({ orientation: "SIDE", cornerZoneLength_m: 0, typicalZoneLength_m: 10 });
      expect(result.provenance[0]?.fixtureId).toBe("enclosure-calculator-v15-default");
    }
  });

  it("reaches explicit geometry to auto wall-girt replay without ProjectInput inference", () => {
    const project = createDefaultProjectInput();
    const geometry = resolveProjectWallGeometry(project, {
      orientation: "SIDE",
      wallCalculationLength_m: 24,
      wallCalculationHeight_m: 9.3,
      cornerHalfLength_m: 6,
      supportStep_m: 6,
      provenance: [{ status: "LEGACY_PROVEN", fixtureId: "explicit-integration-fixture" }],
    });
    expect(geometry.status).toBe("RESOLVED");
    if (geometry.status !== "RESOLVED") return;
    const result = calculateProjectWallGirt({
      project,
      geometryOverride: {
        orientation: "SIDE",
        wallCalculationLength_m: 24,
        wallCalculationHeight_m: 9.3,
        cornerHalfLength_m: 6,
        supportStep_m: 6,
        provenance: [{ status: "LEGACY_PROVEN", fixtureId: "explicit-integration-fixture" }],
      },
      autoRuntime: {
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
      },
    });
    expect(result.status).toBe("PROVEN");
    if (result.status === "PROVEN") expect(result.zone).toMatchObject({ zoneType: "CORNER", zoneLength_m: 12, rows: 7 });
  });

  it("applies only the proven v1.5 B11 orientation mapping", () => {
    const project = createDefaultProjectInput();
    const controls = {
      wallCalculationHeight_m: 4.7,
      cornerHalfLength_m: 2,
      supportStep_m: 5,
      provenance: [{ status: "LEGACY_PROVEN" as const, fixtureId: "v15-length-mapping" }],
    };
    const side = resolveProjectV15WallGeometry(project, { ...controls, orientation: "SIDE" });
    const end = resolveProjectV15WallGeometry(project, { ...controls, orientation: "END" });
    expect(side.status).toBe("RESOLVED");
    expect(end.status).toBe("RESOLVED");
    if (side.status === "RESOLVED" && end.status === "RESOLVED") {
      expect(side.geometry.wallCalculationLength_m).toBe(project.geometry.building_length_m);
      expect(end.geometry.wallCalculationLength_m).toBe(project.geometry.span_m);
    }
  });

  it("routes ProjectInput through the v1.5 length mapping without inventing controls", () => {
    const project = createDefaultProjectInput();
    const result = calculateProjectV15WallGirt({
      project,
      orientation: "END",
      controls: {
        wallCalculationHeight_m: 4.7,
        cornerHalfLength_m: 2,
        supportStep_m: 5,
        provenance: [{ status: "LEGACY_PROVEN", fixtureId: "v15-project-input-route" }],
      },
      autoRuntime: null,
    });
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.geometry?.wallCalculationLength_m).toBe(project.geometry.span_m);
    expect(result.diagnostics[0]?.code).toBe("ENCLOSURE_WALL_GIRT_RUNTIME_REQUIRED");
  });

  it("can load audited controllers from ProjectInput when explicitly persisted", () => {
    const project = createDefaultProjectInput();
    project.enclosure = {
      wall_girts: [],
      wall_geometry: {
        END: {
          wallCalculationHeight_m: 4.7,
          cornerHalfLength_m: 2,
          supportStep_m: 5,
          provenance: [{ status: "LEGACY_PROVEN", fixtureId: "persisted-v15-controller" }],
        },
      },
    };
    const result = calculateProjectV15WallGirt({ project, orientation: "END", controls: null, autoRuntime: null });
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.geometry?.wallCalculationLength_m).toBe(project.geometry.span_m);
    expect(result.diagnostics[0]?.code).toBe("ENCLOSURE_WALL_GIRT_RUNTIME_REQUIRED");
  });

  it("runs the proven ProjectInput path through corner and typical mass results", () => {
    const project = createDefaultProjectInput();
    project.enclosure = {
      wall_girts: [],
      wall_geometry: {
        SIDE: {
          wallCalculationHeight_m: 9.3,
          cornerHalfLength_m: 6,
          supportStep_m: 6,
          provenance: [{ status: "LEGACY_PROVEN", fixtureId: "persisted-success" }],
        },
      },
    };
    const runtime = {
      wall: "SIDE" as const,
      buildingLength_m: 24,
      wallCalculationLength_m: 24,
      wallCalculationHeight_m: 9.3,
      postStep_m: 6,
      buildingHeight_m: 10.5,
      w0_kPa: 0.3,
      terrain: "В" as const,
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
      manualStepMode: "none" as const,
      withoutStuds: true as const,
      normativeSystem: "SP_20" as const,
    };
    const corner = calculateProjectV15WallGirt({ project, orientation: "SIDE", controls: null, autoRuntime: { ...runtime, zoneType: "CORNER" } });
    const typical = calculateProjectV15WallGirt({ project, orientation: "SIDE", controls: null, autoRuntime: { ...runtime, zoneType: "TYPICAL" } });
    expect(corner.status).toBe("PROVEN");
    expect(typical.status).toBe("PROVEN");
    if (corner.status === "PROVEN" && typical.status === "PROVEN") {
      expect(corner.zone.zoneLength_m).toBe(12);
      expect(typical.zone.zoneLength_m).toBe(6);
      expect(corner.zone.totalKnownMass_kg).toBeGreaterThan(0);
      expect(typical.zone.totalKnownMass_kg).toBeGreaterThan(0);
    }
  });
});
