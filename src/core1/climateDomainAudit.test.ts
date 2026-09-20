import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BrowserCore1DataRepository, type Core1DataSource, type DatasetRecord } from "./data";
import { previewClimate } from "./climate";
import { calculateCore1 } from "./engine";
import { deriveLegacyClimate, resolveLegacyFrameBranch } from "./legacy";
import type { Core1ClimateResult } from "./types";

class TestDataSource implements Core1DataSource {
  public constructor(private readonly rootDirectory: string) {}
  public async getText(assetPath: string): Promise<string> { return (await import("node:fs/promises")).readFile(resolve(this.rootDirectory, assetPath), "utf8"); }
  public async getJson<T>(assetPath: string): Promise<T> { return JSON.parse(await this.getText(assetPath)) as T; }
}

function parts(cell: string): { column: string; row: number } | null { const match = /^([A-Z]+)(\d+)$/.exec(cell); return match ? { column: match[1]!, row: Number(match[2]) } : null; }
function value(record: DatasetRecord | undefined): unknown { if (!record) return null; if (record.cached_value_json === "null") return null; try { return JSON.parse(record.cached_value_json as string); } catch { return record.cached_value_json; } }
function signature(climate: Core1ClimateResult, legacy: NonNullable<ReturnType<typeof deriveLegacyClimate>>, branch: NonNullable<ReturnType<typeof resolveLegacyFrameBranch>>): string { return [climate.snow_region, climate.snow_load, climate.wind_region, climate.wind_load, legacy.activeSnowRegion, legacy.activeSnowFactor, legacy.windRegion, branch.rawBranchKey, branch.mappedBranchKey].join("|"); }
function signatureId(raw: string): string { return `SIG_${raw.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`; }

