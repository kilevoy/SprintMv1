import evidenceDataset from "./evidence-data/wall-girt-auto-no-stud-candidates.json";
import { replayManualWallGirt, type ManualWallGirtReplayInput, type ManualWallGirtSectionType } from "./manualWallGirtReplay";
import type { EnclosureProvenance } from "./provenance";

export type AutoWallGirtZoneType = "CORNER" | "TYPICAL";
export type AutoWallGirtTerrain = "А" | "В" | "С";
export type AutoWallGirtFilter = "all" | string;

export interface AutoWallGirtRuntimeInput {
  zoneType: AutoWallGirtZoneType;
  wall: "SIDE" | "END";
  buildingLength_m: number;
  wallCalculationLength_m: number;
  wallCalculationHeight_m: number;
  postStep_m: number;
  /** Optional raw source-backed e/B7 value. When present it is authoritative. */
  cornerHalfLength_m?: number;
  buildingHeight_m: number;
  w0_kPa: number;
  terrain: AutoWallGirtTerrain;
  responsibility: number;
  insulationThickness_mm: number;
  utilizationOverride: number;
  profileFamily: AutoWallGirtFilter;
  sectionType: AutoWallGirtFilter;
  material: AutoWallGirtFilter;
  minProfileHeight_mm: number;
  maxProfileHeight_mm: number;
  minThickness_mm: number;
  maxThickness_mm: number;
  minStep_mm: number;
  maxStep_mm: number;
  manualStepMode: "none" | "explicit";
  manualSteps_mm?: readonly number[];
  withoutStuds: true;
  normativeSystem: "SP_20";
}

export interface AutoWallGirtObjectiveTerms {
  rowCount: number;
  supportSpan_m: number;
  sectionMass_kg: number;
  profileMass_kg: number;
  bracketMass_kg: number;
  sourceOrderTerm: number;
  stepTieBreakTerm: number;
  studMass_kg: number;
}

export interface AutoWallGirtSelectedCandidate {
  sourceRow: number;
  sourceSheet: "Расчет Угловая" | "Расчет Рядовая";
  branch: "NO_STUD";
  zoneType: AutoWallGirtZoneType;
  designation: string;
  profile: string;
  profileFamily: string;
  sectionType: ManualWallGirtSectionType;
  material: string;
  thickness_mm: number;
  profileHeight_mm: number;
  step_mm: number;
  profileMass_kg_m: number;
  sectionMass_kg_m: number;
  bracketUnitMass_kg: number;
  utilization: number;
  capacityValue: number;
  jw: 1;
  objective: number;
  objectiveTerms: AutoWallGirtObjectiveTerms;
  provenance: EnclosureProvenance;
}

export interface AutoWallGirtSelectionResult {
  status: "LEGACY_PROVEN" | "INVALID" | "UNSUPPORTED";
  selected: AutoWallGirtSelectedCandidate | null;
  diagnostics: string[];
}

type EvidenceField = { cached_value: unknown; formula: string | null };
type EvidenceRow = { source_row: number; fields: Record<string, EvidenceField> };
type EvidenceBranch = { branch: "corner" | "typical"; sheet: string; source_rows: EvidenceRow[] };
type Evidence = { branches: EvidenceBranch[] };

const evidence = evidenceDataset as unknown as Evidence;
const STEP_START_MM = 500;
const STEP_END_MM = 3000;
const STEP_INCREMENT_MM = 10;
const GAMMA_F = 1.4;
const P4 = 0.55;
const P6 = 1.1;
const AREA_REDUCTION_TABLE: readonly (readonly [number, number])[] = [
  [0, 1], [2, 1], [3, 0.95], [4, 0.9], [5, 0.85], [7.5, 0.8], [10, 0.75], [15, 0.7], [20, 0.65],
] ;
const K_ZE_TABLE: readonly LookupRow<Record<AutoWallGirtTerrain, number>>[] = [
  [5, { А: 1.025, В: 0.665, С: 0.4 }], [10, { А: 1.0125, В: 0.66, С: 0.4075 }],
  [20, { А: 1.13125, В: 0.73125, С: 0.43125 }], [40, { А: 1.205, В: 0.805, С: 0.505 }],
  [60, { А: 1.32875, В: 0.92875, С: 0.62875 }], [80, { А: 1.32875, В: 0.92875, С: 0.8025 }],
  [100, { А: 1.5525, В: 1.063, С: 0.713 }], [150, { А: 1.692, В: 1.342, С: 0.8525 }],
  [200, { А: 1.692, В: 1.342, С: 1.042 }], [250, { А: 2.171, В: 1.342, С: 1.042 }],
  [300, { А: 2.75, В: 1.0525, С: 1.3315 }], [350, { А: 2.75, В: 2.75, С: 1.30538461538462 }],
] ;
const ZETA_TABLE: readonly LookupRow<Record<AutoWallGirtTerrain, number>>[] = [
  [5, { А: 0.751, В: 1.044, С: 1.78 }], [10, { А: 0.7565, В: 1.053, С: 1.766 }],
  [20, { А: 0.72325, В: 0.977, С: 1.614 }], [40, { А: 0.679, В: 0.8885, С: 1.437 }],
  [60, { А: 0.6295, В: 0.839, С: 1.338 }], [80, { А: 0.6295, В: 0.80425, С: 1.2685 }],
  [100, { А: 0.5937, В: 0.7595, С: 1.179 }], [150, { А: 0.5658, В: 0.7316, С: 1.0674 }],
  [200, { А: 0.5658, В: 0.6558, С: 0.9916 }], [250, { А: 0.5179, В: 0.6558, С: 0.9916 }],
  [300, { А: 0.46, В: 0.6558, С: 0.9337 }], [350, { А: 0.46, В: 0.57223076923077, С: 0.86057692307692 }],
] ;

