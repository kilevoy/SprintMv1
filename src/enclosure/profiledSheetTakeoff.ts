import { enclosureDiagnostic, type EnclosureDiagnostic } from "./diagnostics";
import type { EnclosureProvenance } from "./provenance";

export interface ProfiledSheetTakeoffInput {
  span_m: number;
  buildingLength_m: number;
  wallHeight_m: number;
  wallProfile: string;
  roofProfile: string;
}

export interface ProfiledSheetTakeoffLine {
  component: "SHEET" | "TRIM" | "FASTENER";
  orientation: "SIDE" | "END" | "ROOF" | "PROJECT_WIDE";
  product: string;
  quantity: number;
  unit: "m2" | "pcs";
  mass_kg: number | null;
  unitMass_kg: number | null;
  sourceCell: string;
  formula: string;
}

export interface ProfiledSheetTakeoffResult {
  status: "PARTIAL" | "INVALID";
  lines: ProfiledSheetTakeoffLine[];
  knownMass_kg: number;
  diagnostics: EnclosureDiagnostic[];
  provenance: EnclosureProvenance[];
}

const PROVENANCE: EnclosureProvenance = {
  status: "REAL_PROJECT_VALIDATED",
  sourceWorkbook: "21874.xlsx; 21985.xlsx",
  sourceSheet: "12м",
  note: "Quantity and unit masses replayed from H-column values in archived cold Sprint/AХ result workbooks; commercial price cells are not mass data. Cross-check price workbook SHA256: 08ea5728ad901409b651081b849dfb6db2c182c6b71c972224674365c0372b87.",
};

/** Role-specific legacy unit masses from 21874/21985, sheet 12м H-column. */
const UNIT_MASS = {
  wallSheetKgPerM2: 5.3,       // H41, С-18 0,5мм
  roofDeckKgPerM2: 7.0,        // H50, С-44 0,7 оц
  roofSheetKgPerM2: 7.4,       // H78, С-44 0,7мм
  outerCornerKgPerPiece: 2.3,  // H40
  ridgeTrimKgPerPiece: 1.7,    // H74
  gableTrimKgPerPiece: 1.662,  // H76
  fastenerKgPerPiece: 0.0026,  // H106/H137
} as const;

const PROVEN_WALL_PROFILE_MASS: Record<string, number> = {
  "С-18 0,5мм": UNIT_MASS.wallSheetKgPerM2,
  "С-18 окр. (0.5 мм)": UNIT_MASS.wallSheetKgPerM2,
};

const PROVEN_ROOF_PROFILE_MASS: Record<string, number> = {
  "С-44 0,7мм": UNIT_MASS.roofSheetKgPerM2,
  "С-44  0,7мм": UNIT_MASS.roofSheetKgPerM2,
  "С-44 окр. (0,7мм)": UNIT_MASS.roofSheetKgPerM2,
};

function valid(value: number): boolean { return Number.isFinite(value) && value > 0; }

/**
 * Replays the proven profiled-sheet quantity and unit-mass values from the
 * archived cold-hangar result workbooks. The ridge-seal line remains
 * unweighed because the source H80 cells are blank.
 */
