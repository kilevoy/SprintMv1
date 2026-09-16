// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { BrowserCore1DataRepository } from "./core1/data";

const calculateMock = vi.fn();
vi.mock("./core1/engine", () => ({ calculateCore1: (...args: unknown[]) => calculateMock(...args) }));

const successResult = {
  status: "success" as const,
  diagnostics: [],
  result: {
    scenario: { windows: { enabled: false, window_type: 1, window_height_m: 0, window_strip_length_m: 0, separate_window_count: 0, glazing_construction: "2ой стеклопакет" } },
    kg_per_m2: 30.25967361111111, frame_step_m: 6, beam_profile: "ПГС300", beam_steel: "М.п.350", beam_utilization: 85,
    column_profile: "ПГС245", column_steel: "М.п.350", column_utilization: 65, purlin_profile: "2ПС 200", purlin_steel: "М.п.390", purlin_kg_per_m2: 7.539,
    openings_weight_kg_per_m2: 0, openings_weight_t: 0, openings_weight_kg: 0, window_girts_weight_kg: 0,
    ties: null, suspensions: null, spacers: null, horizontal_bracing: null, vertical_bracing: null, gable_posts: null, portal_bracing: null,
    secondary_beams: null, secondary_columns: null, plates: null, bolts: [], M16_quantity: 0, fittings_weight_kg: 0, window_girts: [], openings: { gate_le_6m_mass_kg: 0, gate_gt_6m_mass_kg: 0, door_mass_kg: 0, window_mass_kg: 0, opening_mass_kg: 0 }, engineering_loads: null,
  },
};

describe("Sprint M calculator UI", () => {
  beforeEach(() => { calculateMock.mockReset(); calculateMock.mockResolvedValue(successResult); });
  afterEach(() => cleanup());

  it("renders calculator and calculates the 12 m demo result", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Подбор сечений" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(screen.getByText(/30,26/)).toBeInTheDocument());
    expect(calculateMock).toHaveBeenCalledTimes(1);
  });

  it("loads the saved 12 m fixture through the repository demo action", async () => {
    const fixtureInput = { span_m: 12, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8, roof_covering: "С-П 200", roof_deck_grade: "С44-1000-0,7", snow_retention_purlin: "нет", enclosure_purlin: "нет", gates_le_6m_count: 0, gates_gt_6m_count: 0, doors_count: 0, city: "Роза", window_height_m: 0, window_strip_length_m: 0, separate_windows_count: 0, window_construction: "2ой стеклопакет" };
    const fixtureSpy = vi.spyOn(BrowserCore1DataRepository.prototype, "loadFixture").mockResolvedValue({ input: fixtureInput, expected: {} } as never);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Загрузить пример 12 м" }));
    await waitFor(() => expect(fixtureSpy).toHaveBeenCalledWith("baseline_12m"));
    expect(screen.getByLabelText("Пролёт, м")).toHaveValue("12");
    fixtureSpy.mockRestore();
  });

  it("hides and shows window fields and all five type cards", () => {
    render(<App />);
    expect(screen.queryByText("Выберите одну из пяти схем")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Окна — есть"));
    expect(screen.getByText("Выберите одну из пяти схем")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Тип [1-5]/ })).toHaveLength(5);
  });

  it("shows eurocode choice for Kazakhstan and maps Да to SP_RK_EN", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Страна"), { target: { value: "KZ" } });
    expect(screen.getByText("Расчёт по евронормам")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Да" }));
    expect(screen.getByText("SP_RK_EN")).toBeInTheDocument();
  });

  it("reveals manual climate fields and marks an existing result stale after edits", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(screen.getByText(/30,26/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Ручной ввод" }));
    expect(screen.getByLabelText("Снеговая нагрузка, кН/м²")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Высота, м"), { target: { value: "3.2" } });
    expect(screen.getByText("Параметры изменены — требуется перерасчёт.")).toBeInTheDocument();
  });

  it("renders typed legacy diagnostic instead of fake output", async () => {
    calculateMock.mockResolvedValue({ status: "legacy_error", code: "LEGACY_NA", result: null, diagnostics: [{ code: "LEGACY_NA", message: "Исходный Excel-калькулятор возвращает #N/A", source: ["24м"], legacy_equivalent: "#N/A" }] });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(screen.getByText("LEGACY_NA")).toBeInTheDocument());
    expect(screen.getByText(/не выдал числовой результат/)).toBeInTheDocument();
  });

  it("renders the legacy REF diagnostic contract", async () => {
    calculateMock.mockResolvedValue({ status: "legacy_error", code: "LEGACY_REF", result: null, diagnostics: [{ code: "LEGACY_REF", message: "Исходный Excel-калькулятор возвращает #REF!", source: ["Расчеты 2"], legacy_equivalent: "#REF!" }] });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(screen.getByText("LEGACY_REF")).toBeInTheDocument());
    expect(screen.getByText("Эквивалент Excel: #REF!")).toBeInTheDocument();
  });

  it("offers a manual climate CTA for an unknown city", async () => {
    calculateMock.mockResolvedValue({ status: "city_not_found", code: "CITY_NOT_FOUND", result: null, diagnostics: [{ code: "CITY_NOT_FOUND", message: "Населённый пункт не найден в базе", source: ["Города п.К"] }] });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ввести климатические данные вручную" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Ввести климатические данные вручную" }));
    expect(screen.getByLabelText("Снеговой район")).toBeInTheDocument();
  });
});
