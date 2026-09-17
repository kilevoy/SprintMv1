import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve(process.argv[2]);
const payload = JSON.parse(await fs.readFile(path.join(outputDir, "pilot_records.json"), "utf8"));
const summary = JSON.parse(await fs.readFile(path.join(outputDir, "summary.json"), "utf8"));

const workbook = Workbook.create();
const names = ["README", "Projects", "Inputs", "ArchiveResults", "ReplayResults", "Comparison", "Mismatches", "Errors", "Summary"];
const sheets = Object.fromEntries(names.map((name) => [name, workbook.worksheets.add(name)]));
for (const sheet of Object.values(sheets)) sheet.showGridLines = false;

const font = "Arial";
function colName(index) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}
function writeTable(sheet, title, rows, columns) {
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A1").format = { font: { name: font, size: 14, bold: true, color: "#1F2937" } };
  const matrix = [columns, ...rows.map((row) => columns.map((column) => row[column] ?? null))];
  if (matrix.length > 0 && columns.length > 0) {
    const endCol = colName(columns.length - 1);
    sheet.getRange(`A3:${endCol}${matrix.length + 2}`).values = matrix;
    sheet.getRange(`A3:${endCol}3`).format = { fill: "#1F4E78", font: { name: font, size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: false };
    sheet.getRange(`A4:${endCol}${matrix.length + 2}`).format = { font: { name: font, size: 10, color: "#111827" }, verticalAlignment: "center", wrapText: false };
    sheet.getRange(`A3:${endCol}${matrix.length + 2}`).format.borders = { preset: "outside", style: "thin", color: "#CBD5E1" };
    sheet.getRange(`A3:${endCol}${matrix.length + 2}`).format.autofitColumns();
    sheet.getRange(`A3:${endCol}${matrix.length + 2}`).format.autofitRows();
    sheet.freezePanes.freezeRows(3);
    const table = sheet.tables.add(`A3:${endCol}${matrix.length + 2}`, true, `${sheet.name.replace(/[^A-Za-z]/g, "")}Table`);
    table.showFilterButton = true;
  }
}

const projectRows = payload.map((record) => {
  const inputs = record.inputs ?? {};
  const geometry = record.geometry ?? (inputs.span_m != null && inputs.length_m != null && inputs.height_m != null ? `${inputs.span_m}x${inputs.length_m}x${inputs.height_m}` : null);
  const row = { project_id: record.project_id, project_name: path.basename(record.source_file ?? ""), source_folder: record.source_folder, source_folder_display: record.source_folder_display, source_file: record.source_file, source_file_sha256: record.source_file_sha256, source_modified_date: record.source_modified_date, reference_class: record.reference_class, archive_title: record.archive_title, geometry, system: record.system, country: record.country, normative_system: record.normative_system, sprint_type: record.sprint_type, comparable: record.comparable, not_comparable_reason: record.not_comparable_reason, status: record.status, archive_d69_kg_m2: record.archive?.d69_kg_m2 ?? null, replay_d69_kg_m2: record.replay?.d69_kg_m2 ?? null, archive_beam_profile: record.archive?.beam_profile ?? null, replay_beam_profile: record.replay?.beam_profile ?? null, archive_column_profile: record.archive?.column_profile ?? null, replay_column_profile: record.replay?.column_profile ?? null, archive_purlin_profile: record.archive?.purlin_profile ?? null, replay_purlin_profile: record.replay?.purlin_profile ?? null, quality_flags: (record.quality_flags ?? []).join(";") };
  Object.assign(row, record.inputs ?? {});
  return row;
});
const keys = (rows) => Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
writeTable(sheets.Projects, "Sprint pilot projects", projectRows, keys(projectRows));

function prefixedRows(prefix) {
  return payload.map((record) => ({ project_id: record.project_id, status: record.status, ...(record[prefix] ?? {}) }));
}
writeTable(sheets.ArchiveResults, "Archive results", prefixedRows("archive"), keys(prefixedRows("archive")));
writeTable(sheets.ReplayResults, "Template replay results", prefixedRows("replay"), keys(prefixedRows("replay")));

const inputRows = payload.map((record) => ({ project_id: record.project_id, ...(record.inputs ?? {}) }));
writeTable(sheets.Inputs, "Normalized inputs", inputRows, keys(inputRows));
const comparisonRows = payload.flatMap((record) => record.comparison ?? []);
writeTable(sheets.Comparison, "Archive vs template replay", comparisonRows, keys(comparisonRows));
writeTable(sheets.Mismatches, "Mismatches only", comparisonRows.filter((row) => row.match === false), keys(comparisonRows));
const errorRows = payload.flatMap((record) => [
  ...(record.parse_error ? [{ project_id: record.project_id, error: record.parse_error }] : []),
  ...(record.replay_error ? [{ project_id: record.project_id, error: record.replay_error }] : []),
  ...((record.replay_errors ?? []).map((error) => ({ project_id: record.project_id, ...error }))),
]);
writeTable(sheets.Errors, "Errors", errorRows, keys(errorRows.length ? errorRows : [{ project_id: null, error: null }]));

sheets.README.getRange("A3:B14").values = [
  ["Purpose", "Archive plus template replay pilot for Sprint calculations"],
  ["Pilot scope", `${summary.total_scanned} unique source-selection workbooks`],
  ["Replay engine", "Microsoft Excel COM CalculateFullRebuild"],
  ["Source policy", "No source XLSX or master template is modified"],
  ["Profile policy", "Raw profile names retained; conservative normalized key"],
  ["Missing data", "NULL / explicit status, never guessed"],
  ["Known case", "22326 is SOURCE_SUSPICIOUS / COMPATIBILITY_CASE"],
  ["D69 unit", "kg/m²"],
  ["Generated", new Date()],
  ["Output report", "report.html in the same output directory"],
  ["Known references", summary.known_reference_projects],
  ["New unseen", summary.new_unseen_projects],
];
sheets.README.getRange("A3:A14").format = { fill: "#E2E8F0", font: { name: font, size: 10, bold: true } };
sheets.README.getRange("B3:B14").format = { font: { name: font, size: 10 }, wrapText: false };
sheets.README.getRange("A3:B14").format.borders = { preset: "outside", style: "thin", color: "#CBD5E1" };
sheets.README.getRange("A3:B14").format.autofitColumns();

sheets.Summary.getRange("A1:B1").values = [["Sprint pilot summary", null]];
sheets.Summary.getRange("A1").format = { font: { name: font, size: 14, bold: true, color: "#1F2937" } };
sheets.Summary.getRange("A3:B13").values = [
  ["Metric", "Value"],
  ["Total pilot projects", summary.total_scanned],
  ["Known reference projects", summary.known_reference_projects],
  ["New unseen projects", summary.new_unseen_projects],
  ["Parsed", summary.parsed],
  ["Replay completed", summary.replay_completed_count],
  ["Comparable", summary.comparable],
  ["FULL_MATCH", summary.full_match],
  ["MISMATCH", summary.mismatch],
  ["NOT_COMPARABLE", summary.not_comparable],
  ["ERROR", summary.error],
];
sheets.Summary.getRange("A3:B3").format = { fill: "#1F4E78", font: { name: font, size: 10, bold: true, color: "#FFFFFF" } };
sheets.Summary.getRange("A4:B13").format = { font: { name: font, size: 10 }, verticalAlignment: "center" };
sheets.Summary.getRange("A3:B13").format.borders = { preset: "outside", style: "thin", color: "#CBD5E1" };
sheets.Summary.getRange("D3:E3").values = [["Mismatch cluster", "Count"]];
const clusterEndRow = 3 + Object.keys(summary.mismatch_clusters ?? {}).length;
if (clusterEndRow >= 4) sheets.Summary.getRange(`D4:E${clusterEndRow}`).values = Object.entries(summary.mismatch_clusters ?? {});
sheets.Summary.getRange("D3:E3").format = { fill: "#1F4E78", font: { name: font, size: 10, bold: true, color: "#FFFFFF" } };
sheets.Summary.getRange("A3:E20").format.autofitColumns();

workbook.recalculate();
const preview = await workbook.render({ sheetName: "Summary", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile(path.join(outputDir, "summary.png"), new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(path.join(outputDir, "SPRINT_VALIDATION_DATABASE.xlsx"));
