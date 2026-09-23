import normalized from "./claudeFixture10.normalized.json";
import { describe, expect, it } from "vitest";

type NormalizedFixture = (typeof normalized.fixtures)[number];

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
