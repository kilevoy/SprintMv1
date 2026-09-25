from __future__ import annotations

import csv
import json
import math
import re
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

from analyze_price_xml import parse_sheet, shared_strings, sheet_map

BASE = Path(r"E:\SprintMv1\input_price_review\Прайс для предрасчетов (не изменять) — 23092026.xlsx")
NEW = Path(r"E:\SprintMv1\input_price_review\ПРАЙС ПОЛНЫЙ на 23.09.2026.xlsx")
OUT_JSON = BASE.parent / "comparison_1c_20260923.json"
OUT_CSV = BASE.parent / "comparison_1c_20260923.csv"


def norm_text(v):
    return re.sub(r"\s+", " ", str(v or "")).strip()


def key_code(v):
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    text = norm_text(v)
    # 1C may export the same catalog code either as a number (58434) or as
    # fixed-width text with leading zeroes (00000058434).
    if re.fullmatch(r"\d+", text):
        return text.lstrip("0") or "0"
    return text


def number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def load_records(path, expected_sheet=None):
    with zipfile.ZipFile(path) as z:
        ss = shared_strings(z)
        sheets = sheet_map(z)
        target = next(((n, p) for n, p in sheets if n == expected_sheet), sheets[0])
        name, xml_path = target
        cells, formulas, maxr, maxc = parse_sheet(z, xml_path, ss)
    records = []
    for r in range(11, maxr + 1):
        code = key_code(cells.get((r, 4)))
        # Hierarchy/group rows from 1C do not carry a catalog code.
        if not code:
            continue
        rec = {
            "row": r,
            "code": code,
            "name": norm_text(cells.get((r, 3)) or cells.get((r, 2))),
            "group": norm_text(cells.get((r, 5))),
            "subgroup": norm_text(cells.get((r, 6))),
            "price": cells.get((r, 7)),
            "unit": norm_text(cells.get((r, 8))),
            "weight": cells.get((r, 9)),
            "price_ton": cells.get((r, 10)),
        }
        records.append(rec)
    return name, records


def index(records):
    d = defaultdict(list)
    for x in records:
        d[x["code"]].append(x)
    return d


def main():
    base_sheet, base_records = load_records(BASE, "Вставить из 1с сюда")
    new_sheet, new_records = load_records(NEW, "TDSheet")
    b, n = index(base_records), index(new_records)
    duplicate_base = {k: v for k, v in b.items() if len(v) > 1}
    duplicate_new = {k: v for k, v in n.items() if len(v) > 1}
    common = sorted(set(b) & set(n))
    added = sorted(set(n) - set(b))
    removed = sorted(set(b) - set(n))
    changes = []
    unchanged_price = 0
    for code in common:
        old, new = b[code][0], n[code][0]
        op, np = old["price"], new["price"]
        if number(op) and number(np):
            delta = float(np) - float(op)
            pct = delta / float(op) if op else None
            if abs(delta) < 1e-9:
                unchanged_price += 1
            else:
                changes.append({
                    "code": code, "name_old": old["name"], "name_new": new["name"],
                    "row_old": old["row"], "row_new": new["row"],
                    "price_old": op, "price_new": np, "delta": delta, "pct": pct,
                    "unit_old": old["unit"], "unit_new": new["unit"],
                    "weight_old": old["weight"], "weight_new": new["weight"],
                    "price_ton_old": old["price_ton"], "price_ton_new": new["price_ton"],
                    "name_changed": old["name"] != new["name"],
                    "unit_changed": old["unit"] != new["unit"],
                    "weight_changed": old["weight"] != new["weight"],
                })
    changes.sort(key=lambda x: abs(x["pct"]) if x["pct"] is not None else -1, reverse=True)
    increases = [x for x in changes if x["delta"] > 0]
    decreases = [x for x in changes if x["delta"] < 0]
    suspicious = [x for x in changes if x["pct"] is not None and abs(x["pct"]) >= 0.5]
    missing_new_price = [x for x in new_records if not number(x["price"])]
    missing_new_ton = [x for x in new_records if not number(x["price_ton"])]
    base_group_counts = Counter(x["group"] for x in base_records if x["group"])
    new_group_counts = Counter(x["group"] for x in new_records if x["group"])
    groups_absent_in_new = [
        {"group": group, "old_positions": count}
        for group, count in base_group_counts.items()
        if group not in new_group_counts
    ]
    groups_absent_in_new.sort(key=lambda x: (-x["old_positions"], x["group"]))
    groups_partially_reduced = []
    for group, old_count in base_group_counts.items():
        new_count = new_group_counts.get(group, 0)
        if 0 < new_count < old_count:
            groups_partially_reduced.append({"group": group, "old_positions": old_count, "new_positions": new_count, "difference": old_count-new_count})
    groups_partially_reduced.sort(key=lambda x: (-x["difference"], x["group"]))
    group_transitions = Counter()
    for code in common:
        old_group = b[code][0]["group"]
        new_group = n[code][0]["group"]
        if old_group != new_group:
            group_transitions[(old_group, new_group)] += 1
    summary = {
        "base_file": str(BASE), "base_sheet": base_sheet, "base_records": len(base_records), "base_unique_codes": len(b),
        "new_file": str(NEW), "new_sheet": new_sheet, "new_records": len(new_records), "new_unique_codes": len(n),
        "common_codes": len(common), "added_codes": len(added), "removed_codes": len(removed),
        "changed_prices": len(changes), "unchanged_prices": unchanged_price,
        "price_increases": len(increases), "price_decreases": len(decreases),
        "changes_ge_50pct": len(suspicious), "duplicate_codes_base": len(duplicate_base), "duplicate_codes_new": len(duplicate_new),
        "new_missing_price": len(missing_new_price), "new_missing_price_ton": len(missing_new_ton),
    }
    report = {
        "summary": summary,
        "largest_increases_pct": increases[:30],
        "largest_decreases_pct": decreases[:30],
        "largest_increases_abs": sorted(increases, key=lambda x: x["delta"], reverse=True)[:30],
        "largest_decreases_abs": sorted(decreases, key=lambda x: x["delta"])[:30],
        "changes_ge_50pct": suspicious,
        "added": [n[k][0] for k in added],
        "removed": [b[k][0] for k in removed],
        "duplicate_codes_base": duplicate_base,
        "duplicate_codes_new": duplicate_new,
        "new_missing_price": missing_new_price,
        "new_missing_price_ton": missing_new_ton,
        "groups_absent_in_new": groups_absent_in_new,
        "groups_partially_reduced": groups_partially_reduced,
        "base_group_counts": dict(base_group_counts),
        "new_group_counts": dict(new_group_counts),
        "group_transitions": [
            {"old_group": old_group, "new_group": new_group, "positions": count}
            for (old_group, new_group), count in group_transitions.most_common()
        ],
    }
    OUT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    fields = ["code","name_old","name_new","row_old","row_new","price_old","price_new","delta","pct","unit_old","unit_new","weight_old","weight_new","price_ton_old","price_ton_new","name_changed","unit_changed","weight_changed"]
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, delimiter=";")
        w.writeheader(); w.writerows(changes)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
