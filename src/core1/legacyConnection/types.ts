import type { Core1Diagnostic, Core1Input, DesignSpanFamily } from "../types";

export type LegacyConnectionBranch = "ROW14" | "ROW15";
export type LegacyConnectionScalar = number | string;

export interface LegacyConnectionSnapshotProvenance {
  /** Metadata only. It must never be used as a calculation selector. */
  projectId: string;
  sourceWorkbook: string;
  sourceWorkbookSha256: string;
  formulaFingerprint: string;
}

export interface LegacyConnectionSelectedRow {
  sourceSheet: string;
  sourceAddresses: readonly string[];
  F: LegacyConnectionScalar;
  J: LegacyConnectionScalar;
  K: string;
  L: string;
  M: string;
  N: string;
}

export interface LegacyConnectionSnapshot {
  schema_version: 1;
  designFamily: DesignSpanFamily;
  activeBranch: LegacyConnectionBranch;
  selectedRow: LegacyConnectionSelectedRow;
  provenance: LegacyConnectionSnapshotProvenance;
}

export interface LegacyConnectionResult {
  designFamily: DesignSpanFamily;
  activeBranch: LegacyConnectionBranch;
  sourceSheet: string;
  sourceAddresses: readonly string[];
  ridgeBeamBoltPattern: string;
  ridgeBeamBoltQuantity: LegacyConnectionScalar;
  eaveBeamBoltPattern: string;
  supportColumnBoltPattern: string;
  eaveColumnBoltPattern: string;
  fittingsWeightKg: LegacyConnectionScalar;
  provenance: LegacyConnectionSnapshotProvenance;
}

export type LegacyConnectionReplayStatus = "success" | "legacy_error" | "snapshot_required" | "invalid_snapshot";

export interface LegacyConnectionReplaySuccess {
  status: "success";
  result: LegacyConnectionResult;
  diagnostics: Core1Diagnostic[];
}

export interface LegacyConnectionReplayLegacyError {
  status: "legacy_error";
  result: LegacyConnectionResult;
  diagnostics: Core1Diagnostic[];
}

export interface LegacyConnectionReplayFailure {
  status: "snapshot_required" | "invalid_snapshot";
  result: null;
  diagnostics: Core1Diagnostic[];
}

export type LegacyConnectionReplayResult =
  | LegacyConnectionReplaySuccess
  | LegacyConnectionReplayLegacyError
  | LegacyConnectionReplayFailure;

export type LegacyConnectionReplayInput = Pick<Core1Input, "span_m">;
