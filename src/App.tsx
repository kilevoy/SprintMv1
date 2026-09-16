import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BrowserCore1DataRepository, BrowserDataSource } from "./core1/data";
import type { DatasetRecord, LoadedDataset } from "./core1/data";
import { previewClimate } from "./core1/climate";
import { calculateCore1 } from "./core1/engine";
import type { Core1EngineResult } from "./core1/engine";
import type { Core1ClimateResult, Core1Diagnostic, Core1Input, CountryCode, RoofCovering, RoofDeckGrade } from "./core1/types";
import { createOpeningId, projectInputToCore1Input } from "./project";
import type { ProjectInput, ProjectOpening, WindowOpening } from "./project";

const spans = [9, 12, 15, 18, 21, 24] as const;
const roofCoverings: RoofCovering[] = ["наше 100 мм", "наше 150 мм", "наше 200 мм", "наше 250 мм", "наше 150 мм с 1 слоем гвл", "наше 150 мм с 2 слоем гвл", "наше 200 мм с 1 слоем гвл", "наше 200 мм с 2 слоем гвл", "наше 250 мм с 1 слоем гвл", "наше 250 мм с 2 слоем гвл", "С-П 50", "С-П 80", "С-П 100", "С-П 120", "С-П 150", "С-П 200", "С-П 250", "малоуклонная кровля с подв. п.", "малоуклонная кровля без подв. п.", "профлист"];
const deckGrades: RoofDeckGrade[] = ["С44-1000-0,5", "С44-1000-0,7", "Н60-845-0,7", "Н60-845-0,8"];
const glazingOptions = ["2ой стеклопакет", "1ой стеклопакет", "светопрозрачный профлист"];
const wallSystems = ["Сэндвич-панель 200 мм"] as const;

const defaultProjectInput: ProjectInput = {
  climate: { mode: "CITY_LOOKUP", country: "RU", city: "Роза", normative_system: "SP_20" },
  geometry: { span_m: 12, building_length_m: 18, building_height_m: 3, responsibility_factor: 0.8, frame_step_override_m: null },
  envelope: { roof_covering: "С-П 200", roof_deck_grade: "С44-1000-0,7", wall_system: wallSystems[0] },
  openings: [],
  special_conditions: { snow_retention_purlin: "нет", enclosure_purlin: "нет", horizontal_bracing_override: null },
  other: { selection_mode: "стандарт", building_roof_type: "двускатное", purlin_max_step_override_mm: null, purlin_min_step_mm: 0, terrain_type: "В", window_scheme_factor: 1.0, window_utilization_limit: 0.85 },
};

function numberValue(value: string, fallback = 0): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cellParts(cell: string): { column: string; row: number } | null {
  const match = /^([A-Z]+)(\d+)$/.exec(cell);
  return match ? { column: match[1]!, row: Number(match[2]) } : null;
}

function cachedText(record: DatasetRecord): string | null {
  return typeof record.cached_value_json === "string" && !record.cached_value_json.startsWith("#") ? record.cached_value_json : null;
}

function extractCities(dataset: LoadedDataset): string[] {
  return [...new Set(dataset.records.flatMap((record) => {
    const parts = cellParts(record.cell);
    if (!parts || parts.row < 3 || !["B", "AR"].includes(parts.column)) return [];
    const city = cachedText(record);
    return city ? [city] : [];
  }))].sort((a, b) => a.localeCompare(b, "ru"));
}

function sameCity(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase("ru-RU") === right.trim().toLocaleLowerCase("ru-RU");
}

function fromFixture(input: Core1Input): ProjectInput {
  const climate = input.climate;
  return {
    ...defaultProjectInput,
    climate: climate?.mode === "MANUAL"
      ? { mode: "MANUAL", country: climate.country, normative_system: climate.normative_system, snow_region: String(climate.snow_region ?? ""), snow_load: climate.snow_load ?? 0, wind_region: String(climate.wind_region ?? ""), wind_load: climate.wind_load ?? 0, seismicity: String(climate.seismicity ?? ""), source_note: climate.source_note ?? "" }
      : { mode: "CITY_LOOKUP", country: climate?.country ?? input.country ?? "RU", city: climate?.city ?? input.city ?? "Роза", normative_system: climate?.normative_system ?? input.normative_system ?? "SP_20" },
    geometry: { span_m: input.span_m, building_length_m: input.building_length_m, building_height_m: input.building_height_m, responsibility_factor: input.responsibility_factor, frame_step_override_m: input.frame_step_override_m ?? null },
    envelope: { ...defaultProjectInput.envelope, roof_covering: input.roof_covering, roof_deck_grade: input.roof_deck_grade },
    special_conditions: { snow_retention_purlin: input.snow_retention_purlin, enclosure_purlin: input.enclosure_purlin, horizontal_bracing_override: input.horizontal_bracing_override ?? null },
    other: { ...defaultProjectInput.other, selection_mode: input.selection_mode ?? "стандарт", building_roof_type: input.building_roof_type ?? "двускатное", purlin_max_step_override_mm: input.purlin_max_step_override_mm ?? null, purlin_min_step_mm: input.purlin_min_step_mm ?? 0, terrain_type: input.terrain_type ?? "В", window_scheme_factor: input.window_scheme_factor ?? 1, window_utilization_limit: input.window_utilization_limit ?? 0.85 },
  };
}

