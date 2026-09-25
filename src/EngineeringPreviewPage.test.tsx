// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateCore1Input } from "./core1/compatibility";
import EngineeringPreviewPage, { defaultPreviewInput } from "./EngineeringPreviewPage";

const calculateMock = vi.fn();
vi.mock("./core1/engine", () => ({ calculateCore1: (...args: unknown[]) => calculateMock(...args) }));
vi.mock("./core1/data", () => ({
  BrowserDataSource: class {},
  BrowserCore1DataRepository: class {
    loadClimateDataset = vi.fn(async (id: string) => ({ records: id === "climate_cities_sparse" ? [
      { cell: "B10", cached_value_json: "Роза" },
      { cell: "B11", cached_value_json: "Челябинск" },
      { cell: "B12", cached_value_json: "Сургут" },
      { cell: "B179", cached_value_json: "Туркестан" },
      { cell: "H179", cached_value_json: "Казахстан" },
    ] : [
      { cell: "B10", cached_value_json: "Роза" },
      { cell: "B11", cached_value_json: "Челябинск" },
      { cell: "B12", cached_value_json: "Сургут" },
      { cell: "B179", cached_value_json: "Туркестан" },
    ] }));
  },
}));

describe("EngineeringPreviewPage", () => {
  beforeEach(() => {
    calculateMock.mockReset();
    calculateMock.mockResolvedValue({ status: "success", diagnostics: [], result: { scenario: { city: "Роза", span_m: 12, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8 }, climate: { city: "Роза" }, excelOutput: { sections: [{ id: "SELECTED_SECTIONS", title: "Подбор сечений", rows: [] }] }, window_girts: [{ profile: "Z140", steel: "С245", quantity: 4, length_m: 6, mass_kg: 42, source: "window dataset", status: "CALCULATED" }, { profile: "Z160", steel: "С245", quantity: 2, length_m: 6, mass_kg: 12, source: "window dataset", status: "CALCULATED" }], window_girts_weight_kg: 54, canonical: { frameGrid: { automaticFrameStepM: 6, manualFrameStepOverrideM: null, effectiveFrameStepM: 6, frameCount: 4 }, selectedSections: { beams: { profile: "B", steel: "S" }, columns: { profile: "C", steel: "S" }, roofPurlins: { profile: "P", stepMm: 1200 } }, connections: { bolts: [], m16Quantity: null, fittingsMassKg: null }, componentMasses: { mainFrameMassKg: null, purlinMassKg: null, knownMassKg: null, isComplete: false }, provenance: { modules: [], legacyOutputProjection: "test" }, legacyCompatibility: { D69_classification: "LEGACY_COMPATIBILITY_VALUE / REGRESSION_CHECKPOINT" } } } });
  });
  afterEach(() => cleanup());

  it("starts with a clean ProjectInput and no fixture action", async () => {
    render(<EngineeringPreviewPage />);
    expect(screen.getByRole("button", { name: "Сохранить расчёт" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Заполнить тестовые данные" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Очистить данные" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Preview страна" })).toHaveValue("RU");
    expect(screen.getByRole("combobox", { name: "Preview город" })).toHaveValue("");
  });

  it("exposes the restricted cold profiled-sheet commercial mode", () => {
    render(<EngineeringPreviewPage />);
    const system = screen.getByRole("combobox", { name: "Preview система ограждения" });
    expect(system).toHaveValue("SANDWICH_PANEL");
    fireEvent.change(system, { target: { value: "PROFILED_SHEET_COLD" } });
    expect(system).toHaveValue("PROFILED_SHEET_COLD");
    expect(screen.getByDisplayValue("С-18 0,5мм")).toBeInTheDocument();
  });

  it("calls calculateCore1 through the ProjectInput adapter", async () => {
    render(<EngineeringPreviewPage />);
    const city = screen.getByRole("combobox", { name: "Preview город" });
    fireEvent.focus(city);
    fireEvent.change(city, { target: { value: "Роза" } });
    fireEvent.click(await screen.findByRole("option", { name: "Роза" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить окна" }));
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(calculateMock).toHaveBeenCalledTimes(1));
    const actualInput = calculateMock.mock.calls[0]?.[0];
    expect(validateCore1Input(actualInput).valid).toBe(true);
    expect(actualInput).toMatchObject({ span_m: 12, building_length_m: 18, building_height_m: 3 });
    expect(await screen.findByText("Подбор сечений")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Canonical" }));
    expect(await screen.findByText("ОКОННЫЕ РИГЕЛИ")).toBeInTheDocument();
    expect(screen.getByText("Z140")).toBeInTheDocument();
    expect(screen.getByText("Z160")).toBeInTheDocument();
    expect(screen.getByText(/Масса оконных ригелей, кг/)).toBeInTheDocument();
    expect(screen.getByText("54", { exact: true })).toBeInTheDocument();
  });

  it("keeps repeatable opening geometry, quantities and window construction in ProjectInput", () => {
    render(<EngineeringPreviewPage />);
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить ворота" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить ворота" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить двери" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить двери" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить окна" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить окна" }));

    const widths = screen.getAllByLabelText("Ширина, м");
    const heights = screen.getAllByLabelText("Высота, м");
    fireEvent.change(widths[0]!, { target: { value: "4" } });
    fireEvent.change(widths[1]!, { target: { value: "6.5" } });
    fireEvent.change(heights[1]!, { target: { value: "5" } });
    const quantities = screen.getAllByLabelText("Количество");
    fireEvent.change(quantities[0]!, { target: { value: "1" } });
    fireEvent.change(quantities[1]!, { target: { value: "2" } });

    expect(screen.getAllByDisplayValue(4)).toHaveLength(1);
    expect(screen.getAllByDisplayValue(6.5)).toHaveLength(1);
    expect(screen.getAllByDisplayValue(5)).toHaveLength(1);
    expect(screen.getAllByDisplayValue(2)).toHaveLength(1);
    expect(screen.getAllByDisplayValue("2ой стеклопакет")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Удалить" })).toHaveLength(6);

    fireEvent.click(screen.getAllByRole("button", { name: "Удалить" })[1]!);
    expect(screen.getAllByRole("button", { name: "Удалить" })).toHaveLength(5);
  });

  it("does not show a stale girt when heterogeneous windows are not representable", async () => {
    render(<EngineeringPreviewPage />);
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить окна" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить окна" }));
    const widths = screen.getAllByLabelText("Ширина, м");
    fireEvent.change(widths[0]!, { target: { value: "1.5" } });
    fireEvent.change(widths[1]!, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    expect(await screen.findByText("CORE1_OPENINGS_NOT_REPRESENTABLE")).toBeInTheDocument();
    expect(screen.getByText(/WINDOW_GIRT_SELECTION = NOT_REPRESENTABLE/)).toBeInTheDocument();
    expect(screen.queryByText("Z140")).not.toBeInTheDocument();
    expect(calculateMock).not.toHaveBeenCalled();
  });

  it("marks zero windows as not required and exposes the projection trace", async () => {
    calculateMock.mockResolvedValueOnce({ status: "success", diagnostics: [], result: { scenario: {}, climate: {}, excelOutput: { sections: [] }, window_girts: [], window_girts_weight_kg: 0 } });
    render(<EngineeringPreviewPage />);
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(calculateMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Диагностика" }));
    expect(screen.getByText(/WINDOW_GIRT_SELECTION = NOT_REQUIRED/)).toBeInTheDocument();
    expect(screen.getByText(/Окна ProjectInput: 0/)).toBeInTheDocument();
    expect(screen.queryByText(/Масса оконных ригелей, кг/)).not.toBeInTheDocument();
  });

  it("uses the climate dataset for city selection and makes Челябинск available", async () => {
    render(<EngineeringPreviewPage />);
    const city = screen.getByRole("combobox", { name: "Preview город" });
    fireEvent.focus(city);
    fireEvent.change(city, { target: { value: "Челябинск" } });
    expect(await screen.findByRole("option", { name: "Челябинск" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Челябинск" }));
    expect(screen.getByDisplayValue("Челябинск")).toBeInTheDocument();
  });

  it("defaults to Russia and clears a city that is not available for Kazakhstan", async () => {
    render(<EngineeringPreviewPage />);
    expect(screen.getByRole("combobox", { name: "Preview страна" })).toHaveValue("RU");
    const city = screen.getByRole("combobox", { name: "Preview город" });
    fireEvent.focus(city);
    fireEvent.change(city, { target: { value: "Роза" } });
    fireEvent.click(await screen.findByRole("option", { name: "Роза" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Preview страна" }), { target: { value: "KZ" } });
    expect(screen.getByRole("combobox", { name: "Preview город" })).toHaveValue("");
    expect(screen.queryByRole("option", { name: "Роза" })).not.toBeInTheDocument();
  });

  it("offers only explicitly country-tagged Kazakhstan cities from the source dataset", async () => {
    render(<EngineeringPreviewPage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Preview страна" }), { target: { value: "KZ" } });
    const city = screen.getByRole("combobox", { name: "Preview город" });
    fireEvent.focus(city);
    expect(await screen.findByRole("option", { name: "Туркестан" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Роза" })).not.toBeInTheDocument();
  });

  it("loads a project JSON atomically and recalculates it through the real engine", async () => {
    render(<EngineeringPreviewPage />);
    const file = new File([JSON.stringify({ format: "SPRINT_M_PROJECT", version: 1, project: { ...defaultPreviewInput, countryCode: "RU", climate: { ...defaultPreviewInput.climate, city: "Сургут" }, geometry: { ...defaultPreviewInput.geometry, building_length_m: 30 } } })], "surgut-project.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Загрузить расчёт файл"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByDisplayValue("Сургут")).toBeInTheDocument());
    expect(screen.getByText(/Загружен: surgut-project\.json/)).toBeInTheDocument();
    expect(screen.getByText("Расчёт загружен. Нажмите «Рассчитать».")) .toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(calculateMock).toHaveBeenCalledTimes(1));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Очистить данные" }));
    expect(confirm).toHaveBeenCalledWith("Очистить все введённые данные расчёта?");
    expect(screen.getByRole("combobox", { name: "Preview страна" })).toHaveValue("RU");
    expect(screen.getByRole("combobox", { name: "Preview город" })).toHaveValue("");
    expect(screen.queryByText(/Загружен: surgut-project/)).not.toBeInTheDocument();
    expect(screen.queryByText("Расчёт загружен. Нажмите «Рассчитать».")) .not.toBeInTheDocument();
    confirm.mockRestore();
  });

  it("keeps the current project when an invalid JSON file is selected", async () => {
    render(<EngineeringPreviewPage />);
    const file = new File(["not json"], "broken.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Загрузить расчёт файл"), { target: { files: [file] } });
    expect(await screen.findByText("Не удалось загрузить расчёт: некорректный JSON-файл.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Preview город" })).toHaveValue("");
  });

  it("passes repeatable wall-girt zones through EnclosureCore and shows the returned mass", async () => {
    render(<EngineeringPreviewPage />);
    fireEvent.click(screen.getByRole("button", { name: "+ Добавить зону ригелей" }));
    expect(screen.getByDisplayValue("C140x2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(calculateMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "ОГРАЖДАЙКА" }));
    expect((await screen.findAllByText("Зона ригелей №1")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("C140x2")).toBeInTheDocument();
    expect(screen.getAllByText("Шаг ригелей, м").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Скобы, шт.")).toBeInTheDocument();
    expect(screen.getByText("Известная масса зоны, кг")).toBeInTheDocument();
    expect(screen.getByText(/Неизвестные компоненты/)).toBeInTheDocument();
  });

  it("persists explicit v1.5 wall controllers and does not invent AUTO runtime", async () => {
    render(<EngineeringPreviewPage />);
    fireEvent.change(screen.getByLabelText("SIDE B12"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("SIDE B13"), { target: { value: "4.5" } });
    fireEvent.change(screen.getByLabelText("SIDE e"), { target: { value: "1.2" } });
    fireEvent.click(screen.getByRole("button", { name: "Рассчитать" }));
    await waitFor(() => expect(calculateMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "ОГРАЖДАЙКА" }));
    expect(await screen.findByText(/ENCLOSURE_WALL_GIRT_RUNTIME_REQUIRED/)).toBeInTheDocument();
    expect(screen.getByText(/EXPLICIT CONTROLLER/)).toBeInTheDocument();
  });
});
