import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateCore1Diagnostic } from "./compatibility";
import { BrowserCore1DataRepository } from "./data";
import type { Core1DataSource } from "./data";
import { calculateCore1 } from "./engine";
import { resolveDesignSpanFamily } from "./frame";
import { getLegacyConnectionReplayFixture, resolveLegacyConnection, resolveLegacyConnectionReplay } from "./legacyConnection";
import type { LegacyConnectionSnapshot } from "./legacyConnection";
import type { Core1Input } from "./types";

class TestDataSource implements Core1DataSource {
  public constructor(private readonly rootDirectory: string) {}
  public async getText(assetPath: string): Promise<string> { return readFile(resolve(this.rootDirectory, assetPath), "utf8"); }
  public async getJson<T>(assetPath: string): Promise<T> { return JSON.parse(await this.getText(assetPath)) as T; }
}

const repository = new BrowserCore1DataRepository(new TestDataSource(resolve(import.meta.dirname, "../..")));

function input(city: string, span_m: number, building_length_m: number, building_height_m: number, snow_retention_purlin: "есть" | "нет"): Core1Input {
  return {
    climate: { mode: "CITY_LOOKUP", country: "RU", city, normative_system: "SP_20" },
    span_m,
    building_length_m,
    building_height_m,
    responsibility_factor: 1,
    frame_step_override_m: null,
    roof_covering: "С-П 150",
    roof_deck_grade: "С44-1000-0,7",
    snow_retention_purlin,
    enclosure_purlin: "нет",
    horizontal_bracing_override: null,
    gates_le_6m_count: 0,
    gates_gt_6m_count: 0,
    doors_count: 0,
    windows: { enabled: false, window_type: 1, window_height_m: 0, window_strip_length_m: 0, separate_window_count: 0, glazing_construction: "2ой стеклопакет" },
    selection_mode: "стандарт",
    building_roof_type: "двускатное",
    purlin_max_step_override_mm: null,
    purlin_min_step_mm: 0,
    terrain_type: "В",
    window_scheme_factor: 1,
    window_utilization_limit: 0.85,
  };
}

async function resolveGeneric(projectInput: Core1Input) {
  const engine = await calculateCore1(projectInput, repository);
  expect(engine.status).toBe("success");
  if (engine.status !== "success" || !engine.context?.legacyClimate || !engine.context.legacyFrameBranch || !engine.context.frame || !engine.context.purlin) throw new Error("Core1 reference context is incomplete");
  const family = resolveDesignSpanFamily(projectInput.span_m);
  if (family === null) throw new Error("Missing design family");
  const [frame, selectionRules, profileCatalogue, calculationAxis, calculationConstants, literals, steelGrades, roofProperties, deckProperties] = await Promise.all([
    repository.loadFrameDataset(family),
    repository.loadPurlinDataset("purlin_selection_rules"),
    repository.loadPurlinDataset("purlin_profile_catalogue"),
    repository.loadPurlinDataset("purlin_calculation_axis"),
    repository.loadPurlinDataset("purlin_calculation_constants"),
    repository.loadPurlinDataset("purlin_literals"),
    repository.loadPurlinDataset("purlin_steel_grades"),
    repository.loadRoofProperties(),
    repository.loadDeckProperties(),
  ]);
  return resolveLegacyConnection({
    ...projectInput,
    climate: engine.context.climate,
    baseLegacyClimate: engine.context.legacyClimate,
    baseLegacyFrameBranch: engine.context.legacyFrameBranch,
    baseFrame: engine.context.frame,
    basePurlin: engine.context.purlin,
  }, { frame, purlin: { selectionRules, profileCatalogue, calculationAxis, calculationConstants, literals, steelGrades, roofProperties, deckProperties } });
}

const projectInputs = {
  "22318": { span_m: 15 },
  "22316": { span_m: 18 },
  "22329": { span_m: 12 },
  "22326": { span_m: 10.4 },
} as const;

