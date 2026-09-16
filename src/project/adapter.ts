import { createCore1Diagnostic } from "../core1/diagnostics";
import type { Core1Diagnostic, Core1Input } from "../core1/types";
import type { ProjectInput, ProjectOpening, WindowOpening, StripWindowOpening } from "./types";

export interface Core1InputAdapterOptions {
  /** Workbook evidence has not yet established whether the 6 m gate boundary is width or height. */
  gate_boundary_dimension?: "width_mm" | "height_mm";
}

export type ProjectInputAdapterResult =
  | { status: "success"; input: Core1Input; diagnostics: Core1Diagnostic[] }
  | { status: "unsupported"; input: null; diagnostics: Core1Diagnostic[] };

function diagnostic(code: "CORE1_OPENINGS_NOT_REPRESENTABLE" | "CORE1_GATE_CLASSIFICATION_UNVERIFIED", message: string, details: Record<string, unknown>): Core1Diagnostic {
  return createCore1Diagnostic({
    code,
    severity: "unsupported",
    classification: "unsupported",
    module: "Core1InputAdapter",
    message,
    source: ["PROJECT_INPUT_ARCHITECTURE.md", "CORE1_OPENING_MASS_AUDIT.md", "вывод!D60:D67"],
    affected_outputs: ["openings_weight_kg", "openings_weight_kg_per_m2", "kg_per_m2"],
    details,
  });
}

function invalidOpeningDiagnostic(message: string, details: Record<string, unknown>): Core1Diagnostic {
  return diagnostic("CORE1_OPENINGS_NOT_REPRESENTABLE", message, details);
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}

function sameWindowProjection(left: WindowOpening | StripWindowOpening, right: WindowOpening | StripWindowOpening): boolean {
  return left.height_mm === right.height_mm
    && left.window_type === right.window_type
    && left.glazing_construction === right.glazing_construction;
}

function validateOpenings(openings: ProjectOpening[]): Core1Diagnostic[] {
  const diagnostics: Core1Diagnostic[] = [];
  const ids = new Set<string>();
  for (const opening of openings) {
    if (ids.has(opening.id)) diagnostics.push(invalidOpeningDiagnostic("Каждый проём должен иметь уникальный stable id.", { id: opening.id }));
    ids.add(opening.id);
    if (!isPositiveInteger(opening.quantity)) diagnostics.push(invalidOpeningDiagnostic("Количество каждого проёма должно быть целым числом не менее 1.", { id: opening.id, quantity: opening.quantity }));
    if (opening.kind !== "strip_window" && (!Number.isFinite(opening.width_mm) || opening.width_mm <= 0)) diagnostics.push(invalidOpeningDiagnostic("Ширина проёма должна быть больше нуля.", { id: opening.id, width_mm: opening.width_mm }));
    if (!Number.isFinite(opening.height_mm) || opening.height_mm <= 0) diagnostics.push(invalidOpeningDiagnostic("Высота проёма должна быть больше нуля.", { id: opening.id, height_mm: opening.height_mm }));
    if (opening.kind === "strip_window" && (!Number.isFinite(opening.length_mm) || opening.length_mm <= 0)) diagnostics.push(invalidOpeningDiagnostic("Длина ленточного окна должна быть больше нуля.", { id: opening.id, length_mm: opening.length_mm }));
  }
  return diagnostics;
}

function windowProjection(openings: ProjectOpening[]): { enabled: boolean; window_height_m: number; window_strip_length_m: number; separate_window_count: number; window_type: 1 | 2 | 3 | 4 | 5; glazing_construction: string } | { diagnostic: Core1Diagnostic } {
  const windows = openings.filter((opening): opening is WindowOpening => opening.kind === "window");
  const strips = openings.filter((opening): opening is StripWindowOpening => opening.kind === "strip_window");
  const allWindowGroups = [...windows, ...strips];
  if (allWindowGroups.length === 0) return { enabled: false, window_height_m: 0, window_strip_length_m: 0, separate_window_count: 0, window_type: 1, glazing_construction: "2ой стеклопакет" };
  const first = allWindowGroups[0]!;
  if (allWindowGroups.some((opening) => !sameWindowProjection(first, opening))) {
    return { diagnostic: invalidOpeningDiagnostic("Несколько оконных групп имеют разные высоту, тип или конструкцию остекления и не могут быть без потери логики представлены legacy D64:D67.", { opening_ids: allWindowGroups.map((opening) => opening.id) }) };
  }
  if (windows.some((opening) => opening.width_mm !== windows[0]!.width_mm || opening.height_mm !== windows[0]!.height_mm)) {
    return { diagnostic: invalidOpeningDiagnostic("Несколько оконных групп имеют разные размеры и не могут быть молча сведены к одному legacy набору D64:D67.", { opening_ids: windows.map((opening) => opening.id) }) };
  }
  if (strips.length > 1 || (strips[0]?.quantity ?? 1) !== 1) {
    return { diagnostic: invalidOpeningDiagnostic("Legacy D65 содержит одну длину ленточного окна без отдельного количества; несколько ленточных групп требуют Core 2.", { opening_ids: strips.map((opening) => opening.id) }) };
  }
  return {
    enabled: true,
    window_height_m: first.height_mm / 1000,
    window_strip_length_m: strips[0] ? strips[0].length_mm / 1000 : 0,
    separate_window_count: windows.reduce((sum, opening) => sum + opening.quantity, 0),
    window_type: first.window_type,
    glazing_construction: first.glazing_construction,
  };
}

