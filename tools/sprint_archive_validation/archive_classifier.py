from __future__ import annotations

from typing import Any


def _num(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def classify(record: dict) -> dict:
    inputs = record.get("inputs", {})
    project_id = str(record.get("project_id", ""))
    flags = list(record.get("quality_flags", []))
    if _num(inputs.get("gate_le_6_count")) or _num(inputs.get("gate_gt_6_count")) or _num(inputs.get("door_count")):
        flags.append("OPENING_PROJECT")
    if _num(inputs.get("window_height_m")) or _num(inputs.get("strip_window_length_m")) or _num(inputs.get("separate_window_count")):
        flags.append("WINDOW_PROJECT")
    if str(inputs.get("special_bracing_flag") or "").strip() == "+":
        flags.append("TIE_PROJECT")
    searchable = " ".join(str(v) for v in record.get("search_text", []))
    searchable = f"{searchable} {record.get('archive_title', '')}"
    lower = searchable.lower()
    if "односкат" in lower:
        flags.append("ONE_SLOPE")
    if "кран" in lower:
        flags.append("CRANE_PROJECT")
    if "пристро" in lower:
        flags.append("ANNEX_PROJECT")

    unique_flags = sorted(set(flags))
    if "ONE_SLOPE" in unique_flags:
        sprint_type = "SPRINT_ONE_SLOPE"
    elif "TIE_PROJECT" in unique_flags:
        sprint_type = "SPRINT_WITH_TIE"
    elif "WINDOW_PROJECT" in unique_flags:
        sprint_type = "SPRINT_WITH_WINDOWS"
    else:
        sprint_type = record.get("sprint_type_hint") or "PLAIN_SPRINT_SP"

    comparable = not bool(record.get("parse_error")) and project_id != "22326"
    reason = None if comparable else ("SOURCE_SUSPICIOUS / COMPATIBILITY_CASE" if project_id == "22326" else record.get("parse_error"))
    record.update({
        "system": "Sprint",
        "sprint_type": sprint_type,
        "comparable": comparable,
        "not_comparable_reason": reason,
        "quality_flags": unique_flags,
    })
    return record
