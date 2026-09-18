import replaySnapshotData from "../../../core1/data/legacy_connections/replay_snapshots.json";
import { createCore1Diagnostic } from "../diagnostics";
import { resolveDesignSpanFamily } from "../frame/designSpanFamily";
import type { Core1Diagnostic, DesignSpanFamily } from "../types";
import type {
  LegacyConnectionBranch,
  LegacyConnectionReplayInput,
  LegacyConnectionReplayResult,
  LegacyConnectionResult,
  LegacyConnectionScalar,
  LegacyConnectionSelectedRow,
  LegacyConnectionSnapshot,
} from "./types";

const ROW14_ADDRESSES = ["ID19", "IH19", "II19", "IJ19", "IK19", "IL19"] as const;
const ROW15_ADDRESSES = ["RT19", "RX19", "RY19", "RZ19", "SA19", "SB19"] as const;
const ROW14_24M_ADDRESSES = ["KP19", "KT19", "KU19", "KV19", "KW19", "KX19"] as const;
const ROW15_24M_ADDRESSES = ["WR19", "WV19", "WW19", "WX19", "WY19", "WZ19"] as const;
const FORMULA_FINGERPRINT_9_TO_21 = "b8e858a0baec8915d4075f4c29e9959de5adf4c872605ba0fe74365ec49bcdc3";
const FORMULA_FINGERPRINT_24 = "d734ba3bb993740f3efa4be45fe4574a52ca072a14fae01cd1d7c9bcb98e1cf8";

interface ReplaySnapshotFile {
  schema_version: 1;
  snapshots: LegacyConnectionSnapshot[];
}

const replaySnapshotFile = replaySnapshotData as ReplaySnapshotFile;

function sourceAddresses(family: DesignSpanFamily, branch: LegacyConnectionBranch): readonly string[] {
  if (family === 24) return branch === "ROW14" ? ROW14_24M_ADDRESSES : ROW15_24M_ADDRESSES;
  return branch === "ROW14" ? ROW14_ADDRESSES : ROW15_ADDRESSES;
}

function isScalar(value: unknown): value is LegacyConnectionScalar {
  return (typeof value === "number" && Number.isFinite(value)) || typeof value === "string";
}

function validQuantity(value: unknown): value is LegacyConnectionScalar {
  return (typeof value === "number" && Number.isFinite(value)) || value === "#N/A";
}

function diagnostic(input: Parameters<typeof createCore1Diagnostic>[0]): Core1Diagnostic {
  return createCore1Diagnostic(input);
}

function failure(
  status: "snapshot_required" | "invalid_snapshot",
  code: "LEGACY_CONNECTION_SNAPSHOT_REQUIRED" | "LEGACY_CONNECTION_SNAPSHOT_INVALID" | "LEGACY_CONNECTION_SNAPSHOT_MISMATCH",
  message: string,
  details: Record<string, unknown>,
  source: string[],
): LegacyConnectionReplayResult {
  return {
    status,
    result: null,
    diagnostics: [diagnostic({
      code,
      severity: status === "snapshot_required" ? "unsupported" : "error",
      classification: status === "snapshot_required" ? "unsupported" : "error",
      module: "LegacyConnectionReplayResolver",
      message,
      source,
      details,
      affected_outputs: ["D52", "E52", "D53", "D54", "D55", "D57"],
    })],
  };
}

function validateSnapshot(snapshot: LegacyConnectionSnapshot, family: DesignSpanFamily): Core1Diagnostic | null {
  const selected = snapshot.selectedRow as Partial<LegacyConnectionSelectedRow> | undefined;
  const expectedAddresses = sourceAddresses(family, snapshot.activeBranch);
  if (!snapshot || snapshot.schema_version !== 1) {
    return diagnostic({
      code: "LEGACY_CONNECTION_SNAPSHOT_INVALID",
      severity: "error",
      classification: "error",
      module: "LegacyConnectionReplayResolver",
      message: "Legacy connection snapshot имеет неподдерживаемую schema_version.",
      source: ["core1/data/legacy_connections/replay_snapshots.json"],
      details: { schema_version: snapshot?.schema_version },
    });
  }
  if (snapshot.designFamily !== family) {
    return diagnostic({
      code: "LEGACY_CONNECTION_SNAPSHOT_MISMATCH",
      severity: "error",
      classification: "error",
      module: "LegacyConnectionReplayResolver",
      message: "Design family snapshot не соответствует literal span проекта.",
      source: ["Core1Input.span_m", "legacy_connection_snapshot.designFamily"],
      details: { input_design_family: family, snapshot_design_family: snapshot.designFamily },
    });
  }
  if (snapshot.activeBranch !== "ROW14" && snapshot.activeBranch !== "ROW15") {
    return diagnostic({
      code: "LEGACY_CONNECTION_SNAPSHOT_INVALID",
      severity: "error",
      classification: "error",
      module: "LegacyConnectionReplayResolver",
      message: "Legacy connection snapshot содержит неизвестную activeBranch.",
      source: ["legacy_connection_snapshot.activeBranch"],
      details: { active_branch: snapshot.activeBranch },
    });
  }
  if (!selected || selected.sourceSheet !== `${family}м` || JSON.stringify(selected.sourceAddresses) !== JSON.stringify(expectedAddresses)) {
    return diagnostic({
      code: "LEGACY_CONNECTION_SNAPSHOT_MISMATCH",
      severity: "error",
      classification: "error",
      module: "LegacyConnectionReplayResolver",
      message: "Source sheet/range snapshot не соответствует design family или active branch.",
      source: ["legacy_connection_snapshot.selectedRow.sourceSheet", "legacy_connection_snapshot.selectedRow.sourceAddresses"],
      details: { expected_sheet: `${family}м`, expected_addresses: expectedAddresses, actual_sheet: selected?.sourceSheet, actual_addresses: selected?.sourceAddresses },
    });
  }
  if (!selected || !validQuantity(selected.F) || !validQuantity(selected.J) || ![selected.K, selected.L, selected.M, selected.N].every((value) => typeof value === "string")) {
    return diagnostic({
      code: "LEGACY_CONNECTION_SNAPSHOT_INVALID",
      severity: "error",
      classification: "error",
      module: "LegacyConnectionReplayResolver",
      message: "Типы значений selectedRow не соответствуют legacy contract.",
      source: ["legacy_connection_snapshot.selectedRow"],
      details: { selected_row: selected },
    });
  }
  const provenance = snapshot.provenance;
  if (!provenance || !provenance.projectId || !provenance.sourceWorkbook || !/^[a-f0-9]{64}$/i.test(provenance.sourceWorkbookSha256) || !/^[a-f0-9]{64}$/i.test(provenance.formulaFingerprint)) {
    return diagnostic({
      code: "LEGACY_CONNECTION_SNAPSHOT_INVALID",
      severity: "error",
      classification: "error",
      module: "LegacyConnectionReplayResolver",
      message: "Provenance legacy connection snapshot неполный или имеет неверный формат.",
      source: ["legacy_connection_snapshot.provenance"],
      details: { provenance },
    });
  }
  const expectedFingerprint = family === 24 ? FORMULA_FINGERPRINT_24 : FORMULA_FINGERPRINT_9_TO_21;
  if (provenance.formulaFingerprint.toLowerCase() !== expectedFingerprint) {
    return diagnostic({
      code: "LEGACY_CONNECTION_SNAPSHOT_MISMATCH",
      severity: "error",
      classification: "error",
      module: "LegacyConnectionReplayResolver",
      message: "Formula fingerprint snapshot не соответствует proven span-family matrix.",
      source: ["legacy_connection_snapshot.provenance.formulaFingerprint"],
      details: { expected_formula_fingerprint: expectedFingerprint, actual_formula_fingerprint: provenance.formulaFingerprint, design_family: family },
    });
  }
  return null;
}

