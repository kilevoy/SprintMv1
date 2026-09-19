# UI Input Contract Freeze

Статус: frozen after corrective pass, 2026-09-19.

Этот документ фиксирует границу пользовательского контракта. Изменение
контракта после freeze допускается только отдельным audit/change proposal с
регрессией ProjectInput → adapter → Core1.

## Frozen rules

1. `D8` — автоматически рассчитанный Core1 шаг рам; он не является редактируемым
   пользовательским полем.
2. `D9` — явный ручной override шага рам. UI не делает вид, что D9 является
   результатом автоматического подбора.
3. Effective frame step — расчётный результат: D9 при активном override, иначе
   D8. В UI виден источник effective value.
4. Frame count — расчётный результат, а не вход.
5. Literal span сохраняется как literal number в пределах поддерживаемого Core1
   ограничения; UI не округляет его к ближайшей canonical family.
6. 24 m остаётся явно частичной веткой: подбор рамы/D8 и ограниченный low-height
   путь полезны, но финальный структурный D69 не считается полностью доказанным.
7. Граница классификации ворот остаётся typed:
   `CORE1_GATE_CLASSIFICATION_UNVERIFIED`. Width/height не выбираются молча.
8. Сложные несовместимые группы окон могут вернуть
   `CORE1_OPENINGS_NOT_REPRESENTABLE`; ProjectInput остаётся подробной моделью.
9. Локальный расчёт оконных ригелей отображается как `ENHANCED`, пока legacy
   parity не подтверждён отдельными golden sources.
10. Поля стен и оболочки принадлежат будущему `EnclosureCore`; это не обещание
    полного расчёта стен в Core1.
11. UI contract нельзя менять молча после этого freeze.

## Current release status

```text
CORE1_9_21_SUPPORTED_DOMAIN = FROZEN
CORE1_24M = PARTIAL
UI_INPUT_CONTRACT = FROZEN_WITH_BOUNDED_PARTIALS
CORE1_ENGINEERING_LOGIC_CHANGED_BY_FREEZE = NO
NEXT_STAGE = COLD_ENCLOSURE_ARCHITECTURE_AUDIT
```

## Non-goals

Freeze не расширяет инженерный domain, не доказывает manual D9 parity, не
закрывает 24 m D69 и не превращает enhanced window calculation в legacy
comparable result.