/** Converts the single ProjectInput model to the compatibility-only Core1Input contract. */
export function projectInputToCore1Input(project: ProjectInput, options: Core1InputAdapterOptions = {}): ProjectInputAdapterResult {
  const openingDiagnostics = validateOpenings(project.openings);
  if (openingDiagnostics.length > 0) return { status: "unsupported", input: null, diagnostics: openingDiagnostics };

  const gates = project.openings.filter((opening) => opening.kind === "gate");
  if (gates.length > 0 && !options.gate_boundary_dimension) {
    return {
      status: "unsupported",
      input: null,
      diagnostics: [diagnostic("CORE1_GATE_CLASSIFICATION_UNVERIFIED", "Основная книга хранит только D60/D61 и не доказывает, ширина или высота определяет границу 6 м. Для безопасного Core 1 projection нужен подтверждённый adapter policy.", { opening_ids: gates.map((opening) => opening.id), boundary_mm: 6000, available_dimensions: ["width_mm", "height_mm"] })],
    };
  }
  const gateDimension = options.gate_boundary_dimension;
  const gateCountLe6m = gateDimension ? gates.filter((opening) => opening[gateDimension] <= 6000).reduce((sum, opening) => sum + opening.quantity, 0) : 0;
  const gateCountGt6m = gateDimension ? gates.filter((opening) => opening[gateDimension] > 6000).reduce((sum, opening) => sum + opening.quantity, 0) : 0;
  const windowProjectionResult = windowProjection(project.openings);
  if ("diagnostic" in windowProjectionResult) return { status: "unsupported", input: null, diagnostics: [windowProjectionResult.diagnostic] };

  const climate = project.climate.mode === "MANUAL"
    ? { mode: "MANUAL" as const, country: project.climate.country, normative_system: project.climate.normative_system, snow_region: project.climate.snow_region, snow_load: project.climate.snow_load, wind_region: project.climate.wind_region, wind_load: project.climate.wind_load, seismicity: project.climate.seismicity || null, ...(project.climate.source_note ? { source_note: project.climate.source_note } : {}) }
    : { mode: "CITY_LOOKUP" as const, country: project.climate.country, city: project.climate.city.trim(), normative_system: project.climate.normative_system };
  const input: Core1Input = {
    span_m: project.geometry.span_m,
    building_length_m: project.geometry.building_length_m,
    building_height_m: project.geometry.building_height_m,
    responsibility_factor: project.geometry.responsibility_factor,
    frame_step_override_m: project.geometry.frame_step_override_m,
    roof_covering: project.envelope.roof_covering,
    roof_deck_grade: project.envelope.roof_deck_grade,
    snow_retention_purlin: project.special_conditions.snow_retention_purlin,
    enclosure_purlin: project.special_conditions.enclosure_purlin,
    horizontal_bracing_override: project.special_conditions.horizontal_bracing_override,
    gates_le_6m_count: gateCountLe6m,
    gates_gt_6m_count: gateCountGt6m,
    doors_count: project.openings.filter((opening) => opening.kind === "door").reduce((sum, opening) => sum + opening.quantity, 0),
    windows: windowProjectionResult,
    selection_mode: project.other.selection_mode,
    building_roof_type: project.other.building_roof_type,
    purlin_max_step_override_mm: project.other.purlin_max_step_override_mm,
    purlin_min_step_mm: project.other.purlin_min_step_mm,
    terrain_type: project.other.terrain_type,
    window_scheme_factor: project.other.window_scheme_factor,
    window_utilization_limit: project.other.window_utilization_limit,
    climate,
  };
  return { status: "success", input, diagnostics: [] };
}
