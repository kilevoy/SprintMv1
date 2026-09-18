from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

import openpyxl


REQUIRED_SOURCE_SHEETS = {"вывод", "подбор", "снегветер"}
SPAN_SHEETS = {"9м", "12м", "15м", "18м", "21м", "24м"}
INPUT_CELLS = {
    "city": "D2",
    "span_m": "D4",
    "length_m": "D5",
    "height_m": "D6",
    "responsibility_level": "D7",
    "roof_covering": "D20",
    "deck_grade": "D21",
    "snow_retention": "D26",
    "legacy_enclosure_purlin_flag": "D27",
    "special_bracing_flag": "D29",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _norm(value: Any) -> str:
    if value is None:
        return ""
    # NFC keeps the Numero sign in labels such as ``ТЗ №``. NFKC would
    # convert it to ``No`` and make the result-layout label harder to match.
    text = unicodedata.normalize("NFC", str(value)).strip().lower()
    return re.sub(r"\s+", " ", text)


def _clean(value: Any):
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def _numeric(value: Any):
    value = _clean(value)
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return value
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return value


def _same_value(left: Any, right: Any) -> bool:
    if left is None or right is None:
        return False
    left_num, right_num = _numeric(left), _numeric(right)
    if isinstance(left_num, (int, float)) and isinstance(right_num, (int, float)):
        return abs(float(left_num) - float(right_num)) <= 1e-9
    return _norm(left) == _norm(right)


def _project_id_from_path(path: Path) -> str | None:
    matches = re.findall(r"(?<!\d)(\d{5})(?!\d)", str(path))
    return matches[-1] if matches else None


def _source_fingerprint(path: Path) -> dict:
    try:
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        sheetnames = list(wb.sheetnames)
        wb.close()
    except Exception as exc:  # pragma: no cover - diagnostic record
        return {"is_source_selection": False, "error": str(exc), "sheetnames": []}
    normalized = {_norm(name) for name in sheetnames}
    required_present = sorted(REQUIRED_SOURCE_SHEETS & normalized)
    span_present = sorted(SPAN_SHEETS & normalized)
    return {
        "is_source_selection": REQUIRED_SOURCE_SHEETS <= normalized and len(span_present) >= 4,
        "sheet_count": len(sheetnames),
        "required_sheets_present": required_present,
        "span_sheets_present": span_present,
        "sheetnames": sheetnames,
    }


def _read_source(path: Path) -> dict:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        sheet = wb["вывод"]
        inputs = {field: _clean(sheet[address].value) for field, address in INPUT_CELLS.items()}
        inputs["span_m"] = _numeric(inputs["span_m"])
        inputs["length_m"] = _numeric(inputs["length_m"])
        inputs["height_m"] = _numeric(inputs["height_m"])
        return {"inputs": inputs, "sheetnames": list(wb.sheetnames)}
    finally:
        wb.close()


def _first_right_value(row: tuple[Any, ...], index: int):
    for value in row[index + 1 :]:
        value = _clean(value)
        if value is not None:
            return value
    return None


def _find_result_value(ws, patterns: tuple[str, ...]):
    for row in ws.iter_rows():
        values = tuple(cell.value for cell in row)
        for index, value in enumerate(values):
            text = _norm(value)
            if text and any(pattern in text for pattern in patterns):
                candidate = _first_right_value(values, index)
                if candidate is not None:
                    return candidate
    return None


def _read_result(path: Path, target_geometry: dict | None = None) -> dict:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        candidates = []
        for ws in wb.worksheets:
            city = _find_result_value(ws, ("место стр", "место строит"))
            span = _find_result_value(ws, ("пролет, м", "пролет м"))
            length = _find_result_value(ws, ("длина, м", "длина м"))
            height = _find_result_value(ws, ("высота, м", "высота м"))
            tz_number = _find_result_value(ws, ("тз №",))
            if any(value is not None for value in (city, span, length, height, tz_number)):
                tz_digits = re.search(r"\d{4,}", str(tz_number)) if tz_number is not None else None
                candidates.append({
                    "sheet_name": ws.title,
                    "city": _clean(city),
                    "span_m": _numeric(span),
                    "length_m": _numeric(length),
                    "height_m": _numeric(height),
                    "tz_number": tz_digits.group(0) if tz_digits else _clean(tz_number),
                    "frame_step_m": _numeric(_find_result_value(ws, ("шаг рам",))),
                    "frame_count": _numeric(_find_result_value(ws, ("кол.-во рам", "кол-во рам"))),
                })
        if candidates:
            def score(candidate):
                score_value = 0
                if target_geometry:
                    for field in ("span_m", "length_m", "height_m"):
                        target = target_geometry.get(field)
                        if target is not None and _same_value(target, candidate.get(field)):
                            score_value += 10
                    if target_geometry.get("city") and _same_value(target_geometry["city"], candidate.get("city")):
                        score_value += 10
                    target_project_id = target_geometry.get("project_id")
                    if target_project_id and str(candidate.get("tz_number")) == str(target_project_id):
                        score_value += 15
                return score_value
            return max(candidates, key=score)
        return {
            "sheet_name": None,
            "city": None,
            "span_m": None,
            "length_m": None,
            "height_m": None,
            "tz_number": None,
            "frame_step_m": None,
            "frame_count": None,
        }
    finally:
        wb.close()


def _identity_check(project_id: str, source_inputs: dict | None, result_identity: dict) -> dict:
    if not source_inputs:
        return {"status": "UNVERIFIED", "compared_fields": [], "mismatches": []}
    comparisons = {
        "project_id_vs_result_tz_number": (project_id, result_identity.get("tz_number")),
        "city": (source_inputs.get("city"), result_identity.get("city")),
        "span_m": (source_inputs.get("span_m"), result_identity.get("span_m")),
        "length_m": (source_inputs.get("length_m"), result_identity.get("length_m")),
        "height_m": (source_inputs.get("height_m"), result_identity.get("height_m")),
    }
    compared = []
    mismatches = []
    missing = []
    for field, (source_value, result_value) in comparisons.items():
        if source_value is None or result_value is None:
            missing.append(field)
            continue
        compared.append(field)
        if not _same_value(source_value, result_value):
            mismatches.append({"field": field, "source": source_value, "result": result_value})
    if mismatches:
        status = "MISMATCH"
    elif missing:
        status = "UNVERIFIED"
    else:
        status = "MATCH"
    return {"status": status, "compared_fields": compared, "missing_fields": missing, "mismatches": mismatches}


def _candidate_files(root: Path, suffix: str = ".xlsx") -> list[Path]:
    if not root.exists():
        return []
    return [path for path in root.rglob(f"*{suffix}") if not path.name.startswith("~$")]


def _result_candidates(project_id: str, roots: list[Path]) -> list[Path]:
    found = []
    pattern = re.compile(rf"^{re.escape(project_id)}(?: \(\d+\))?\.xlsx$", re.IGNORECASE)
    for root in roots:
        for path in _candidate_files(root):
            if pattern.match(path.name):
                found.append(path)
    unique = {}
    for path in found:
        try:
            unique.setdefault(sha256(path), path)
        except OSError:
            continue
    return list(unique.values())


def _source_candidates(project_id: str, roots: list[Path]) -> list[Path]:
    found = []
    for root in roots:
        for path in _candidate_files(root):
            if _project_id_from_path(path) != project_id:
                continue
            fingerprint = _source_fingerprint(path)
            if fingerprint.get("is_source_selection"):
                found.append(path)
    unique = {}
    for path in found:
        try:
            unique.setdefault(sha256(path), path)
        except OSError:
            continue
    return list(unique.values())


def _existing_statuses(pilot_dir: Path) -> dict[str, dict]:
    path = pilot_dir / "pilot_records.json"
    if not path.exists():
        return {}
    try:
        records = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return {str(record.get("project_id")): record for record in records if record.get("project_id")}


def _pair_status(source_status: str, identity_status: str, existing: dict | None) -> str:
    if source_status == "NOT_FOUND":
        return "RESULT_WORKBOOK_ONLY"
    if identity_status == "MISMATCH":
        return "SOURCE_RESULT_IDENTITY_MISMATCH"
    if identity_status == "UNVERIFIED":
        return "SOURCE_SELECTION_AMBIGUOUS"
    if existing and existing.get("replay") and not existing.get("replay_error"):
        return "REPLAY_COMPLETED"
    return "REPLAY_READY"


def build_pairs(repo_root: Path, reference_root: Path, pilot_dir: Path, output_dir: Path) -> dict:
    project_ids = sorted(_existing_statuses(pilot_dir).keys(), key=lambda value: int(value))
    if not project_ids:
        raise ValueError(f"No pilot project records found in {pilot_dir}")
    existing = _existing_statuses(pilot_dir)
    replay_evidence = _existing_statuses(output_dir / "replay_22285")
    result_roots = [reference_root, pilot_dir / "downloads", repo_root, Path(r"C:\Users\Deako\Downloads")]
    source_roots = [reference_root, output_dir / "downloads"]
    manual = {
        "22285": {
            "source_workbook": "Таблица по подбору сечений теплых ангаров пролетами 9м, 12м, 15м, 18м, 21м, 24м версия 1,5.xlsx",
            "source_folder_display": "Drive / Сурова / Август 2026 / 22285 (18х48х6, спринт сп)",
            "match_method_override": "same folder / project id",
            "search_evidence": "Drive global search: exact master template name; project folder inspected",
        }
    }
    pairs = []
    for project_id in project_ids:
        existing_record = existing.get(project_id)
        replay_record = replay_evidence.get(project_id) or existing_record
        result_paths = _result_candidates(project_id, result_roots)
        result_path = result_paths[0] if result_paths else None
        source_paths = _source_candidates(project_id, source_roots)
        source_path = None
        if result_path:
            same_parent = [candidate for candidate in source_paths if candidate.parent == result_path.parent]
            source_path = (same_parent or source_paths or [None])[0]
        else:
            source_path = source_paths[0] if source_paths else None
        source_data = _read_source(source_path) if source_path else None
        target_geometry = {"project_id": project_id}
        if source_data:
            target_geometry.update(source_data["inputs"])
        elif existing_record:
            geometry_match = re.match(r"\s*([0-9.]+)x([0-9.]+)x([0-9.]+)", str(existing_record.get("geometry") or ""))
            if geometry_match:
                target_geometry.update({"span_m": float(geometry_match.group(1)), "length_m": float(geometry_match.group(2)), "height_m": float(geometry_match.group(3))})
        result_identity = _read_result(result_path, target_geometry) if result_path else {}
        source_status = "FOUND" if source_path else "NOT_FOUND"
        identity = _identity_check(project_id, source_data["inputs"] if source_data else None, result_identity)
        metadata = manual.get(project_id, {})
        source_fingerprint = _source_fingerprint(source_path) if source_path else {}
        pair = {
            "project_id": project_id,
            "result_workbook": result_path.name if result_path else None,
            "result_path": str(result_path) if result_path else None,
            "result_sha256": sha256(result_path) if result_path else None,
            "source_selection_workbook": metadata.get("source_workbook") or (source_path.name if source_path else None),
            "source_selection_path": str(source_path) if source_path else None,
            "source_sha256": sha256(source_path) if source_path else None,
            "source_status": source_status,
            "match_method": metadata.get("match_method_override") or ("same folder / project id" if source_path and result_path and source_path.parent == result_path.parent else "project id + source fingerprint" if source_path else "folder hierarchy + global template-name search"),
            "source_folder_display": metadata.get("source_folder_display") or (str(source_path.parent) if source_path else None),
            "search_evidence": metadata.get("search_evidence") or "local reference scan + project-folder inspection + global template-name search",
            "source_fingerprint": source_fingerprint,
            "source_inputs": source_data["inputs"] if source_data else {},
            "result_identity": result_identity,
            "identity_status": identity["status"],
            "identity_compared_fields": identity["compared_fields"],
            "identity_missing_fields": identity.get("missing_fields", []),
            "identity_mismatches": identity["mismatches"],
            "replay_status": "NOT_READY" if source_status == "NOT_FOUND" else "FULL_MATCH" if replay_record and replay_record.get("status") == "FULL_MATCH" else "NOT_COMPARABLE" if replay_record and replay_record.get("status") == "NOT_COMPARABLE" else "BLOCKED_IDENTITY_MISMATCH" if identity["status"] == "MISMATCH" else "NOT_READY",
            "archive_result_status": "RESULT_ONLY" if source_status == "NOT_FOUND" else "MATCH" if replay_record and replay_record.get("status") == "FULL_MATCH" else "COMPATIBILITY_CASE" if replay_record and replay_record.get("status") == "NOT_COMPARABLE" else "IDENTITY_MISMATCH" if identity["status"] == "MISMATCH" else "RESULT_ONLY",
            "pair_status": _pair_status(source_status, identity["status"], replay_record),
        }
        pairs.append(pair)
    summary = {
        "total_projects": len(pairs),
        "source_selection_found": sum(pair["source_status"] == "FOUND" for pair in pairs),
        "source_selection_not_found": sum(pair["source_status"] == "NOT_FOUND" for pair in pairs),
        "identity_match": sum(pair["identity_status"] == "MATCH" for pair in pairs),
        "identity_mismatch": sum(pair["identity_status"] == "MISMATCH" for pair in pairs),
        "identity_unverified": sum(pair["identity_status"] == "UNVERIFIED" for pair in pairs),
        "replay_full_match": sum(pair["replay_status"] == "FULL_MATCH" for pair in pairs),
        "pair_status_counts": {},
        "search_scope": [
            "local E:/SprintMv1_reference recursive scan using workbook fingerprint",
            "each pilot project folder inspected in Google Drive",
            "global Drive search for exact master template name",
        ],
    }
    for pair in pairs:
        summary["pair_status_counts"][pair["pair_status"]] = summary["pair_status_counts"].get(pair["pair_status"], 0) + 1
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "source_result_pairs.json").write_text(json.dumps(pairs, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    (output_dir / "pair_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    columns = sorted({key for pair in pairs for key, value in pair.items() if not isinstance(value, (dict, list))})
    with (output_dir / "source_result_pairs.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(pairs)
    rows_html = []
    for pair in pairs:
        rows_html.append(
            "<tr>"
            + "".join(f"<td>{html.escape(str(pair.get(column) if pair.get(column) is not None else 'NULL'))}</td>" for column in ("project_id", "result_workbook", "source_selection_workbook", "source_status", "match_method", "identity_status", "replay_status", "archive_result_status", "pair_status"))
            + "</tr>"
        )
    report = """<!doctype html><meta charset='utf-8'><title>Source result pair search</title>
<h1>Source ↔ Result pair search</h1>
<p>Search policy: local fingerprint scan, project-folder inspection, then global exact-template-name search. Result workbooks are retained; no inputs are inferred from result-only layouts.</p>
<pre>%s</pre>
<table border='1'><tr><th>Project</th><th>Result workbook</th><th>Source-selection workbook</th><th>Source status</th><th>Match method</th><th>Identity</th><th>Replay</th><th>Archive result</th><th>Pair status</th></tr>%s</table>
""" % (html.escape(json.dumps(summary, ensure_ascii=False, indent=2)), "".join(rows_html))
    (output_dir / "source_result_pair_report.html").write_text(report, encoding="utf-8")
    return {"pairs": pairs, "summary": summary}


def main():
    parser = argparse.ArgumentParser(description="Find and validate SOURCE-SELECTION <-> RESULT workbook pairs")
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--reference-root", type=Path, required=True)
    parser.add_argument("--pilot-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    result = build_pairs(args.repo_root, args.reference_root, args.pilot_dir, args.output_dir)
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
