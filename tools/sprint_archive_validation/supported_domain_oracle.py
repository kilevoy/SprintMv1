"""Read-only Excel oracle runner for the supported-domain boundary matrix.

This script opens disposable copies of the master workbook, performs a full
rebuild, and prints JSON to stdout. It does not modify the source workbook or
write into the repository.
"""
from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path

import pythoncom
import win32com.client


ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / "Таблица по подбору сечений теплых ангаров пролетами 9м, 12м, 15м, 18м, 21м, 24м версия 1,5.xlsx"

SCENARIOS = [
    {"id": "rosa-09-h300-r08", "city": "Роза", "span": 9, "length": 18, "height": 3.0, "responsibility": 0.8},
    {"id": "rosa-09-h380-r08", "city": "Роза", "span": 9, "length": 18, "height": 3.8, "responsibility": 0.8},
    {"id": "rosa-09-h381-r08", "city": "Роза", "span": 9, "length": 18, "height": 3.81, "responsibility": 0.8},
    {"id": "rosa-12-h300-r08", "city": "Роза", "span": 12, "length": 18, "height": 3.0, "responsibility": 0.8},
    {"id": "rosa-12-h380-r08", "city": "Роза", "span": 12, "length": 18, "height": 3.8, "responsibility": 0.8},
    {"id": "rosa-12-h381-r08", "city": "Роза", "span": 12, "length": 18, "height": 3.81, "responsibility": 0.8},
    {"id": "rosa-15-h300-r08", "city": "Роза", "span": 15, "length": 18, "height": 3.0, "responsibility": 0.8},
    {"id": "rosa-15-h380-r08", "city": "Роза", "span": 15, "length": 18, "height": 3.8, "responsibility": 0.8},
    {"id": "rosa-15-h381-r08", "city": "Роза", "span": 15, "length": 18, "height": 3.81, "responsibility": 0.8},
]


def clean(value):
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def read(sheet, address):
    return clean(sheet.Range(address).Value)


def run_one(excel, scenario, work_dir):
    copy = work_dir / f"{scenario['id']}.xlsx"
    shutil.copy2(MASTER, copy)
    book = excel.Workbooks.Open(str(copy), UpdateLinks=0, ReadOnly=False)
    try:
        inp = book.Worksheets("вывод")
        out = book.Worksheets("вывод")
        inp.Range("D2").Value = scenario["city"]
        inp.Range("D4").Value = scenario["span"]
        inp.Range("D5").Value = scenario["length"]
        inp.Range("D6").Value = scenario["height"]
        inp.Range("D7").Value = scenario["responsibility"]
        inp.Range("D9").Value = None
        inp.Range("D20").Value = "С-П 150"
        inp.Range("D21").Value = "С44-1000-0,7"
        inp.Range("D26").Value = "нет"
        inp.Range("D27").Value = "нет"
        inp.Range("D29").Value = None
        inp.Range("D60").Value = 0
        inp.Range("D61").Value = 0
        inp.Range("D62").Value = 0
        inp.Range("D64").Value = 0
        inp.Range("D65").Value = 0
        inp.Range("D66").Value = 0
        inp.Range("D67").Value = "2ой стеклопакет"
        excel.CalculateFullRebuild()
        for _ in range(100):
            if excel.CalculationState == 0:
                break
        span_sheet = book.Worksheets(f"{scenario['span']}м" if scenario["span"] != 24 else "24м")
        family_row = {9: 2, 12: 3, 15: 4, 18: 5, 21: 6, 24: 7}[scenario["span"]]
        branch_sheet = book.Worksheets("подбор")
        result = {
            "id": scenario["id"], "inputs": scenario,
            "outputs": {key: read(out, addr) for key, addr in {
                "d8": "D8", "d16": "D16", "d17": "D17", "d22": "D22", "d28": "D28",
                "d33": "D33", "e33": "E33", "d34": "D34", "e34": "E34", "d35": "D35", "e35": "E35",
                "d52": "D52", "e52": "E52", "d53": "D53", "d54": "D54", "d55": "D55", "d56": "D56", "d57": "D57",
                "d68": "D68", "e68": "E68", "e8": "E8", "e9": "E9", "d69": "D69",
            }.items()},
            "span_sheet": {"frame_mass": read(branch_sheet, f"G{family_row}"), "secondary_mass": read(branch_sheet, f"H{family_row}")},
        }
        return result
    finally:
        book.Close(SaveChanges=False)


def main():
    pythoncom.CoInitialize()
    excel = win32com.client.DispatchEx("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False
    excel.EnableEvents = False
    excel.AskToUpdateLinks = False
    try:
        with tempfile.TemporaryDirectory(prefix="sprint-m-matrix-") as temp:
            rows = []
            for scenario in SCENARIOS:
                try:
                    rows.append(run_one(excel, scenario, Path(temp)))
                except Exception as error:
                    rows.append({"id": scenario["id"], "inputs": scenario, "error": str(error)})
            print(json.dumps(rows, ensure_ascii=False, indent=2))
    finally:
        excel.Quit()
        pythoncom.CoUninitialize()


if __name__ == "__main__":
    main()
