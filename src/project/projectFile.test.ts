import { describe, expect, it } from "vitest";
import { parseSprintMProjectFile, projectFileName, serializeProjectFile } from "./projectFile";
import type { ProjectInput } from "./types";

const project: ProjectInput = {
  countryCode: "KZ",
  climate: { mode: "CITY_LOOKUP", country: "KZ", city: "Туркестан", normative_system: "SP_RK_EN" },
  geometry: { span_m: 12, building_length_m: 30, building_height_m: 4.8, responsibility_factor: 1, frame_step_override_m: 4.5 },
  envelope: { system: "SANDWICH_PANEL", roof_covering: "С-П 200", roof_deck_grade: "С44-1000-0,7", wall_system: "Сэндвич-панель 200 мм" },
  supply: { scope: null },
  openings: [
    { id: "gate-1", kind: "gate", width_mm: 4000, height_mm: 4200, quantity: 2 },
    { id: "gate-2", kind: "gate", width_mm: 6500, height_mm: 5000, quantity: 1 },
    { id: "door-1", kind: "door", width_mm: 900, height_mm: 2100, quantity: 3 },
    { id: "window-1", kind: "window", width_mm: 1200, height_mm: 1500, quantity: 4, window_type: 2, glazing_construction: "2ой стеклопакет" },
    { id: "strip-1", kind: "strip_window", height_mm: 1500, length_mm: 6000, quantity: 1, window_type: 1, glazing_construction: "светопрозрачный профлист" },
  ],
  special_conditions: { snow_retention_purlin: "есть", enclosure_purlin: "нет", horizontal_bracing_override: "+" },
  other: { selection_mode: "подбор", building_roof_type: "двускатное", purlin_max_step_override_mm: 1200, purlin_min_step_mm: 0, terrain_type: "В", window_scheme_factor: 1, window_utilization_limit: 0.85 },
  enclosure: { wall_girts: [{ wall: "END", zoneType: "TYPICAL", wallHeight_m: 4.8, zoneLength_m: 12, girtStep_m: 0.6, structuralPostStep_m: 4.5, sectionType: "[]", profile: { profileId: "C140x2", sectionMass_kg_m: 4.2 }, selectionMode: "MANUAL" }] },
};

describe("Sprint-M project file", () => {
  it("serializes the complete ProjectInput into the same v1 envelope used by the loader", () => {
    const savedAt = new Date("2026-09-20T10:00:00.000Z");
    const file = serializeProjectFile(project, savedAt);
    expect(file.format).toBe("SPRINT_M_PROJECT");
    expect(file.version).toBe(2);
    expect(file.savedAt).toBe(savedAt.toISOString());
    expect(file.project).toEqual(project);
    expect(file).not.toHaveProperty("result");
    expect(projectFileName(project, savedAt)).toBe("sprint-m_KZ_Туркестан_12x30x4.8_2026-09-20.json");
  });

  it("round-trips heterogeneous openings and manual wall zones exactly", () => {
    const serialized = serializeProjectFile(project, new Date("2026-09-20T10:00:00.000Z"));
    const loaded = parseSprintMProjectFile(JSON.stringify(serialized));
    expect(loaded).toMatchObject({ ok: true });
    if (loaded.ok) expect(loaded.file.project).toEqual(project);
  });

  it("migrates a v1 project by inferring only envelope system and null supply scope", () => {
    const legacy = JSON.parse(JSON.stringify(project)) as Record<string, unknown>;
    const envelope = { ...(legacy.envelope as Record<string, unknown>) };
    delete envelope.system;
    delete legacy.supply;
    legacy.envelope = envelope;
    const loaded = parseSprintMProjectFile(JSON.stringify({ format: "SPRINT_M_PROJECT", version: 1, project: legacy }));
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.file.project).toMatchObject({ envelope: { system: "SANDWICH_PANEL", roof_covering: "С-П 200" }, supply: { scope: null } });
  });

  it("rejects a v2 semantic mismatch", () => {
    const invalid = { ...project, envelope: { ...project.envelope, system: "PROFILED_SHEET_COLD" as const } };
    expect(parseSprintMProjectFile(JSON.stringify({ format: "SPRINT_M_PROJECT", version: 2, project: invalid })).ok).toBe(false);
  });

  it("restores the complete versioned ProjectInput and ignores derived result fields", () => {
    const result = parseSprintMProjectFile(JSON.stringify({ format: "SPRINT_M_PROJECT", version: 2, savedAt: "2026-09-20T10:00:00Z", project, result: { D69: 999999, selectedProfile: "FAKE" } }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.project).toEqual(project);
      expect(result.file.project.openings).toHaveLength(5);
      expect(result.file.project.enclosure?.wall_girts[0]).toMatchObject({ wall: "END", sectionType: "[]", girtStep_m: 0.6 });
      expect(result.file).not.toHaveProperty("result");
    }
  });

  it("rejects malformed JSON without producing a project", () => {
    expect(parseSprintMProjectFile("{")).toEqual({ ok: false, message: "Не удалось загрузить расчёт: некорректный JSON-файл." });
  });

  it("rejects wrong format and unsupported versions", () => {
    expect(parseSprintMProjectFile(JSON.stringify({ format: "OTHER", version: 1, project }))).toEqual({ ok: false, message: "Файл не является расчётом Sprint-M." });
    expect(parseSprintMProjectFile(JSON.stringify({ format: "SPRINT_M_PROJECT", version: 3, project })).ok).toBe(false);
  });

  it("rejects invalid nested ProjectInput fields atomically", () => {
    const invalid = { ...project, geometry: { ...project.geometry, building_height_m: -1 } };
    expect(parseSprintMProjectFile(JSON.stringify({ format: "SPRINT_M_PROJECT", version: 1, project: invalid }))).toMatchObject({ ok: false });
  });
});
