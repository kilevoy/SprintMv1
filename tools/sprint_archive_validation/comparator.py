from __future__ import annotations

import math

from .config import NUMERIC_COMPARE_FIELDS, PROFILE_COMPARE_FIELDS

INPUT_COMPARE_FIELDS = {"city", "span_m", "length_m", "height_m", "responsibility_level", "roof_covering", "deck_grade", "snow_retention", "legacy_enclosure_purlin_flag", "special_bracing_flag"}


def _number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def compare_record(record: dict) -> dict:
    archive = record.get("archive", {})
    replay = record.get("replay", {})
    rows = []
    mismatch_fields = []
    fields = sorted(INPUT_COMPARE_FIELDS | set(archive) | set(replay))
    for field in fields:
        if field.endswith("_parsed") or field in {"active_branch", "canonical_snow_region", "canonical_wind_region", "canonical_snow_load_kpa", "canonical_wind_load_kpa", "alternate_structural_base_kg_m2", "secondary_mass_kg_m2"}:
            continue
        if field in INPUT_COMPARE_FIELDS:
            av = (record.get("inputs") or {}).get(field)
            rv = av
        else:
            av = archive.get(field)
            rv = replay.get(field)
        row = {"project_id": record.get("project_id"), "field": field, "archive_value": av, "replay_value": rv, "delta": None, "delta_percent": None, "raw_match": None, "normalized_match": None, "match": False}
        if field in NUMERIC_COMPARE_FIELDS:
            if _number(av) and _number(rv):
                row["delta"] = rv - av
                row["delta_percent"] = None if av == 0 else (rv - av) / av
                row["match"] = abs(rv - av) <= 1e-9
            else:
                row["match"] = av == rv
        elif field in PROFILE_COMPARE_FIELDS:
            row["raw_match"] = av == rv
            akey = (archive.get(f"{field}_parsed") or {}).get("normalized_key")
            rkey = (replay.get(f"{field}_parsed") or {}).get("normalized_key")
            row["normalized_match"] = akey is not None and akey == rkey
            row["match"] = row["raw_match"] or row["normalized_match"]
        else:
            row["match"] = av == rv
            row["raw_match"] = row["match"]
        if not row["match"]:
            mismatch_fields.append(field)
        rows.append(row)

    if record.get("not_comparable_reason"):
        status = "NOT_COMPARABLE"
    elif record.get("parse_error"):
        status = "INPUT_INCOMPLETE"
    elif record.get("replay_error"):
        status = "TEMPLATE_ERROR"
    elif any(e.get("error") in {"#REF!", "#N/A", "#VALUE!", "#DIV/0!"} for e in record.get("replay_errors", [])):
        status = "TEMPLATE_LEGACY_ERROR"
    elif not mismatch_fields:
        status = "FULL_MATCH"
    elif set(mismatch_fields).issubset({"frame_mass_kg", "purlin_mass_kg", "d69_kg_m2", "structural_base_kg_m2"}):
        status = "PROFILE_MATCH_MASS_DELTA"
    else:
        status = "ARCHIVE_REPLAY_DIFFERENCE"
    record["comparison"] = rows
    record["mismatch_fields"] = mismatch_fields
    record["status"] = status
    if mismatch_fields:
        record.setdefault("quality_flags", []).append("ARCHIVE_REPLAY_MISMATCH")
    return record
