import { createCore1Diagnostic } from "../diagnostics";
import { LEGACY_FRAME_BRANCH_MAPPING } from "./data";
import type { LegacyFrameBranchResult, LegacyScalar } from "./types";

function numericRegion(value: LegacyScalar): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  const numeric = Number(trimmed.replace(",", "."));
  if (Number.isInteger(numeric) && numeric > 0) return numeric;
  const roman: Record<string, number> = { I: 1, V: 5, X: 10 };
  if (!/^[IVX]+$/.test(trimmed)) return null;
  let total = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    const current = roman[trimmed[index]!]!;
    const next = roman[trimmed[index + 1]!];
    total += next && next > current ? -current : current;
  }
  return total > 0 ? total : null;
}

export function resolveLegacyFrameBranch(input: { activeSnowRegion: LegacyScalar; windRegion: LegacyScalar }): LegacyFrameBranchResult | null {
  const snowNumeric = numericRegion(input.activeSnowRegion);
  const windNumeric = numericRegion(input.windRegion);
  if (snowNumeric === null || windNumeric === null) return null;
  const rawBranchKey = `${snowNumeric}/${windNumeric}`;
  const mapping = LEGACY_FRAME_BRANCH_MAPPING.find((row) => row.raw_branch_key === rawBranchKey);
  if (!mapping) return null;
  return {
    snowNumeric,
    windNumeric,
    rawBranchKey,
    mappedBranchKey: mapping.mapped_branch_key,
    diagnostics: [],
  };
}

export function legacyFrameBranchDiagnostic(message: string, details: Record<string, unknown>) {
  return createCore1Diagnostic({
    code: "UNSUPPORTED_FOR_PARITY",
    severity: "unsupported",
    classification: "unsupported",
    module: "LegacyFrameBranchResolver",
    message,
    source: ["подбор!AJ9:AJ11", "подбор!V19:W44"],
    details,
  });
}
