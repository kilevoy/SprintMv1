import { describe, expect, it } from "vitest";
import { resolveDesignSpanFamily } from "./designSpanFamily";

describe("resolveDesignSpanFamily", () => {
  it.each([
    [8.5, 9], [9, 9], [9.01, 12], [10.4, 12], [12, 12],
    [12.01, 15], [15, 15], [15.01, 18], [18, 18], [18.01, 21],
    [21, 21], [21.01, 24], [24, 24],
  ] as const)("maps literal span %d m to family %d m", (span, family) => {
    expect(resolveDesignSpanFamily(span)).toBe(family);
  });

  it.each([0, -0.1, -10, 24.01, Number.NaN, Number.POSITIVE_INFINITY])(
    "returns null for span outside the proven family domain: %s",
    (span) => expect(resolveDesignSpanFamily(span)).toBeNull(),
  );
});
