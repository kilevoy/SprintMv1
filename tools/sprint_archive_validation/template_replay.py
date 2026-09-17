from __future__ import annotations

import shutil
import time
from pathlib import Path
from typing import Any

import pythoncom
import win32com.client

from .config import INPUT_CELLS, OUTPUT_CELLS
from .archive_extractor import _clean, _numeric
from .profile_normalizer import parse_profile


def _variant(value: Any):
    if value is None:
        return ""
    if isinstance(value, str) and value.startswith("#"):
        return value
    return value


def _find_city_row_com(sheet, city: str):
    if not city:
        return None
    values = sheet.Range("B3:B600").Value
    for offset, row_value in enumerate(values, start=3):
        if isinstance(row_value, tuple):
            row_value = row_value[0]
        if row_value == city:
            return offset
    return None


def _read(sheet, address):
    value = sheet.Range(address).Value
    if isinstance(value, tuple):
        return None
    return _variant(value)


def replay_one(template_path: Path, record: dict, work_dir: Path) -> dict:
    pythoncom.CoInitialize()
    excel = None
    book = None
    try:
        work_dir.mkdir(parents=True, exist_ok=True)
        working_copy = work_dir / f"{record['project_id']}_template_replay.xlsx"
        shutil.copy2(template_path, working_copy)
        excel = win32com.client.DispatchEx("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        excel.EnableEvents = False
        excel.AskToUpdateLinks = False
        book = excel.Workbooks.Open(str(working_copy), UpdateLinks=0, ReadOnly=False, AddToMru=False)
        output_sheet = book.Worksheets("вывод")
        for field, address in INPUT_CELLS.items():
            output_sheet.Range(address).Value = record.get("inputs", {}).get(field)
        excel.CalculateFullRebuild()
        deadline = time.time() + 120
        while excel.CalculationState != 0 and time.time() < deadline:
            time.sleep(0.2)

        values = {field: _read(output_sheet, address) for field, address in OUTPUT_CELLS.items()}
        e8 = _numeric(_read(output_sheet, "E8"))
        e9 = _numeric(_read(output_sheet, "E9"))
        active_branch = 15 if isinstance(e8, (int, float)) and isinstance(e9, (int, float)) and e8 > e9 else 14
        family_row = {9: 2, 12: 3, 15: 4, 18: 5, 21: 6, 24: 7}.get(record.get("inputs", {}).get("span_m"))
        branch_sheet = book.Worksheets("подбор")
        frame_mass = _numeric(_read(branch_sheet, f"G{family_row}")) if family_row else None
        secondary_mass_m2 = _numeric(_read(branch_sheet, f"H{family_row}")) if family_row else None
        city = record.get("inputs", {}).get("city")
        climate_sheet = book.Worksheets("снегветер")
        row = _find_city_row_com(climate_sheet, city)
        canonical = {
            "snow_region": _read(climate_sheet, f"F{row}") if row else None,
            "snow_load_kpa": _numeric(_read(climate_sheet, f"G{row}")) if row else None,
            "wind_region": _read(climate_sheet, f"H{row}") if row else None,
            "wind_load_kpa": _numeric(_read(climate_sheet, f"I{row}")) if row else None,
        }
        replay = {
            "snow_region": values.get("snow_region_display"),
            "snow_load_kpa": canonical["snow_load_kpa"],
            "wind_region": values.get("wind_region_display"),
            "wind_load_kpa": canonical["wind_load_kpa"],
            "frame_step_m": _numeric(values.get("frame_step_m")),
            "frame_count": None,
            "beam_profile": values.get("beam_profile"),
            "beam_steel": values.get("beam_steel"),
            "column_profile": values.get("column_profile"),
            "column_steel": values.get("column_steel"),
            "frame_mass_kg": frame_mass,
            "purlin_profile": values.get("purlin_profile"),
            "purlin_steel": values.get("purlin_steel"),
            "purlin_step_mm": _numeric(values.get("purlin_step_mm")),
            "purlin_mass_kg": _numeric(_read(output_sheet, "E24")),
            "secondary_mass_kg": None,
            "secondary_mass_kg_m2": secondary_mass_m2,
            "opening_mass_kg_m2": _numeric(values.get("opening_mass_kg_m2")),
            "structural_base_kg_m2": _numeric(values.get("structural_base_kg_m2")),
            "d69_kg_m2": _numeric(values.get("d69_kg_m2")),
            "frame_total_kg": None,
            "active_branch": active_branch,
            "alternate_structural_base_kg_m2": _numeric(values.get("alternate_structural_base_kg_m2")),
            "canonical_snow_region": canonical["snow_region"],
            "canonical_wind_region": canonical["wind_region"],
            "canonical_snow_load_kpa": canonical["snow_load_kpa"],
            "canonical_wind_load_kpa": canonical["wind_load_kpa"],
        }
        for field in ("beam_profile", "column_profile", "purlin_profile"):
            replay[f"{field}_parsed"] = parse_profile(replay.get(field))
        errors = []
        for field, value in replay.items():
            if isinstance(value, str) and value.startswith("#"):
                errors.append({"field": field, "error": value})
        return {"replay": replay, "replay_raw_outputs": values, "errors": errors, "replay_error": None}
    except Exception as exc:
        return {"replay": {}, "replay_raw_outputs": {}, "errors": [], "replay_error": f"{type(exc).__name__}: {exc}"}
    finally:
        if book is not None:
            book.Close(SaveChanges=False)
        if excel is not None:
            excel.Quit()
        pythoncom.CoUninitialize()