function mapResult(snapshot: LegacyConnectionSnapshot): LegacyConnectionResult {
  return {
    designFamily: snapshot.designFamily,
    activeBranch: snapshot.activeBranch,
    sourceSheet: snapshot.selectedRow.sourceSheet,
    sourceAddresses: snapshot.selectedRow.sourceAddresses,
    ridgeBeamBoltPattern: snapshot.selectedRow.K,
    ridgeBeamBoltQuantity: snapshot.selectedRow.F,
    eaveBeamBoltPattern: snapshot.selectedRow.L,
    supportColumnBoltPattern: snapshot.selectedRow.M,
    eaveColumnBoltPattern: snapshot.selectedRow.N,
    fittingsWeightKg: snapshot.selectedRow.J,
    provenance: snapshot.provenance,
  };
}

function hasLegacyNa(result: LegacyConnectionResult): boolean {
  return [result.ridgeBeamBoltQuantity, result.fittingsWeightKg, result.ridgeBeamBoltPattern, result.eaveBeamBoltPattern, result.supportColumnBoltPattern, result.eaveColumnBoltPattern].some((value) => value === "#N/A");
}

export function getLegacyConnectionReplayFixture(projectId: string): LegacyConnectionSnapshot | null {
  return replaySnapshotFile.snapshots.find((snapshot) => snapshot.provenance.projectId === projectId) ?? null;
}

export function resolveLegacyConnectionReplay(input: LegacyConnectionReplayInput, snapshot: LegacyConnectionSnapshot | null | undefined): LegacyConnectionReplayResult {
  if (!snapshot) {
    return failure(
      "snapshot_required",
      "LEGACY_CONNECTION_SNAPSHOT_REQUIRED",
      "Для historical connection replay отсутствует обязательный project-scoped snapshot.",
      { span_m: input.span_m },
      ["LegacyConnectionReplaySnapshot"],
    );
  }
  const family = resolveDesignSpanFamily(input.span_m);
  if (family === null) {
    return failure(
      "invalid_snapshot",
      "LEGACY_CONNECTION_SNAPSHOT_INVALID",
      "Невозможно определить design family для literal span.",
      { span_m: input.span_m },
      ["Core1Input.span_m", "CORE1_SUPPORTED_DOMAIN.md"],
    );
  }
  const validationDiagnostic = validateSnapshot(snapshot, family);
  if (validationDiagnostic) {
    return {
      status: "invalid_snapshot",
      result: null,
      diagnostics: [validationDiagnostic],
    };
  }
  const result = mapResult(snapshot);
  if (!hasLegacyNa(result)) return { status: "success", result, diagnostics: [] };
  return {
    status: "legacy_error",
    result,
    diagnostics: [diagnostic({
      code: "LEGACY_NA",
      excel_error: "#N/A",
      severity: "error",
      classification: "legacy_anomaly",
      module: "LegacyConnectionReplayResolver",
      message: "Historical connection snapshot сохраняет legacy #N/A без нормализации.",
      source: [`${result.sourceSheet}!${result.sourceAddresses.join(",")}`],
      legacy_equivalent: "#N/A",
      affected_outputs: ["D52", "E52", "D53", "D54", "D55", "D57"],
      details: { design_family: result.designFamily, active_branch: result.activeBranch },
    })],
  };
}

export type {
  LegacyConnectionBranch,
  LegacyConnectionReplayInput,
  LegacyConnectionReplayResult,
  LegacyConnectionResult,
  LegacyConnectionScalar,
  LegacyConnectionSelectedRow,
  LegacyConnectionSnapshot,
  LegacyConnectionSnapshotProvenance,
} from "./types";
