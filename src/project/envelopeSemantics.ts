import type { EnvelopeSystem, LegacyEnvelopeSystem, ProjectEnvelopeSystem } from "./types";
import type { RoofCovering } from "../core1/types";

export type EnvelopeSemanticDiagnosticCode =
  | "UNSUPPORTED_LEGACY_ENVELOPE"
  | "INVALID_ENVELOPE_ROOFCOVERING";

export type EnvelopeSemanticValidation =
  | { valid: true; system: EnvelopeSystem; diagnostic: null }
  | { valid: false; system: EnvelopeSystem; diagnostic: { code: EnvelopeSemanticDiagnosticCode; message: string; details: Record<string, unknown> } };

const SANDWICH_COVERINGS: readonly RoofCovering[] = [
  "С-П 50", "С-П 80", "С-П 100", "С-П 120", "С-П 150", "С-П 200", "С-П 250",
];

const LEGACY_INSI_COVERINGS: readonly RoofCovering[] = [
  "наше 100 мм", "наше 150 мм", "наше 200 мм", "наше 250 мм",
  "наше 150 мм с 1 слоем гвл", "наше 150 мм с 2 слоем гвл",
  "наше 200 мм с 1 слоем гвл", "наше 200 мм с 2 слоем гвл",
  "наше 250 мм с 1 слоем гвл", "наше 250 мм с 2 слоем гвл",
];

function isSandwichCovering(roofCovering: RoofCovering): boolean {
  return SANDWICH_COVERINGS.includes(roofCovering);
}

function isLegacyInsiCovering(roofCovering: RoofCovering): boolean {
  return LEGACY_INSI_COVERINGS.includes(roofCovering);
}

/** Deterministic exact D20-to-product classification; no fuzzy matching. */
export function classifyRoofCoveringEnvelopeSystem(roofCovering: RoofCovering): EnvelopeSystem {
  if (roofCovering === "профлист") return "PROFILED_SHEET_COLD";
  if (isSandwichCovering(roofCovering)) return "SANDWICH_PANEL";
  if (isLegacyInsiCovering(roofCovering)) return "INSI_BUILT_UP_PANEL_LEGACY";
  // These remaining legacy roof labels have no proven modern product mapping.
  // Keep them on the historical-only side rather than silently treating them as
  // sandwich or profiled-sheet products.
  return "INSI_BUILT_UP_PANEL_LEGACY";
}

export function validateEnvelopeSystemRoofCovering(
  system: EnvelopeSystem,
  roofCovering: RoofCovering,
): EnvelopeSemanticValidation {
  const expected = classifyRoofCoveringEnvelopeSystem(roofCovering);
  if (expected !== system) {
    return {
      valid: false,
      system,
      diagnostic: {
        code: "INVALID_ENVELOPE_ROOFCOVERING",
        message: "Семантическая система оболочки не соответствует legacy значению покрытия D20.",
        details: { system, roof_covering: roofCovering, expected_system: expected },
      },
    };
  }
  return { valid: true, system, diagnostic: null };
}

export function validateNewProjectEnvelopeSystem(system: EnvelopeSystem): EnvelopeSemanticValidation {
  if (system === "INSI_BUILT_UP_PANEL_LEGACY") {
    return {
      valid: false,
      system,
      diagnostic: {
        code: "UNSUPPORTED_LEGACY_ENVELOPE",
        message: "Историческая послойная система ИНСИ сохранена только для совместимости со старыми расчётами и не поддерживается для новых проектов Sprint-M.",
        details: { system, mode: "NEW_PROJECT" },
      },
    };
  }
  return { valid: true, system, diagnostic: null };
}

export function isProjectEnvelopeSystem(system: unknown): system is EnvelopeSystem {
  return system === "PROFILED_SHEET_COLD" || system === "SANDWICH_PANEL" || system === "INSI_BUILT_UP_PANEL_LEGACY";
}

export function isSupplyScope(scope: unknown): scope is "FRAME_ONLY" | "FULL_BUILDING" {
  return scope === "FRAME_ONLY" || scope === "FULL_BUILDING";
}

export type { EnvelopeSystem, LegacyEnvelopeSystem, ProjectEnvelopeSystem };
