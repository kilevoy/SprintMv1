from __future__ import annotations

import csv
import json
from collections import Counter
from html import escape
from pathlib import Path


def _json_default(value):
    return str(value)


def flatten_project(record):
    inputs = record.get("inputs", {})
    geometry = record.get("geometry")
    if not geometry and all(inputs.get(key) is not None for key in ("span_m", "length_m", "height_m")):
        geometry = f"{inputs['span_m']}x{inputs['length_m']}x{inputs['height_m']}"
    row = {
        "project_id": record.get("project_id"),
        "project_name": Path(record.get("source_file", "")).stem,
        "source_folder": record.get("source_folder"),
        "source_file": record.get("source_file"),
        "source_file_sha256": record.get("source_file_sha256"),
        "reference_class": record.get("reference_class"),
        "archive_title": record.get("archive_title"),
        "geometry": geometry,
        "source_folder_display": record.get("source_folder_display"),
        "source_modified_date": record.get("source_modified_date"),
        "system": record.get("system"),
        "country": record.get("country"),
        "normative_system": record.get("normative_system"),
        "sprint_type": record.get("sprint_type"),
        "comparable": record.get("comparable"),
        "not_comparable_reason": record.get("not_comparable_reason"),
        "status": record.get("status"),
        "quality_flags": ";".join(record.get("quality_flags", [])),
    }
    row.update(inputs)
    for prefix in ("archive", "replay"):
        for key, value in record.get(prefix, {}).items():
            if key.endswith("_parsed") or isinstance(value, dict):
                continue
            row[f"{prefix}_{key}"] = value
    return row


