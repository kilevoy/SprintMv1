# CORE1 Legacy Gate Classification Audit — D60 / D61

## Scope

Read-only audit of the authoritative workbook:

Таблица по подбору сечений теплых ангаров пролетами 9м, 12м, 15м, 18м, 21м, 24м версия 1,5.xlsx

Production code, ProjectInput, adapter policy and XLSX were not changed.

## 1. Source cells

| Cell | Label | Formula | Source value | Direct precedents | Source type |
|---|---|---|---:|---|---|
| вывод!D60 | Ворота до 6 м | none; literal cell | 0 | none | MANUAL_INPUT |
| вывод!D61 | Ворота свыше 6 м | none; literal cell | 0 | none | MANUAL_INPUT |

Both cells are already-separated numeric gate counts. The workbook does not store raw gate width, raw gate height, gate quantity records, gate type, or a formula that derives either count from geometry. The labels establish the intended bucket names, but do not prove which dimension controls the boundary.

## 2. Formula chains

### D60 branch

вывод!D60 → Лист1!O23 → Лист1!O28 → вывод!D68 → вывод!D69

Exact formulas:

Лист1!O23 = Q23 * вывод!D60 * 1.05

Лист1!Q23 = 350

Лист1!O28 = (O23 + O24 + O25 + O26 + O27) / B10 / B11

вывод!D68 = Лист1!O28

вывод!D69 = IF(D9=0,E8,E9) + D68

### D61 branch

вывод!D61 → Лист1!O24 → Лист1!O28 → вывод!D68 → вывод!D69

Exact formulas:

Лист1!O24 = Q24 * вывод!D61 * 1.05

Лист1!Q24 = 450

The parallel Лист7!O23/O24 formulas use the same D60/D61 branches. Лист7!O27 is a separate calculation and does not classify gates.

## 3. Search for the 6 m condition

Search scope included all workbook formulas and text for:

- <=6, <6, >6, >=6;
- 6.0, 6000;
- gate/opening-related formulas and labels.

Relevant gate occurrences:

вывод!C60 = Ворота до 6 м

вывод!C61 = Ворота свыше 6 м

No gate-related formula containing a six-metre comparison or 6000 was found. The formula matches подбор!AN11 and подбор!BE11 use an unrelated V8<=6.2 height calculation. Notes about a six-metre purlin span are also unrelated. These are not evidence for D60/D61 classification.

## 4. Controlled tests

Cases A–F were not performed. The workbook does not expose raw gate width/height inputs. Changing D60/D61 would only test manual category counts, not the missing geometry-to-category rule. No authoritative workbook input exists for the proposed width/height experiments.

## 5. Downstream effect

| Branch | Per-unit source coefficient | Opening-mass contribution |
|---|---:|---|
| D60 | Лист1!Q23 = 350 | 350 × D60 × 1.05 |
| D61 | Лист1!Q24 = 450 | 450 × D61 × 1.05 |

Both contributions flow through Лист1!O28 to вывод!D68 and then to вывод!D69. The formulas prove different coefficients and downstream impact. They do not prove whether a raw gate is classified by width, height, maximum dimension, or another policy.

## 6. ProjectInput comparison

Current detailed gate records contain:

| Field | Availability |
|---|---|
| id | stable opening identifier |
| kind | gate |
| width_mm | raw width |
| height_mm | raw height |
| quantity | quantity |
| gate type | no separate proven field |

Legacy Core1 requires only:

gates_le_6m_count → вывод!D60

gates_gt_6m_count → вывод!D61

The mapping from detailed geometry to these aggregate counts remains unproven.

## 7. Evidence classification

D60_MEANING = manually supplied count for the bucket labelled “Ворота до 6 м”

D61_MEANING = manually supplied count for the bucket labelled “Ворота свыше 6 м”

D60_SOURCE_TYPE = MANUAL_INPUT

D61_SOURCE_TYPE = MANUAL_INPUT

GATE_CLASSIFICATION_RULE = MANUAL_CATEGORY

BOUNDARY_6M = UNKNOWN

SOURCE_PROVEN = PARTIAL

PROJECTINPUT_TO_CORE1_GATE_MAPPING_PROVEN = NO

SAFE_TO_IMPLEMENT_GATE_ADAPTER_POLICY = NO

CORE1_GATE_CLASSIFICATION_UNVERIFIED_CAN_BE_REMOVED = NO

CORE1_FORMULAS_CHANGED = NO

MANUAL_CATEGORY describes the proven source model: Excel receives pre-classified counts. It does not prove the upstream geometric rule used to create those counts.

## 8. Adapter decision

Keep:

CORE1_GATE_CLASSIFICATION_UNVERIFIED

Do not implement width_mm <= 6000 or any alternative policy.

Required evidence to close the uncertainty:

1. a source-selection workbook exposing raw gate geometry and formulas populating D60/D61;
2. an authoritative input form or specification defining width, height, maximum dimension, or manual categorization;
3. paired real projects with the same gate geometry and authoritative D60/D61 values sufficient to distinguish candidate policies.

## Final status

D60_MEANING = MANUAL_CATEGORY_COUNT_LE_6M_LABEL

D61_MEANING = MANUAL_CATEGORY_COUNT_GT_6M_LABEL

D60_SOURCE_TYPE = MANUAL_INPUT

D61_SOURCE_TYPE = MANUAL_INPUT

GATE_CLASSIFICATION_RULE = MANUAL_CATEGORY

BOUNDARY_6M = UNKNOWN

SOURCE_PROVEN = PARTIAL

PROJECTINPUT_TO_CORE1_GATE_MAPPING_PROVEN = NO

SAFE_TO_IMPLEMENT_GATE_ADAPTER_POLICY = NO

CORE1_GATE_CLASSIFICATION_UNVERIFIED_CAN_BE_REMOVED = NO

CORE1_FORMULAS_CHANGED = NO

NEXT_STAGE = obtain a source mapping raw gate geometry to D60/D61, then rerun the controlled boundary audit
