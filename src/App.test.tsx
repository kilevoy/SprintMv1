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
    scenario: { roof_covering: "С-П 200", roof_deck_grade: "С44-1000-0,7", windows: { enabled: false, window_type: 1, window_height_m: 0, window_strip_length_m: 0, separate_window_count: 0, glazing_construction: "2ой стеклопакет" } },
    kg_per_m2: 30.25967361111111, frame_step_m: 6, beam_profile: "ПГС300", beam_steel: "М.п.350", beam_utilization: 85,
    column_profile: "ПГС245", column_steel: "М.п.350", column_utilization: 65, purlin_profile: "2ПС 200", purlin_steel: "М.п.390", purlin_step_mm: 1200, purlin_kg_per_m2: 7.539,
    openings_weight_kg_per_m2: 0, openings_weight_t: 0, openings_weight_kg: 0, window_girts_weight_kg: 0,
    ties: null, suspensions: null, spacers: null, horizontal_bracing: null, vertical_bracing: null, gable_posts: null, portal_bracing: null,
    secondary_beams: null, secondary_columns: null, plates: null, bolts: [], M16_quantity: 0, fittings_weight_kg: 0, window_girts: [], openings: { gate_le_6m_mass_kg: 0, gate_gt_6m_mass_kg: 0, door_mass_kg: 0, window_mass_kg: 0, opening_mass_kg: 0 }, engineering_loads: null,
  },
};

describe("Sprint M calculator UI", () => {
  beforeEach(() => {
    calculateMock.mockReset();
    calculateMock.mockResolvedValue(successResult);
    vi.spyOn(BrowserCore1DataRepository.prototype, "loadClimateDataset").mockResolvedValue({
      descriptor: {} as never,
      records: [
        { cell: "B3", cached_value_json: "Челябинск" }, { cell: "F3", cached_value_json: "III" }, { cell: "G3", cached_value_json: 1.5 }, { cell: "H3", cached_value_json: "II" }, { cell: "I3", cached_value_json: 0.3 },
        { cell: "B4", cached_value_json: "Роза" }, { cell: "F4", cached_value_json: "III" }, { cell: "G4", cached_value_json: 1.5 }, { cell: "H4", cached_value_json: "II" }, { cell: "I4", cached_value_json: 0.3 },
      ],
    } as never);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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

  it("supports dynamic opening groups for gates, doors, and windows", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить ворота" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить ворота" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить дверь" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить окно" }));
    expect(screen.getAllByLabelText(/Ширина ворота/)).toHaveLength(2);
    fireEvent.change(screen.getAllByLabelText(/Ширина ворота/)[1]!, { target: { value: "6500" } });
    expect(screen.getAllByLabelText(/Ширина ворота/)[1]).toHaveValue(6500);
    expect(screen.getByLabelText(/Высота двери/)).toBeInTheDocument();
    expect(screen.getByLabelText("Тип окна")).toHaveValue("1");
    expect(screen.getAllByRole("button", { name: "Удалить" })).toHaveLength(4);
    fireEvent.change(screen.getAllByLabelText(/Количество ворота/)[0]!, { target: { value: "2" } });
    expect(screen.getAllByLabelText(/Количество ворота/)[0]).toHaveValue(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Удалить" })[1]!);
    expect(screen.getAllByLabelText(/Ширина ворота/)).toHaveLength(1);
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

  it("searches and selects a city with keyboard and shows fresh climate preview", async () => {
    render(<App />);
    const city = screen.getByRole("combobox", { name: "Населённый пункт" });
    fireEvent.change(city, { target: { value: "Челяби" } });
    expect(await screen.findByRole("option", { name: "Челябинск" })).toBeInTheDocument();
    fireEvent.keyDown(city, { key: "ArrowDown" });
    fireEvent.keyDown(city, { key: "Enter" });
    expect(city).toHaveValue("Челябинск");
    expect(await screen.findByText("Климатические данные загружены")).toBeInTheDocument();
    expect(screen.getByText(/III · 1,50/)).toBeInTheDocument();
  });

  it("clears the selected climate when the city query is edited and offers manual input for an unknown city", async () => {
    render(<App />);
    const city = screen.getByRole("combobox", { name: "Населённый пункт" });
    await screen.findByText("Климатические данные загружены");
    fireEvent.change(city, { target: { value: "Неизвестный город" } });
    expect(screen.queryByText("Климатические данные загружены")).not.toBeInTheDocument();
    expect(await screen.findByText("Город не найден в локальной базе")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Перейти к ручному вводу" }));
    expect(screen.getByLabelText("Снеговая нагрузка, кН/м²")).toBeInTheDocument();
  });

  it("keeps the roof deck helper, wall selector, and does not pass wall UI state into Core 1", async () => {
    render(<App />);
    expect(screen.getByLabelText("Покрытие")).toBeInTheDocument();
    expect(screen.getByLabelText("Марка настила")).toBeInTheDocument();
    expect(screen.getByText("Используется для ограничения допустимого шага прогонов.")).toBeInTheDocument();
    const wall = screen.getByLabelText("Стены");
    expect(wall).toHaveValue("Сэндвич-панель 200 мм");
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(calculateMock).toHaveBeenCalledTimes(1));
    const firstInput = calculateMock.mock.calls[0]?.[0];
    fireEvent.change(wall, { target: { value: "Сэндвич-панель 200 мм" } });
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(calculateMock).toHaveBeenCalledTimes(2));
    expect(calculateMock.mock.calls[1]?.[0]).toEqual(firstInput);
  });

  it("shows the selected deck grade and purlin step in the result card", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(screen.getByText("2ПС 200")).toBeInTheDocument());
    expect(screen.getByText(/С44-1000-0,7 · шаг 1 200 мм/)).toBeInTheDocument();
  });
});
