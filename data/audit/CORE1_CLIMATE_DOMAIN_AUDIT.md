# CORE1 CLIMATE DOMAIN AUDIT

TOTAL_CLIMATE_LOCATIONS = 528
UNIQUE_CITIES = 504
UNIQUE_NORMALIZED_TUPLES = 146
UNIQUE_LEGACY_SIGNATURES = 128
CURRENTLY_PROVEN_SIGNATURES = SIG_IV_1_8_I_0_23_IV_0_8_I_4_1_4_1, SIG_III_1_5_II_0_3_III_1_II_3_2_3_2, SIG_IV_1_5_I_0_23_III_1_I_3_1_3_1
CITIES_COVERED_BY_PROVEN_SIGNATURES = 54
SIGNATURES_REQUIRING_EXCEL_VALIDATION = 125
UNRESOLVED_SIGNATURES = 26
FRAME_DRY_RUN_SUCCESS_SIGNATURES = 128
FRAME_DRY_RUN_FAILURES = 0
DOWNSTREAM_CITY_NAME_DEPENDENCY = NO
CITY_BY_CITY_WHITELIST_REQUIRED = NO
SAFE_TO_REPLACE_CITY_WHITELIST = YES
CHELYABINSK_SIGNATURE = SIG_III_1_2_II_0_3_III_0_8_II_3_2_3_2
CHELYABINSK_STATUS = REQUIRES_EXCEL_VALIDATION

## Method

Each exact city/source row was resolved through the same climate dataset, deriveLegacyClimate at the proven representative responsibility 0.8 and roof SP-200, then resolveLegacyFrameBranch. Each unique signature was dry-run through Core1 with the representative supported 12 m / 3 m / responsibility 0.8 scenario. Cities are grouped by the resulting normalized climate and legacy branch signature. No city-name branch was found in downstream Core1 code; unsupported or malformed source rows remain blocked. A source-backed city can therefore proceed without a city whitelist, while signatures not covered by current references remain explicitly marked REQUIRES_EXCEL_VALIDATION for parity claims.

The machine-readable per-location and per-signature matrix is in data/audit/core1_climate_domain_matrix.json.
