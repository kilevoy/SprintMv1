import { describe, expect, it } from "vitest";
import fixture from "../../docs/enclosure/evidence/profiled-sheet-takeoff-archive-fixture.json";
import { calculateProfiledSheetTakeoff } from "./profiledSheetTakeoff";

function quantity(result: ReturnType<typeof calculateProfiledSheetTakeoff>, cell: string): number {
  return result.lines.find((line) => line.sourceCell === cell)?.quantity ?? Number.NaN;
}

describe("profiled-sheet quantity replay", () => {
  it.each(["21874", "21985"] as const)("matches archived source quantities for %s", (projectId) => {
    const expected = fixture.expected[projectId];
    const result = calculateProfiledSheetTakeoff({
      span_m: expected.span_m,
      buildingLength_m: expected.length_m,
      wallHeight_m: expected.height_m,
      wallProfile: "С-18 0,5мм",
      roofProfile: "С-44 0,7мм",
    });
    expect(result.status).toBe("PARTIAL");
    expect(quantity(result, "12м!C41")).toBeCloseTo(expected.wall_sheet_m2, 10);
    expect(quantity(result, "12м!C40")).toBeCloseTo(expected.outer_corner_trim_pcs, 10);
    expect(quantity(result, "12м!C50")).toBeCloseTo(expected.roof_deck_m2, 10);
    expect(quantity(result, "12м!C78")).toBeCloseTo(expected.roof_sheet_m2, 10);
    expect(quantity(result, "12м!C74")).toBe(expected.ridge_trim_pcs);
    expect(quantity(result, "12м!C76")).toBe(expected.gable_trim_pcs);
    expect(quantity(result, "12м!C80")).toBe(expected.ridge_seal_pcs);
    expect(quantity(result, "12м!C106")).toBeCloseTo(expected.wall_fasteners_pcs, 10);
    expect(quantity(result, "12м!C137")).toBeCloseTo(expected.roof_fasteners_pcs, 10);
    expect(result.knownMass_kg).toBeCloseTo(projectId === "21874" ? 11090.096250758623 : 16540.672103172416, 8);
    expect(result.lines.find((line) => line.sourceCell === "12м!C80")?.mass_kg).toBeNull();
    expect(result.diagnostics[0]?.code).toBe("ENCLOSURE_MATERIAL_MASS_NOT_PROVEN");
  });

  it("does not apply proven weights to an unknown product label", () => {
    const result = calculateProfiledSheetTakeoff({
      span_m: 15,
      buildingLength_m: 30,
      wallHeight_m: 6,
      wallProfile: "Профнастил неизвестной марки",
      roofProfile: "профлист",
    });
    expect(result.lines.find((line) => line.sourceCell === "12м!C41")?.quantity).toBeCloseTo(676.5, 10);
    expect(result.lines.find((line) => line.sourceCell === "12м!C41")?.mass_kg).toBeNull();
    expect(result.lines.find((line) => line.sourceCell === "12м!C78")?.mass_kg).toBeNull();
    expect(result.diagnostics[0]?.details?.missing).toEqual([
      "wall:Профнастил неизвестной марки",
      "roof:профлист",
      "trim:Уплотнитель (2м)",
    ]);
  });
});