function number(value: unknown): number {
  const result = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(result)) throw new Error(`Expected numeric evidence value, received ${String(value)}`);
  return result;
}

type LookupRow<T> = readonly [number, T];

function lookup<T extends Record<AutoWallGirtTerrain, number>>(table: readonly LookupRow<T>[], height_m: number, terrain: AutoWallGirtTerrain): number {
  const h = Math.max(5, height_m);
  let selected = table[0]!;
  for (const row of table) {
    if (row[0] <= h) selected = row;
    else break;
  }
  return selected[1][terrain];
}

function areaReduction(area_m2: number): number {
  let selected = AREA_REDUCTION_TABLE[0]!;
  for (const row of AREA_REDUCTION_TABLE) {
    if (row[0] <= area_m2) selected = row;
    else break;
  }
  return selected[1];
}

class ArithmeticParser {
  private readonly tokens: string[];
  private position = 0;

  constructor(expression: string, private readonly values: Record<string, number>) {
    this.tokens = expression.replace(/\$/g, "").match(/(?:\d+(?:\.\d+)?|[A-Za-zА-Яа-я_]+\d*|[()+\-*/])/g) ?? [];
  }

  parse(): number {
    const result = this.expression();
    if (this.position !== this.tokens.length) throw new Error("Unsupported candidate capacity expression");
    return result;
  }

  private expression(): number {
    let result = this.term();
    while (this.peek() === "+" || this.peek() === "-") {
      const operator = this.take();
      const rhs = this.term();
      result = operator === "+" ? result + rhs : result - rhs;
    }
    return result;
  }

  private term(): number {
    let result = this.factor();
    while (this.peek() === "*" || this.peek() === "/") {
      const operator = this.take();
      const rhs = this.factor();
      result = operator === "*" ? result * rhs : result / rhs;
    }
    return result;
  }

  private factor(): number {
    const token = this.take();
    if (token === "(") {
      const result = this.expression();
      if (this.take() !== ")") throw new Error("Unclosed candidate capacity expression");
      return result;
    }
    if (token === "-") return -this.factor();
    if (/^\d/.test(token)) return Number(token);
    const value = this.values[token];
    if (value === undefined) throw new Error(`Unknown candidate capacity token ${token}`);
    return value;
  }

  private peek(): string | undefined { return this.tokens[this.position]; }
  private take(): string { const token = this.tokens[this.position]; if (!token) throw new Error("Unexpected end of candidate capacity expression"); this.position += 1; return token; }
}

function candidateValue(rows: EvidenceRow[], row: EvidenceRow, field: string, cache: Map<number, number>): number {
  const source = getField(row, field);
  if (!source.formula) return number(source.cached_value);
  const cached = cache.get(row.source_row);
  if (cached !== undefined) return cached;
  const values: Record<string, number> = { P4, P6 };
  const refs = source.formula.match(/W\d+/g) ?? [];
  for (const ref of refs) {
    const refRow = Number(ref.slice(1));
    const refEvidence = rows.find((candidate) => candidate.source_row === refRow);
    if (!refEvidence) throw new Error(`Missing referenced candidate row ${refRow}`);
    values[ref] = candidateValue(rows, refEvidence, field, cache);
  }
  const result = new ArithmeticParser(source.formula, values).parse();
  cache.set(row.source_row, result);
  return result;
}

function getField(row: EvidenceRow, field: string): EvidenceField {
  const value = row.fields[field];
  if (!value) throw new Error(`Missing candidate field ${field} in row ${row.source_row}`);
  return value;
}

