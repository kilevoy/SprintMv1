import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BrowserCore1DataRepository, BrowserDataSource } from "./core1/data";
import { calculateCore1 } from "./core1/engine";
import type { Core1EngineResult } from "./core1/engine";
import type { Core1Input, Core1Result, CountryCode, NormativeSystem, RoofCovering, RoofDeckGrade } from "./core1/types";

const spans = [9, 12, 15, 18, 21, 24] as const;
const roofCoverings: RoofCovering[] = ["наше 100 мм", "наше 150 мм", "наше 200 мм", "наше 250 мм", "наше 150 мм с 1 слоем гвл", "наше 150 мм с 2 слоем гвл", "наше 200 мм с 1 слоем гвл", "наше 200 мм с 2 слоем гвл", "наше 250 мм с 1 слоем гвл", "наше 250 мм с 2 слоем гвл", "С-П 50", "С-П 80", "С-П 100", "С-П 120", "С-П 150", "С-П 200", "С-П 250", "малоуклонная кровля с подв. п.", "малоуклонная кровля без подв. п.", "профлист"];
const deckGrades: RoofDeckGrade[] = ["С44-1000-0,5", "С44-1000-0,7", "Н60-845-0,7", "Н60-845-0,8"];
const glazingOptions = ["2ой стеклопакет", "1ой стеклопакет", "светопрозрачный профлист"];

type FormState = {
  country: CountryCode;
  city: string;
  climateMode: "CITY_LOOKUP" | "MANUAL";
  normativeSystem: NormativeSystem;
  snowRegion: string;
  snowLoad: string;
  windRegion: string;
  windLoad: string;
  seismicity: string;
  sourceNote: string;
  span: (typeof spans)[number];
  length: string;
  height: string;
  responsibility: "0.8" | "1.0";
  manualFrameStep: boolean;
  frameStep: string;
  roofCovering: RoofCovering;
  deckGrade: RoofDeckGrade;
  snowRetention: "есть" | "нет";
  enclosurePurlin: "есть" | "нет";
  horizontalBracing: boolean;
  gateSmall: string;
  gateLarge: string;
  doors: string;
  windowsEnabled: boolean;
  windowType: 1 | 2 | 3 | 4 | 5;
  windowHeight: string;
  stripLength: string;
  separateWindows: string;
  glazing: string;
};

const defaultForm: FormState = {
  country: "RU", city: "Роза", climateMode: "CITY_LOOKUP", normativeSystem: "SP_20",
  snowRegion: "", snowLoad: "", windRegion: "", windLoad: "", seismicity: "", sourceNote: "",
  span: 12, length: "18", height: "3", responsibility: "0.8", manualFrameStep: false, frameStep: "",
  roofCovering: "С-П 200", deckGrade: "С44-1000-0,7", snowRetention: "нет", enclosurePurlin: "нет",
  horizontalBracing: false, gateSmall: "0", gateLarge: "0", doors: "0", windowsEnabled: false,
  windowType: 1, windowHeight: "0", stripLength: "0", separateWindows: "0", glazing: "2ой стеклопакет",
};

function numberValue(value: string, fallback = 0): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInput(form: FormState): Core1Input {
  const base: Core1Input = {
    span_m: form.span,
    building_length_m: numberValue(form.length),
    building_height_m: numberValue(form.height),
    responsibility_factor: Number(form.responsibility) as 0.8 | 1.0,
    frame_step_override_m: form.manualFrameStep ? numberValue(form.frameStep) : null,
    roof_covering: form.roofCovering,
    roof_deck_grade: form.deckGrade,
    snow_retention_purlin: form.snowRetention,
    enclosure_purlin: form.enclosurePurlin,
    horizontal_bracing_override: form.horizontalBracing ? "+" : null,
    gates_le_6m_count: Math.max(0, Math.trunc(numberValue(form.gateSmall))),
    gates_gt_6m_count: Math.max(0, Math.trunc(numberValue(form.gateLarge))),
    doors_count: Math.max(0, Math.trunc(numberValue(form.doors))),
    windows: {
      enabled: form.windowsEnabled,
      window_type: form.windowType,
      window_height_m: Math.max(0, numberValue(form.windowHeight)),
      window_strip_length_m: Math.max(0, numberValue(form.stripLength)),
      separate_window_count: Math.max(0, Math.trunc(numberValue(form.separateWindows))),
      glazing_construction: form.glazing,
    },
    selection_mode: "стандарт",
    building_roof_type: "двускатное",
    purlin_max_step_override_mm: null,
    purlin_min_step_mm: 0,
    terrain_type: "В",
    window_scheme_factor: 1.0,
    window_utilization_limit: 0.85,
  };
  if (form.climateMode === "MANUAL") {
    base.climate = {
      mode: "MANUAL", country: form.country, normative_system: form.normativeSystem,
      snow_region: form.snowRegion || "", snow_load: numberValue(form.snowLoad),
      wind_region: form.windRegion || "", wind_load: numberValue(form.windLoad),
      seismicity: form.seismicity || null, ...(form.sourceNote ? { source_note: form.sourceNote } : {}),
    };
  } else {
    base.climate = { mode: "CITY_LOOKUP", country: form.country, city: form.city.trim(), normative_system: form.normativeSystem };
  }
  return base;
}

