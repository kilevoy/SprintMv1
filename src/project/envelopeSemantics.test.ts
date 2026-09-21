import { describe, expect, it } from "vitest";
import { classifyRoofCoveringEnvelopeSystem, validateEnvelopeSystemRoofCovering, validateNewProjectEnvelopeSystem } from "./envelopeSemantics";

describe("envelope product semantics", () => {
  it("maps exact product labels without fuzzy matching", () => {
    expect(classifyRoofCoveringEnvelopeSystem("профлист")).toBe("PROFILED_SHEET_COLD");
    for (const covering of ["С-П 50", "С-П 80", "С-П 100", "С-П 120", "С-П 150", "С-П 200", "С-П 250"] as const) {
      expect(classifyRoofCoveringEnvelopeSystem(covering)).toBe("SANDWICH_PANEL");
    }
    for (const covering of ["наше 100 мм", "наше 150 мм", "наше 200 мм", "наше 250 мм", "наше 150 мм с 1 слоем гвл", "наше 150 мм с 2 слоем гвл", "наше 200 мм с 1 слоем гвл", "наше 200 мм с 2 слоем гвл", "наше 250 мм с 1 слоем гвл", "наше 250 мм с 2 слоем гвл"] as const) {
      expect(classifyRoofCoveringEnvelopeSystem(covering)).toBe("INSI_BUILT_UP_PANEL_LEGACY");
    }
  });

  it("rejects semantic mismatch and legacy new-project use", () => {
    expect(validateEnvelopeSystemRoofCovering("SANDWICH_PANEL", "профлист").valid).toBe(false);
    expect(validateEnvelopeSystemRoofCovering("SANDWICH_PANEL", "С-П 200").valid).toBe(true);
    expect(validateNewProjectEnvelopeSystem("INSI_BUILT_UP_PANEL_LEGACY")).toMatchObject({ valid: false, diagnostic: { code: "UNSUPPORTED_LEGACY_ENVELOPE" } });
  });
});
