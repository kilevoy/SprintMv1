import { describe, expect, it } from "vitest";
import { replayManualWallGirt, type ManualWallGirtReplayInput } from "./manualWallGirtReplay";

const base = {
  wall: "SIDE" as const,
  zoneType: "CORNER" as const,
  wallHeight_m: 9.3,
  zoneLength_m: 12,
  girtStep_m: 1.37,
  structuralPostStep_m: 6,
  profile: { profileId: "]ПП 145x45x1,5", sectionMass_kg_m: 2.6716 },
};

const replay = (sectionType: ManualWallGirtReplayInput["sectionType"], overrides: Partial<ManualWallGirtReplayInput> = {}) => replayManualWallGirt({ ...base, sectionType, ...overrides });

describe("manual wall-girt replay", () => {
  it.each([
    ["]", 2.6716, 8, 96, 256.4736, 16, 0.75, 12],
    ["[]", 5.3432, 7, 84, 448.8288, 14, 1.5, 21],
    ["][", 5.3432, 7, 84, 448.8288, 14, 1.5, 21],
    ["[-]", 7.3285, 7, 84, 615.594, 14, 1.5, 21],
  ] as const)("replays %s with source formulas", (sectionType, massPerMeter, rows, length, profileMass, brackets, bracketUnitMass, bracketMass) => {
    const result = replay(sectionType, { profile: { profileId: base.profile.profileId, sectionMass_kg_m: massPerMeter } });
    expect(result.status).toBe("PROVEN");
    expect(result.zone).toMatchObject({ rows, profileLength_m: length, bracketCount: brackets, bracketUnitMass_kg: bracketUnitMass, bracketMass_kg: bracketMass });
    expect(result.zone?.profileMass_kg).toBeCloseTo(profileMass, 10);
    expect(result.zone?.totalKnownMass_kg).toBeCloseTo(profileMass + bracketMass, 10);
  });

  it("preserves the typical-zone manual input without changing the formula", () => {
    const result = replay("]", { zoneType: "TYPICAL", girtStep_m: 1.38 });
    expect(result.zone).toMatchObject({ zoneType: "TYPICAL", rows: 8, profileLength_m: 96 });
  });

  it.each([
    ["openings", { openingCount: 1 }, "ENCLOSURE_OPENINGS_UNSUPPORTED"],
    ["plus studs", { plusStands: true }, "ENCLOSURE_PLUS_STUDS_UNSUPPORTED"],
    ["automatic selection", { selectionMode: "AUTO" }, "ENCLOSURE_AUTO_GIRT_SELECTION_NOT_IMPLEMENTED"],
  ] as const)("rejects unsupported %s branches", (_label, overrides, code) => {
    const result = replay("]", overrides);
    expect(result.status).toBe("UNSUPPORTED");
    expect(result.diagnostics[0]?.code).toBe(code);
    expect(result.zone).toBeNull();
  });

  it("does not fabricate a result for invalid dimensions", () => {
    const result = replay("]", { girtStep_m: 0 });
    expect(result.status).toBe("INVALID");
    expect(result.diagnostics[0]?.code).toBe("ENCLOSURE_INVALID_MANUAL_GIRT_INPUT");
  });
});
