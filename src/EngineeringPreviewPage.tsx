import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BrowserCore1DataRepository, BrowserDataSource } from "./core1/data";
import type { DatasetRecord } from "./core1/data";
import { calculateCore1 } from "./core1/engine";
import type { Core1EngineResult } from "./core1/engine";
import type {
  Core1Input as Core1InputBase,
  Core1ExcelOutputRow,
  RoofCovering,
  RoofDeckGrade,
} from "./core1/types";
import {
  createDefaultProjectInput,
  createOpeningId,
  parseSprintMProjectFile,
  projectFileName,
  projectInputToCore1Input as projectInputToCore1InputBase,
  serializeProjectFile,
} from "./project";
import type { ProjectInput, ProjectOpening } from "./project";
import type { CountryCode } from "./core1/types";
import { calculateCore3FromEnclosureResult } from "./core3";
import type { Core3CommercialResult } from "./core3";
import {
  calculateColdEnclosure,
  calculateProjectV15WallGirt,
  projectInputToColdEnclosureInput,
} from "./enclosure";
import type {
  ColdEnclosureResult,
  EnclosureStructuralContext,
  EnclosureProvenance,
  ProjectV15WallGeometryControls,
  ProjectWallGirtCalculationResult,
} from "./enclosure";
import type {
  ManualWallGirtReplayInput,
  ManualWallGirtSectionType,
} from "./enclosure";
import "./engineering-preview.css";
import "./engineering-preview-window.css";
import "./engineering-preview-theme.css";

const defaultPreviewInput = createDefaultProjectInput();
const roofCoverings: RoofCovering[] = [
  "С-П 200",
  "С-П 150",
  "С-П 250",
  "профлист",
];
const deckGrades: RoofDeckGrade[] = [
  "С44-1000-0,5",
  "С44-1000-0,7",
  "Н60-845-0,7",
  "Н60-845-0,8",
];
const glazingOptions = [
  "2ой стеклопакет",
  "1ой стеклопакет",
  "светопрозрачный профлист",
];
type Core1Input = Core1InputBase & {
  windows: NonNullable<Core1InputBase["windows"]>;
};

function numberValue(value: string, fallback = 0): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}
function inputValue(value: unknown): string {
  return value === null || value === undefined || value === ""
    ? ""
    : String(value);
}
function canonicalValue(value: unknown): string {
  if (value === null || value === undefined || value === "")
    return "НЕ ДОСТУПНО";
  return typeof value === "number"
    ? value.toLocaleString("ru-RU", { maximumFractionDigits: 3 })
    : String(value);
}
function recordText(record: DatasetRecord | undefined): string | null {
  if (!record) return null;
  const value = record.cached_value_json;
  return typeof value === "string"
    ? value
    : value === null || value === undefined
      ? null
      : String(value);
}
function cellParts(cell: string): { column: string; row: number } | null {
  const match = /^([A-Z]+)(\d+)$/.exec(cell);
  return match ? { column: match[1]!, row: Number(match[2]) } : null;
}
function climateCitiesByCountry(
  lookupRecords: DatasetRecord[],
  cityRecords: DatasetRecord[],
): Record<CountryCode, string[]> {
  const countryByRow = new Map<number, CountryCode>();
  const explicitlyKazakh = new Set<string>();
  for (const record of cityRecords) {
    const parts = cellParts(record.cell);
    if (!parts || parts.column !== "H") continue;
    const marker = recordText(record)?.trim().toLocaleLowerCase("ru-RU") ?? "";
    if (marker === "кз" || marker.includes("казахстан") || marker === "kz") {
      countryByRow.set(parts.row, "KZ");
    }
  }
  for (const record of cityRecords) {
    const parts = cellParts(record.cell);
    if (!parts || !["B", "AR"].includes(parts.column)) continue;
    const city = recordText(record)?.trim();
    if (city && countryByRow.get(parts.row) === "KZ") explicitlyKazakh.add(city);
  }
  const ru = new Set<string>();
  const kz = new Set(explicitlyKazakh);
  for (const record of lookupRecords) {
    const parts = cellParts(record.cell);
    if (!parts || !["B", "AR"].includes(parts.column)) continue;
    const city = recordText(record)?.trim();
    if (!city) continue;
    if (explicitlyKazakh.has(city)) kz.add(city);
    else ru.add(city);
  }
  return {
    RU: [...ru].sort((a, b) => a.localeCompare(b, "ru")),
    KZ: [...kz].sort((a, b) => a.localeCompare(b, "ru")),
  };
}
const sectionTypes: ManualWallGirtSectionType[] = ["]", "[]", "][", "[-]"];
const defaultWallGirtZone = (): ManualWallGirtReplayInput => ({
  wall: "SIDE",
  zoneType: "CORNER",
  wallHeight_m: 4,
  zoneLength_m: 12,
  girtStep_m: 0.6,
  structuralPostStep_m: 4.5,
  sectionType: "[]",
  profile: { profileId: "C140x2", sectionMass_kg_m: 4.2 },
  selectionMode: "MANUAL",
});
const wallOrientations = ["SIDE", "END"] as const;
type WallOrientation = (typeof wallOrientations)[number];
function wallOrientationLabel(orientation: WallOrientation): string {
  return orientation === "SIDE" ? "Боковая стена" : "Торцевая стена";
}
function projectInputToCore1Input(
  project: ProjectInput,
  options?: Parameters<typeof projectInputToCore1InputBase>[1],
) {
  // Gate boundary remains unverified; keep the adapter diagnostic visible instead of inventing a UI rule.
  void options;
  const result = projectInputToCore1InputBase(project);
  return result.status === "success"
    ? { ...result, input: result.input as Core1Input }
    : result;
}