function format(value: number | null | undefined, digits = 2): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: digits }) : "нет данных";
}

function StatusBadge({ result }: { result: Core1EngineResult | null }) {
  if (!result) return <span className="status-pill neutral">Готов к расчёту</span>;
  if (result.status === "success") return <span className="status-pill success">Расчёт выполнен</span>;
  if (result.status === "legacy_error") return <span className="status-pill legacy">Legacy behavior</span>;
  return <span className="status-pill warning">Требуется внимание</span>;
}

function DiagnosticPanel({ result }: { result: Core1EngineResult }) {
  if (result.status === "success" && result.diagnostics.length === 0) return null;
  return <div className="diagnostics" role="alert">{result.diagnostics.map((diagnostic, index) => <details key={`${diagnostic.code}-${index}`} open={index === 0}><summary><strong>{diagnostic.code}</strong><span>{diagnostic.message}</span></summary><div className="diagnostic-details"><span>Источник: {diagnostic.source?.join(", ") || "не указан"}</span>{diagnostic.legacy_equivalent ? <span>Эквивалент Excel: {diagnostic.legacy_equivalent}</span> : null}</div></details>)}</div>;
}

function AdapterDiagnosticPanel({ diagnostics }: { diagnostics: Core1Diagnostic[] }) {
  if (diagnostics.length === 0) return null;
  return <div className="diagnostics" role="alert">{diagnostics.map((item, index) => <details key={`${item.code}-${index}`} open={index === 0}><summary><strong>{item.code}</strong><span>{item.message}</span></summary><div className="diagnostic-details"><span>Core 1 получает данные только через explicit adapter.</span><span>Источник: {item.source?.join(", ") || "не указан"}</span></div></details>)}</div>;
}