const expected = {
  "22318": { activeBranch: "ROW14", ridgeBeamBoltPattern: "8х2", ridgeBeamBoltQuantity: 276, eaveBeamBoltPattern: "9х2", supportColumnBoltPattern: "7х2", eaveColumnBoltPattern: "10х2", fittingsWeightKg: 238 },
  "22316": { activeBranch: "ROW14", ridgeBeamBoltPattern: "10х2", ridgeBeamBoltQuantity: 308, eaveBeamBoltPattern: "10х2", supportColumnBoltPattern: "7х2", eaveColumnBoltPattern: "10х2", fittingsWeightKg: 264 },
  "22329": { activeBranch: "ROW14", ridgeBeamBoltPattern: "8х2", ridgeBeamBoltQuantity: 276, eaveBeamBoltPattern: "9х2", supportColumnBoltPattern: "7х2", eaveColumnBoltPattern: "9х2", fittingsWeightKg: 233 },
  "22326": { activeBranch: "ROW15", ridgeBeamBoltPattern: "8х2", ridgeBeamBoltQuantity: 260, eaveBeamBoltPattern: "9х2", supportColumnBoltPattern: "6х2", eaveColumnBoltPattern: "8х2", fittingsWeightKg: 223 },
} as const;

describe("LegacyConnectionReplayResolver", () => {
  it.each(Object.keys(projectInputs))("replays exact six outputs for project %s", (projectId) => {
    const snapshot = getLegacyConnectionReplayFixture(projectId);
    expect(snapshot).not.toBeNull();
    const result = resolveLegacyConnectionReplay(projectInputs[projectId as keyof typeof projectInputs], snapshot);
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result).toMatchObject(expected[projectId as keyof typeof expected]);
  });

  it("does not use projectId as a calculation selector", () => {
    const snapshot = getLegacyConnectionReplayFixture("22326");
    expect(snapshot).not.toBeNull();
    if (!snapshot) return;
    const renamed = { ...snapshot, provenance: { ...snapshot.provenance, projectId: "unrelated-metadata" } };
    const result = resolveLegacyConnectionReplay({ span_m: 10.4 }, renamed);
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result.activeBranch).toBe("ROW15");
    expect(result.result.ridgeBeamBoltQuantity).toBe(260);
  });

  it("returns a typed diagnostic when the replay snapshot is absent", () => {
    const result = resolveLegacyConnectionReplay({ span_m: 15 }, undefined);
    expect(result.status).toBe("snapshot_required");
    expect(result.diagnostics[0]?.code).toBe("LEGACY_CONNECTION_SNAPSHOT_REQUIRED");
    expect(validateCore1Diagnostic(result.diagnostics[0]).valid).toBe(true);
  });

  it("rejects a snapshot from a different design family", () => {
    const snapshot = getLegacyConnectionReplayFixture("22318");
    expect(snapshot).not.toBeNull();
    if (!snapshot) return;
    const result = resolveLegacyConnectionReplay({ span_m: 18 }, snapshot);
    expect(result.status).toBe("invalid_snapshot");
    expect(result.diagnostics[0]?.code).toBe("LEGACY_CONNECTION_SNAPSHOT_MISMATCH");
  });

  it("preserves the 24 m legacy #N/A result without normalization", () => {
    const snapshot: LegacyConnectionSnapshot = {
      schema_version: 1,
      designFamily: 24,
      activeBranch: "ROW14",
      selectedRow: {
        sourceSheet: "24м",
        sourceAddresses: ["KP19", "KT19", "KU19", "KV19", "KW19", "KX19"],
        F: "#N/A",
        J: "#N/A",
        K: "#N/A",
        L: "#N/A",
        M: "#N/A",
        N: "#N/A",
      },
      provenance: {
        projectId: "24m-control",
        sourceWorkbook: "legacy-24m.xlsx",
        sourceWorkbookSha256: "a".repeat(64),
        formulaFingerprint: "d734ba3bb993740f3efa4be45fe4574a52ca072a14fae01cd1d7c9bcb98e1cf8",
      },
    };
    const result = resolveLegacyConnectionReplay({ span_m: 24 }, snapshot);
    expect(result.status).toBe("legacy_error");
    if (result.status !== "legacy_error") return;
    expect(result.result.ridgeBeamBoltQuantity).toBe("#N/A");
    expect(result.result.eaveColumnBoltPattern).toBe("#N/A");
    expect(result.diagnostics[0]?.code).toBe("LEGACY_NA");
  });
});

