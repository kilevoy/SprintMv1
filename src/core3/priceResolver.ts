import dataset from "./data/price-dataset-v1.json";
import profileCatalog from "./data/profile-price-catalog-v1.json";
import { core3Diagnostic, type Core3Diagnostic } from "./diagnostics";
import type { Core3PriceEntry, Core3PriceLine, Core3PriceUnit } from "./priceTypes";
import type { ManualWallGirtZoneResult } from "../enclosure/manualWallGirtReplay";
import type { Core1Result } from "../core1/types";

const entries = dataset.entries as Core3PriceEntry[];
const profileEntries = profileCatalog.entries as Core3PriceEntry[];
const allEntries = [...entries, ...profileEntries];
const sourceBase = { workbook: dataset.source.workbook, sha256: dataset.source.sha256, effective_date: dataset.effective_date };

/**
 * Explicit Core 1 → 1C aliases proven for the purlin families used by the
 * current real-project regression set. This is intentionally a closed table:
 * an unknown Core 1 mark must remain UNKNOWN_COST rather than being normalized
 * by a fuzzy parser.
 */
const PROVEN_PURLIN_MARKS: Readonly<Record<string, string>> = {
  "2ПС 145х45х1,5|М.п.350": "ПС 145х45 без перфор. 1,5 П350 (Оцинк.)",
  "2ПС 145х45х1,5|М.п.390": "ПС 145х45 без перфор. 1,5 П390 (Оцинк.)",
  "2ПС 150х45х1,5|М.п.350": "ПС 150х45 без перфор. 1,5 П350 (Оцинк.)",
  "2ПС 150х45х1,5|М.п.390": "ПС 150х45 без перфор. 1,5 П390 (Оцинк.)",
  "2ПС 150х45х2|М.п.350": "ПС 150х45 без перфор. 2,0 П350 (Оцинк.)",
  "2ПС 150х45х2|М.п.390": "ПС 150х45 без перфор. 2,0 П390 (Оцинк.)",
  "2ПС 150х65х1,5|М.п.350": "ПС 150х65 без перфор. 1,5 П350 (Оцинк.)",
  "2ПС 150х65х1,5|М.п.390": "ПС 150х65 без перфор. 1,5 П390 (Оцинк.)",
  "2ПС 150х65х2|М.п.350": "ПС 150х65 без перфор. 2,0 П350 (Оцинк.)",
  "2ПС 150х65х2|М.п.390": "ПС 150х65 без перфор. 2,0 П390 (Оцинк.)",
  "2ПС 195х45х1,5|М.п.350": "ПС 195х45 без перфор. 1,5 П350 (Оцинк.)",
  "2ПС 195х45х1,5|М.п.390": "ПС 195х45 без перфор. 1,5 П390 (Оцинк.)",
  "2ПС 200х45х1,5|М.п.350": "ПС 200х45 без перфор. 1,5 П350 (Оцинк.)",
  "2ПС 200х45х1,5|М.п.390": "ПС 200х45 без перфор. 1,5 П390 (Оцинк.)",
  "2ПС 200х45х2|М.п.350": "ПС 200х45 без перфор. 2,0 П350 (Оцинк.)",
  "2ПС 200х45х2|М.п.390": "ПС 200х45 без перфор. 2,0 П390 (Оцинк.)",
  "2ПС 200х65х1,5|М.п.350": "ПС 200х65 без перфор. 1,5 П350 (Оцинк.)",
  "2ПС 200х65х1,5|М.п.390": "ПС 200х65 без перфор. 1,5 П390 (Оцинк.)",
  "2ПС 200х65х2|М.п.350": "ПС 200х65 без перфор. 2,0 П350 (Оцинк.)",
  "2ПС 200х65х2|М.п.390": "ПС 200х65 без перфор. 2,0 П390 (Оцинк.)",
  "2ПС 245х65х1,5|М.п.350": "ПС 245х65 без перфор. 1,5 П350 (Оцинк.)",
  "2ПС 245х65х1,5|М.п.390": "ПС 245х65 без перфор. 1,5 П390 (Оцинк.)",
  "2ПС 245х65х2|М.п.350": "ПС 245х65 без перфор. 2,0 П350 (Оцинк.)",
  "2ПС 245х65х2|М.п.390": "ПС 245х65 без перфор. 2,0 П390 (Оцинк.)",
};

/**
 * Exact frame labels observed in the archived result workbooks.  The table is
 * deliberately closed: a visually similar profile is not accepted.
 */