def _write_csv(path: Path, rows: list[dict]):
    fieldnames = sorted({key for row in rows for key in row}) if rows else ["error"]
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_outputs(records: list[dict], output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    projects = [flatten_project(record) for record in records]
    comparison = [row for record in records for row in record.get("comparison", [])]
    mismatches = [row for row in comparison if not row.get("match")]
    errors = []
    for record in records:
        if record.get("parse_error") and record.get("parse_error") != "UNSUPPORTED_ARCHIVE_LAYOUT":
            errors.append({"project_id": record.get("project_id"), "source_file": record.get("source_file"), "error": record["parse_error"]})
        if record.get("replay_error"):
            errors.append({"project_id": record.get("project_id"), "source_file": record.get("source_file"), "error": record["replay_error"]})
        for item in record.get("replay_errors", []):
            errors.append({"project_id": record.get("project_id"), "source_file": record.get("source_file"), "field": item.get("field"), "error": item.get("error")})
    summary = {
        "total_scanned": len(records),
        "sprint_candidates": sum(1 for r in records if r.get("system") == "Sprint"),
        "successfully_parsed": sum(1 for r in records if not r.get("parse_error")),
        "replay_completed": sum(1 for r in records if r.get("replay") and not r.get("replay_error")),
        "comparable": sum(1 for r in records if r.get("comparable")),
        "full_matches": sum(1 for r in records if r.get("status") == "FULL_MATCH"),
        "mismatches": sum(1 for r in records if r.get("status") in {"ARCHIVE_REPLAY_DIFFERENCE", "PROFILE_MATCH_MASS_DELTA", "TEMPLATE_LEGACY_ERROR", "TEMPLATE_ERROR"}),
        "errors": len(errors),
        "known_reference_projects": sum(1 for r in records if r.get("reference_class") == "KNOWN_REFERENCE"),
        "new_unseen_projects": sum(1 for r in records if r.get("reference_class") == "NEW_UNSEEN"),
        "parsed": sum(1 for r in records if not r.get("parse_error")),
        "replay_completed_count": sum(1 for r in records if r.get("replay") and not r.get("replay_error")),
        "full_match": sum(1 for r in records if r.get("status") == "FULL_MATCH"),
        "mismatch": sum(1 for r in records if r.get("status") in {"ARCHIVE_REPLAY_DIFFERENCE", "PROFILE_MATCH_MASS_DELTA", "TEMPLATE_LEGACY_ERROR", "TEMPLATE_ERROR"}),
        "not_comparable": sum(1 for r in records if r.get("status") == "NOT_COMPARABLE"),
        "error": len(errors),
        "status_counts": dict(Counter(r.get("status") for r in records)),
        "sprint_type_counts": dict(Counter(r.get("sprint_type") for r in records)),
        "mismatch_clusters": dict(Counter(row.get("field") for row in mismatches)),
    }
    summary["breakdowns"] = {
        "span_m": dict(Counter(str((record.get("inputs") or {}).get("span_m")) for record in records)),
        "height_m": dict(Counter(str((record.get("inputs") or {}).get("height_m")) for record in records)),
        "city": dict(Counter(str((record.get("inputs") or {}).get("city")) for record in records)),
        "snow_region": dict(Counter(str((record.get("archive") or {}).get("snow_region")) for record in records)),
        "wind_region": dict(Counter(str((record.get("archive") or {}).get("wind_region")) for record in records)),
        "frame_step_m": dict(Counter(str((record.get("archive") or {}).get("frame_step_m")) for record in records)),
        "beam_profile": dict(Counter(str((record.get("archive") or {}).get("beam_profile")) for record in records)),
        "purlin_profile": dict(Counter(str((record.get("archive") or {}).get("purlin_profile")) for record in records)),
        "sprint_type": dict(Counter(str(record.get("sprint_type")) for record in records)),
    }
    (output_dir / "sprint_projects.json").write_text(json.dumps(projects, ensure_ascii=False, indent=2, default=_json_default), encoding="utf-8")
    (output_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    _write_csv(output_dir / "sprint_projects.csv", projects)
    _write_csv(output_dir / "sprint_comparison.csv", comparison)
    _write_csv(output_dir / "errors.csv", errors)
    _write_csv(output_dir / "mismatches.csv", mismatches)
    def display(value):
        return "NULL" if value is None or value == "" else str(value)

    def geometry_display(record):
        geometry = record.get("geometry")
        inputs = record.get("inputs") or {}
        if not geometry and all(inputs.get(key) is not None for key in ("span_m", "length_m", "height_m")):
            geometry = f"{inputs['span_m']}x{inputs['length_m']}x{inputs['height_m']}"
        return display(geometry)

    project_rows_html = "".join(
        "<tr>"
        f"<td>{escape(str(record.get('project_id')))}</td>"
        f"<td>{escape(display((record.get('inputs') or {}).get('city')))}</td>"
        f"<td>{escape(geometry_display(record))}</td>"
        f"<td>{escape(display((record.get('archive') or {}).get('d69_kg_m2')))}</td>"
        f"<td>{escape(display((record.get('replay') or {}).get('d69_kg_m2')))}</td>"
        f"<td>{escape(display((record.get('archive') or {}).get('beam_profile')))}</td>"
        f"<td>{escape(display((record.get('replay') or {}).get('beam_profile')))}</td>"
        f"<td>{escape(display((record.get('archive') or {}).get('column_profile')))}</td>"
        f"<td>{escape(display((record.get('replay') or {}).get('column_profile')))}</td>"
        f"<td>{escape(display((record.get('archive') or {}).get('purlin_profile')))}</td>"
        f"<td>{escape(display((record.get('replay') or {}).get('purlin_profile')))}</td>"
        f"<td>{escape(display(record.get('status')))}</td>"
        f"<td>{escape(display(';'.join(record.get('quality_flags', []))))}</td>"
        "</tr>"
        for record in records
    )
    breakdown_html = "".join(
        f"<h3>{escape(name)}</h3><pre>{escape(json.dumps(values, ensure_ascii=False, indent=2))}</pre>"
        for name, values in summary["breakdowns"].items()
    )
    report_html = f"""<!doctype html><meta charset='utf-8'><title>Sprint pilot validation</title>
<h1>Sprint pilot validation</h1>
<p>Total pilot projects: {summary['total_scanned']}<br>Known reference projects: {summary['known_reference_projects']}<br>New unseen projects: {summary['new_unseen_projects']}<br>Parsed: {summary['parsed']}<br>Replay completed: {summary['replay_completed_count']}<br>Comparable: {summary['comparable']}<br>FULL_MATCH: {summary['full_match']}<br>MISMATCH: {summary['mismatch']}<br>NOT_COMPARABLE: {summary['not_comparable']}<br>ERROR: {summary['error']}</p>
<h2>Pilot projects</h2><table border='1'><tr><th>Project</th><th>City</th><th>Geometry</th><th>Archive D69</th><th>Replay D69</th><th>Beam archive</th><th>Beam replay</th><th>Column archive</th><th>Column replay</th><th>Purlin archive</th><th>Purlin replay</th><th>Status</th><th>Flags</th></tr>{project_rows_html}</table>
<h2>Top mismatch clusters</h2><pre>{escape(json.dumps(summary['mismatch_clusters'], ensure_ascii=False, indent=2))}</pre>
<h2>Breakdowns</h2>{breakdown_html}
<h2>Missing or unavailable fields</h2><pre>{escape(json.dumps({'archive_frame_count': 'not proven', 'archive_frame_total_kg': 'not proven', 'archive_secondary_mass_kg': 'not proven', 'replay_frame_count': 'not proven', 'replay_frame_total_kg': 'not proven', 'replay_secondary_mass_kg': 'not proven'}, ensure_ascii=False, indent=2))}</pre>
"""
    (output_dir / "report.html").write_text(report_html, encoding="utf-8")
    return {"projects": projects, "comparison": comparison, "mismatches": mismatches, "errors": errors, "summary": summary}
