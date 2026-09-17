import re
from typing import Any


def parse_profile(raw_name: Any) -> dict:
    raw = None if raw_name is None else str(raw_name)
    result = {
        "raw_name": raw,
        "profile_family": None,
        "height_mm": None,
        "flange_mm": None,
        "lip_mm": None,
        "thickness_mm": None,
        "paired": None,
        "shape_variant": None,
        "normalized_key": None,
        "parse_error": None,
    }
    if raw is None or not raw.strip():
        result["parse_error"] = "EMPTY_PROFILE"
        return result

    text = raw.upper().replace("Х", "X").replace("×", "X").replace(",", ".")
    text = re.sub(r"\s+", "", text)
    result["paired"] = text.startswith("2") or text.startswith("ДВОЙ")

    family_match = re.match(r"^(2?)([А-ЯA-Z]+)(?:[-_]?([А-ЯA-Z]+))?", text)
    if not family_match:
        result["parse_error"] = "PROFILE_FAMILY_NOT_FOUND"
        return result
    prefix, family, variant = family_match.groups()
    result["profile_family"] = family
    result["shape_variant"] = variant

    nums = re.findall(r"\d+(?:\.\d+)?", text[family_match.end():])
    if len(nums) < 2:
        result["parse_error"] = "PROFILE_DIMENSIONS_NOT_FOUND"
        return result
    try:
        dims = [float(x) for x in nums]
    except ValueError:
        result["parse_error"] = "PROFILE_DIMENSIONS_INVALID"
        return result
    result["height_mm"] = dims[0]
    result["thickness_mm"] = dims[-1]
    if len(dims) >= 3:
        result["flange_mm"] = dims[1]
        result["lip_mm"] = dims[2] if len(dims) >= 4 else None
    elif len(dims) == 2:
        result["flange_mm"] = dims[1]
    result["normalized_key"] = "|".join([
        str(result["profile_family"] or ""),
        str(result["shape_variant"] or ""),
        str(result["height_mm"] or ""),
        str(result["flange_mm"] or ""),
        str(result["lip_mm"] or ""),
        str(result["thickness_mm"] or ""),
        str(bool(result["paired"])),
    ])
    return result