const PROVEN_FRAME_LABELS: Readonly<Record<string, { width: "300" | "245"; thickness: "1,5" | "2,0" | "2,5" | "3,0" }>> = {
  "ПГС300/20х80х1,5": { width: "300", thickness: "1,5" },
  "ПГС300/20х80х2": { width: "300", thickness: "2,0" },
  "ПГС300/20х80х2,5": { width: "300", thickness: "2,5" },
  "ПГС300/20х80х3": { width: "300", thickness: "3,0" },
  "ПГС245/20х80х1,5": { width: "245", thickness: "1,5" },
  "ПГС245/20х80х2": { width: "245", thickness: "2,0" },
  "ПГС245/20х80х2,5": { width: "245", thickness: "2,5" },
  "ПГС-сигма 300х80х1,5": { width: "300", thickness: "1,5" },
  "ПГС-сигма 300х80х2": { width: "300", thickness: "2,0" },
  "ПГС-сигма 300х80х2,5": { width: "300", thickness: "2,5" },
  "ПГС-сигма 300х80х3": { width: "300", thickness: "3,0" },
};

function frameCatalogMark(profile: string, steel: string): string | null {
  const parsed = PROVEN_FRAME_LABELS[profile.trim()];
  const grade = steel.trim() === "М.п.350" ? "П350" : steel.trim() === "М.п.390" ? "П390" : null;
  if (!parsed || !grade) return null;
  return `ПГС-сигма ${parsed.width}х80x20 без перфор. ${parsed.thickness} ${grade} (Оцинк.)`;
}

function frameFailure(
  role: "beam" | "column",
  profile: string,
  details: Record<string, unknown> = {},
): Core3PriceLine {
  return {
    component: "FRAME",
    orientation: "PROJECT_WIDE",
    product: `${role}:${profile || "unknown"}`,
    quantity: 0,
    unit: "m",
    unitPrice: null,
    lineCost: null,
    source: null,
    diagnostics: [core3Diagnostic("CORE3_FRAME_PROFILE_PRICE_NOT_PROVEN", `Цена рамного профиля «${profile || "unknown"}» (${role}) не доказана.`, "FRAME", details)],
    costStatus: "UNKNOWN_COST",
  };
}

/**
 * Prices the proven gable-frame commercial branch from the historical BOM
 * rows: beams = 2 * span * frameCount and columns =
 * 2 * 3.5 * 2 * (frameCount - 2). These are commercial takeoff literals and
 * are intentionally separate from the structural D68/D69 formulas.
 */
export function resolveCore3FramePrices(
  core1: Pick<Core1Result, "scenario" | "frame_step_m" | "beam_profile" | "beam_steel" | "column_profile" | "column_steel">,
  catalog: readonly Core3PriceEntry[] = profileEntries,
): Core3PriceLine[] {
  const scenario = core1.scenario;
  const fail = (role: "beam" | "column", profile: string, details: Record<string, unknown> = {}) => frameFailure(role, profile, details);
  if (!scenario) {
    return [fail("beam", core1.beam_profile ?? "", { reason: "CORE1_SCENARIO_REQUIRED" }), fail("column", core1.column_profile ?? "", { reason: "CORE1_SCENARIO_REQUIRED" })];
  }
  if (scenario.building_roof_type === "односкатное") {
    return [
      fail("beam", core1.beam_profile ?? "", { reason: "MONO_SLOPE_QUANTITY_FORMULA_NOT_CLOSED" }),
      fail("column", core1.column_profile ?? "", { reason: "MONO_SLOPE_QUANTITY_FORMULA_NOT_CLOSED" }),
    ];
  }
  const frameStep = core1.frame_step_m;
  const length = scenario.building_length_m;
  const height = scenario.building_height_m;
  if (typeof frameStep !== "number" || !Number.isFinite(frameStep) || frameStep <= 0
    || typeof length !== "number" || !Number.isFinite(length) || length <= 0
    || typeof height !== "number" || !Number.isFinite(height) || height <= 0) {
    return [fail("beam", core1.beam_profile ?? "", { reason: "INVALID_FRAME_GEOMETRY" }), fail("column", core1.column_profile ?? "", { reason: "INVALID_FRAME_GEOMETRY" })];
  }
  const frameCount = Math.ceil(length / frameStep) + 1;
  // Historical sheets use J14 = 15*3.14/180 (not the JS Math.PI literal).
  const definitions = [
    { role: "beam" as const, profile: core1.beam_profile ?? "", steel: core1.beam_steel ?? "", quantity: 2 * scenario.span_m * frameCount },
    { role: "column" as const, profile: core1.column_profile ?? "", steel: core1.column_steel ?? "", quantity: 2 * 3.5 * 2 * Math.max(0, frameCount - 2) },
  ];
  return definitions.map(({ role, profile, steel, quantity }) => {
    const mark = frameCatalogMark(profile, steel);
    if (!mark) return fail(role, profile, { profile, steel, mapping: "EXPLICIT_ONLY" });
    const entry = findEntry(mark, catalog);
    if (!entry || entry.unit !== "m" || entry.price_per_unit === null) return fail(role, profile, { mark, mapping: "EXPLICIT_ONLY" });
    const source = { ...sourceBase, ...entry.source };
    return {
      component: "FRAME" as const,
      orientation: "PROJECT_WIDE" as const,
      product: mark,
      quantity,
      unit: "m" as const,
      unitPrice: entry.price_per_unit,
      lineCost: quantity * entry.price_per_unit,
      source,
      diagnostics: [],
      costStatus: "KNOWN_COST" as const,
    };
  });
}

