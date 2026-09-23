import normalized from "./claudeFixture10.normalized.json";
import openings from "./claudeFixture10.openings.raw.json";
import baseline from "../../../core1/fixtures/baseline_12m.input.json";
import { calculateCore1 } from "../engine/calculateCore1";
import { BrowserCore1DataRepository } from "../data";
import type { Core1DataSource } from "../data";
import type { Core1Input } from "../types";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type NormalizedFixture = (typeof normalized.fixtures)[number];
type OpeningFixture = (typeof openings.fixtures)[keyof typeof openings.fixtures];

/** Test-only formula oracle; no standalone Core1 frame-count export exists. */
function formulaParityFrameCount(lengthM: number, frameStepM: number): number {
  return Math.ceil(lengthM / frameStepM) + 1;
}

function nextUp(value: number): number {
  if (Number.isNaN(value) || value === Infinity) return value;
  if (value === 0) return Number.MIN_VALUE;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value, false);
  let bits = view.getBigUint64(0, false);
  bits = value > 0 ? bits + 1n : bits - 1n;
  view.setBigUint64(0, bits, false);
  return view.getFloat64(0, false);
}

function nextDown(value: number): number {
  if (Number.isNaN(value) || value === -Infinity) return value;
  if (value === 0) return -Number.MIN_VALUE;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value, false);
  let bits = view.getBigUint64(0, false);
  bits = value > 0 ? bits - 1n : bits + 1n;
  view.setBigUint64(0, bits, false);
  return view.getFloat64(0, false);
}

function validFiniteInput(lengthM: number, frameStepM: number): boolean {
  return Number.isFinite(lengthM) && Number.isFinite(frameStepM) && lengthM > 0 && frameStepM > 0;
}

const passingBaseline = baseline.input as Core1Input;

class HarnessDataSource implements Core1DataSource {
  public async getText(assetPath: string): Promise<string> {
    return readFile(resolve(import.meta.dirname, "../../../", assetPath), "utf8");
  }

  public async getJson<T>(assetPath: string): Promise<T> {
    return JSON.parse(await this.getText(assetPath)) as T;
  }
}

function harnessRepository(): BrowserCore1DataRepository {
  return new BrowserCore1DataRepository(new HarnessDataSource());
}

/** Only the four scalar fields below are source-derived in this harness. */
function core1HarnessInput(fixture: NormalizedFixture, useSourceManualStep: boolean): Core1Input {
  return {
    ...passingBaseline,
    span_m: fixture.span_m,
    building_length_m: fixture.length_m,
    building_height_m: fixture.height_m,
    frame_step_override_m: useSourceManualStep ? fixture.manualFrameStep_m : passingBaseline.frame_step_override_m ?? null,
  };
}

function diagnosticRow(projectId: string, result: Awaited<ReturnType<typeof calculateCore1>>) {
  const diagnostic = result.diagnostics[0];
  return {
    projectId,
    status: result.status,
    code: diagnostic?.code ?? null,
    severity: diagnostic?.severity ?? null,
    fieldPath: diagnostic?.trigger ?? diagnostic?.source_cells.join(",") ?? null,
    message: diagnostic?.message ?? diagnostic?.message_ru ?? null,
    inputValue: diagnostic?.details ?? null,
  };
}