function validRuntime(input: AutoWallGirtRuntimeInput): string | null {
  const numeric = [input.buildingLength_m, input.wallCalculationLength_m, input.wallCalculationHeight_m, input.postStep_m, input.buildingHeight_m, input.w0_kPa, input.responsibility, input.insulationThickness_mm, input.utilizationOverride, input.minProfileHeight_mm, input.maxProfileHeight_mm, input.minThickness_mm, input.maxThickness_mm, input.minStep_mm, input.maxStep_mm];
  if (numeric.some((value) => !Number.isFinite(value))) return "Runtime contract contains a non-finite value";
  if (input.cornerHalfLength_m !== undefined && (!Number.isFinite(input.cornerHalfLength_m) || input.cornerHalfLength_m <= 0)) return "cornerHalfLength_m must be positive when supplied";
  if (input.normativeSystem !== "SP_20" || input.withoutStuds !== true) return "Only SP_20/no-stud restricted AUTO is proven";
  if (input.wallCalculationHeight_m <= 0 || input.postStep_m <= 0 || input.buildingLength_m <= 0 || input.wallCalculationLength_m <= 0) return "Runtime geometry must be positive";
  return null;
}

function zoneLength(input: AutoWallGirtRuntimeInput): number {
  // Расчет Угловая!B7 → Ветер по СП!J31: e = MIN(length, 2*height), then e/5.
  // Do not clamp height to 5 m: the source formula uses the literal height.
  const windLength = input.cornerHalfLength_m ?? (Math.min(input.buildingLength_m, 2 * input.buildingHeight_m) / 5);
  const cornerLength = windLength / input.postStep_m < 0.5 ? 0 : 2 * Math.ceil(windLength / input.postStep_m) * input.postStep_m;
  return input.zoneType === "CORNER" ? cornerLength : input.wallCalculationLength_m - cornerLength;
}