export function calculateProfiledSheetTakeoff(input: ProfiledSheetTakeoffInput): ProfiledSheetTakeoffResult {
  if (!valid(input.span_m) || !valid(input.buildingLength_m) || !valid(input.wallHeight_m) || input.wallProfile.trim() === "" || input.roofProfile.trim() === "") {
    return {
      status: "INVALID",
      lines: [],
      knownMass_kg: 0,
      diagnostics: [enclosureDiagnostic("ENCLOSURE_INPUT_INVALID", "Профнастильный takeoff требует положительные span/length/height и явные марки листа.", "PROFILED_SHEET")],
      provenance: [PROVENANCE],
    };
  }

  const span = input.span_m;
  const length = input.buildingLength_m;
  const height = input.wallHeight_m;
  const wallSheet = (2 * span + 2 * length) * (height + 0.5) * 1.1 + 2 * span * 1.1;
  const cornerTrim = 4 * height / 2.9;
  const roofDeck = span * length * 1.1;
  const roofSheet = (span + 0.6) * (length + 1) * 1.1;
  const ridgeTrim = Math.ceil(length / 1.9);
  const gableTrim = Math.ceil(2 * span / 1.8);
  const ridgeSeal = 2 * ridgeTrim;
  const wallFasteners = 10 * wallSheet;
  const roofFasteners = 8 * roofSheet;
  const wallSheetUnitMass = PROVEN_WALL_PROFILE_MASS[input.wallProfile] ?? null;
  const roofSheetUnitMass = PROVEN_ROOF_PROFILE_MASS[input.roofProfile] ?? null;
  const line = (value: Omit<ProfiledSheetTakeoffLine, "mass_kg">): ProfiledSheetTakeoffLine => ({
    ...value,
    mass_kg: value.unitMass_kg === null ? null : value.quantity * value.unitMass_kg,
  });
  const lines: ProfiledSheetTakeoffLine[] = [
    line({ component: "SHEET", orientation: "PROJECT_WIDE", product: input.wallProfile, quantity: wallSheet, unit: "m2", unitMass_kg: wallSheetUnitMass, sourceCell: "12м!C41", formula: "(2*span + 2*length)*(height + 0.5)*1.1 + 2*span*1.1" }),
    line({ component: "TRIM", orientation: "PROJECT_WIDE", product: "Уголок 50х50 нар", quantity: cornerTrim, unit: "pcs", unitMass_kg: UNIT_MASS.outerCornerKgPerPiece, sourceCell: "12м!C40", formula: "4*height/2.9" }),
    line({ component: "SHEET", orientation: "ROOF", product: "С-44 0,7 оц", quantity: roofDeck, unit: "m2", unitMass_kg: UNIT_MASS.roofDeckKgPerM2, sourceCell: "12м!C50", formula: "span*length*1.1" }),
    line({ component: "SHEET", orientation: "ROOF", product: input.roofProfile, quantity: roofSheet, unit: "m2", unitMass_kg: roofSheetUnitMass, sourceCell: "12м!C78", formula: "(span + 0.6)*(length + 1)*1.1" }),
    line({ component: "TRIM", orientation: "ROOF", product: "Конек плоский (2м)", quantity: ridgeTrim, unit: "pcs", unitMass_kg: UNIT_MASS.ridgeTrimKgPerPiece, sourceCell: "12м!C74", formula: "CEILING(length/1.9,1)" }),
    line({ component: "TRIM", orientation: "ROOF", product: "Фронтон (2м)", quantity: gableTrim, unit: "pcs", unitMass_kg: UNIT_MASS.gableTrimKgPerPiece, sourceCell: "12м!C76", formula: "CEILING(2*span/1.8,1)" }),
    line({ component: "TRIM", orientation: "ROOF", product: "Уплотнитель (2м)", quantity: ridgeSeal, unit: "pcs", unitMass_kg: null, sourceCell: "12м!C80", formula: "2*ridge_trim_pcs" }),
    line({ component: "FASTENER", orientation: "PROJECT_WIDE", product: "Саморез 4,8x20 (стены)", quantity: wallFasteners, unit: "pcs", unitMass_kg: UNIT_MASS.fastenerKgPerPiece, sourceCell: "12м!C106", formula: "10*wall_sheet_m2" }),
    line({ component: "FASTENER", orientation: "ROOF", product: "Саморез 4,8x20 (кровля)", quantity: roofFasteners, unit: "pcs", unitMass_kg: UNIT_MASS.fastenerKgPerPiece, sourceCell: "12м!C137", formula: "8*roof_sheet_m2" }),
  ];
  const knownMass_kg = lines.reduce((sum, current) => sum + (current.mass_kg ?? 0), 0);
  const missingMassProducts = [
    ...(wallSheetUnitMass === null ? [`wall:${input.wallProfile}`] : []),
    ...(roofSheetUnitMass === null ? [`roof:${input.roofProfile}`] : []),
    "trim:Уплотнитель (2м)",
  ];
  return {
    status: "PARTIAL",
    lines,
    knownMass_kg,
    diagnostics: [enclosureDiagnostic("ENCLOSURE_MATERIAL_MASS_NOT_PROVEN", "Масса доказана только для профилей и изделий, совпадающих с source-backed legacy marks; неизвестные марки и уплотнитель остаются без массы.", "PROFILED_SHEET", { source: "21874.xlsx;21985.xlsx", missing: missingMassProducts, sourceCells: ["12м!H80"] })],
    provenance: [PROVENANCE],
  };
}