describe("Claude fixture 10 normalized regression harness", () => {
  it("has the restricted normalized schema and no production semantics", () => {
    expect(normalized.source.sourceRepo).toBe("insicomet/SprintM");
    expect(normalized.source.sourceCommit).toBe("a24b92823c46b20157e26e0dccdb323a06e34727");
    expect(normalized.fixtures).toHaveLength(10);
    for (const fixture of normalized.fixtures) {
      expect(Object.keys(fixture).sort()).toEqual([
        "expectedFrameCount", "height_m", "length_m", "liveSheet", "manualFrameStep_m", "projectId", "sourceCommit", "sourceFile", "sourceRepo", "sourceSchema", "span_m",
      ]);
      expect(fixture.sourceRepo).toBe(normalized.source.sourceRepo);
      expect(fixture.sourceCommit).toBe(normalized.source.sourceCommit);
      expect(fixture.sourceSchema).toBe(normalized.source.sourceAuditSchema);
    }
  });

  it.each(normalized.fixtures)("matches XLSX scalar frame count for $projectId", (fixture: NormalizedFixture) => {
    expect(formulaParityFrameCount(fixture.length_m, fixture.manualFrameStep_m)).toBe(fixture.expectedFrameCount);
  });

  it("proves 10/10 frame-count parity without asserting axis positions", () => {
    const matches = normalized.fixtures.filter((fixture) => formulaParityFrameCount(fixture.length_m, fixture.manualFrameStep_m) === fixture.expectedFrameCount);
    expect(matches).toHaveLength(10);
  });

  it("uses the existing successful baseline fixture as the only non-source input template", async () => {
    const result = await calculateCore1(passingBaseline, harnessRepository());
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.result.canonical.frameGrid.frameCount).toBe(4);
    }
  });

  it("isolates geometry-only and source-manual-step production diagnostics", async () => {
    const matrix = await Promise.all(normalized.fixtures.map(async (fixture) => ({
      projectId: fixture.projectId,
      geometryOnly: diagnosticRow(fixture.projectId, await calculateCore1(core1HarnessInput(fixture, false), harnessRepository())),
      withSourceManualStep: diagnosticRow(fixture.projectId, await calculateCore1(core1HarnessInput(fixture, true), harnessRepository())),
    })));

    expect(matrix).toHaveLength(10);
    expect(matrix.filter((row) => row.geometryOnly.status === "success")).toHaveLength(2);
    expect(matrix.filter((row) => row.withSourceManualStep.status === "success")).toHaveLength(0);
    for (const row of matrix) {
      expect(row.geometryOnly.projectId).toBe(row.projectId);
      expect(row.withSourceManualStep.projectId).toBe(row.projectId);
    }
  });

  it("preserves the source opening classification without connecting openings to Core1", () => {
    const values = Object.values(openings.fixtures) as OpeningFixture[];
    expect(values).toHaveLength(10);
    expect(values.filter((fixture) => fixture.windows.count > 0)).toHaveLength(0);
    expect(values.filter((fixture) => fixture.doors.count > 0)).toHaveLength(6);
    expect(values.filter((fixture) => fixture.gates.count > 0)).toHaveLength(10);
    for (const fixture of values) {
      for (const opening of [fixture.windows, fixture.doors, fixture.gates]) {
        if (opening.count === 0) {
          const inactive = opening as { count: number; width_m?: number; height_m?: number; area_m2?: number };
          expect(inactive.width_m ?? 0).toBe(0);
          expect(inactive.height_m ?? 0).toBe(0);
          expect(inactive.area_m2 ?? 0).toBe(0);
        }
      }
    }
    expect(openings.positionStatus).toBe("UNKNOWN");
  });

  it.each([
    [20, 4, "nextDown"], [20, 4, "exact"], [20, 4, "nextUp"],
    [17, 3.4, "nextDown"], [17, 3.4, "exact"], [17, 3.4, "nextUp"],
    [17.5, 3.5, "nextDown"], [17.5, 3.5, "exact"], [17.5, 3.5, "nextUp"],
    [19.6, 3.92, "nextDown"], [19.6, 3.92, "exact"], [19.6, 3.92, "nextUp"],
  ] as const)("tests %s boundary for step %s", (boundaryLength, step, mode) => {
    const length = mode === "nextDown" ? nextDown(boundaryLength) : mode === "nextUp" ? nextUp(boundaryLength) : boundaryLength;
    expect(validFiniteInput(length, step)).toBe(true);
    expect(formulaParityFrameCount(length, step)).toBe(Math.ceil(length / step) + 1);
  });

  it.each([
    [19.999999999999, 4], [20, 4], [20.000000000001, 4],
    [16.999999999999, 3.4], [17.000000000001, 3.4],
    [17.499999999999, 3.5], [17.500000000001, 3.5],
    [19.599999999999, 3.92], [19.600000000001, 3.92],
  ] as const)("accepts practical decimal boundary input length=%s step=%s", (length, step) => {
    expect(validFiniteInput(length, step)).toBe(true);
    expect(Number.isInteger(formulaParityFrameCount(length, step))).toBe(true);
  });

  it.each([
    [0, 4], [20, 0], [-1, 4], [20, -4], [Number.NaN, 4], [20, Number.NaN], [Infinity, 4], [20, Infinity], [20, -Infinity],
  ] as const)("identifies invalid frame-count input length=%s step=%s", (length, step) => {
    // Existing production typed diagnostic is not exposed as a standalone frame-count API.
    // Keep this as an explicit GAP assertion rather than inventing a production behavior.
    expect(validFiniteInput(length, step)).toBe(false);
  });
});
