from pathlib import Path

INPUT_CELLS = {
    "city": "D2",
    "span_m": "D4",
    "length_m": "D5",
    "height_m": "D6",
    "responsibility_level": "D7",
    "frame_step_input_m": "D9",
    "roof_covering": "D20",
    "deck_grade": "D21",
    "snow_retention": "D26",
    "legacy_enclosure_purlin_flag": "D27",
    "special_bracing_flag": "D29",
    "gate_le_6_count": "D60",
    "gate_gt_6_count": "D61",
    "door_count": "D62",
    "window_height_m": "D64",
    "strip_window_length_m": "D65",
    "separate_window_count": "D66",
    "window_construction": "D67",
}

OUTPUT_CELLS = {
    "city": "D2",
    "frame_step_m": "D22",
    "purlin_step_mm": "D28",
    "beam_profile": "D33",
    "beam_steel": "E33",
    "column_profile": "D34",
    "column_steel": "E34",
    "purlin_profile": "D35",
    "purlin_steel": "E35",
    "opening_mass_kg_m2": "D68",
    "opening_mass_t": "E68",
    "structural_base_kg_m2": "E8",
    "alternate_structural_base_kg_m2": "E9",
    "d69_kg_m2": "D69",
    "snow_region_display": "D16",
    "wind_region_display": "D17",
}

BRANCH_OUTPUT_CELLS = {
    "frame_mass_kg": ("подбор", "G14", "G15"),
    "secondary_mass_kg_m2": ("подбор", "H14", "H15"),
}

CLIMATE_ROW_CELLS = {
    "snow_region": "F",
    "snow_load_kpa": "G",
    "wind_region": "H",
    "wind_load_kpa": "I",
}

KNOWN_STATUS_OVERRIDES = {
    "22326": "SOURCE_SUSPICIOUS / COMPATIBILITY_CASE",
}

NUMERIC_COMPARE_FIELDS = {
    "span_m", "length_m", "height_m", "responsibility_level",
    "frame_step_input_m", "gate_le_6_count", "gate_gt_6_count", "door_count",
    "window_height_m", "strip_window_length_m", "separate_window_count",
    "frame_step_m", "frame_count", "frame_mass_kg", "purlin_step_mm",
    "purlin_mass_kg", "secondary_mass_kg", "opening_mass_kg_m2",
    "structural_base_kg_m2", "d69_kg_m2", "snow_load_kpa", "wind_load_kpa",
}

PROFILE_COMPARE_FIELDS = {"beam_profile", "column_profile", "purlin_profile"}

def default_paths(repo_root: Path):
    return {
        "repo_root": repo_root,
        "master_template": repo_root / "Таблица по подбору сечений теплых ангаров пролетами 9м, 12м, 15м, 18м, 21м, 24м версия 1,5.xlsx",
        "output_dir": repo_root / "outputs" / "sprint_pilot",
    }
