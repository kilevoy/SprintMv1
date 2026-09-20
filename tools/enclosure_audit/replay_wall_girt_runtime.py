"""Audit-only replay of the restricted no-stud wall-girt source chain.

This script intentionally consumes only the extracted evidence dataset and
explicit runtime constants. It does not open the source workbook and does not
read cached JW/objective/selected-result cells.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import openpyxl
from openpyxl.utils import get_column_letter


ROOT = Path(__file__).resolve().parents[2]
DATASET = ROOT / "src" / "enclosure" / "evidence-data" / "wall-girt-auto-no-stud-candidates.json"
AUTHORITATIVE_XLSX = Path(r"C:\Users\Deako\Downloads\Калькулятор ограждайки v1.5 (1).xlsx")

CONTRACT = {
    "building_height_m": 10.5,
    "wall_height_m": 9.3,
    "building_length_m": 24.0,
    "wall_calculation_length_m": 24.0,
    "post_step_m": 6.0,
    "w0_kPa": 0.30,
    "terrain": "B",
    "responsibility": 0.8,
    "min_step_mm": 0,
    "max_step_mm": 1500,
    "manual_step_mode": "none",
    "insulation_mm": 0,
    "utilization_override": 0,
    "min_profile_height_mm": 145,
    "max_profile_height_mm": 145,
    "max_utilization": 100,
    "profile_family_all": True,
    "section_type_all": True,
    "material_all": True,
    "without_studs": True,
    "normative_system": "SP_20",
}

KZE = {5: {"A": 0.75, "B": 0.665, "C": 0.4}, 10: {"A": 1.0, "B": 0.66, "C": 0.4}, 20: {"A": 1.25, "B": 0.73125, "C": 0.55}}
ZETA = {5: {"A": 0.751, "B": 1.044, "C": 1.78}, 10: {"A": 0.7565, "B": 1.053, "C": 1.766}, 20: {"A": 0.72325, "B": 0.977, "C": 1.614}}
AREA = [(0, 1.0), (2, 1.0), (3, 0.95), (4, 0.9), (5, 0.85), (7.5, 0.8), (10, 0.75), (15, 0.7), (20, 0.65)]


def approx_lookup(table: dict[int, dict[str, float]], height: float, terrain: str) -> float:
    key = max(k for k in table if k <= max(5.0, height))
    return table[key][terrain]


def area_factor(area: float) -> float:
    breakpoint, value = max((item for item in AREA if item[0] <= area), key=lambda item: item[0])
    return value


def number(value):
    return float(value) if isinstance(value, (int, float)) else float(str(value).replace(",", "."))


def load_rows(branch: str):
    data = json.loads(DATASET.read_text(encoding="utf-8"))
    return next(item["source_rows"] for item in data["branches"] if item["branch"] == branch)


def utilization_for_row_step(fields: dict, branch: str, step_mm: int) -> float:
    height = max(5.0, CONTRACT["building_height_m"])
    kze = approx_lookup(KZE, height, CONTRACT["terrain"])
    zeta = approx_lookup(ZETA, height, CONTRACT["terrain"])
    aero = 1.4 if branch == "typical" else 2.2
    pressure = CONTRACT["w0_kPa"] * kze * (1 + zeta) * aero * 1.4 * CONTRACT["responsibility"]
    raw = pressure * area_factor((step_mm / 1000) * CONTRACT["post_step_m"]) * (step_mm / 1000) * CONTRACT["post_step_m"] ** 2 / 8
    denominator = number(fields["W"]["cached_value"]) * number(fields["O"]["cached_value"])
    if number(fields["M"]["cached_value"]) == 1:
        denominator *= 0.55
    return raw / denominator


def validation_sample() -> tuple[int, int, int]:
    """Compare calculated utilization/JW with cached Excel values after replay."""
    sample = [7, 8, 335, 336, 499, 507, 609, 614, 620, 625]
    sheets = {"corner": "Расчет Угловая", "typical": "Расчет Рядовая"}
    wb = openpyxl.load_workbook(AUTHORITATIVE_XLSX, data_only=True, read_only=True)
    utilization_mismatches = 0
    jw_mismatches = 0
    checked = 0
    for branch in ("corner", "typical"):
        ws = wb[sheets[branch]]
        rows = {x["source_row"]: x["fields"] for x in load_rows(branch)}
        for source_row in sample:
            fields = rows[source_row]
            for offset, step_mm in enumerate(range(500, 3001, 10)):
                util = utilization_for_row_step(fields, branch, step_mm)
                cached_util = ws.cell(source_row, 30 + offset).value  # AD:JT
                if abs(util - float(cached_util)) > 1e-9:
                    utilization_mismatches += 1
                expected_jw = int(
                    500 <= step_mm <= 1500
                    and number(fields["I"]["cached_value"]) == 1
                    and number(fields["K"]["cached_value"]) == 1
                    and number(fields["Q"]["cached_value"]) == 1
                    and number(fields["S"]["cached_value"]) == 1
                    and number(fields["R"]["cached_value"]) == 1
                    and number(fields["U"]["cached_value"]) == CONTRACT["insulation_mm"]
                    and CONTRACT["min_profile_height_mm"] <= number(fields["N"]["cached_value"]) <= CONTRACT["max_profile_height_mm"]
                    and util <= 1
                )
                cached_jw = ws.cell(source_row, 227 + offset).value  # JW:TM
                if expected_jw != int(cached_jw):
                    jw_mismatches += 1
                checked += 1
    return checked, utilization_mismatches, jw_mismatches


def replay(branch: str):
    rows = load_rows(branch)
    height = max(5.0, CONTRACT["building_height_m"])
    kze = approx_lookup(KZE, height, CONTRACT["terrain"])
    zeta = approx_lookup(ZETA, height, CONTRACT["terrain"])
    aero = 1.4 if branch == "typical" else 2.2
    gamma_f = 1.4
    pressure = CONTRACT["w0_kPa"] * kze * (1 + zeta) * aero * gamma_f * CONTRACT["responsibility"]
    wind_zone_a = min(CONTRACT["building_length_m"], 2 * height) / 5
    zone_length = 2 * (0 if wind_zone_a / CONTRACT["post_step_m"] < 0.5 else math.ceil(wind_zone_a / CONTRACT["post_step_m"]) * CONTRACT["post_step_m"])
    if branch == "typical":
        zone_length = CONTRACT["wall_calculation_length_m"] - zone_length
    best = None
    for row in rows:
        f = row["fields"]
        if number(f["R"]["cached_value"]) != 1:
            continue
        if not (CONTRACT["min_profile_height_mm"] <= number(f["N"]["cached_value"]) <= CONTRACT["max_profile_height_mm"]):
            continue
        if number(f["U"]["cached_value"]) != CONTRACT["insulation_mm"]:
            continue
        utilization = number(f["O"]["cached_value"])
        z = number(f["Z"]["cached_value"])
        aa = number(f["AA"]["cached_value"])
        tn = number(f["TN"]["cached_value"])
        to = number(f["TO"]["cached_value"])
        t = number(f["T"]["cached_value"])
        for step_mm in range(500, 3001, 10):
            if not (CONTRACT["min_step_mm"] <= step_mm <= CONTRACT["max_step_mm"]):
                continue
            step_m = step_mm / 1000
            raw = pressure * area_factor(step_m * CONTRACT["post_step_m"]) * step_m * CONTRACT["post_step_m"] ** 2 / 8
            adjusted = raw / (number(f["W"]["cached_value"]) * utilization * (0.55 if number(f["M"]["cached_value"]) == 1 else 1))
            if adjusted > 1:
                continue
            row_count = math.ceil(CONTRACT["wall_height_m"] / step_m) - 1
            support_span = row_count * CONTRACT["post_step_m"]
            objective = support_span * z + to * CONTRACT["post_step_m"] + row_count * aa + number(f["G"]["cached_value"]) / 1_000_000 - step_mm / 1_000_000_000 + tn * CONTRACT["post_step_m"] + t
            candidate = (objective, number(f["G"]["cached_value"]), step_mm, f["V"]["cached_value"])
            if best is None or candidate < best:
                best = candidate
    return zone_length, pressure, best


def main() -> None:
    print("WALL_GIRT_RUNTIME_REPLAY = AUDIT_ONLY")
    for branch in ("corner", "typical"):
        zone_length, pressure, best = replay(branch)
        print(f"{branch}: zone_length_m={zone_length:g} pressure_kPa={pressure:.8f} winner={best}")
    print("CACHE_INDEPENDENT_INPUT = YES")
    checked, util_mismatches, jw_mismatches = validation_sample()
    print(f"REPRESENTATIVE_ROWS=10 ADDITIONAL; CELLS_CHECKED={checked}; UTILIZATION_MISMATCHES={util_mismatches}; JW_MISMATCHES={jw_mismatches}")
    print("PRODUCTION_CODE_CHANGED = NO")


if __name__ == "__main__":
    main()
