import type { DesignSpanFamily } from "../types";

/**
 * Maps a literal project span to the proven legacy frame-design family.
 * The legacy workbook uses inclusive upper bounds; this is deliberately not
 * rounding, interpolation, or nearest-family selection.
 */
export function resolveDesignSpanFamily(span_m: number): DesignSpanFamily | null {
  if (!Number.isFinite(span_m) || span_m <= 0 || span_m > 24) return null;
  if (span_m <= 9) return 9;
  if (span_m <= 12) return 12;
  if (span_m <= 15) return 15;
  if (span_m <= 18) return 18;
  if (span_m <= 21) return 21;
  return 24;
}
