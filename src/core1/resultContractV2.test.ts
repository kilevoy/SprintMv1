import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BrowserCore1DataRepository } from "./data";
import type { Core1DataSource } from "./data";
import { calculateCore1 } from "./engine";
import { validateCore1Result } from "./compatibility";

class TestDataSource implements Core1DataSource {
  public constructor(private readonly rootDirectory: string) {}

  public async getText(assetPath: string): Promise<string> {
    return readFile(resolve(this.rootDirectory, assetPath), "utf8");
  }

  public async getJson<T>(assetPath: string): Promise<T> {
    return JSON.parse(await this.getText(assetPath)) as T;
  }
}

const repoRoot = resolve(import.meta.dirname, "../..");
const source = new TestDataSource(repoRoot);

describe("Core1Result v2 projection", () => {
  it("exposes canonical result and preserves the ordered legacy output blocks", async () => {
    const envelope = await source.getJson<{ input: unknown }>("core1/fixtures/baseline_12m.input.json");
    const result = await calculateCore1(envelope.input, new BrowserCore1DataRepository(source));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(validateCore1Result(result.result).valid).toBe(true);

    const selected = result.result.excelOutput.sections.find((section) => section.id === "SELECTED_SECTIONS");
    const bolts = result.result.excelOutput.sections.find((section) => section.id === "BOLTS");
    const openings = result.result.excelOutput.sections.find((section) => section.id === "OPENINGS");
    expect(selected?.rows.map((row) => row.label)).toEqual([
      "Балки", "Колонны", "Прогоны", "Затяжки", "Подвески", "Распорки",
      "Связи горизонтальные", "Связи вертикальные", "Стойки фахверка",
      "Пластина карниз, конек", "Пластина опора",
    ]);
    expect(bolts?.rows.map((row) => row.label)).toEqual([
      "Балки конек", "Балки карниз", "Колонны опора", "Колонны карниз",
      "Затяжка, для крепления уголка к карнизной фасонке, M16",
    ]);
    expect(openings?.rows.map((row) => row.label)).toEqual([
      "Ворота до 6 м", "Ворота свыше 6 м", "Двери", "Окна", "Высота окон (м)",
      "Длина ленты (м)", "Количество отдельных окон", "Конструкция окна",
      "МЕ окон, ворот, дверей", "Общая МЕ",
    ]);
    expect(selected?.rows[0]).toMatchObject({ value1: result.result.beam_profile, value2: result.result.beam_steel, value3: result.result.beam_utilization });
    expect(selected?.rows[2]?.value3).toBeNull();
    expect(result.result.excelOutput.sections.find((section) => section.id === "FITTINGS")?.rows[0]).toMatchObject({ label: "Вес фасонок, кг", value1: result.result.fittings_weight_kg, unit: "kg" });
    expect(result.result.canonical.frameGrid).toMatchObject({
      automaticFrameStepM: 6,
      manualFrameStepOverrideM: null,
      effectiveFrameStepM: 6,
      bayCount: 3,
      frameCount: 4,
    });
    expect(result.result.canonical.componentMasses.mainFrameMassKg).toBeTypeOf("number");
    expect(result.result.canonical.componentMasses.isComplete).toBe(false);
    expect(result.result.canonical.legacyCompatibility.D69).toBe(result.result.kg_per_m2);
    expect(result.result.beam_profile).toBe(result.result.canonical.selectedSections.beams.profile);
    expect(result.result.purlin_profile).toBe(result.result.canonical.selectedSections.roofPurlins.profile);
  });
});