function PreviewField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="preview-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function OpeningEditor({
  openings,
  onAdd,
  onUpdate,
  onRemove,
}: {
  openings: ProjectOpening[];
  onAdd: (kind: ProjectOpening["kind"]) => void;
  onUpdate: (id: string, patch: Partial<ProjectOpening>) => void;
  onRemove: (id: string) => void;
}) {
  const groups: Array<{ kind: ProjectOpening["kind"]; title: string }> = [
    { kind: "gate", title: "Ворота" },
    { kind: "door", title: "Двери" },
    { kind: "window", title: "Окна" },
    { kind: "strip_window", title: "Ленточное остекление" },
  ];
  return (
    <div className="preview-opening-editor">
      {groups.map(({ kind, title }) => (
        <section className="preview-opening-group" key={kind}>
          <div className="preview-section-title">
            <h3>{title}</h3>
            <span>
              {openings.filter((item) => item.kind === kind).length} типа
            </span>
          </div>
          {openings
            .filter((item) => item.kind === kind)
            .map((opening, index) => (
              <div className="preview-opening-card" key={opening.id}>
                <strong>
                  {title.slice(0, -1)} №{index + 1}
                </strong>
                <div className="preview-field-grid">
                  <PreviewField label="Ширина, м">
                    {"width_mm" in opening ? (
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={opening.width_mm / 1000}
                        onChange={(event) =>
                          onUpdate(opening.id, {
                            width_mm: numberValue(event.target.value) * 1000,
                          })
                        }
                      />
                    ) : (
                      <span className="preview-unavailable">
                        не применяется
                      </span>
                    )}
                  </PreviewField>
                  <PreviewField label="Высота, м">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={opening.height_mm / 1000}
                      onChange={(event) =>
                        onUpdate(opening.id, {
                          height_mm: numberValue(event.target.value) * 1000,
                        })
                      }
                    />
                  </PreviewField>
                  <PreviewField label="Количество">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={opening.quantity}
                      onChange={(event) =>
                        onUpdate(opening.id, {
                          quantity: Math.max(
                            1,
                            Math.trunc(numberValue(event.target.value)),
                          ),
                        })
                      }
                    />
                  </PreviewField>
                  {opening.kind === "strip_window" ? (
                    <PreviewField label="Длина ленты, м">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={opening.length_mm / 1000}
                        onChange={(event) =>
                          onUpdate(opening.id, {
                            length_mm: numberValue(event.target.value) * 1000,
                          })
                        }
                      />
                    </PreviewField>
                  ) : null}
                  {opening.kind === "window" ||
                  opening.kind === "strip_window" ? (
                    <PreviewField label="Тип окна">
                      <select
                        value={opening.window_type}
                        onChange={(event) =>
                          onUpdate(opening.id, {
                            window_type: Number(event.target.value) as
                              1 | 2 | 3 | 4 | 5,
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((type) => (
                          <option value={type} key={type}>
                            Тип {type}
                          </option>
                        ))}
                      </select>
                    </PreviewField>
                  ) : null}
                  {opening.kind === "window" ||
                  opening.kind === "strip_window" ? (
                    <PreviewField label="Конструкция">
                      <select
                        value={opening.glazing_construction}
                        onChange={(event) =>
                          onUpdate(opening.id, {
                            glazing_construction: event.target.value,
                          })
                        }
                      >
                        {glazingOptions.map((value) => (
                          <option value={value} key={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </PreviewField>
                  ) : null}
                </div>
                <button
                  className="text-button preview-remove"
                  type="button"
                  onClick={() => onRemove(opening.id)}
                >
                  Удалить
                </button>
              </div>
            ))}
          <button
            className="secondary-button preview-add"
            type="button"
            onClick={() => onAdd(kind)}
          >
            + Добавить{" "}
            {title
              .toLowerCase()
              .replace("ленточное остекление", "ленточное окно")}
          </button>
        </section>
      ))}
    </div>
  );
}
function WallGirtEditor({
  zones,
  onAdd,
  onUpdate,
  onRemove,
}: {
  zones: ManualWallGirtReplayInput[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<ManualWallGirtReplayInput>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="preview-wall-girt-editor">
      <div className="preview-inline-note">
        Режим: <strong>MANUAL</strong>. Используются только поля доказанного
        ручного replay; автоматический подбор, + стойки, профнастил и крепёж
        пока недоступны.
      </div>
      {zones.map((zone, index) => (
        <article
          className="preview-opening-card"
          key={`${index}-${zone.wall}-${zone.zoneType}`}
        >
          <div className="preview-section-title">
            <h3>Зона ригелей №{index + 1}</h3>
            <button
              className="text-button preview-remove"
              type="button"
              onClick={() => onRemove(index)}
            >
              Удалить
            </button>
          </div>
          <div className="preview-field-grid">
            <PreviewField label="Стена">
              <select
                value={zone.wall}
                onChange={(event) =>
                  onUpdate(index, {
                    wall: event.target.value as "SIDE" | "END",
                  })
                }
              >
                <option value="SIDE">Боковая</option>
                <option value="END">Торцевая</option>
              </select>
            </PreviewField>
            <PreviewField label="Зона">
              <select
                value={zone.zoneType}
                onChange={(event) =>
                  onUpdate(index, {
                    zoneType: event.target.value as "CORNER" | "TYPICAL",
                  })
                }
              >
                <option value="CORNER">Угловая</option>
                <option value="TYPICAL">Рядовая</option>
              </select>
            </PreviewField>
            <PreviewField label="Высота стены, м">
              <input
                type="number"
                min="0"
                step="0.01"
                value={zone.wallHeight_m}
                onChange={(event) =>
                  onUpdate(index, {
                    wallHeight_m: numberValue(event.target.value),
                  })
                }
              />
            </PreviewField>
            <PreviewField label="Длина зоны, м">
              <input
                type="number"
                min="0"
                step="0.01"
                value={zone.zoneLength_m}
                onChange={(event) =>
                  onUpdate(index, {
                    zoneLength_m: numberValue(event.target.value),
                  })
                }
              />
            </PreviewField>
            <PreviewField label="Шаг ригелей, м">
              <input
                type="number"
                min="0"
                step="0.01"
                value={zone.girtStep_m}
                onChange={(event) =>
                  onUpdate(index, {
                    girtStep_m: numberValue(event.target.value),
                  })
                }
              />
            </PreviewField>
            <PreviewField label="Шаг стоек, м">
              <input
                type="number"
                min="0"
                step="0.01"
                value={zone.structuralPostStep_m}
                onChange={(event) =>
                  onUpdate(index, {
                    structuralPostStep_m: numberValue(event.target.value),
                  })
                }
              />
            </PreviewField>
            <PreviewField label="Тип сечения">
              <select
                value={zone.sectionType}
                onChange={(event) =>
                  onUpdate(index, {
                    sectionType: event.target
                      .value as ManualWallGirtSectionType,
                  })
                }
              >
                {sectionTypes.map((type) => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </PreviewField>
            <PreviewField label="Профиль">
              <input
                value={zone.profile.profileId}
                onChange={(event) =>
                  onUpdate(index, {
                    profile: { ...zone.profile, profileId: event.target.value },
                  })
                }
              />
            </PreviewField>
            <PreviewField label="Масса профиля, кг/м">
              <input
                type="number"
                min="0"
                step="0.01"
                value={zone.profile.sectionMass_kg_m}
                onChange={(event) =>
                  onUpdate(index, {
                    profile: {
                      ...zone.profile,
                      sectionMass_kg_m: numberValue(event.target.value),
                    },
                  })
                }
              />
            </PreviewField>
          </div>
        </article>
      ))}
      <button
        className="secondary-button preview-add"
        type="button"
        onClick={onAdd}
      >
        + Добавить зону ригелей
      </button>
      {zones.length === 0 ? (
        <p className="preview-unavailable">
          Зоны не заданы. Добавьте хотя бы одну ручную зону для расчёта
          EnclosureCore.
        </p>
      ) : null}
    </div>
  );
}
function ExcelRows({ rows }: { rows: Core1ExcelOutputRow[] }) {
  return (
    <div className="preview-table-wrap">
      <table className="preview-table">
        <thead>
          <tr>
            <th>Показатель</th>
            <th>Значение</th>
            <th>Материал / параметр</th>
            <th>Дополнительно</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            row.kind === "GROUP_HEADER" ? (
              <tr
                className="preview-group-row"
                key={`${row.order}-${row.label}`}
              >
                <th colSpan={4}>{row.label}</th>
              </tr>
            ) : (
              <tr key={`${row.order}-${row.label}`}>
                <td>{row.label}</td>
                <td className="number-cell">
                  {inputValue(row.value1)}
                  {row.unit ? ` ${row.unit}` : ""}
                </td>
                <td>{inputValue(row.value2)}</td>
                <td>{inputValue(row.value3)}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
function ValueList({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, unknown]>;
}) {
  return (
    <section className="preview-subcard">
      <h3>{title}</h3>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{canonicalValue(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
function windowGirtLabel(key: string): string {
  const labels: Record<string, string> = {
    lower_girt_profile: "Нижний оконный ригель — профиль",
    lower_girt_steel: "Нижний оконный ригель — сталь",
    lower_girt_utilization: "Нижний оконный ригель — использование",
    upper_girt_profile: "Верхний оконный ригель — профиль",
    upper_girt_steel: "Верхний оконный ригель — сталь",
    upper_girt_utilization: "Верхний оконный ригель — использование",
    mass_kg: "Масса, кг",
    quantity: "Количество",
    length_m: "Длина, м",
    source: "Источник",
    provenance: "Происхождение",
    status: "Статус",
  };
  return labels[key] ?? key;
}
function windowGirtSelection(
  projectWindowGroups: number,
  girts: Array<Record<string, unknown>>,
  notRepresentable: boolean,
): "SELECTED" | "NOT_REQUIRED" | "NOT_SELECTED" | "NOT_REPRESENTABLE" {
  if (notRepresentable) return "NOT_REPRESENTABLE";
  if (girts.length > 0) return "SELECTED";
  return projectWindowGroups === 0 ? "NOT_REQUIRED" : "NOT_SELECTED";
}
function WindowGirtSection({
  result,
  projectWindowGroups,
}: {
  result: Extract<Core1EngineResult, { status: "success" }>["result"];
  projectWindowGroups: number;
}) {
  const notRepresentable =
    result.compatibility_diagnostics?.some(
      (item) => item.code === "CORE1_OPENINGS_NOT_REPRESENTABLE",
    ) || false;
  const girts = Array.isArray(result.window_girts) ? result.window_girts : [];
  const selection = windowGirtSelection(
    projectWindowGroups,
    girts,
    notRepresentable,
  );
  return (
    <section className="preview-subcard preview-window-girts">
      <h3>ОКОННЫЕ РИГЕЛИ</h3>
      {selection === "NOT_REQUIRED" ? (
        <p>Оконные ригели: не требуются</p>
      ) : selection === "NOT_SELECTED" ? (
        <p>Оконные ригели: НЕ ПОДОБРАНЫ</p>
      ) : selection === "NOT_REPRESENTABLE" ? (
        <>
          <strong>Оконные ригели: НЕ ПОДОБРАНЫ</strong>
          <p>
            Причина: детальный набор окон невозможно точно представить во входах
            legacy Core1.
          </p>
        </>
      ) : (
        <div className="preview-girt-list">
          {girts.map((girt, index) => (
            <article key={index}>
              <strong>Ригель №{index + 1}</strong>
              <dl>
                {Object.entries(girt).map(([key, value]) => (
                  <div key={key}>
                    <dt>{windowGirtLabel(key)}</dt>
                    <dd>{canonicalValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      )}
      {selection === "SELECTED" && result.window_girts_weight_kg != null ? (
        <p>
          Масса оконных ригелей, кг:{" "}
          <strong>{canonicalValue(result.window_girts_weight_kg)}</strong>
        </p>
      ) : null}
    </section>
  );
}
function DiagnosticList({
  result,
  projectWindowGroups,
  projection,
}: {
  result: Core1EngineResult;
  projectWindowGroups: number;
  projection: Core1Input | null;
}) {
  const success = result.status === "success";
  const notRepresentable = result.diagnostics.some(
    (item) => item.code === "CORE1_OPENINGS_NOT_REPRESENTABLE",
  );
  const girts =
    success && Array.isArray(result.result.window_girts)
      ? result.result.window_girts
      : [];
  const selection = windowGirtSelection(
    projectWindowGroups,
    girts,
    notRepresentable,
  );
  const projectionSummary = projection
    ? JSON.stringify({
        window_height_m: projection.windows.window_height_m,
        window_strip_length_m: projection.windows.window_strip_length_m,
        separate_window_count: projection.windows.separate_window_count,
        window_type: projection.windows.window_type,
        glazing_construction: projection.windows.glazing_construction,
      })
    : "НЕ ПЕРЕДАНА";
  return (
    <div className="preview-diagnostics">
      {result.diagnostics.length === 0 && success ? (
        <div className="preview-ok">
          Диагностика Core 1 не содержит предупреждений.
        </div>
      ) : null}
      {result.diagnostics.map((item, index) => {
        const errors = Array.isArray(item.details?.schema_errors)
          ? (item.details.schema_errors as Array<Record<string, unknown>>)
          : [];
        return (
          <details open={index === 0} key={index}>
            <summary>
              <strong>{item.code}</strong>
              <span>{item.message}</span>
            </summary>
            <p>
              Класс: {item.classification} · серьёзность: {item.severity}
            </p>
            <p>Источник: {item.source?.join(", ") || "не указан"}</p>
            {errors.map((error, errorIndex) => (
              <p key={errorIndex}>
                <code>{String(error.instancePath || "/")}</code> ·{" "}
                {String(error.message || "ошибка схемы")} ·{" "}
                {JSON.stringify(error.params ?? {})}
              </p>
            ))}
          </details>
        );
      })}
      <div className="preview-ok">
        Окна ProjectInput: {projectWindowGroups}
        <br />
        CORE1_WINDOW_PROJECTION = {projectionSummary}
        <br />
        WINDOW_GIRT_RESULT_COUNT = {girts.length}
        <br />
        WINDOW_GIRT_SELECTION = {selection}
      </div>
    </div>
  );
}
function WallGeometryControllerEditor({
  controls,
  onChange,
}: {
  controls: Partial<Record<WallOrientation, Omit<ProjectV15WallGeometryControls, "orientation">>>;
  onChange: (
    orientation: WallOrientation,
    field: "wallCalculationHeight_m" | "supportStep_m" | "cornerHalfLength_m",
    value: number,
  ) => void;
}) {
  return (
    <div className="preview-wall-girt-editor">
      <div className="preview-inline-note">
        AUTO-контроллер v1.5: B12, B13 и e вводятся явно по доказанному
        контракту. Значения не выводятся из общих габаритов проекта.
      </div>
      {wallOrientations.map((orientation) => {
        const current = controls[orientation];
        return (
          <article className="preview-opening-card" key={orientation}>
            <div className="preview-section-title">
              <h3>{wallOrientationLabel(orientation)}</h3>
              <span className="preview-badge preview-badge-muted">
                {current ? "EXPLICIT CONTROLLER" : "NOT ENTERED"}
              </span>
            </div>
            <div className="preview-field-grid">
              <PreviewField label="Расчётная высота B12, м">
                <input
                  aria-label={`${orientation} B12`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={current?.wallCalculationHeight_m ?? ""}
                  onChange={(event) =>
                    onChange(orientation, "wallCalculationHeight_m", numberValue(event.target.value))
                  }
                />
              </PreviewField>
              <PreviewField label="Шаг опор B13, м">
                <input
                  aria-label={`${orientation} B13`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={current?.supportStep_m ?? ""}
                  onChange={(event) =>
                    onChange(orientation, "supportStep_m", numberValue(event.target.value))
                  }
                />
              </PreviewField>
              <PreviewField label="Половина угловой зоны e, м">
                <input
                  aria-label={`${orientation} e`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={current?.cornerHalfLength_m ?? ""}
                  onChange={(event) =>
                    onChange(orientation, "cornerHalfLength_m", numberValue(event.target.value))
                  }
                />
              </PreviewField>
            </div>
            <div className="preview-inline-note">
              Длина B11: {orientation === "SIDE" ? "длина здания" : "пролёт"} · источник: ProjectInput v1.5 mapping.
            </div>
          </article>
        );
      })}
    </div>
  );
}
function EnclosureStatus({
  result,
  projectWallGirtResults,
}: {
  result: ColdEnclosureResult | null;
  projectWallGirtResults: Partial<Record<WallOrientation, ProjectWallGirtCalculationResult>>;
}) {
  const autoStatuses = wallOrientations
    .map((orientation) => projectWallGirtResults[orientation]?.status)
    .filter(Boolean);
  const cards = [
    [
      "Стеновые ригели",
      result?.wallGirts.manualZones.length
        ? "CALCULATED · MANUAL"
        : autoStatuses.length
          ? `AUTO · ${autoStatuses.join(" / ")}`
          : "AVAILABLE IN MANUAL DOMAIN",
    ],
    ["+ стойки", "NOT IMPLEMENTED"],
    ["Проёмы", "NOT IMPLEMENTED"],
    ["Профнастил", "UNKNOWN SOURCE"],
    ["Крепёж", "UNKNOWN SOURCE"],
  ];
  return (
    <section className="preview-enclosure">
      <div className="preview-section-title">
        <div>
          <span className="preview-eyebrow">EnclosureCore</span>
          <h2>Ограждающие конструкции</h2>
        </div>
        <span className="preview-badge preview-badge-muted">
          {result ? "REAL ENGINE" : "ИНФОРМАЦИОННО"}
        </span>
      </div>
      <div className="enclosure-grid">
        {cards.map(([name, status]) => (
          <article key={name}>
            <strong>{name}</strong>
            <span className="preview-badge preview-badge-muted">{status}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
function EnclosureView({
  result,
  commercialResult,
  projectWallGirtResults,
}: {
  result: ColdEnclosureResult | null;
  commercialResult: Core3CommercialResult | null;
  projectWallGirtResults: Partial<Record<WallOrientation, ProjectWallGirtCalculationResult>>;
}) {
  if (!result)
    return (
      <div className="preview-tab-content">
        <div className="preview-empty">
          Рассчитайте проект, чтобы получить результат EnclosureCore.
        </div>
      </div>
    );
  return (
    <div className="preview-tab-content preview-canonical">
      <ValueList
        title="ОГРАЖДАЙКА · промежуточный результат"
        rows={[
          ["Статус стеновых ригелей", result.wallGirts.status],
          ["Известная масса ограждайки, кг", result.totals.knownMass_kg],
          ["Неизвестные компоненты", result.totals.unknownMassComponents.join(", ") || "нет"],
          [
            "Происхождение",
            result.provenance.map((item) => item.status).join(", "),
          ],
          [
            "Диагностика",
            result.diagnostics.map((item) => item.code).join(", ") || "нет",
          ],
        ]}
      />
      {result.wallGirts.manualZones.map((zone, index) => (
        <section
          className="preview-subcard"
          key={`${zone.wall}-${zone.zoneType}-${index}`}
        >
          <h3>Зона ригелей №{index + 1}</h3>
          <ValueList
            title={`${zone.wall === "SIDE" ? "Боковая" : "Торцевая"} · ${zone.zoneType === "CORNER" ? "угловая" : "рядовая"}`}
            rows={[
              ["Профиль", zone.profile],
              ["Тип сечения", zone.sectionType],
              ["Шаг ригелей, м", zone.girtStep_m],
              ["Ряды", zone.rows],
              ["Длина профиля, м", zone.profileLength_m],
              ["Масса профиля, кг", zone.profileMass_kg],
              ["Скобы, шт.", zone.bracketCount],
              ["Масса скоб, кг", zone.bracketMass_kg],
              ["Известная масса зоны, кг", zone.totalKnownMass_kg],
              [
                "Статус",
                zone.provenance.map((item) => item.status).join(", ") ||
                  "MANUAL",
              ],
            ]}
          />
        </section>
      ))}
      {result.wallGirts.manualZones.length === 0 ? (
        <p className="preview-unavailable">Ручные зоны не рассчитаны.</p>
      ) : null}
      <section className="preview-subcard">
        <h3>Доказанный v1.5 AUTO-контур</h3>
        {wallOrientations.map((orientation) => {
          const wallResult = projectWallGirtResults[orientation];
          return (
            <div className="preview-inline-note" key={orientation}>
              <strong>{wallOrientationLabel(orientation)}:</strong>{" "}
              {wallResult?.status ?? "НЕ РАССЧИТАНО"}
              {wallResult?.diagnostics.length
                ? ` · ${wallResult.diagnostics.map((item) => item.code).join(", ")}`
                : ""}
              {wallResult?.status === "PROVEN" && wallResult.zone
                ? ` · ${wallResult.zone.profile} · шаг ${wallResult.zone.girtStep_m} м · рядов ${wallResult.zone.rows} · масса ${wallResult.zone.totalKnownMass_kg} кг`
                : ""}
            </div>
          );
        })}
        <p className="preview-inline-note">
          Пустой runtime не заменяется климатом или расчётными догадками;
          при его отсутствии показывается typed diagnostic.
        </p>
      </section>
      <CommercialPriceView result={commercialResult} />
    </div>
  );
}

function CommercialPriceView({ result }: { result: Core3CommercialResult | null }) {
  if (!result) return null;
  const money = (value: number | null) => value === null
    ? "НЕ ДОСТУПНО"
    : `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`;
  const sourceLabel = (line: Core3CommercialResult["lines"][number]) => line.source
    ? `${line.source.sheet}!${line.source.price_cell}`
    : "не доказан";
  return (
    <section className="preview-subcard">
      <h3>Core 3 · предварительная стоимость</h3>
      <ValueList
        title="Коммерческий результат"
        rows={[
          ["Статус", result.status],
          ["Класс стоимости", result.costStatus],
          ["Известная стоимость, ₽", result.knownCost],
          ["Неизвестные позиции", result.unknownCostComponents.join(", ") || "нет"],
          ["Dataset", result.datasetId],
          ["Дата прайса", result.provenance.effective_date],
        ]}
      />
      <div className="preview-table-wrap">
        <table className="preview-table">
          <thead><tr><th>Позиция</th><th>Количество</th><th>Цена</th><th>Стоимость</th><th>Класс</th><th>Источник</th></tr></thead>
          <tbody>
            {result.lines.map((line) => (
              <tr key={`${line.component}-${line.orientation}-${line.product}`}>
                <td>{line.product}</td>
                <td>{line.quantity.toLocaleString("ru-RU", { maximumFractionDigits: 3 })} {line.unit}</td>
                <td>{money(line.unitPrice)}</td>
                <td>{money(line.lineCost)}</td>
                <td>{line.costStatus}</td>
                <td>{sourceLabel(line)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.diagnostics.length > 0 ? (
        <p className="preview-inline-note">Диагностика: {result.diagnostics.map((item) => item.code).join(", ")}</p>
      ) : null}
      <p className="preview-inline-note">Неизвестная стоимость не заменяется нулём и не включается в известный итог.</p>
    </section>
  );
}
function CanonicalView({
  result,
  projection,
  projectWindowGroups,
}: {
  result: Extract<Core1EngineResult, { status: "success" }>["result"];
  projection: Core1Input | null;
  projectWindowGroups: number;
}) {
  const { scenario, canonical } = result;
  return (
    <div className="preview-tab-content preview-canonical">
      <ValueList
        title="Геометрия и климат"
        rows={[
          ["Город", scenario.city ?? result.climate?.city],
          ["Пролёт, м", scenario.span_m],
          ["Длина, м", scenario.building_length_m],
          ["Высота, м", scenario.building_height_m],
          ["Ответственность", scenario.responsibility_factor],
          ["Снеговой район", result.climate?.snow_region],
          ["Снеговая нагрузка, кН/м²", result.climate?.snow_load],
          ["Ветровой район", result.climate?.wind_region],
          ["Ветровая нагрузка, кН/м²", result.climate?.wind_load],
        ]}
      />
      <ValueList
        title="Сетка рам"
        rows={[
          ["Автоматический D8, м", canonical.frameGrid.automaticFrameStepM],
          [
            "Ручной override D9, м",
            canonical.frameGrid.manualFrameStepOverrideM,
          ],
          ["Эффективный шаг, м", canonical.frameGrid.effectiveFrameStepM],
          ["Количество рам", canonical.frameGrid.frameCount],
        ]}
      />
      <ValueList
        title="Выбранные сечения"
        rows={[
          ["Балка", canonical.selectedSections.beams.profile],
          ["Колонна", canonical.selectedSections.columns.profile],
          ["Прогоны", canonical.selectedSections.roofPurlins.profile],
          ["Шаг прогонов, мм", canonical.selectedSections.roofPurlins.stepMm],
        ]}
      />
      <WindowGirtSection
        result={result}
        projectWindowGroups={projectWindowGroups}
      />
      {projection ? (
        <ValueList
          title="ПРОЕКЦИЯ ПРОЁМОВ В CORE1"
          rows={[
            ["Ворота до 6 м", projection.gates_le_6m_count],
            ["Ворота свыше 6 м", projection.gates_gt_6m_count],
            ["Двери", projection.doors_count],
            ["Высота окон, м", projection.windows.window_height_m],
            ["Длина ленты, м", projection.windows.window_strip_length_m],
            [
              "Количество отдельных окон",
              projection.windows.separate_window_count,
            ],
            ["Конструкция окна", projection.windows.glazing_construction],
          ]}
        />
      ) : null}
      <ValueList
        title="Соединения и масса"
        rows={[
          [
            "Болты",
            canonical.connections.bolts
              .map((item) => `${item.name}: ${item.pattern}`)
              .join("; "),
          ],
          ["M16", canonical.connections.m16Quantity],
          ["Фасонки, кг", canonical.connections.fittingsMassKg],
          ["Основной каркас, кг", canonical.componentMasses.mainFrameMassKg],
          ["Прогоны, кг", canonical.componentMasses.purlinMassKg],
          ["Известная масса, кг", canonical.componentMasses.knownMassKg],
          [
            "Итоговая масса",
            canonical.componentMasses.isComplete
              ? canonical.componentMasses.knownMassKg
              : "НЕ ДОСТУПНО",
          ],
        ]}
      />
    </div>
  );
}
function ResultTabs({
  result,
  projection,
  projectWindowGroups,
  enclosureResult,
  commercialResult,
  projectWallGirtResults,
  tab,
  setTab,
}: {
  result: Core1EngineResult | null;
  projection: Core1Input | null;
  projectWindowGroups: number;
  enclosureResult: ColdEnclosureResult | null;
  commercialResult: Core3CommercialResult | null;
  projectWallGirtResults: Partial<Record<WallOrientation, ProjectWallGirtCalculationResult>>;
  tab: "excel" | "canonical" | "enclosure" | "diagnostics";
  setTab: (tab: "excel" | "canonical" | "enclosure" | "diagnostics") => void;
}) {
  if (!result)
    return (
      <div className="preview-empty">
        Нажмите «Рассчитать», чтобы получить результат Core 1.
      </div>
    );
  const success = result.status === "success";
  return (
    <div className="preview-result">
      <div className="preview-tabs" role="tablist">
        <button
          className={tab === "excel" ? "active" : ""}
          onClick={() => setTab("excel")}
        >
          Excel 1:1
        </button>
        <button
          className={tab === "canonical" ? "active" : ""}
          onClick={() => setTab("canonical")}
        >
          Canonical
        </button>
        <button
          className={tab === "enclosure" ? "active" : ""}
          onClick={() => setTab("enclosure")}
        >
          ОГРАЖДАЙКА
        </button>
        <button
          className={tab === "diagnostics" ? "active" : ""}
          onClick={() => setTab("diagnostics")}
        >
          Диагностика
        </button>
      </div>
      {!success ? (
        <DiagnosticList
          result={result}
          projectWindowGroups={projectWindowGroups}
          projection={projection}
        />
      ) : null}
      {success && tab === "excel" ? (
        <div className="preview-tab-content">
          {result.result.excelOutput.sections.map((section) => (
            <section className="preview-output-section" key={section.id}>
              <div className="preview-section-title">
                <h2>{section.title}</h2>
                <span>{section.id}</span>
              </div>
              <ExcelRows rows={section.rows} />
            </section>
          ))}
        </div>
      ) : null}
      {success && tab === "canonical" ? (
        <CanonicalView
          result={result.result}
          projection={projection}
          projectWindowGroups={projectWindowGroups}
        />
      ) : null}
      {tab === "enclosure" ? <EnclosureView result={enclosureResult} commercialResult={commercialResult} projectWallGirtResults={projectWallGirtResults} /> : null}
      {success && tab === "diagnostics" ? (
        <div className="preview-tab-content">
          <DiagnosticList
            result={result}
            projectWindowGroups={projectWindowGroups}
            projection={projection}
          />
          {projection ? (
            <ValueList
              title="ПРОЕКЦИЯ ПРОЁМОВ В CORE1"
              rows={[
                ["Ворота до 6 м", projection.gates_le_6m_count],
                ["Ворота свыше 6 м", projection.gates_gt_6m_count],
                ["Двери", projection.doors_count],
                ["Высота окон, м", projection.windows.window_height_m],
                ["Длина ленты, м", projection.windows.window_strip_length_m],
                [
                  "Количество отдельных окон",
                  projection.windows.separate_window_count,
                ],
                ["Конструкция окна", projection.windows.glazing_construction],
              ]}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function EngineeringPreviewPage() {
  const repository = useMemo(
    () => new BrowserCore1DataRepository(new BrowserDataSource()),
    [],
  );
  const [input, setInput] = useState<ProjectInput>(defaultPreviewInput);
  const [result, setResult] = useState<Core1EngineResult | null>(null);
  const [projection, setProjection] = useState<Core1Input | null>(null);
  const [enclosureResult, setEnclosureResult] =
    useState<ColdEnclosureResult | null>(null);
  const [commercialResult, setCommercialResult] =
    useState<Core3CommercialResult | null>(null);
  const [projectWallGirtResults, setProjectWallGirtResults] = useState<
    Partial<Record<WallOrientation, ProjectWallGirtCalculationResult>>
  >({});
  const [tab, setTab] = useState<
    "excel" | "canonical" | "enclosure" | "diagnostics"
  >("excel");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    window.localStorage.getItem("sprint-m-preview-theme") === "dark"
      ? "dark"
      : "light",
  );
  const [cityOptionsByCountry, setCityOptionsByCountry] = useState<Record<CountryCode, string[]>>({ RU: [], KZ: [] });
  const [cityListOpen, setCityListOpen] = useState(false);
  useEffect(() => {
    window.localStorage.setItem("sprint-m-preview-theme", theme);
  }, [theme]);
  useEffect(() => {
    let cancelled = false;
    if (typeof repository.loadClimateDataset !== "function") return () => { cancelled = true; };
    void Promise.all([
      repository.loadClimateDataset("climate_lookup_sparse"),
      repository.loadClimateDataset("climate_cities_sparse"),
    ])
      .then(([lookup, cities]) => {
        if (!cancelled) setCityOptionsByCountry(climateCitiesByCountry(lookup.records, cities.records));
      })
      .catch(() => {
        if (!cancelled) setCityOptionsByCountry({ RU: [], KZ: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);
  const cityOptions = cityOptionsByCountry[input.countryCode];
  const selectCountry = (countryCode: CountryCode) => {
    setInput((current) => {
      const currentCity = current.climate.mode === "CITY_LOOKUP" ? current.climate.city : "";
      const nextCity = cityOptionsByCountry[countryCode].includes(currentCity) ? currentCity : "";
      return {
        ...current,
        countryCode,
        climate: current.climate.mode === "MANUAL"
          ? { ...current.climate, country: countryCode }
          : { mode: "CITY_LOOKUP", country: countryCode, city: nextCity, normative_system: "SP_20" },
      };
    });
    setCityListOpen(false);
  };
  const updateGeometry = (patch: Partial<ProjectInput["geometry"]>) =>
    setInput((current) => ({
      ...current,
      geometry: { ...current.geometry, ...patch },
    }));
  const updateEnvelope = (patch: Partial<ProjectInput["envelope"]>) =>
    setInput((current) => ({
      ...current,
      envelope: { ...current.envelope, ...patch },
    }));
  const updateSpecial = (patch: Partial<ProjectInput["special_conditions"]>) =>
    setInput((current) => ({
      ...current,
      special_conditions: { ...current.special_conditions, ...patch },
    }));
  const updateWallGeometryController = (
    orientation: WallOrientation,
    field: "wallCalculationHeight_m" | "supportStep_m" | "cornerHalfLength_m",
    value: number,
  ) =>
    setInput((current) => {
      const existing = current.enclosure?.wall_geometry?.[orientation];
      const provenance: EnclosureProvenance[] = existing?.provenance ?? [{
        status: "MANUAL",
        fixtureId: "engineering-preview-wall-controller",
        note: "Пользовательский явный контроллер B12/B13/e; не является автоматической проекцией.",
      }];
      const next = {
        wallCalculationHeight_m: existing?.wallCalculationHeight_m ?? 0,
        cornerHalfLength_m: existing?.cornerHalfLength_m ?? 0,
        supportStep_m: existing?.supportStep_m ?? 0,
        provenance,
        [field]: value,
      };
      return {
        ...current,
        enclosure: {
          wall_girts: current.enclosure?.wall_girts ?? [],
          wall_geometry: {
            ...(current.enclosure?.wall_geometry ?? {}),
            [orientation]: next,
          },
        },
      };
    });
  const updateWallGirt = (
    index: number,
    patch: Partial<ManualWallGirtReplayInput>,
  ) =>
    setInput((current) => {
      const zones = current.enclosure?.wall_girts ?? [];
      return {
        ...current,
        enclosure: {
          wall_girts: zones.map((zone, zoneIndex) =>
            zoneIndex === index
              ? ({
                  ...zone,
                  ...patch,
                  ...(patch.profile
                    ? { profile: { ...zone.profile, ...patch.profile } }
                    : {}),
                } as ManualWallGirtReplayInput)
              : zone,
          ),
        },
      };
    });
  const addWallGirt = () =>
    setInput((current) => ({
      ...current,
      enclosure: {
        wall_girts: [
          ...(current.enclosure?.wall_girts ?? []),
          defaultWallGirtZone(),
        ],
      },
    }));
  const removeWallGirt = (index: number) =>
    setInput((current) => ({
      ...current,
      enclosure: {
        wall_girts: (current.enclosure?.wall_girts ?? []).filter(
          (_, zoneIndex) => zoneIndex !== index,
        ),
      },
    }));
  const addOpening = (kind: ProjectOpening["kind"]) =>
    setInput((current) => ({
      ...current,
      openings: [
        ...current.openings,
        kind === "gate"
          ? {
              id: createOpeningId(kind),
              kind,
              width_mm: 4000,
              height_mm: 4200,
              quantity: 1,
            }
          : kind === "door"
            ? {
                id: createOpeningId(kind),
                kind,
                width_mm: 900,
                height_mm: 2100,
                quantity: 1,
              }
            : kind === "window"
              ? {
                  id: createOpeningId(kind),
                  kind,
                  width_mm: 1200,
                  height_mm: 1500,
                  quantity: 1,
                  window_type: 1,
                  glazing_construction: glazingOptions[0]!,
                }
              : {
                  id: createOpeningId(kind),
                  kind,
                  height_mm: 1500,
                  length_mm: 6000,
                  quantity: 1,
                  window_type: 1,
                  glazing_construction: glazingOptions[0]!,
                },
      ],
    }));
  const updateOpening = (id: string, patch: Partial<ProjectOpening>) =>
    setInput((current) => ({
      ...current,
      openings: current.openings.map((opening) =>
        opening.id === id
          ? ({ ...opening, ...patch } as ProjectOpening)
          : opening,
      ),
    }));
  const removeOpening = (id: string) =>
    setInput((current) => ({
      ...current,
      openings: current.openings.filter((opening) => opening.id !== id),
    }));
  const calculate = async () => {
    setBusy(true);
    setError(null);
    setTab("excel");
    try {
      const adapted = projectInputToCore1Input(input, {
        gate_boundary_dimension: "width_mm",
      });
      if (adapted.status !== "success") {
        setProjection(null);
        setResult({
          status: "unsupported",
          code: "UNSUPPORTED_FOR_PARITY",
          diagnostics: adapted.diagnostics,
          result: null,
        });
        const enclosure = calculateColdEnclosure(projectInputToColdEnclosureInput(input)).result;
        setEnclosureResult(enclosure);
        setCommercialResult(calculateCore3FromEnclosureResult(enclosure));
        setProjectWallGirtResults({
          SIDE: calculateProjectV15WallGirt({ project: input, orientation: "SIDE", controls: null, autoRuntime: null }),
          END: calculateProjectV15WallGirt({ project: input, orientation: "END", controls: null, autoRuntime: null }),
        });
        return;
      }
      setProjection(adapted.input);
      const coreResult = await calculateCore1(adapted.input, repository);
      setResult(coreResult);
      const structuralContext: EnclosureStructuralContext | null =
        coreResult.status === "success"
          ? {
              effectiveFrameStep_m:
                coreResult.result.canonical.frameGrid.effectiveFrameStepM,
              frameCount: coreResult.result.canonical.frameGrid.frameCount,
              source: {
                status: "REAL_PROJECT_VALIDATED",
                note: "Structural context supplied by Core1 preview result",
              },
            }
          : null;
      const enclosure = calculateColdEnclosure(
        projectInputToColdEnclosureInput(
          input,
          structuralContext,
          coreResult.status === "success"
            ? { canonicalClimate: coreResult.result.climate ?? null }
            : {},
        ),
      ).result;
      setEnclosureResult(enclosure);
      setCommercialResult(calculateCore3FromEnclosureResult(enclosure, coreResult.status === "success" ? coreResult.result : null));
      setProjectWallGirtResults({
        SIDE: calculateProjectV15WallGirt({ project: input, orientation: "SIDE", controls: null, autoRuntime: null }),
        END: calculateProjectV15WallGirt({ project: input, orientation: "END", controls: null, autoRuntime: null }),
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Не удалось выполнить расчёт",
      );
    } finally {
      setBusy(false);
    }
  };
  const loadProjectFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setLoadNotice(null);
    const parsed = parseSprintMProjectFile(await file.text());
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setInput(parsed.file.project);
    setProjection(null);
    setResult(null);
    setEnclosureResult(null);
    setCommercialResult(null);
    setProjectWallGirtResults({});
    setTab("excel");
    setLoadedFileName(file.name);
    setLoadNotice("Расчёт загружен. Нажмите «Рассчитать».");
  };
  const saveProjectFile = () => {
    const file = serializeProjectFile(input);
    const filename = projectFileName(input, new Date(file.savedAt ?? new Date().toISOString()));
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setError(null);
    setLoadNotice(`Расчёт сохранён: ${filename}`);
  };
  const clearProjectData = () => {
    const isClean = JSON.stringify(input) === JSON.stringify(defaultPreviewInput);
    if (!isClean && !window.confirm("Очистить все введённые данные расчёта?")) return;
    setInput(createDefaultProjectInput());
    setProjection(null);
    setResult(null);
    setEnclosureResult(null);
    setCommercialResult(null);
    setProjectWallGirtResults({});
    setLoadedFileName(null);
    setLoadNotice(null);
    setError(null);
    setTab("excel");
    if (projectFileInputRef.current) projectFileInputRef.current.value = "";
  };
  return (
    <div className={`engineering-preview-shell preview-theme-${theme}`}>
      <header className="preview-topbar">
        <div>
          <strong>Sprint M</strong>
          <span>CORE 1 · result contract preview</span>
        </div>
        <div className="preview-topbar-actions">
          <span className="preview-badge preview-badge-amber">
            TEST / ENGINEERING PREVIEW
          </span>
          <button
            className="theme-toggle"
            type="button"
            aria-label={
              theme === "light"
                ? "Включить тёмную тему"
                : "Включить светлую тему"
            }
            onClick={() =>
              setTheme((current) => (current === "light" ? "dark" : "light"))
            }
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            {theme === "light" ? "Тёмная тема" : "Светлая тема"}
          </button>
        </div>
      </header>
      <main className="preview-workspace">
        <div className="preview-intro">
          <span className="preview-eyebrow">Инженерный preview</span>
          <h1>Sprint-M — промежуточный расчёт</h1>
          <p>
            Подробные проёмы сохраняются в ProjectInput; legacy projection
            показывается отдельно.
          </p>
        </div>
        {error ? <div className="preview-error">{error}</div> : null}
        {loadNotice ? <div className="preview-ok">{loadNotice}</div> : null}
        <div className="preview-layout">
          <form
            className="preview-input-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void calculate();
            }}
          >
            <section className="preview-form-section">
              <div className="preview-section-title">
                <h2>Входные данные</h2>
                <span>ProjectInput</span>
              </div>
              <div className="preview-field-grid">
                <PreviewField label="Страна">
                  <select aria-label="Preview страна" value={input.countryCode} onChange={(event) => selectCountry(event.target.value as CountryCode)}>
                    <option value="RU">🇷🇺 Россия</option>
                    <option value="KZ">🇰🇿 Казахстан</option>
                  </select>
                </PreviewField>
                <PreviewField label="Город">
                  <div className="preview-city-picker">
                    <input
                      aria-label="Preview город"
                      role="combobox"
                      aria-expanded={cityListOpen}
                      value={input.climate.mode === "CITY_LOOKUP" ? input.climate.city : ""}
                      onFocus={() => setCityListOpen(true)}
                      onChange={(event) => setInput((current) => ({ ...current, climate: { mode: "CITY_LOOKUP", country: current.countryCode, city: event.target.value, normative_system: "SP_20" } }))}
                    />
                    {cityListOpen ? <div className="preview-city-options" role="listbox">
                      {cityOptions.filter((city) => city.toLocaleLowerCase("ru").includes((input.climate.mode === "CITY_LOOKUP" ? input.climate.city : "").toLocaleLowerCase("ru"))).slice(0, 12).map((city) => <button type="button" role="option" key={city} onMouseDown={(event) => event.preventDefault()} onClick={() => { setInput((current) => ({ ...current, climate: { mode: "CITY_LOOKUP", country: current.countryCode, city, normative_system: "SP_20" } })); setCityListOpen(false); }}>{city}</button>)}
                      {cityOptions.length === 0 ? <span>Источник городов загружается…</span> : null}
                    </div> : null}
                  </div>
                </PreviewField>
                <PreviewField label="Пролёт, м">
                  <select
                    aria-label="Preview пролёт"
                    value={input.geometry.span_m}
                    onChange={(event) =>
                      updateGeometry({
                        span_m: Number(
                          event.target.value,
                        ) as ProjectInput["geometry"]["span_m"],
                      })
                    }
                  >
                    {[9, 12, 15, 18, 21, 24].map((span) => (
                      <option key={span} value={span}>
                        {span}
                      </option>
                    ))}
                  </select>
                </PreviewField>
                <PreviewField label="Длина, м">
                  <input
                    type="number"
                    value={input.geometry.building_length_m}
                    onChange={(event) =>
                      updateGeometry({
                        building_length_m: numberValue(event.target.value),
                      })
                    }
                  />
                </PreviewField>
                <PreviewField label="Высота, м">
                  <input
                    type="number"
                    value={input.geometry.building_height_m}
                    onChange={(event) =>
                      updateGeometry({
                        building_height_m: numberValue(event.target.value),
                      })
                    }
                  />
                </PreviewField>
                <PreviewField label="Ответственность">
                  <select
                    value={input.geometry.responsibility_factor}
                    onChange={(event) =>
                      updateGeometry({
                        responsibility_factor: Number(event.target.value) as
                          0.8 | 1.0,
                      })
                    }
                  >
                    <option value="0.8">0,8</option>
                    <option value="1">1,0</option>
                  </select>
                </PreviewField>
              </div>
              <div className="preview-frame-step">
                <strong>Шаг рам</strong>
                <label>
                  <input
                    type="radio"
                    checked={input.geometry.frame_step_override_m === null}
                    onChange={() =>
                      updateGeometry({ frame_step_override_m: null })
                    }
                  />{" "}
                  Автоматически (D8)
                </label>
                <label>
                  <input
                    type="radio"
                    checked={input.geometry.frame_step_override_m !== null}
                    onChange={() =>
                      updateGeometry({ frame_step_override_m: 6 })
                    }
                  />{" "}
                  Ручной override D9
                </label>
                {input.geometry.frame_step_override_m !== null ? (
                  <input
                    aria-label="Preview D9"
                    type="number"
                    value={input.geometry.frame_step_override_m}
                    onChange={(event) =>
                      updateGeometry({
                        frame_step_override_m: numberValue(event.target.value),
                      })
                    }
                  />
                ) : null}
              </div>
            </section>
            <section className="preview-form-section">
              <div className="preview-section-title">
                <div><h2>ОГРАЖДАЮЩИЕ КОНСТРУКЦИИ</h2><span>ProjectInput → EnclosureCore</span></div>
                <span className="preview-badge preview-badge-muted">MANUAL + V1.5 CONTROLLER</span>
              </div>
              <PreviewField label="Система ограждения">
                <select
                  aria-label="Preview система ограждения"
                  value={input.envelope.system}
                  onChange={(event) => {
                    const system = event.target.value as ProjectInput["envelope"]["system"];
                    updateEnvelope({
                      system,
                      ...(system === "PROFILED_SHEET_COLD"
                        ? { wall_system: "С-18 0,5мм", roof_covering: "профлист" as RoofCovering }
                        : {}),
                    });
                  }}
                >
                  <option value="PROFILED_SHEET_COLD">Холодный профнастил</option>
                  <option value="SANDWICH_PANEL">Сэндвич-панель</option>
                </select>
              </PreviewField>
              <PreviewField label="Система стены"><input value={input.envelope.wall_system} onChange={(event) => updateEnvelope({ wall_system: event.target.value })} /></PreviewField>
              <WallGeometryControllerEditor
                controls={input.enclosure?.wall_geometry ?? {}}
                onChange={updateWallGeometryController}
              />
              <WallGirtEditor zones={input.enclosure?.wall_girts ?? []} onAdd={addWallGirt} onUpdate={updateWallGirt} onRemove={removeWallGirt} />
              {input.openings.length > 0 ? <div className="preview-inline-note">В текущем manual domain проёмы не участвуют в replay стеновых ригелей; EnclosureCore вернёт диагностический статус без выдуманного результата.</div> : null}
            </section>
            <section className="preview-form-section">
              <div className="preview-section-title">
                <h2>Кровля и условия</h2>
                <span>Core 1 inputs</span>
              </div>
              <div className="preview-field-grid">
                <PreviewField label="Покрытие">
                  <select
                    value={input.envelope.roof_covering}
                    onChange={(event) =>
                      updateEnvelope({
                        roof_covering: event.target.value as RoofCovering,
                      })
                    }
                  >
                    {roofCoverings.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </PreviewField>
                <PreviewField label="Марка настила">
                  <select
                    value={input.envelope.roof_deck_grade}
                    onChange={(event) =>
                      updateEnvelope({
                        roof_deck_grade: event.target.value as RoofDeckGrade,
                      })
                    }
                  >
                    {deckGrades.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </PreviewField>
                <PreviewField label="Снегозадержание">
                  <select
                    value={input.special_conditions.snow_retention_purlin}
                    onChange={(event) =>
                      updateSpecial({
                        snow_retention_purlin: event.target.value as
                          "есть" | "нет",
                      })
                    }
                  >
                    <option value="нет">Нет</option>
                    <option value="есть">Есть</option>
                  </select>
                </PreviewField>
                <PreviewField label="Прогон ограждения">
                  <select
                    value={input.special_conditions.enclosure_purlin}
                    onChange={(event) =>
                      updateSpecial({
                        enclosure_purlin: event.target.value as "есть" | "нет",
                      })
                    }
                  >
                    <option value="нет">Нет</option>
                    <option value="есть">Есть</option>
                  </select>
                </PreviewField>
              </div>
              <label className="preview-check">
                <input
                  type="checkbox"
                  checked={
                    input.special_conditions.horizontal_bracing_override === "+"
                  }
                  onChange={(event) =>
                    updateSpecial({
                      horizontal_bracing_override: event.target.checked
                        ? "+"
                        : null,
                    })
                  }
                />{" "}
                Горизонтальные связи: специальная ветка
              </label>
            </section>
            <section className="preview-form-section">
              <div className="preview-section-title">
                <h2>Повторяемые проёмы</h2>
                <span>детальная геометрия ProjectInput</span>
              </div>
              <OpeningEditor
                openings={input.openings}
                onAdd={addOpening}
                onUpdate={updateOpening}
                onRemove={removeOpening}
              />
            </section>
            <div className="preview-actions">
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? "Расчёт…" : "Рассчитать"}
              </button>
              <input
                ref={projectFileInputRef}
                aria-label="Загрузить расчёт файл"
                type="file"
                accept=".json,application/json"
                hidden
                onChange={(event) => {
                  void loadProjectFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button
                className="secondary-button"
                type="button"
                onClick={() => projectFileInputRef.current?.click()}
              >
                Загрузить расчёт
              </button>
              <button className="secondary-button" type="button" onClick={saveProjectFile}>
                Сохранить расчёт
              </button>
              {loadedFileName ? <span className="preview-inline-note">Загружен: {loadedFileName} · Sprint-M project v1</span> : null}
              <button
                className="text-button"
                type="button"
                onClick={clearProjectData}
              >
                Очистить данные
              </button>
            </div>
          </form>
          <section className="preview-result-panel">
            <div className="preview-result-heading">
              <div>
                <span className="preview-eyebrow">Результат Core 1</span>
                <h2>Legacy Excel / Canonical / Диагностика</h2>
              </div>
              <span className="preview-badge preview-badge-green">
                REAL ENGINE
              </span>
            </div>
            <ResultTabs
              result={result}
              projection={projection}
              projectWindowGroups={
                input.openings.filter(
                  (opening) =>
                    opening.kind === "window" ||
                    opening.kind === "strip_window",
                ).length
              }
              enclosureResult={enclosureResult}
              commercialResult={commercialResult}
              projectWallGirtResults={projectWallGirtResults}
              tab={tab}
              setTab={setTab}
            />
            <EnclosureStatus result={enclosureResult} projectWallGirtResults={projectWallGirtResults} />
            {result?.status === "success" ? (
              <section className="preview-summary">
                <div>
                  <span>Core 1</span>
                  <strong>SUCCESS</strong>
                </div>
                <div>
                  <span>EnclosureCore</span>
                  <strong>{enclosureResult ? `${enclosureResult.wallGirts.status} · ${canonicalValue(enclosureResult.totals.knownMass_kg)} кг известной массы` : "NOT CALCULATED"}</strong>
                </div>
                <div>
                  <span>Core 3 · стоимость</span>
                  <strong>{commercialResult ? `${commercialResult.status} · ${canonicalValue(commercialResult.knownCost)} ₽` : "NOT CALCULATED"}</strong>
                </div>
                <div>
                  <span>Промежуточный итог</span>
                  <strong>{enclosureResult ? `KNOWN ONLY · ${canonicalValue((result.result.canonical.componentMasses.knownMassKg ?? 0) + enclosureResult.totals.knownMass_kg)} кг; неизвестные компоненты не суммируются` : "PARTIAL · неизвестные компоненты не суммируются"}</strong>
                </div>
              </section>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
undefined;
export { defaultPreviewInput };