function OpeningEditor({ openings, onAdd, onUpdate, onRemove }: { openings: ProjectOpening[]; onAdd: (kind: ProjectOpening["kind"]) => void; onUpdate: (id: string, patch: Partial<ProjectOpening>) => void; onRemove: (id: string) => void }) {
  const groups: Array<{ kind: ProjectOpening["kind"]; title: string; addLabel: string }> = [
    { kind: "gate", title: "Ворота", addLabel: "+ Добавить ворота" },
    { kind: "door", title: "Двери", addLabel: "+ Добавить дверь" },
    { kind: "window", title: "Окна", addLabel: "+ Добавить окно" },
    { kind: "strip_window", title: "Ленточные окна", addLabel: "+ Добавить ленточное окно" },
  ];
  return <div className="opening-editor">{groups.map(({ kind, title, addLabel }) => {
    const rows = openings.filter((opening) => opening.kind === kind);
    return <div className="opening-group" key={kind}><div className="opening-group-heading"><strong>{title}</strong><span>{rows.length ? `${rows.length} группы` : "нет"}</span></div>{rows.map((opening) => <div className="opening-row" key={opening.id}>
      <div className="two-col">{opening.kind !== "strip_window" ? <Field label={`Ширина ${title.toLowerCase()}`}><input type="number" min="1" step="1" value={"width_mm" in opening ? opening.width_mm : ""} onChange={(event) => onUpdate(opening.id, { width_mm: Math.max(0, Number(event.target.value)) })} /></Field> : <div />}{<Field label={`Высота ${title.toLowerCase()}`}><input type="number" min="1" step="1" value={opening.height_mm} onChange={(event) => onUpdate(opening.id, { height_mm: Math.max(0, Number(event.target.value)) })} /></Field>}</div>
      {opening.kind === "strip_window" ? <Field label="Длина ленточного окна, мм"><input type="number" min="1" step="1" value={opening.length_mm} onChange={(event) => onUpdate(opening.id, { length_mm: Math.max(0, Number(event.target.value)) })} /></Field> : null}
      <div className="two-col"><Field label={`Количество ${title.toLowerCase()}`}><input type="number" min="1" step="1" value={opening.quantity} onChange={(event) => onUpdate(opening.id, { quantity: Math.max(1, Math.trunc(Number(event.target.value))) })} /></Field>{opening.kind === "window" || opening.kind === "strip_window" ? <Field label="Тип окна"><select value={opening.window_type} onChange={(event) => onUpdate(opening.id, { window_type: Number(event.target.value) as WindowOpening["window_type"] })}>{([1, 2, 3, 4, 5] as const).map((type) => <option key={type} value={type}>Тип {type}</option>)}</select></Field> : <div />}</div>
      {opening.kind === "window" || opening.kind === "strip_window" ? <Field label="Конструкция остекления"><select value={opening.glazing_construction} onChange={(event) => onUpdate(opening.id, { glazing_construction: event.target.value })}>{glazingOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field> : null}
      <button type="button" className="remove-opening text-button" onClick={() => onRemove(opening.id)}>Удалить</button>
    </div>)}<button type="button" className="add-opening secondary-button" onClick={() => onAdd(kind)}>{addLabel}</button></div>;
  })}</div>;
}

function ResultCard({ result, onManualClimate, climateFresh = true }: { result: Core1EngineResult | null; onManualClimate: () => void; climateFresh?: boolean }) {
  if (!result) return <div className="empty-result"><div className="empty-mark">⌁</div><h2>Результат появится здесь</h2><p>Заполните исходные данные и нажмите «Рассчитать».</p></div>;
  if (result.status !== "success") return <><DiagnosticPanel result={result} /><div className="empty-result compact"><h2>Расчёт не выдал числовой результат</h2><p>Сценарий обработан по контракту Core 1. Исправление legacy-поведения не выполняется.</p>{result.status === "city_not_found" || result.diagnostics.some((diagnostic) => diagnostic.code === "CITY_NOT_FOUND") ? <button type="button" className="secondary-button cta-button" onClick={onManualClimate}>Ввести климатические данные вручную</button> : null}</div></>;
  const value = result.result;
  const baseline = value.scenario.span_m === 12 && value.scenario.building_length_m === 18 && value.scenario.building_height_m === 3 && !value.scenario.windows?.enabled;
  return <div className="result-stack">
    <section className="hero-result"><div><span className="eyebrow">Основной результат</span><h2>Металлоёмкость</h2><span className="parity-note">{baseline ? "✓ Проверено по Excel baseline" : "Расчёт реализован · parity verification pending"}</span></div><div className="hero-number">{format(value.kg_per_m2)} <small>кг/м²</small></div></section>
    <DiagnosticPanel result={result} />
    <section className="result-card"><div className="card-heading"><div><span className="eyebrow">Core 1</span><h3>Основной каркас</h3></div><span className="tiny-status">Результат</span></div><div className="metric-grid"><Metric label="Балка" value={value.beam_profile} sub={`${value.beam_steel ?? "—"} · ${format(value.beam_utilization, 1)} %`} /><Metric label="Колонна" value={value.column_profile} sub={`${value.column_steel ?? "—"} · ${format(value.column_utilization, 1)} %`} /><Metric label="Шаг рам" value={`${format(value.frame_step_m)} м`} /><Metric label="Прогоны" value={value.purlin_profile} sub={`${value.scenario.roof_deck_grade ?? "настил —"} · шаг ${value.purlin_step_mm != null ? `${format(value.purlin_step_mm, 0)} мм` : "по расчёту"} · ${value.purlin_steel ?? "—"} · ${format(value.purlin_kg_per_m2)} кг/м²`} /></div></section>
    <section className="result-card"><div className="card-heading"><div><span className="eyebrow">Масса</span><h3>Проёмы и окна</h3></div></div><div className="metric-grid"><Metric label="Дополнительная масса" value={`${format(value.openings_weight_kg_per_m2)} кг/м²`} /><Metric label="Абсолютная масса" value={`${format(value.openings_weight_t, 3)} т`} /><Metric label="Оконные ригели" value={value.window_girts_weight_kg ? `${format(value.window_girts_weight_kg)} кг` : "нет"} /></div>{value.scenario.windows?.enabled ? <div className="window-result"><strong>Тип окна {value.scenario.windows.window_type}</strong><span>Нижний: {value.window_lower_girt_profile ?? "нет данных"} · {format(value.window_lower_girt_utilization, 1)} %</span><span>Верхний: {value.window_upper_girt_profile ?? "нет данных"} · {format(value.window_upper_girt_utilization, 1)} %</span><em>Parity ненулевых окон ожидает golden-сценарий</em></div> : null}</section>
    {value.climate && climateFresh ? <section className="result-card"><div className="card-heading"><div><span className="eyebrow">ClimateResult</span><h3>Климатические данные</h3></div><span className="tiny-status">{value.climate.climate_source === "MANUAL" ? "Ручной ввод" : "База"}</span></div><div className="metric-grid"><Metric label="Страна / город" value={`${value.climate.country} · ${value.climate.city ?? "ручной ввод"}`} /><Metric label="Нормативная система" value={value.climate.normative_system} /><Metric label="Снеговой район / нагрузка" value={`${value.climate.snow_region ?? "—"} · ${format(value.climate.snow_load, 3)} кН/м²`} /><Metric label="Ветровой район / нагрузка" value={`${value.climate.wind_region ?? "—"} · ${format(value.climate.wind_load, 3)} кН/м²`} /></div></section> : null}
    <details className="result-card secondary-details"><summary><h3>Дополнительные конструкции</h3><span>Показать состав</span></summary><div className="secondary-list">{([ ["Затяжки", value.ties], ["Подвески", value.suspensions], ["Распорки", value.spacers], ["Стойки фахверка", value.gable_posts], ["Портальные связи", value.portal_bracing], ["Вторичные стойки", value.secondary_columns] ] as const).map(([label, item]) => item ? <div key={label}><span>{label}</span><strong>{item.profile ?? "нет данных"}</strong><small>{item.steel ?? ""}</small></div> : null)}<div><span>Болты / М16</span><strong>{value.bolts?.length ?? 0} группы · {value.M16_quantity ?? 0} шт.</strong></div><div><span>Фасонки</span><strong>{format(value.fittings_weight_kg)} кг</strong></div></div></details>
  </div>;
}

function Metric({ label, value, sub }: { label: string; value: unknown; sub?: string }) { return <div className="metric"><span>{label}</span><strong>{String(value ?? "нет данных")}</strong>{sub ? <small>{sub}</small> : null}</div>; }

type ClimatePreviewStatus = "loading" | "success" | "city_not_found" | "unknown_climate_data";

function ClimatePreviewCard({ climate, status, onManual }: { climate: Core1ClimateResult | null; status: ClimatePreviewStatus; onManual: () => void }) {
  if (status === "loading") return <div className="climate-preview muted-preview" role="status">Загружаем локальную климатическую базу…</div>;
  if (status === "success" && climate) return <div className="climate-preview" role="status"><div className="climate-preview-heading"><span className="climate-check">✓</span><div><strong>Климатические данные загружены</strong><small>Источник: база калькулятора · {climate.normative_system}</small></div></div><div className="climate-preview-grid"><div><span>Снег</span><strong>{climate.snow_region} · {format(climate.snow_load, 2)} кН/м²</strong></div><div><span>Ветер</span><strong>{climate.wind_region} · {format(climate.wind_load, 2)} кН/м²</strong></div><div><span>Сейсмичность</span><strong>{climate.seismicity ?? "не задана"}</strong></div></div></div>;
  return <div className="climate-preview climate-preview-warning" role="status"><div><strong>{status === "city_not_found" ? "Город не найден в локальной базе" : "Климат для этой ветки не подтверждён"}</strong><small>Введите климатические параметры вручную, чтобы продолжить расчёт.</small></div><button type="button" className="secondary-button" onClick={onManual}>Ввести вручную</button></div>;
}

export default function App() {
  const repository = useMemo(() => new BrowserCore1DataRepository(new BrowserDataSource()), []);
  const [projectInput, setProjectInput] = useState<ProjectInput>(defaultProjectInput);
  const [cityQuery, setCityQuery] = useState(defaultProjectInput.climate.mode === "CITY_LOOKUP" ? defaultProjectInput.climate.city : "");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [climateDataset, setClimateDataset] = useState<LoadedDataset | null>(null);
  const [cityDatasetLoading, setCityDatasetLoading] = useState(true);
  const [cityActiveIndex, setCityActiveIndex] = useState(-1);
  const [climatePreview, setClimatePreview] = useState<Core1ClimateResult | null>(null);
  const [climatePreviewStatus, setClimatePreviewStatus] = useState<ClimatePreviewStatus>("loading");
  const [result, setResult] = useState<Core1EngineResult | null>(null);
  const [adapterDiagnostics, setAdapterDiagnostics] = useState<Core1Diagnostic[]>([]);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void repository.loadClimateDataset("climate_lookup_sparse").then((dataset) => {
      if (!active) return;
      const cities = extractCities(dataset);
      setClimateDataset(dataset);
      setCityOptions(cities);
      setCityDatasetLoading(false);
      const initialCity = cities.find((city) => sameCity(city, "Роза"));
      if (initialCity) {
        setSelectedCity(initialCity);
        setProjectInput((current) => current.climate.mode === "CITY_LOOKUP" ? { ...current, climate: { ...current.climate, city: initialCity } } : current);
      }
    }).catch(() => { if (active) { setCityDatasetLoading(false); setClimatePreviewStatus("unknown_climate_data"); } });
    return () => { active = false; };
  }, [repository]);

  const climate = projectInput.climate;
  const climateIsManual = climate.mode === "MANUAL";
  const manualClimate = climateIsManual ? climate : null;
  useEffect(() => {
    if (climateIsManual || !selectedCity || !climateDataset) return;
    const preview = previewClimate({ mode: "CITY_LOOKUP", country: climate.country, city: selectedCity, normative_system: climate.normative_system }, climateDataset);
    setClimatePreviewStatus(preview.status);
    setClimatePreview(preview.status === "success" ? preview.climate : null);
  }, [climate, climateDataset, climateIsManual, selectedCity]);

  const mutateProject = (updater: (current: ProjectInput) => ProjectInput, affectsCore1 = true) => { setProjectInput(updater); setAdapterDiagnostics([]); if (affectsCore1) setStale(Boolean(result)); };
  const updateClimate = (patch: Partial<ProjectInput["climate"]>, affectsCore1 = true) => mutateProject((current) => {
    const mode = patch.mode ?? current.climate.mode;
    const cityPatch = "city" in patch ? patch.city : undefined;
    if (mode === "CITY_LOOKUP") return { ...current, climate: { mode: "CITY_LOOKUP", country: patch.country ?? current.climate.country, city: cityPatch ?? cityQuery, normative_system: patch.normative_system ?? current.climate.normative_system } };
    const manualBase = current.climate.mode === "MANUAL" ? current.climate : { mode: "MANUAL" as const, country: current.climate.country, normative_system: current.climate.normative_system, snow_region: "", snow_load: 0, wind_region: "", wind_load: 0, seismicity: "", source_note: "" };
    return { ...current, climate: { ...manualBase, ...patch, mode: "MANUAL" } as ProjectInput["climate"] };
  }, affectsCore1);
  const updateGeometry = (patch: Partial<ProjectInput["geometry"]>) => mutateProject((current) => ({ ...current, geometry: { ...current.geometry, ...patch } }));
  const updateEnvelope = (patch: Partial<ProjectInput["envelope"]>) => mutateProject((current) => ({ ...current, envelope: { ...current.envelope, ...patch } }), !Object.prototype.hasOwnProperty.call(patch, "wall_system"));
  const updateSpecial = (patch: Partial<ProjectInput["special_conditions"]>) => mutateProject((current) => ({ ...current, special_conditions: { ...current.special_conditions, ...patch } }));
  const updateOther = (patch: Partial<ProjectInput["other"]>) => mutateProject((current) => ({ ...current, other: { ...current.other, ...patch } }));
  const updateOpening = (id: string, patch: Partial<ProjectOpening>) => {
    const currentOpening = projectInput.openings.find((opening) => opening.id === id);
    const gateOrDoorDimensionsOnly = currentOpening !== undefined && (currentOpening.kind === "gate" || currentOpening.kind === "door") && Object.keys(patch).every((key) => key === "width_mm" || key === "height_mm");
    mutateProject((current) => ({ ...current, openings: current.openings.map((opening) => opening.id === id ? { ...opening, ...patch } as ProjectOpening : opening) }), !gateOrDoorDimensionsOnly);
  };
  const addOpening = (kind: ProjectOpening["kind"]) => {
    const opening: ProjectOpening = kind === "gate" ? { id: createOpeningId(kind), kind, width_mm: 4000, height_mm: 4200, quantity: 1 }
      : kind === "door" ? { id: createOpeningId(kind), kind, width_mm: 900, height_mm: 2100, quantity: 1 }
        : kind === "window" ? { id: createOpeningId(kind), kind, width_mm: 1200, height_mm: 1500, quantity: 1, window_type: 1, glazing_construction: glazingOptions[0]! }
          : { id: createOpeningId(kind), kind, height_mm: 1500, length_mm: 6000, quantity: 1, window_type: 1, glazing_construction: glazingOptions[0]! };
    mutateProject((current) => ({ ...current, openings: [...current.openings, opening] }));
  };
  const removeOpening = (id: string) => mutateProject((current) => ({ ...current, openings: current.openings.filter((opening) => opening.id !== id) }));

  const filteredCityOptions = useMemo(() => {
    const query = cityQuery.trim().toLocaleLowerCase("ru-RU");
    if (!query || selectedCity === cityQuery) return [];
    return cityOptions.filter((city) => city.toLocaleLowerCase("ru-RU").includes(query)).slice(0, 8);
  }, [cityOptions, cityQuery, selectedCity]);
  const exactCity = cityOptions.find((city) => sameCity(city, cityQuery));
  const cityNotFound = !cityDatasetLoading && cityQuery.trim().length > 1 && !selectedCity && !exactCity && filteredCityOptions.length === 0;
  useEffect(() => { if (cityNotFound) setClimatePreviewStatus("city_not_found"); }, [cityNotFound]);
  const chooseCity = (city: string) => { setCityQuery(city); setSelectedCity(city); setCityActiveIndex(-1); setClimatePreview(null); setClimatePreviewStatus("loading"); updateClimate({ mode: "CITY_LOOKUP", city }); };
  const onCityQueryChange = (value: string) => { setCityQuery(value); setSelectedCity(null); setClimatePreview(null); setClimatePreviewStatus(value.trim() ? "unknown_climate_data" : "loading"); setCityActiveIndex(-1); updateClimate({ mode: "CITY_LOOKUP", city: value }); };
  const commitCity = (candidate?: string) => { const value = candidate ?? cityQuery; const exact = cityOptions.find((city) => sameCity(city, value)); if (exact) chooseCity(exact); };
  const calculate = async () => {
    setLoading(true); setError(null); setAdapterDiagnostics([]);
    try {
      const adapted = projectInputToCore1Input(projectInput);
      if (adapted.status !== "success") { setAdapterDiagnostics(adapted.diagnostics); setResult(null); setStale(false); return; }
      setResult(await calculateCore1(adapted.input, repository)); setStale(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт"); }
    finally { setLoading(false); }
  };
  const loadDemo = async () => { setError(null); try { const fixture = await repository.loadFixture("baseline_12m"); const nextProject = fromFixture(fixture.input as Core1Input); setProjectInput(nextProject); setCityQuery(nextProject.climate.mode === "CITY_LOOKUP" ? nextProject.climate.city : ""); setSelectedCity(null); setClimatePreview(null); setClimatePreviewStatus("loading"); setResult(null); setAdapterDiagnostics([]); setStale(false); } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось загрузить fixture"); } };
  const reset = () => { setProjectInput(defaultProjectInput); setCityQuery("Роза"); setSelectedCity(null); setClimatePreview(null); setClimatePreviewStatus("loading"); setResult(null); setAdapterDiagnostics([]); setStale(false); setError(null); };
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">SM</div><div><strong>Sprint M</strong><span>Расчёт металлокаркаса ангара</span></div></div><div className="core-status"><i /> Core 1</div></header>
    <main className="workspace"><div className="intro"><div><span className="eyebrow">Инженерный калькулятор</span><h1>Подбор сечений</h1><p>Один ProjectInput для пользовательского проекта и будущих расчётных ядер.</p></div><StatusBadge result={result} /></div>
      {stale ? <div className="stale-banner">Параметры изменены — требуется перерасчёт.</div> : null}{error ? <div className="error-banner">{error}</div> : null}
      <div className="calculator-grid"><form className="input-panel" onSubmit={(event) => { event.preventDefault(); void calculate(); }}>
        <Section title="Местоположение и климат" hint="Нагрузка определяется Core 1"><Field label="Страна"><select value={climate.country} onChange={(event) => updateClimate({ country: event.target.value as CountryCode, normative_system: event.target.value === "RU" ? "SP_20" : climate.normative_system })}><option value="RU">Россия</option><option value="KZ">Казахстан</option></select></Field>{climate.country === "KZ" ? <Field label="Расчёт по евронормам"><div className="segmented"><button type="button" className={climate.normative_system === "SP_20" ? "active" : ""} onClick={() => updateClimate({ normative_system: "SP_20" })}>Нет</button><button type="button" className={climate.normative_system === "SP_RK_EN" ? "active" : ""} onClick={() => updateClimate({ normative_system: "SP_RK_EN" })}>Да</button></div><small className="field-note">{climate.normative_system}</small></Field> : null}<Field label="Режим климатических данных"><div className="segmented"><button type="button" className={!climateIsManual ? "active" : ""} onClick={() => updateClimate({ mode: "CITY_LOOKUP" })}>По базе</button><button type="button" className={climateIsManual ? "active" : ""} onClick={() => updateClimate({ mode: "MANUAL" })}>Ручной ввод</button></div></Field>{!climateIsManual ? <><Field label="Населённый пункт"><div className="city-combobox"><div className="city-input-shell"><input role="combobox" aria-label="Населённый пункт" aria-expanded={filteredCityOptions.length > 0} aria-controls="city-suggestions" aria-activedescendant={cityActiveIndex >= 0 ? `city-option-${cityActiveIndex}` : undefined} value={cityQuery} onChange={(event) => onCityQueryChange(event.target.value)} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setCityActiveIndex((current) => Math.min(current + 1, filteredCityOptions.length - 1)); } else if (event.key === "ArrowUp") { event.preventDefault(); setCityActiveIndex((current) => Math.max(current - 1, 0)); } else if (event.key === "Enter") { event.preventDefault(); commitCity(cityActiveIndex >= 0 ? filteredCityOptions[cityActiveIndex] : undefined); } else if (event.key === "Escape") setCityActiveIndex(-1); }} onBlur={() => window.setTimeout(() => commitCity(), 0)} placeholder="Например, Роза" />{selectedCity ? <span className="city-selected-mark" aria-label="Город выбран">✓</span> : null}</div>{filteredCityOptions.length > 0 ? <div className="city-suggestions" id="city-suggestions" role="listbox">{filteredCityOptions.map((city, index) => <button type="button" role="option" aria-selected={index === cityActiveIndex} id={`city-option-${index}`} className={index === cityActiveIndex ? "city-suggestion active" : "city-suggestion"} key={city} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseCity(city)}>{city}</button>)}</div> : null}</div></Field><ClimatePreviewCard climate={climatePreview} status={climatePreviewStatus} onManual={() => updateClimate({ mode: "MANUAL" })} />{cityNotFound ? <div className="climate-not-found"><span>Совпадений в локальной базе нет.</span><button type="button" className="text-button" onClick={() => updateClimate({ mode: "MANUAL" })}>Перейти к ручному вводу</button></div> : null}</> : <div className="manual-climate"><div className="two-col"><Field label="Снеговой район"><input value={manualClimate?.snow_region ?? ""} onChange={(event) => updateClimate({ snow_region: event.target.value })} /></Field><Field label="Снеговая нагрузка, кН/м²"><input type="number" step="any" value={manualClimate?.snow_load ?? 0} onChange={(event) => updateClimate({ snow_load: numberValue(event.target.value) })} /></Field></div><div className="two-col"><Field label="Ветровой район"><input value={manualClimate?.wind_region ?? ""} onChange={(event) => updateClimate({ wind_region: event.target.value })} /></Field><Field label="Ветровая нагрузка, кН/м²"><input type="number" step="any" value={manualClimate?.wind_load ?? 0} onChange={(event) => updateClimate({ wind_load: numberValue(event.target.value) })} /></Field></div><Field label="Сейсмичность"><input value={manualClimate?.seismicity ?? ""} onChange={(event) => updateClimate({ seismicity: event.target.value })} placeholder="не задано" /></Field><Field label="Источник / примечание"><input value={manualClimate?.source_note ?? ""} onChange={(event) => updateClimate({ source_note: event.target.value })} /></Field></div>}</Section>
        <Section title="Геометрия ангара"><div className="two-col"><Field label="Пролёт, м"><select value={projectInput.geometry.span_m} onChange={(event) => updateGeometry({ span_m: Number(event.target.value) as ProjectInput["geometry"]["span_m"] })}>{spans.map((span) => <option key={span} value={span}>{span} м</option>)}</select></Field><Field label="Ответственность"><select value={projectInput.geometry.responsibility_factor} onChange={(event) => updateGeometry({ responsibility_factor: Number(event.target.value) as 0.8 | 1.0 })}><option value="0.8">0,8</option><option value="1.0">1,0</option></select></Field></div><div className="two-col"><Field label="Длина, м"><input type="number" min="0" step="any" value={projectInput.geometry.building_length_m} onChange={(event) => updateGeometry({ building_length_m: numberValue(event.target.value) })} /></Field><Field label="Высота, м"><input type="number" min="0" step="any" value={projectInput.geometry.building_height_m} onChange={(event) => updateGeometry({ building_height_m: numberValue(event.target.value) })} /></Field></div><label className="check-row"><input type="checkbox" checked={projectInput.geometry.frame_step_override_m !== null} onChange={(event) => updateGeometry({ frame_step_override_m: event.target.checked ? 6 : null })} /><span>Задать шаг рам вручную</span></label>{projectInput.geometry.frame_step_override_m !== null ? <Field label="Шаг рам, м"><input type="number" min="0" step="any" value={projectInput.geometry.frame_step_override_m} onChange={(event) => updateGeometry({ frame_step_override_m: numberValue(event.target.value) })} /></Field> : null}</Section>
        <Section title="Ограждающие конструкции" hint="Системы оболочки"><div className="construction-group"><div className="construction-kicker"><strong>Кровля</strong><span>Формирует вход Core 1</span></div><Field label="Покрытие"><select value={projectInput.envelope.roof_covering} onChange={(event) => updateEnvelope({ roof_covering: event.target.value as RoofCovering })}>{roofCoverings.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field><Field label="Марка настила"><select value={projectInput.envelope.roof_deck_grade} onChange={(event) => updateEnvelope({ roof_deck_grade: event.target.value as RoofDeckGrade })}>{deckGrades.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field><p className="field-help">Используется для ограничения допустимого шага прогонов.</p></div><div className="construction-group"><div className="construction-kicker"><strong>Стены</strong><span>Параметр проекта · Core 2</span></div><Field label="Стены"><select value={projectInput.envelope.wall_system} onChange={(event) => updateEnvelope({ wall_system: event.target.value })}>{wallSystems.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field><p className="field-help muted">Каталог стеновых систем Core 2 будет расширен после закрытия внешних источников.</p></div></Section>
        <Section title="Дополнительные условия"><div className="two-col"><Field label="Снегозадержание"><select value={projectInput.special_conditions.snow_retention_purlin} onChange={(event) => updateSpecial({ snow_retention_purlin: event.target.value as "есть" | "нет" })}><option value="нет">Нет</option><option value="есть">Да</option></select></Field><Field label="Прогон ограждения"><select value={projectInput.special_conditions.enclosure_purlin} onChange={(event) => updateSpecial({ enclosure_purlin: event.target.value as "есть" | "нет" })}><option value="нет">Нет</option><option value="есть">Да</option></select></Field></div><label className="check-row"><input type="checkbox" checked={projectInput.special_conditions.horizontal_bracing_override === "+"} onChange={(event) => updateSpecial({ horizontal_bracing_override: event.target.checked ? "+" : null })} /><span>Специальный горизонтальный связевой сценарий</span></label></Section>
        <Section title="Проёмы" hint="Детальные записи ProjectInput"><OpeningEditor openings={projectInput.openings} onAdd={addOpening} onUpdate={updateOpening} onRemove={removeOpening} /></Section>
        <div className="form-actions"><button className="primary-button" type="submit" disabled={loading}>{loading ? "Расчёт…" : "Рассчитать"}</button><button className="secondary-button" type="button" onClick={() => void loadDemo()}>Загрузить пример 12 м</button><button className="text-button" type="button" onClick={reset}>Сбросить</button></div>
      </form><aside className="result-panel"><div className="result-heading"><div><span className="eyebrow">Результат расчёта</span><h2>Состав конструкции</h2></div><span className="result-dot" /></div><AdapterDiagnosticPanel diagnostics={adapterDiagnostics} /><ResultCard result={result} climateFresh={climateIsManual || climatePreview !== null} onManualClimate={() => updateClimate({ mode: "MANUAL" })} /></aside></div>
    </main><footer><span>Core 1 · browser-side calculation</span><span>ProjectInput → adapters → calculation cores</span></footer>
  </div>;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) { return <section className="form-section"><div className="section-heading"><h2>{title}</h2>{hint ? <span>{hint}</span> : null}</div>{children}</section>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