function findEntry(product: string, catalog: readonly Core3PriceEntry[]): Core3PriceEntry | null {
  const normalized = product.trim().toLocaleLowerCase("ru-RU");
  return catalog.find((entry) => [entry.code_1c, entry.canonical_mark, ...entry.aliases]
    .filter((mark): mark is string => Boolean(mark))
    .some((mark) => mark.toLocaleLowerCase("ru-RU") === normalized)) ?? null;
}

function resolveCatalogPrice(
  line: { product: string; unit: Core3PriceUnit; component: Core3PriceLine["component"]; orientation: Core3PriceLine["orientation"]; quantity: number },
  catalog: readonly Core3PriceEntry[],
): Core3PriceLine {
  const expectedUnit = line.unit;
  const entry = findEntry(line.product, catalog);
  const diagnostics: Core3Diagnostic[] = [];
  if (!entry) {
    const generic = ["профлист", "с-18", "с-44"].includes(line.product.trim().toLocaleLowerCase("ru-RU"));
    diagnostics.push(core3Diagnostic(
      generic ? "CORE3_GENERIC_PROFILE_MARK_UNSUPPORTED" : "CORE3_UNKNOWN_PRODUCT_MARK",
      generic ? "Generic-профлист без точной марки не может получить цену." : `В dataset нет доказанной цены для позиции «${line.product}».`,
      line.component,
      { product: line.product },
    ));
    return { component: line.component, orientation: line.orientation, product: line.product, quantity: line.quantity, unit: expectedUnit, unitPrice: null, lineCost: null, source: null, diagnostics, costStatus: "UNKNOWN_COST" };
  }
  if (entry.unit !== expectedUnit) {
    diagnostics.push(core3Diagnostic("CORE3_UNIT_UNKNOWN", `Единица позиции «${line.product}» не совпадает с единицей takeoff.`, line.component, { expected: expectedUnit, dataset: entry.unit }));
  }
  if (entry.price_per_unit === null) {
    diagnostics.push(core3Diagnostic("CORE3_PRICE_NOT_FOUND", `Цена позиции «${line.product}» отсутствует в dataset.`, line.component));
  }
  const source = { ...sourceBase, ...entry.source };
  const valid = diagnostics.length === 0 && entry.price_per_unit !== null;
  return { component: line.component, orientation: line.orientation, product: line.product, quantity: line.quantity, unit: expectedUnit, unitPrice: valid ? entry.price_per_unit : null, lineCost: valid ? line.quantity * entry.price_per_unit! : null, source: valid ? source : null, diagnostics, costStatus: valid ? "KNOWN_COST" : (diagnostics.some((item) => item.code === "CORE3_UNIT_UNKNOWN") ? "UNSUPPORTED" : "UNKNOWN_COST") };
}

export function resolveCore3Price(
  line: Pick<Core3PriceLine, "product" | "unit" | "component" | "orientation" | "quantity">,
  catalog: readonly Core3PriceEntry[] = allEntries,
): Core3PriceLine {
  return resolveCatalogPrice(line, catalog);
}

/**
 * Prices one proven Core 1 roof-purlin result as a material-length line.
 * Core 1 exposes the selected assembly mass, while the 1C profile catalogue
 * exposes mass and price per metre. Therefore quantity is derived only from
 * the exact source-backed mass basis; no geometric or nearest-profile fallback
 * is used.
 */
