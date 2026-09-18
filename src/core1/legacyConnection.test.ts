import { describe, expect, it } from "vitest";
import { validateCore1Diagnostic } from "./compatibility";
import { getLegacyConnectionReplayFixture, resolveLegacyConnectionReplay } from "./legacyConnection";
import type { LegacyConnectionSnapshot } from "./legacyConnection";

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
