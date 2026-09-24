import { describe, expect, it } from "vitest";
import { resolveWallGeometry } from "./wallGeometryResolver";

describe("WallGeometryResolver", () => {
  it("reproduces the proven corner and typical zone formulas", () => {
    const result = resolveWallGeometry({ orientation: "SIDE", wallCalculationLength_m: 24, wallCalculationHeight_m: 9.3, cornerHalfLength_m: 6, supportStep_m: 6 });
    expect(result).toEqual({
      status: "RESOLVED",
      diagnostics: [],
      geometry: {
        orientation: "SIDE",
        wallCalculationLength_m: 24,
        wallCalculationHeight_m: 9.3,
        cornerHalfLength_m: 6,
        supportStep_m: 6,
        cornerZoneLength_m: 12,
        typicalZoneLength_m: 12,
        status: "EXPLICIT_PROVEN",
      },
    });
  });

  it("keeps the explicit orientation and does not infer missing project geometry", () => {
    const result = resolveWallGeometry({ orientation: "END", wallCalculationLength_m: 12, wallCalculationHeight_m: 9.3, cornerHalfLength_m: 6, supportStep_m: 6 });
    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") expect(result.geometry).toMatchObject({ orientation: "END", cornerZoneLength_m: 12, typicalZoneLength_m: 0 });
  });

  it("returns a typed diagnostic for incomplete explicit geometry", () => {
    const result = resolveWallGeometry({ orientation: "SIDE", wallCalculationLength_m: 24, wallCalculationHeight_m: 0, cornerHalfLength_m: 6, supportStep_m: 6 });
    expect(result.status).toBe("INVALID");
    expect(result.diagnostics[0]?.code).toBe("ENCLOSURE_GEOMETRY_INPUT_INVALID");
  });
});