export function resolveCore3PurlinPrice(
  purlin: Pick<Core1Result, "purlin_profile" | "purlin_steel" | "purlin_weight_kg">,
  catalog: readonly Core3PriceEntry[] = profileEntries,
): Core3PriceLine {
  const profile = purlin.purlin_profile ?? "";
  const steel = purlin.purlin_steel ?? "";
  const key = `${profile}|${steel}`;
  const mark = PROVEN_PURLIN_MARKS[key];
  const fail = (code: "CORE3_PURLIN_PRICE_NOT_PROVEN" | "CORE3_PROFILE_MASS_NOT_PROVEN", message: string, details?: Record<string, unknown>): Core3PriceLine => ({
    component: "PURLIN",
    orientation: "ROOF",
    product: profile || "purlin",
    quantity: 0,
    unit: "m",
    unitPrice: null,
    lineCost: null,
    source: null,
    diagnostics: [core3Diagnostic(code, message, "PURLIN", details)],
    costStatus: "UNKNOWN_COST",
  });
  if (!mark) {
    return fail("CORE3_PURLIN_PRICE_NOT_PROVEN", `Для Core 1 прогона «${profile}» / «${steel}» нет точного 1C alias.`, { profile, steel, mapping: "EXPLICIT_ONLY" });
  }
  const entry = findEntry(mark, catalog);
  if (!entry || entry.unit !== "m" || entry.price_per_unit === null) {
    return fail("CORE3_PURLIN_PRICE_NOT_PROVEN", `Точная цена для прогона «${mark}» отсутствует или имеет несовместимую единицу.`, { mark, datasetUnit: entry?.unit ?? null });
  }
  const mass = purlin.purlin_weight_kg;
  const massPerM = entry.mass_kg_per_m;
  if (typeof mass !== "number" || !Number.isFinite(mass) || mass <= 0 || typeof massPerM !== "number" || !Number.isFinite(massPerM) || massPerM <= 0) {
    return fail("CORE3_PROFILE_MASS_NOT_PROVEN", `Нельзя получить коммерческую длину прогона «${mark}»: отсутствует доказанная масса.`, { mark, massKg: mass ?? null, massKgPerM: massPerM ?? null });
  }
  const quantity = mass / massPerM;
  const source = { ...sourceBase, ...entry.source };
  return {
    component: "PURLIN",
    orientation: "ROOF",
    product: mark,
    quantity,
    unit: "m",
    unitPrice: entry.price_per_unit,
    lineCost: quantity * entry.price_per_unit,
    source,
    diagnostics: [],
    costStatus: "KNOWN_COST",
  };
}

export function resolveCore3WallGirtPrice(
  zone: ManualWallGirtZoneResult,
  catalog: readonly Core3PriceEntry[] = allEntries,
): Core3PriceLine {
  const paired = zone.sectionType === "[]";
  const singleMark = zone.profile.replace(/^\[\]|^\]|^\]\[/, "");
  const entry = findEntry(singleMark, catalog);
  if (!entry) {
    return {
      component: "WALL_GIRT", orientation: zone.wall, product: zone.profile, quantity: zone.profileLength_m,
      unit: "m", unitPrice: null, lineCost: null,
      source: null,
      diagnostics: [core3Diagnostic("CORE3_WALL_GIRT_PRICE_NOT_PROVEN", `Цена для wall-girt профиля «${zone.profile}» не доказана.`, "WALL_GIRT", { sectionType: zone.sectionType })],
      costStatus: "UNKNOWN_COST",
    };
  }
  if (entry.unit !== "m") {
    return {
      component: "WALL_GIRT", orientation: zone.wall, product: zone.profile, quantity: zone.profileLength_m,
      unit: "m", unitPrice: null, lineCost: null, source: null,
      diagnostics: [core3Diagnostic("CORE3_UNIT_UNKNOWN", "Для wall-girt прайс не содержит совместимую единицу п.м.", "WALL_GIRT", { datasetUnit: entry.unit })],
      costStatus: "UNSUPPORTED",
    };
  }
  const multiplier = paired ? 2 : 1;
  const quantity = zone.profileLength_m * multiplier;
  const source = { ...sourceBase, ...entry.source };
  return {
    component: "WALL_GIRT", orientation: zone.wall, product: zone.profile, quantity, unit: "m",
    unitPrice: entry.price_per_unit, lineCost: entry.price_per_unit === null ? null : quantity * entry.price_per_unit,
    source: entry.price_per_unit === null ? null : source,
    diagnostics: entry.price_per_unit === null ? [core3Diagnostic("CORE3_PRICE_NOT_FOUND", `Цена для wall-girt профиля «${zone.profile}» отсутствует.`, "WALL_GIRT")] : [],
    costStatus: entry.price_per_unit === null ? "UNKNOWN_COST" : "KNOWN_COST",
  };
}

