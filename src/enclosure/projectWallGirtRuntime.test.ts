import { describe, expect, it } from "vitest";
import { createDefaultProjectInput } from "../project";
import { buildProjectV15AutoRuntime, type ProjectV15AutoRuntimeOverrides } from "./projectWallGirtRuntime";
import { calculateProjectV15WallGirtFromInputs } from "./calculateProjectWallGirt";
import type { Core1ClimateResult } from "../core1/types";

const climate: Core1ClimateResult = {
  mode: "CITY_LOOKUP",
  country: "RU",
  normative_system: "SP_20",
  climate_source: "CITY_LOOKUP",
  snow_region: "III",
  snow_load: 1.5,
  wind_region: "II",
  wind_load: 0.3,
};
const controls = {
  wallCalculationHeight_m: 4,
  cornerHalfLength_m: 1.2,
  supportStep_m: 4.5,
  provenance: [],
};
const overrides: ProjectV15AutoRuntimeOverrides = {
  zoneType: "CORNER",
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
};

describe("Project v1.5 AUTO runtime adapter", () => {
  it("derives only proven project and climate fields", () => {
    const result = buildProjectV15AutoRuntime({ project: createDefaultProjectInput(), climate, orientation: "SIDE", controls, overrides });
    expect(result.status).toBe("READY");
    if (result.status === "READY") {
      expect(result.runtime).toMatchObject({
        wall: "SIDE",
        buildingLength_m: 18,
        wallCalculationLength_m: 18,
        wallCalculationHeight_m: 4,
        postStep_m: 4.5,
        cornerHalfLength_m: 1.2,
        buildingHeight_m: 3,
        w0_kPa: 0.3,
        terrain: "В",
        responsibility: 0.8,
        normativeSystem: "SP_20",
      });
    }
  });

  it("does not infer missing controller or source filters", () => {
    const result = buildProjectV15AutoRuntime({ project: createDefaultProjectInput(), climate, orientation: "SIDE", controls: null, overrides: null });
    expect(result.status).toBe("MISSING_INPUT");
    expect(result.diagnostics[0]?.code).toBe("ENCLOSURE_PROJECT_GEOMETRY_REQUIRED");
  });

  it("rejects unsupported normative branch before selector execution", () => {
    const result = buildProjectV15AutoRuntime({ project: createDefaultProjectInput(), climate: { ...climate, normative_system: "SP_RK_EN" }, orientation: "SIDE", controls, overrides });
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.diagnostics[0]?.code).toBe("ENCLOSURE_AUTO_DOMAIN_UNSUPPORTED");
  });

  it("passes a complete explicit runtime to the proven selector boundary", () => {
    const result = calculateProjectV15WallGirtFromInputs({
      project: createDefaultProjectInput(),
      climate,
      orientation: "SIDE",
      controls,
      runtimeOverrides: overrides,
    });
    expect(result.diagnostics.some((item) => item.code === "ENCLOSURE_AUTO_SOURCE_INPUT_MISSING")).toBe(false);
  });
});
