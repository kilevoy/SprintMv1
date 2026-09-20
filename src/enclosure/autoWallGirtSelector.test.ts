import { describe, expect, it } from "vitest";
import {
  replaySelectedAutoWallGirt,
  selectAutoWallGirt,
  toManualWallGirtReplayInput,
  type AutoWallGirtRuntimeInput,
} from "./autoWallGirtSelector";

const sourceCase: AutoWallGirtRuntimeInput = {
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

describe("restricted legacy AUTO wall-girt selector", () => {
  it("reproduces the cached corner golden result", () => {
    const result = selectAutoWallGirt(sourceCase);
    expect(result.status).toBe("LEGACY_PROVEN");
    expect(result.selected).toMatchObject({ sourceRow: 161, step_mm: 1370, branch: "NO_STUD", jw: 1 });
    expect(result.selected?.objective).toBeCloseTo(233.41455363, 10);
    expect(result.selected?.objectiveTerms.stepTieBreakTerm).toBe(-0.00000137);
  });

  it("reproduces the cached typical golden result", () => {
    const result = selectAutoWallGirt({ ...sourceCase, zoneType: "TYPICAL" });
    expect(result.status).toBe("LEGACY_PROVEN");
    expect(result.selected).toMatchObject({ sourceRow: 46, step_mm: 1380, branch: "NO_STUD", jw: 1 });
    expect(result.selected?.objective).toBeCloseTo(188.57523862, 10);
  });

  it("is deterministic and preserves source-order traversal", () => {
    const first = selectAutoWallGirt(sourceCase);
    const second = selectAutoWallGirt(sourceCase);
    expect(second).toEqual(first);
  });

  it("rejects unsupported normative or stud branches without fallback", () => {
    expect(selectAutoWallGirt({ ...sourceCase, normativeSystem: "SP_20" }).status).toBe("LEGACY_PROVEN");
    expect(selectAutoWallGirt({ ...sourceCase, withoutStuds: false as true }).status).toBe("INVALID");
  });

  it("reuses the proven manual replay after AUTO selection", () => {
    const selection = selectAutoWallGirt(sourceCase);
    expect(selection.selected).not.toBeNull();
    const input = toManualWallGirtReplayInput(sourceCase, selection.selected!);
    expect(input.selectionMode).toBe("MANUAL");
    expect(input.girtStep_m).toBe(1.37);
    expect(input.structuralPostStep_m).toBe(6);
    const replay = replaySelectedAutoWallGirt(sourceCase);
    expect(replay.status).toBe("PROVEN");
    expect(replay.zone).toMatchObject({ zoneType: "CORNER", rows: 7, girtStep_m: 1.37, zoneLength_m: 12, bracketCount: 14 });
  });

  it("keeps the manual replay path unchanged", () => {
    const result = replaySelectedAutoWallGirt({ ...sourceCase, maxStep_mm: 0 });
    expect(result.status).toBe("UNSUPPORTED");
  });
});