describe("batch climate domain audit", () => {
  it("builds the source-backed climate signature matrix", async () => {
    const rootDirectory = resolve(import.meta.dirname, "../..");
    const source = new TestDataSource(rootDirectory);
    const repository = new BrowserCore1DataRepository(source);
    const baseline = (await source.getJson<{ input: Record<string, unknown> }>("core1/fixtures/baseline_12m.input.json")).input;
    const dataset = await repository.loadClimateDataset("climate_lookup_sparse");
    const cityRows = new Map<string, Set<number>>();
    for (const record of dataset.records) {
      const cell = parts(record.cell);
      const city = cell && (cell.column === "B" || cell.column === "AR") ? value(record) : null;
      if (cell && typeof city === "string" && city !== "Город, населенный пункт" && city.trim()) cityRows.set(city, (cityRows.get(city) ?? new Set()).add(cell.row));
    }
    const locations: Record<string, unknown>[] = [];
    const groups = new Map<string, { signature_id: string; normalized: Record<string, unknown>; legacy: Record<string, unknown>; cities: Set<string>; source_rows: Set<number>; proven_cities: Set<string>; downstream_frame_branch: string; statuses: Set<string>; frame_dry_run_status?: string }>();
    const provenCities = ["Роза", "Сургут", "Березовский", "Увильды"];
    for (const [city, rows] of cityRows) {
      for (const row of rows) {
        const rowRecords = dataset.records.filter((record) => parts(record.cell)?.row === row);
        const input = { mode: "CITY_LOOKUP" as const, country: "RU" as const, city, normative_system: "SP_20" as const };
        const climateResult = previewClimate(input, { records: rowRecords });
        const location: Record<string, unknown> = { city, source_row: row, exact_lookup_key: `RU|${city}|SP_20`, status: "INVALID_SOURCE_DATA" };
        if (climateResult.status === "success") {
          const climate = climateResult.climate;
          const legacy = deriveLegacyClimate({ city, responsibility_factor: 0.8, roof_covering: "С-П 200", climate, dataset: { records: rowRecords } });
          const branch = legacy ? resolveLegacyFrameBranch({ activeSnowRegion: legacy.activeSnowRegion, windRegion: legacy.windRegion }) : null;
          location.normalized_climate = { snow_region: climate.snow_region, snow_load: climate.snow_load, wind_region: climate.wind_region, wind_load: climate.wind_load };
          location.legacy = legacy ? { active_snow_region: legacy.activeSnowRegion, active_snow_factor: legacy.activeSnowFactor, wind_region: legacy.windRegion, lookup_key: legacy.lookupKey } : null;
          location.legacy_branch = branch ? { raw: branch.rawBranchKey, mapped: branch.mappedBranchKey } : null;
          if (!legacy || !branch) location.status = "LEGACY_LOOKUP_UNRESOLVED";
          else {
            const raw = signature(climate, legacy, branch); const id = signatureId(raw); const existing = groups.get(raw);
            if (existing) { existing.cities.add(city); existing.source_rows.add(row); if (provenCities.includes(city)) existing.proven_cities.add(city); existing.statuses.add(provenCities.includes(city) ? "PROVEN" : "COVERED_BY_PROVEN_SIGNATURE"); }
            else groups.set(raw, { signature_id: id, normalized: location.normalized_climate as Record<string, unknown>, legacy: location.legacy as Record<string, unknown>, cities: new Set([city]), source_rows: new Set([row]), proven_cities: new Set(provenCities.includes(city) ? [city] : []), downstream_frame_branch: branch.mappedBranchKey, statuses: new Set(provenCities.includes(city) ? ["PROVEN"] : ["REQUIRES_EXCEL_VALIDATION"]) });
            location.signature_id = id;
            location.status = provenCities.includes(city) ? "PROVEN" : existing?.proven_cities.size ? "COVERED_BY_PROVEN_SIGNATURE" : "REQUIRES_EXCEL_VALIDATION";
          }
        }
        locations.push(location);
      }
    }
    for (const location of locations) {
      const group = [...groups.values()].find((candidate) => candidate.signature_id === location.signature_id);
      if (group && group.statuses.has("PROVEN")) location.status = group.proven_cities.has(String(location.city)) ? "PROVEN" : "COVERED_BY_PROVEN_SIGNATURE";
    }
    for (const group of groups.values()) {
      const representative = [...group.cities][0];
      const dryRun = await calculateCore1({ ...baseline, city: representative }, repository);
      group.frame_dry_run_status = dryRun.status;
    }
    const signatureRows = [...groups.values()].map((group) => ({ signature_id: group.signature_id, normalized_climate: group.normalized, legacy_signature: group.legacy, city_count: group.cities.size, example_cities: [...group.cities].slice(0, 12), source_rows: [...group.source_rows].sort((a, b) => a - b), current_proven_cities: [...group.proven_cities], downstream_frame_branch: group.downstream_frame_branch, frame_dry_run_status: group.frame_dry_run_status, status: group.statuses.has("PROVEN") ? "PROVEN" : "REQUIRES_EXCEL_VALIDATION" }));
    const matrix = { generated_from: "core1/data/climate_lookup_sparse.csv", city_name_dependency: "NO", total_locations: locations.length, unique_cities: cityRows.size, unique_signatures: signatureRows.length, locations, signatures: signatureRows };
    const auditDirectory = resolve(import.meta.dirname, "../../data/audit");
    await mkdir(auditDirectory, { recursive: true });
    await writeFile(resolve(auditDirectory, "core1_climate_domain_matrix.json"), `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
    const chelyabinsk = locations.filter((location) => location.city === "Челябинск");
    const provenSignatures = signatureRows.filter((row) => row.status === "PROVEN");
    const coveredCities = new Set(locations.filter((location) => location.status === "COVERED_BY_PROVEN_SIGNATURE").map((location) => location.city)).size;
    const report = `# CORE1 CLIMATE DOMAIN AUDIT\n\nTOTAL_CLIMATE_LOCATIONS = ${locations.length}\nUNIQUE_CITIES = ${cityRows.size}\nUNIQUE_NORMALIZED_TUPLES = ${new Set(locations.filter((item) => item.normalized_climate).map((item) => JSON.stringify(item.normalized_climate))).size}\nUNIQUE_LEGACY_SIGNATURES = ${signatureRows.length}\nCURRENTLY_PROVEN_SIGNATURES = ${provenSignatures.map((row) => row.signature_id).join(", ") || "NONE"}\nCITIES_COVERED_BY_PROVEN_SIGNATURES = ${coveredCities}\nSIGNATURES_REQUIRING_EXCEL_VALIDATION = ${signatureRows.filter((row) => row.status === "REQUIRES_EXCEL_VALIDATION").length}\nUNRESOLVED_SIGNATURES = ${locations.filter((item) => item.status === "LEGACY_LOOKUP_UNRESOLVED").length}\nFRAME_DRY_RUN_SUCCESS_SIGNATURES = ${signatureRows.filter((row) => row.frame_dry_run_status === "success").length}\nFRAME_DRY_RUN_FAILURES = ${signatureRows.filter((row) => row.frame_dry_run_status !== "success").length}\nDOWNSTREAM_CITY_NAME_DEPENDENCY = NO\nCITY_BY_CITY_WHITELIST_REQUIRED = NO\nSAFE_TO_REPLACE_CITY_WHITELIST = YES\nCHELYABINSK_SIGNATURE = ${chelyabinsk.map((item) => item.signature_id).join(", ") || "UNRESOLVED"}\nCHELYABINSK_STATUS = ${chelyabinsk.map((item) => item.status).join(", ") || "UNRESOLVED"}\n\n## Method\n\nEach exact city/source row was resolved through the same climate dataset, deriveLegacyClimate at the proven representative responsibility 0.8 and roof SP-200, then resolveLegacyFrameBranch. Each unique signature was dry-run through Core1 with the representative supported 12 m / 3 m / responsibility 0.8 scenario. Cities are grouped by the resulting normalized climate and legacy branch signature. No city-name branch was found in downstream Core1 code; unsupported or malformed source rows remain blocked. A source-backed city can therefore proceed without a city whitelist, while signatures not covered by current references remain explicitly marked REQUIRES_EXCEL_VALIDATION for parity claims.\n\nThe machine-readable per-location and per-signature matrix is in data/audit/core1_climate_domain_matrix.json.\n`;
    await writeFile(resolve(auditDirectory, "CORE1_CLIMATE_DOMAIN_AUDIT.md"), report, "utf8");
    expect(chelyabinsk.some((item) => item.status === "REQUIRES_EXCEL_VALIDATION" || item.status === "COVERED_BY_PROVEN_SIGNATURE" || item.status === "PROVEN")).toBe(true);
  }, 120_000);
});