describe("LegacyConnectionResolver", () => {
  const controls = [
    { id: "22318", input: input("Сургут", 15, 24, 5, "нет"), expected: expected["22318"] },
    { id: "22316", input: input("Березовский", 18, 30, 5, "есть"), expected: expected["22316"] },
    { id: "22329", input: input("Увильды", 12, 26, 4, "нет"), expected: expected["22329"] },
    { id: "22326", input: input("Увильды", 10.4, 25.7, 4, "нет"), expected: expected["22326"] },
  ] as const;

  it.each(controls)("reproduces generic connection outputs for $id", async ({ input: projectInput, expected: output }) => {
    const result = await resolveGeneric(projectInput);
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.connection).toMatchObject(output);
  });

  it("exposes the generic D8 result for the compatibility control", async () => {
    const engine = await calculateCore1(input("Увильды", 10.4, 25.7, 4, "нет"), repository);
    expect(engine.status).toBe("success");
    if (engine.status === "success") expect(engine.context?.legacyFrameStep?.automaticFrameStepM).toBe(6);
  });

  it("preserves ROW14 on exact E8/E9 equality", async () => {
    const result = await resolveGeneric(input("Увильды", 12, 26, 4, "нет"));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.connection.trace.row14.scoreKgPerM2).toBe(result.connection.trace.row15.scoreKgPerM2);
    expect(result.connection.activeBranch).toBe("ROW14");
  });

  it("selects ROW15 at the first score divergence for 22326", async () => {
    const result = await resolveGeneric(input("Увильды", 10.4, 25.7, 4, "нет"));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    // 22326 remains a SOURCE_SUSPICIOUS compatibility case, so its absolute
    // candidate scores are diagnostic rather than normative oracles.  The
    // proven selector relation and resulting ROW15 output remain stable.
    expect(result.connection.trace.row14.scoreKgPerM2).toBeGreaterThan(result.connection.trace.row15.scoreKgPerM2);
    expect(result.connection.activeBranch).toBe("ROW15");
  });

  it("keeps manual frame-step and 24 m outside the proven generic domain", async () => {
    const manual = input("Увильды", 12, 26, 4, "нет");
    manual.frame_step_override_m = 6;
    const manualEngine = await calculateCore1({ ...manual, frame_step_override_m: null }, repository);
    expect(manualEngine.status).toBe("success");
    if (manualEngine.status !== "success" || !manualEngine.context?.legacyClimate || !manualEngine.context.legacyFrameBranch || !manualEngine.context.frame || !manualEngine.context.purlin) return;
    const family = resolveDesignSpanFamily(manual.span_m)!;
    const [frame, selectionRules, profileCatalogue, calculationAxis, calculationConstants, literals, steelGrades, roofProperties, deckProperties] = await Promise.all([
      repository.loadFrameDataset(family), repository.loadPurlinDataset("purlin_selection_rules"), repository.loadPurlinDataset("purlin_profile_catalogue"), repository.loadPurlinDataset("purlin_calculation_axis"), repository.loadPurlinDataset("purlin_calculation_constants"), repository.loadPurlinDataset("purlin_literals"), repository.loadPurlinDataset("purlin_steel_grades"), repository.loadRoofProperties(), repository.loadDeckProperties(),
    ]);
    const result = resolveLegacyConnection({ ...manual, climate: manualEngine.context.climate, baseLegacyClimate: manualEngine.context.legacyClimate, baseLegacyFrameBranch: manualEngine.context.legacyFrameBranch, baseFrame: manualEngine.context.frame, basePurlin: manualEngine.context.purlin }, { frame, purlin: { selectionRules, profileCatalogue, calculationAxis, calculationConstants, literals, steelGrades, roofProperties, deckProperties } });
    expect(result.status).toBe("unsupported");
    const family24 = resolveLegacyConnection({ ...manual, span_m: 24, frame_step_override_m: null, climate: manualEngine.context.climate, baseLegacyClimate: manualEngine.context.legacyClimate, baseLegacyFrameBranch: manualEngine.context.legacyFrameBranch, baseFrame: manualEngine.context.frame, basePurlin: manualEngine.context.purlin }, { frame, purlin: { selectionRules, profileCatalogue, calculationAxis, calculationConstants, literals, steelGrades, roofProperties, deckProperties } });
    expect(family24.status).toBe("legacy_error");
    expect(family24.diagnostics[0]?.code).toBe("LEGACY_NA");
  });
});
