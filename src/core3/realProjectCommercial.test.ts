import { describe, expect, it } from "vitest";
import fixtures from "../../docs/core3/evidence/real-project-commercial-fixtures.json";
import { resolveCore3FramePrices, resolveCore3Price } from "./priceResolver";
import type { Core3PriceUnit } from "./priceTypes";

describe("Core3 real-project commercial price fixtures", () => {
  for (const fixture of fixtures.projects) {
    it(`${fixture.projectId} preserves known and unknown commercial mappings`, () => {
      for (const { product, unit } of fixture.known_products) {
        const typedUnit = unit as Core3PriceUnit;
        const component = typedUnit === "m2" ? "SHEET" : typedUnit === "pcs" && product.startsWith("Саморез") ? "FASTENER" : "TRIM";
        const result = resolveCore3Price({ component, orientation: "PROJECT_WIDE", product, quantity: 1, unit: typedUnit });
        expect(result.unitPrice, product).not.toBeNull();
        expect(result.diagnostics, product).toEqual([]);
        if (product === "Уголок 50х50 нар") expect(result.unitPrice).toBe(640);
      }
      for (const product of fixture.unknown_products) {
        const result = resolveCore3Price({ component: "TRIM", orientation: "PROJECT_WIDE", product, quantity: 1, unit: "pcs" });
        expect(result.unitPrice, product).toBeNull();
        expect(result.diagnostics[0]?.code, product).toBe("CORE3_UNKNOWN_PRODUCT_MARK");
      }
    });
  }

  it("replays the proven gable frame quantities and exact 1C marks", () => {
    const lines = resolveCore3FramePrices({
      scenario: {
        span_m: 15,
        building_length_m: 24,
        building_height_m: 5,
        building_roof_type: "двускатное",
      },
      frame_step_m: 4,
      beam_profile: "ПГС300/20х80х3",
      beam_steel: "М.п.350",
      column_profile: "ПГС300/20х80х2",
      column_steel: "М.п.350",
    } as never);
    expect(lines[0]).toMatchObject({
      product: "ПГС-сигма 300х80x20 без перфор. 3,0 П350 (Оцинк.)",
      unitPrice: 1668,
      costStatus: "KNOWN_COST",
    });
    expect(lines[0]?.quantity).toBeCloseTo(210, 6);
    expect(lines[1]).toMatchObject({
      product: "ПГС-сигма 300х80x20 без перфор. 2,0 П350 (Оцинк.)",
      quantity: 70,
      unitPrice: 1142,
      costStatus: "KNOWN_COST",
    });
  });

  it.each([
    ["22318", 15, 24, 5, 4, "ПГС300/20х80х3", "ПГС300/20х80х2", 210, 70],
    ["22316", 18, 30, 5, 4.5, "ПГС300/20х80х3", "ПГС300/20х80х2", 288, 84],
    ["22329", 12, 26, 4, 6, "ПГС300/20х80х2,5", "ПГС300/20х80х2", 144, 56],
  ])("keeps the closed frame commercial chain for project %s", (_project, span, length, height, step, beam, column, beamQuantity, columnQuantity) => {
    const lines = resolveCore3FramePrices({
      scenario: { span_m: span, building_length_m: length, building_height_m: height, building_roof_type: "двускатное" },
      frame_step_m: step,
      beam_profile: beam,
      beam_steel: "М.п.350",
      column_profile: column,
      column_steel: "М.п.350",
    } as never);
    expect(lines.every((line) => line.costStatus === "KNOWN_COST")).toBe(true);
    expect(lines[0]?.quantity).toBeCloseTo(beamQuantity, 6);
    expect(lines[1]?.quantity).toBeCloseTo(columnQuantity, 6);
    expect(lines.every((line) => line.source?.workbook === "ПРАЙС ПОЛНЫЙ на 23.09.2026.xlsx")).toBe(true);
  });
});