function fromFixture(input: Core1Input): FormState {
  const climate = input.climate;
  const windows = input.windows;
  return {
    ...defaultForm,
    country: climate?.country ?? input.country ?? "RU",
    city: climate?.mode === "CITY_LOOKUP" ? climate.city : input.city ?? "Роза",
    climateMode: climate?.mode ?? "CITY_LOOKUP",
    normativeSystem: climate?.normative_system ?? input.normative_system ?? (input.normative_branch === "по СП РК EN" ? "SP_RK_EN" : "SP_20"),
    span: input.span_m, length: String(input.building_length_m), height: String(input.building_height_m),
    responsibility: String(input.responsibility_factor) as "0.8" | "1.0",
    manualFrameStep: input.frame_step_override_m !== null && input.frame_step_override_m !== undefined,
    frameStep: input.frame_step_override_m ? String(input.frame_step_override_m) : "",
    roofCovering: input.roof_covering, deckGrade: input.roof_deck_grade,
    snowRetention: input.snow_retention_purlin, enclosurePurlin: input.enclosure_purlin,
    horizontalBracing: input.horizontal_bracing_override === "+",
    gateSmall: String(input.gates_le_6m_count), gateLarge: String(input.gates_gt_6m_count), doors: String(input.doors_count),
    windowsEnabled: windows?.enabled ?? Boolean((input.window_height_m ?? 0) || (input.window_strip_length_m ?? 0) || (input.separate_windows_count ?? 0)),
    windowType: windows?.window_type ?? input.window_type ?? 1,
    windowHeight: String(windows?.window_height_m ?? input.window_height_m ?? 0),
    stripLength: String(windows?.window_strip_length_m ?? input.window_strip_length_m ?? 0),
    separateWindows: String(windows?.separate_window_count ?? input.separate_windows_count ?? 0),
    glazing: windows?.glazing_construction ?? input.window_construction ?? "2ой стеклопакет",
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
  return <div className="diagnostics" role="alert">
    {result.diagnostics.map((diagnostic, index) => <details key={`${diagnostic.code}-${index}`} open={index === 0}>
      <summary><strong>{diagnostic.code}</strong><span>{diagnostic.message}</span></summary>
      <div className="diagnostic-details"><span>Источник: {diagnostic.source?.join(", ") || "не указан"}</span>{diagnostic.legacy_equivalent ? <span>Эквивалент Excel: {diagnostic.legacy_equivalent}</span> : null}</div>
    </details>)}
  </div>;
}

function ResultCard({ result, onManualClimate }: { result: Core1EngineResult | null; onManualClimate: () => void }) {
  if (!result) return <div className="empty-result"><div className="empty-mark">⌁</div><h2>Результат появится здесь</h2><p>Заполните исходные данные и нажмите «Рассчитать».</p></div>;
  if (result.status !== "success") return <><DiagnosticPanel result={result} /><div className="empty-result compact"><h2>Расчёт не выдал числовой результат</h2><p>Сценарий обработан по контракту Core 1. Исправление legacy-поведения не выполняется.</p>{result.status === "city_not_found" || result.diagnostics.some((diagnostic) => diagnostic.code === "CITY_NOT_FOUND") ? <button type="button" className="secondary-button cta-button" onClick={onManualClimate}>Ввести климатические данные вручную</button> : null}</div></>;
  const value = result.result;
  const baseline = value.scenario.span_m === 12 && value.scenario.building_length_m === 18 && value.scenario.building_height_m === 3 && !value.scenario.windows?.enabled;
  return <div className="result-stack">
    <section className="hero-result"><div><span className="eyebrow">Основной результат</span><h2>Металлоёмкость</h2><span className="parity-note">{baseline ? "✓ Проверено по Excel baseline" : "Расчёт реализован · parity verification pending"}</span></div><div className="hero-number">{format(value.kg_per_m2)} <small>кг/м²</small></div></section>
    <DiagnosticPanel result={result} />
    <section className="result-card"><div className="card-heading"><div><span className="eyebrow">Core 1</span><h3>Основной каркас</h3></div><span className="tiny-status">Результат</span></div><div className="metric-grid"><Metric label="Балка" value={value.beam_profile} sub={`${value.beam_steel ?? "—"} · ${format(value.beam_utilization, 1)} %`} /><Metric label="Колонна" value={value.column_profile} sub={`${value.column_steel ?? "—"} · ${format(value.column_utilization, 1)} %`} /><Metric label="Шаг рам" value={`${format(value.frame_step_m)} м`} /><Metric label="Прогоны" value={value.purlin_profile} sub={`${value.purlin_steel ?? "—"} · ${format(value.purlin_kg_per_m2)} кг/м²`} /></div></section>
    <section className="result-card"><div className="card-heading"><div><span className="eyebrow">Масса</span><h3>Проёмы и окна</h3></div></div><div className="metric-grid"><Metric label="Дополнительная масса" value={`${format(value.openings_weight_kg_per_m2)} кг/м²`} /><Metric label="Абсолютная масса" value={`${format(value.openings_weight_t, 3)} т`} /><Metric label="Оконные ригели" value={value.window_girts_weight_kg ? `${format(value.window_girts_weight_kg)} кг` : "нет"} /></div>{value.scenario.windows?.enabled ? <div className="window-result"><strong>Тип окна {value.scenario.windows.window_type}</strong><span>Нижний: {value.window_lower_girt_profile ?? "нет данных"} · {format(value.window_lower_girt_utilization, 1)} %</span><span>Верхний: {value.window_upper_girt_profile ?? "нет данных"} · {format(value.window_upper_girt_utilization, 1)} %</span><em>Parity ненулевых окон ожидает golden-сценарий</em></div> : null}</section>
    {value.climate ? <section className="result-card"><div className="card-heading"><div><span className="eyebrow">ClimateResult</span><h3>Климатические данные</h3></div><span className="tiny-status">{value.climate.climate_source === "MANUAL" ? "Ручной ввод" : "База"}</span></div><div className="metric-grid"><Metric label="Страна / город" value={`${value.climate.country} · ${value.climate.city ?? "ручной ввод"}`} /><Metric label="Нормативная система" value={value.climate.normative_system} /><Metric label="Снеговой район / нагрузка" value={`${value.climate.snow_region ?? "—"} · ${format(value.climate.snow_load, 3)} кН/м²`} /><Metric label="Ветровой район / нагрузка" value={`${value.climate.wind_region ?? "—"} · ${format(value.climate.wind_load, 3)} кН/м²`} /></div></section> : null}
    <details className="result-card secondary-details"><summary><h3>Дополнительные конструкции</h3><span>Показать состав</span></summary><div className="secondary-list">{([ ["Затяжки", value.ties], ["Подвески", value.suspensions], ["Распорки", value.spacers], ["Стойки фахверка", value.gable_posts], ["Портальные связи", value.portal_bracing], ["Вторичные стойки", value.secondary_columns] ] as const).map(([label, item]) => item ? <div key={label}><span>{label}</span><strong>{item.profile ?? "нет данных"}</strong><small>{item.steel ?? ""}</small></div> : null)}<div><span>Болты / М16</span><strong>{value.bolts?.length ?? 0} группы · {value.M16_quantity ?? 0} шт.</strong></div><div><span>Фасонки</span><strong>{format(value.fittings_weight_kg)} кг</strong></div></div></details>
  </div>;
}

function Metric({ label, value, sub }: { label: string; value: unknown; sub?: string }) { return <div className="metric"><span>{label}</span><strong>{String(value ?? "нет данных")}</strong>{sub ? <small>{sub}</small> : null}</div>; }

export default function App() {
  const repository = useMemo(() => new BrowserCore1DataRepository(new BrowserDataSource()), []);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [result, setResult] = useState<Core1EngineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => { setForm((current) => ({ ...current, [key]: value })); setStale(Boolean(result)); };
  const calculate = async () => { setLoading(true); setError(null); try { setResult(await calculateCore1(toInput(form), repository)); setStale(false); } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось выполнить расчёт"); } finally { setLoading(false); } };
  const loadDemo = async () => { setError(null); try { const fixture = await repository.loadFixture("baseline_12m"); setForm(fromFixture(fixture.input as Core1Input)); setResult(null); setStale(false); } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось загрузить fixture"); } };
  const reset = () => { setForm(defaultForm); setResult(null); setStale(false); setError(null); };
  const climateIsManual = form.climateMode === "MANUAL";
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">SM</div><div><strong>Sprint M</strong><span>Расчёт металлокаркаса ангара</span></div></div><div className="core-status"><i /> Core 1</div></header>
    <main className="workspace"><div className="intro"><div><span className="eyebrow">Инженерный калькулятор</span><h1>Подбор сечений</h1><p>Исходные данные слева, проверенный расчёт — справа.</p></div><StatusBadge result={result} /></div>
      {stale ? <div className="stale-banner">Параметры изменены — требуется перерасчёт.</div> : null}{error ? <div className="error-banner">{error}</div> : null}
      <div className="calculator-grid"><form className="input-panel" onSubmit={(event) => { event.preventDefault(); void calculate(); }}>
        <Section title="Местоположение и климат" hint="Нагрузка определяется Core 1"><Field label="Страна"><select value={form.country} onChange={(event) => { const country = event.target.value as CountryCode; update("country", country); if (country === "RU") update("normativeSystem", "SP_20"); }}><option value="RU">Россия</option><option value="KZ">Казахстан</option></select></Field>{form.country === "KZ" ? <Field label="Расчёт по евронормам"><div className="segmented"><button type="button" className={form.normativeSystem === "SP_20" ? "active" : ""} onClick={() => update("normativeSystem", "SP_20")}>Нет</button><button type="button" className={form.normativeSystem === "SP_RK_EN" ? "active" : ""} onClick={() => update("normativeSystem", "SP_RK_EN")}>Да</button></div><small className="field-note">{form.normativeSystem}</small></Field> : null}<Field label="Режим климатических данных"><div className="segmented"><button type="button" className={!climateIsManual ? "active" : ""} onClick={() => update("climateMode", "CITY_LOOKUP")}>По базе</button><button type="button" className={climateIsManual ? "active" : ""} onClick={() => update("climateMode", "MANUAL")}>Ручной ввод</button></div></Field>{!climateIsManual ? <Field label="Населённый пункт"><input value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="Например, Роза" /></Field> : <div className="manual-climate"><div className="two-col"><Field label="Снеговой район"><input value={form.snowRegion} onChange={(event) => update("snowRegion", event.target.value)} /></Field><Field label="Снеговая нагрузка, кН/м²"><input type="number" step="any" value={form.snowLoad} onChange={(event) => update("snowLoad", event.target.value)} /></Field></div><div className="two-col"><Field label="Ветровой район"><input value={form.windRegion} onChange={(event) => update("windRegion", event.target.value)} /></Field><Field label="Ветровая нагрузка, кН/м²"><input type="number" step="any" value={form.windLoad} onChange={(event) => update("windLoad", event.target.value)} /></Field></div><Field label="Сейсмичность"><input value={form.seismicity} onChange={(event) => update("seismicity", event.target.value)} placeholder="не задано" /></Field><Field label="Источник / примечание"><input value={form.sourceNote} onChange={(event) => update("sourceNote", event.target.value)} /></Field></div>}</Section>
        <Section title="Геометрия ангара"><div className="two-col"><Field label="Пролёт, м"><select value={form.span} onChange={(event) => update("span", Number(event.target.value) as FormState["span"])}>{spans.map((span) => <option key={span} value={span}>{span} м</option>)}</select></Field><Field label="Ответственность"><select value={form.responsibility} onChange={(event) => update("responsibility", event.target.value as FormState["responsibility"])}><option value="0.8">0,8</option><option value="1.0">1,0</option></select></Field></div><div className="two-col"><Field label="Длина, м"><input type="number" min="0" step="any" value={form.length} onChange={(event) => update("length", event.target.value)} /></Field><Field label="Высота, м"><input type="number" min="0" step="any" value={form.height} onChange={(event) => update("height", event.target.value)} /></Field></div><label className="check-row"><input type="checkbox" checked={form.manualFrameStep} onChange={(event) => update("manualFrameStep", event.target.checked)} /><span>Задать шаг рам вручную</span></label>{form.manualFrameStep ? <Field label="Шаг рам, м"><input type="number" min="0" step="any" value={form.frameStep} onChange={(event) => update("frameStep", event.target.value)} /></Field> : null}</Section>
        <Section title="Кровля"><Field label="Покрытие кровли"><select value={form.roofCovering} onChange={(event) => update("roofCovering", event.target.value as RoofCovering)}>{roofCoverings.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field><Field label="Профнастил / настил"><select value={form.deckGrade} onChange={(event) => update("deckGrade", event.target.value as RoofDeckGrade)}>{deckGrades.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field></Section>
        <Section title="Дополнительные условия"><div className="two-col"><Field label="Снегозадержание"><select value={form.snowRetention} onChange={(event) => update("snowRetention", event.target.value as "есть" | "нет")}><option value="нет">Нет</option><option value="есть">Да</option></select></Field><Field label="Прогон ограждения"><select value={form.enclosurePurlin} onChange={(event) => update("enclosurePurlin", event.target.value as "есть" | "нет")}><option value="нет">Нет</option><option value="есть">Да</option></select></Field></div><label className="check-row"><input type="checkbox" checked={form.horizontalBracing} onChange={(event) => update("horizontalBracing", event.target.checked)} /><span>Специальный горизонтальный связевой сценарий</span></label></Section>
        <Section title="Проёмы"><div className="three-col"><Field label="Ворота до 6 м"><input type="number" min="0" step="1" value={form.gateSmall} onChange={(event) => update("gateSmall", event.target.value)} /></Field><Field label="Ворота более 6 м"><input type="number" min="0" step="1" value={form.gateLarge} onChange={(event) => update("gateLarge", event.target.value)} /></Field><Field label="Двери"><input type="number" min="0" step="1" value={form.doors} onChange={(event) => update("doors", event.target.value)} /></Field></div><label className="check-row prominent"><input type="checkbox" checked={form.windowsEnabled} onChange={(event) => update("windowsEnabled", event.target.checked)} /><span>Окна — есть</span></label>{form.windowsEnabled ? <div className="window-form"><span className="field-note">Выберите одну из пяти схем</span><div className="window-types">{([1, 2, 3, 4, 5] as const).map((type) => <button type="button" key={type} className={form.windowType === type ? "window-type selected" : "window-type"} onClick={() => update("windowType", type)} aria-pressed={form.windowType === type}><span className="window-placeholder">Схема<br />типа {type}</span><strong>Тип {type}</strong></button>)}</div><div className="two-col"><Field label="Высота окна, м"><input type="number" min="0" step="any" value={form.windowHeight} onChange={(event) => update("windowHeight", event.target.value)} /></Field><Field label="Длина ленточного остекления, м"><input type="number" min="0" step="any" value={form.stripLength} onChange={(event) => update("stripLength", event.target.value)} /></Field></div><div className="two-col"><Field label="Отдельные окна, шт."><input type="number" min="0" step="1" value={form.separateWindows} onChange={(event) => update("separateWindows", event.target.value)} /></Field><Field label="Конструкция остекления"><select value={form.glazing} onChange={(event) => update("glazing", event.target.value)}>{glazingOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field></div></div> : null}</Section>
        <div className="form-actions"><button className="primary-button" type="submit" disabled={loading}>{loading ? "Расчёт…" : "Рассчитать"}</button><button className="secondary-button" type="button" onClick={() => void loadDemo()}>Загрузить пример 12 м</button><button className="text-button" type="button" onClick={reset}>Сбросить</button></div>
      </form><aside className="result-panel"><div className="result-heading"><div><span className="eyebrow">Результат расчёта</span><h2>Состав конструкции</h2></div><span className="result-dot" /></div><ResultCard result={result} onManualClimate={() => update("climateMode", "MANUAL")} /></aside></div>
    </main><footer><span>Core 1 · browser-side calculation</span><span>Инженерные формулы находятся в расчётном ядре</span></footer>
  </div>;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) { return <section className="form-section"><div className="section-heading"><h2>{title}</h2>{hint ? <span>{hint}</span> : null}</div>{children}</section>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
