# UI input contract corrective pass

Дата: 2026-09-19. Режим: scoped corrective pass после Core1 freeze.

## Scope

Изменены только UI, UI tests и contract documentation. Инженерные формулы
Core1, legacy datasets, XLSX/PDF и `outputs/` не изменялись.

## Исправлено

1. D8 теперь явно обозначен как автоматический расчётный шаг; D9 — отдельный
   ручной override. Результат показывает effective step с указанием `D8` или
   `D9` и количество рам.
2. Literal span стал числовым полем в диапазоне `0.01..24`, поэтому UI больше
   не скрывает поддерживаемые неканонические значения и не округляет их.
3. Успешная 24 m ветка показывает
   `CORE1_24M_STRUCTURAL_PARITY_PARTIAL`; числа расчёта не меняются.
4. Стены явно представлены как проектная оболочка будущего EnclosureCore.
   `Марка настила` и `Прогон ограждения` сохранены как Core1 inputs с точным
   назначением.
5. Enhanced оконные ригели помечаются `ENHANCED`; legacy parity не заявляется.
6. Unknown-domain и legacy-error диагностики уже проходили через typed result
   panel и сохранены без смягчения или подмены результата.

## Gate and window safety

Автоматическая классификация ворот по ширине/высоте не добавлялась. При
неподтверждённой legacy-классификации сохраняется
`CORE1_GATE_CLASSIFICATION_UNVERIFIED`. Несовместимые оконные группы не
сливаются молча и сохраняют `CORE1_OPENINGS_NOT_REPRESENTABLE`.

## Deferred non-blocking items

- stale-state refinement for gate/door dimension-only edits;
- более детальная provenance-разметка будущих Core2/коммерческих результатов.

## Numeric safety

Core1 numeric outputs and golden calculations were not changed. The UI only
changes labels, visibility, bounded-domain notices, and literal input editing.

## Validation

| Check | Result |
|---|---|
| `npm test` | 199 passed |
| `npm run typecheck` | pass |
| `npm run build` | pass |
| static integrity | 26 passed |
| `git diff --check` | pass |

## Final status

```text
SAFE_TO_FREEZE_UI_INPUT_CONTRACT = YES
NEXT_STAGE = COLD_ENCLOSURE_REVERSE_ENGINEERING
PRODUCTION_CODE_CHANGED = NO
```
