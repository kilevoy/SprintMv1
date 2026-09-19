# Generic legacy D8 frame-step resolver

Дата: 2026-09-19

Статус: рабочая реализация без commit/push.

## Реализованный source chain

Для автоматического city-lookup режима Core1 теперь воспроизводит цепочку:

```text
вывод!D8
→ подбор!AA14
→ INDEX(подбор!I2:I7, MATCH(подбор!AM9, подбор!A2:A7, 0))
→ span-sheet I/IG19 (9–21 м) или 24м!KS19
→ height lookup
→ legacy responsibility-factor lookup
→ legacy structural branch lookup
```

Семейство пролёта определяется существующим `resolveDesignSpanFamily`. Длина
здания не участвует в D8. Она используется downstream для количества рам.

Для 9–21 м используются уже извлечённые `frame_*m_cells.csv` без нового
дублирующего dataset:

| height key | factor `1` | factor `0.8` |
|---:|---|---|
| 3.6 | `B6:B15 → D6:D15` | `AL6:AL15 → AN6:AN15` |
| 4.8 | `BV6:BV15 → BX6:BX15` | `DF6:DF15 → DH6:DH15` |
| 6.0 | `EP6:EP15 → ER6:ER15` | `FZ6:FZ15 → GB6:GB15` |

Для 24 м используется активная локальная таблица `24м`:

```text
height 6/7/8/9
factor 1.0: A/BT/EL/HD → C/BV/EN/HF
factor 0.8: AK/DC/FU/IM → AM/DE/FW/IO
→ 24м!KS6 или KS14
→ 24м!KS19
```

Старый `AUTOMATIC_FRAME_STEP_M` больше не используется production calculation.
Производственный frame path получает `automatic_frame_step_m` из
`resolveLegacyFrameStep`. Для manual climate без proven legacy city branch
сохраняется отдельный first-match compatibility path; ненулевой
`frame_step_override_m` остаётся прямым manual override.

## Controlled golden matrix

Сценарий: город `Роза`, высота 3 м, ответственность `0.8`, automatic mode,
legacy branch `3/2`.

| family | D8 / automatic step, m |
|---:|---:|
| 9 | 6.0 |
| 12 | 6.0 |
| 15 | 6.0 |
| 18 | 5.0 |
| 21 | 4.0 |
| 24 | 4.3 |

Эти значения получаются lookup-таблицей, а не новой константной картой.

## Frame count

Сохранена доказанная формула Excel:

```text
bayCount   = CEILING(buildingLength / effectiveStep)
frameCount = bayCount + 1
```

Контроли для D8 `6/5/4` и длин `18/20/24/25.7/26/30` добавлены в
`src/core1/frame.test.ts`. `D9` не смешивается с D8: blank выбирает automatic
D8, ненулевой override выбирает D9.

## Real-project regression

| project | family | resolved D8 | frame step | status |
|---|---:|---:|---:|---|
| 22318 Сургут | 15 | 4.0 | 4.0 | expected parity preserved |
| 22316 Березовский | 18 | 4.5 | 4.5 | expected parity preserved |
| 22329 Увильды | 12 | 6.0 | 6.0 | expected parity preserved |
| 22326 Увильды | 12 | 6.0 | 6.0 | compatibility case; not tuning oracle |

Connection/BOM outputs for 22318, 22316 and 22329 remain covered by the
existing generic connection tests. 22326 remains `SOURCE_SUSPICIOUS /
COMPATIBILITY_CASE`.

## Boundaries

- Supported generic automatic D8 heights remain `(0, 6.2]`.
- 24 м automatic low-height path is now resolved through the same generic
  resolver and retains the proven D8 `4.3` result.
- 24 м upper-height, 24 м manual-step and natural ROW15 active cases remain
  outside the proven domain.
- No project ID, building length or special length=20 branch is used.
- XLSX files are read-only and unchanged.