/**
 * Replays the archived wall-girt bracket commercial chain:
 * 21874.xlsx!12м!C38 = bracketCount * 0.2 m and E38 points to the exact
 * special-angle product in the price workbook. The conversion is deliberately
 * explicit; it is not a per-ton or nearest-profile fallback.
 */
export function resolveCore3WallGirtBracketPrice(
  zone: ManualWallGirtZoneResult,
  catalog: readonly Core3PriceEntry[] = allEntries,
): Core3PriceLine {
  const mark = "Угол специальный 90 гр. 2,0 П350 (Оцинк.)";
  const entry = findEntry(mark, catalog);
  const quantity = zone.bracketCount * 0.2;
  if (!entry) {
    return {
      component: "WALL_GIRT", orientation: zone.wall, product: "wall-girt-brackets",
      quantity, unit: "m", unitPrice: null, lineCost: null, source: null,
      diagnostics: [core3Diagnostic("CORE3_WALL_GIRT_BRACKET_PRICE_NOT_PROVEN", "Цена доказанного уголка-кронштейна wall-girt отсутствует в dataset.", "WALL_GIRT_BRACKET", { sourceProduct: mark })],
      costStatus: "UNKNOWN_COST",
    };
  }
  if (entry.unit !== "m" || entry.price_per_unit === null) {
    return {
      component: "WALL_GIRT", orientation: zone.wall, product: "wall-girt-brackets",
      quantity, unit: "m", unitPrice: null, lineCost: null, source: null,
      diagnostics: [core3Diagnostic("CORE3_WALL_GIRT_BRACKET_PRICE_NOT_PROVEN", "Источник уголка-кронштейна не содержит совместимой цену за погонный метр.", "WALL_GIRT_BRACKET", { sourceProduct: mark, datasetUnit: entry.unit })],
      costStatus: "UNSUPPORTED",
    };
  }
  const source = { ...sourceBase, ...entry.source };
  return {
    component: "WALL_GIRT", orientation: zone.wall, product: "wall-girt-brackets",
    quantity, unit: "m", unitPrice: entry.price_per_unit, lineCost: quantity * entry.price_per_unit,
    source, diagnostics: [], costStatus: "KNOWN_COST",
  };
}

export function auditCore3ProfilePriceCatalog(catalog: readonly Core3PriceEntry[] = profileEntries): Core3Diagnostic[] {
  const diagnostics: Core3Diagnostic[] = [];
  const byCode = new Map<string, Core3PriceEntry[]>();
  const byMark = new Map<string, Core3PriceEntry[]>();
  for (const entry of catalog) {
    if (entry.code_1c) byCode.set(entry.code_1c, [...(byCode.get(entry.code_1c) ?? []), entry]);
    const key = entry.canonical_mark.trim().toLocaleLowerCase("ru-RU");
    byMark.set(key, [...(byMark.get(key) ?? []), entry]);
    if (entry.mass_kg_per_m == null) {
      diagnostics.push(core3Diagnostic("CORE3_PROFILE_MASS_NOT_PROVEN", `Масса профиля «${entry.canonical_mark}» отсутствует в каталоге.`, "PROFILE", { code_1c: entry.code_1c }));
    }
    if (entry.unit !== "m") {
      diagnostics.push(core3Diagnostic("CORE3_UNIT_UNKNOWN", `Единица профиля «${entry.canonical_mark}» не является погонным метром.`, "PROFILE", { unit: entry.unit }));
    }
  }
  for (const [code, group] of byCode) {
    if (group.length > 1) diagnostics.push(core3Diagnostic("CORE3_PROFILE_PRICE_CATALOG_DUPLICATE", `Код 1С ${code} встречается несколько раз.`, "PROFILE", { code_1c: code, count: group.length }));
  }
  for (const [mark, group] of byMark) {
    const prices = new Set(group.map((entry) => entry.price_per_unit));
    if (group.length > 1) diagnostics.push(core3Diagnostic(prices.size > 1 ? "CORE3_PROFILE_PRICE_CONFLICT" : "CORE3_PROFILE_PRICE_CATALOG_DUPLICATE", `Марка профиля «${mark}» встречается несколько раз.`, "PROFILE", { count: group.length, prices: [...prices] }));
  }
  return diagnostics;
}