export function selectAutoWallGirt(input: AutoWallGirtRuntimeInput): AutoWallGirtSelectionResult {
  const invalidReason = validRuntime(input);
  if (invalidReason) return { status: "INVALID", selected: null, diagnostics: [invalidReason] };
  if (zoneLength(input) <= 0) return { status: "INVALID", selected: null, diagnostics: ["Typical wall-girt zone length is not positive"] };

  const branchName = input.zoneType === "CORNER" ? "corner" : "typical";
  const branch = evidence.branches.find((candidate) => candidate.branch === branchName);
  if (!branch) return { status: "INVALID", selected: null, diagnostics: [`Missing evidence branch ${branchName}`] };
  const wCache = new Map<number, number>();
  const zonePressure = input.w0_kPa * lookup(K_ZE_TABLE, input.buildingHeight_m, input.terrain) * (1 + lookup(ZETA_TABLE, input.buildingHeight_m, input.terrain)) * (input.zoneType === "CORNER" ? 2.2 : 1.4) * GAMMA_F * input.responsibility;
  let winner: AutoWallGirtSelectedCandidate | null = null;

  for (const row of branch.source_rows) {
    const r = number(getField(row, "R").cached_value);
    const profileHeight = number(getField(row, "N").cached_value);
    const thickness = number(getField(row, "M").cached_value);
    const candidateStep = (step_mm: number) => {
      const w = candidateValue(branch.source_rows, row, "W", wCache);
      const defaultUtilization = number(getField(row, "O").cached_value);
      const denominator = w * (input.utilizationOverride === 0 ? defaultUtilization : input.utilizationOverride) * (thickness === 1 ? P4 : 1);
      if (denominator <= 0) return null;
      const utilization = zonePressure * areaReduction((step_mm / 1000) * input.postStep_m) * (step_mm / 1000) * input.postStep_m ** 2 / 8 / denominator;
      const manualStepAllowed = input.manualStepMode === "none" || (input.manualSteps_mm ?? []).includes(step_mm);
      const familyAllowed = input.profileFamily === "all" || String(getField(row, "H").cached_value) === input.profileFamily;
      const sectionAllowed = input.sectionType === "all" || String(getField(row, "J").cached_value) === input.sectionType;
      const materialAllowed = input.material === "all" || String(getField(row, "P").cached_value) === input.material;
      const jw = r === 1 && familyAllowed && sectionAllowed && materialAllowed && number(getField(row, "I").cached_value) === 1 && number(getField(row, "K").cached_value) === 1 && thickness >= input.minThickness_mm && thickness <= input.maxThickness_mm && profileHeight >= input.minProfileHeight_mm && profileHeight <= input.maxProfileHeight_mm && number(getField(row, "Q").cached_value) === 1 && number(getField(row, "U").cached_value) === input.insulationThickness_mm && utilization <= 1 && manualStepAllowed && number(getField(row, "S").cached_value) === 1;
      if (!jw) return null;
      const step_m = step_mm / 1000;
      const rowCount = Math.ceil(input.wallCalculationHeight_m / step_m) - 1;
      const supportSpan_m = rowCount * input.postStep_m;
      const sectionMass = number(getField(row, "Z").cached_value);
      const profileMass = number(getField(row, "TO").cached_value);
      const bracketMass = number(getField(row, "AA").cached_value);
      const studMass = number(getField(row, "T").cached_value);
      const objectiveTerms: AutoWallGirtObjectiveTerms = { rowCount, supportSpan_m, sectionMass_kg: supportSpan_m * sectionMass, profileMass_kg: profileMass * input.postStep_m, bracketMass_kg: rowCount * bracketMass, sourceOrderTerm: number(getField(row, "G").cached_value) / 1_000_000, stepTieBreakTerm: -step_mm / 1_000_000_000, studMass_kg: studMass };
      const objective = objectiveTerms.sectionMass_kg + objectiveTerms.profileMass_kg + objectiveTerms.bracketMass_kg + objectiveTerms.sourceOrderTerm + objectiveTerms.stepTieBreakTerm + objectiveTerms.profileMass_kg + objectiveTerms.studMass_kg;
      const sectionType = String(getField(row, "J").cached_value) as ManualWallGirtSectionType;
      const candidate: AutoWallGirtSelectedCandidate = {
        sourceRow: row.source_row,
        sourceSheet: input.zoneType === "CORNER" ? "Расчет Угловая" : "Расчет Рядовая",
        branch: "NO_STUD",
        zoneType: input.zoneType,
        designation: String(getField(row, "V").cached_value),
        profile: String(getField(row, "V").cached_value),
        profileFamily: String(getField(row, "H").cached_value),
        sectionType,
        material: String(getField(row, "P").cached_value),
        thickness_mm: thickness,
        profileHeight_mm: profileHeight,
        step_mm,
        profileMass_kg_m: profileMass,
        sectionMass_kg_m: sectionMass,
        bracketUnitMass_kg: bracketMass,
        utilization,
        capacityValue: zonePressure * areaReduction((step_mm / 1000) * input.postStep_m) * (step_mm / 1000) * input.postStep_m ** 2 / 8,
        jw: 1,
        objective,
        objectiveTerms,
        provenance: { status: "LEGACY_PROVEN", sourceWorkbook: "Калькулятор ограждайки v1.5.xlsx", sourceSheet: input.zoneType === "CORNER" ? "Расчет Угловая" : "Расчет Рядовая", sourceCell: `${input.zoneType === "CORNER" ? "Расчет Угловая" : "Расчет Рядовая"}!${row.source_row}`, note: "Exact restricted no-stud AUTO selector reproduced from extracted source dataset." },
      };
      if (!winner || candidate.objective < winner.objective) winner = candidate;
      return candidate;
    };
    for (let step_mm = STEP_START_MM; step_mm <= STEP_END_MM; step_mm += STEP_INCREMENT_MM) {
      if (step_mm < input.minStep_mm || step_mm > input.maxStep_mm) continue;
      candidateStep(step_mm);
    }
  }
  return winner ? { status: "LEGACY_PROVEN", selected: winner, diagnostics: [] } : { status: "UNSUPPORTED", selected: null, diagnostics: ["No candidate satisfies the restricted legacy JW gates"] };
}

export function toManualWallGirtReplayInput(input: AutoWallGirtRuntimeInput, selected: AutoWallGirtSelectedCandidate): ManualWallGirtReplayInput {
  const selectedSection = selected.sectionType;
  if (!["]", "[]", "][", "[-]"].includes(selectedSection)) throw new Error(`Unsupported selected section type ${selectedSection}`);
  return { wall: input.wall, zoneType: input.zoneType, wallHeight_m: input.wallCalculationHeight_m, zoneLength_m: zoneLength(input), girtStep_m: selected.step_mm / 1000, structuralPostStep_m: input.postStep_m, sectionType: selectedSection, profile: { profileId: selected.profile, sectionMass_kg_m: selected.sectionMass_kg_m, provenance: [selected.provenance] }, openingCount: 0, plusStands: false, selectionMode: "MANUAL" };
}

export function replaySelectedAutoWallGirt(input: AutoWallGirtRuntimeInput): ReturnType<typeof replayManualWallGirt> {
  const selection = selectAutoWallGirt(input);
  if (selection.status !== "LEGACY_PROVEN" || !selection.selected) return { status: selection.status === "INVALID" ? "INVALID" : "UNSUPPORTED", zone: null, diagnostics: [] };
  return replayManualWallGirt(toManualWallGirtReplayInput(input, selection.selected));
}
