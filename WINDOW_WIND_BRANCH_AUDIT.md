# Аудит ветровой ветки окон

`WINDOW_BRANCH_STATUS: FULLY_PROVEN_FOR_IMPLEMENTATION` (числовая parity
приёмка ждёт non-zero golden scenario).

## Новый API-маршрутизатор

Для KZ пользовательский выбор «Расчёт по евронормам» преобразуется до
расчёта:

```text
Нет → normative_system = SP_20    → локальный лист Ветер СП
Да  → normative_system = SP_RK_EN → локальный лист Ветер по СП РК EN
```

`Лист1!J20` в новый Core не передаётся и не вычисляется.

## SP_20

Локальная ветка `Ветер СП` содержит lookup/coefficient blocks и итоговые
`G25/G26`. В исходной книге `Расчет!D9/F9` использует их с коэффициентами
`B3` и `/1,4` для F9. Cached baseline подтверждает выбранный SP path:
`D9=0,43969114285714284`, `F9=0,251252081632653`.

## SP_RK_EN

Локальный лист `Ветер по СП РК EN` содержит `B2:B12`, `D28/D29` и расчётные
blocks `Z:AC`. Его downstream формулы образуют тот же вход `D9/F9`, но новый
Core выбирает эту ветку напрямую по `normative_system=SP_RK_EN`, без J20.

## J20: legacy-only

- `Лист1!J20` blank, без formula/validation/producer.
- В legacy Excel это условие в `Расчет!D9/F9`.
- Blank выбирает SP-ветку только в compatibility trace.
- Классификация: `RESERVE_FORMULA / UNKNOWN_ZERO_LOGIC`.
- Это не пользовательский input и не blocker нового API.

## Внешние ID

| ID | Роль исторической ссылки | Локальная замена | Runtime |
|---:|---|---|---|
| 3 | city membership `J18` | `Города п.К`, `снегветер`, local snapshots | `LEGACY_REDUNDANT` |
| 4 | SP/EN wind outputs | `Ветер СП`, `Ветер по СП РК EN` | `LEGACY_REDUNDANT` |
| 5 | EN inputs | local EN blocks | `LEGACY_REDUNDANT` |

Local cached `#N/A` сохраняется как Excel error. Книга v2.0 не используется.

## Вывод

Обе нормативные ветки локально доказаны структурно и могут быть реализованы
в `WindowGirtCalculator`. Отсутствие non-zero golden scenario влияет только
на статус `PARITY_PROVEN`, не на возможность реализации.
