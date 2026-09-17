# Core 1 v1 — поддерживаемая область

Этот документ задаёт границу первой реализации. Статусы относятся к режиму строгой совместимости с исходной книгой, а не к инженерной допустимости проекта вообще.

## Статусы

- `SUPPORTED` — вход и его downstream-путь доказаны локальными данными; Core обязан вычислить результат.
- `SUPPORTED_WITH_LEGACY_ANOMALY` — путь реализуется буквально, но при известном условии обязан вернуть legacy error/warning.
- `UNSUPPORTED_FOR_PARITY` — алгоритм понятен, но для строгого результата отсутствуют доказанные legacy-данные.
- `UNKNOWN` — границы допустимых значений или поведение не доказаны; v1 обязан отклонить значение вне явно поддержанного подмножества.

## Матрица параметров

| Параметр | Доказанная область v1 | Статус | Поведение вне области |
|---|---|---|---|
| `span_m` | конечное число `0 < span_m <= 24`; frame lookup uses the proven upper-bound family mapper | `SUPPORTED` for domain validation; literal geometry is preserved | `>24` → `UNKNOWN_DOMAIN`/unsupported; no rounding or clamping |
| `span_m` in `(21,24]` | family `24` | `SUPPORTED_WITH_LEGACY_ANOMALY` downstream | run the family-24 compatibility path and return active `#N/A`; do not emit a constructive result |
| `length_m` | конечное положительное число; `вывод!D5` не имеет list-validation/min/max и используется в арифметике/ветвлении; подтверждено реальным `22318: 24` м | `SUPPORTED` для domain validation; parity каждого сценария отдельно | `<=0`/нечисловое отклонить; верхний предел не придумывать |
| `height_m` | конечное положительное число до `6,2` м; `вывод!D6` не имеет list-validation/min/max, а `15м` содержит высотные bands `3,6`, `4,8`, `6,0`; реальный `22318: 5` м попадает в band `4,8` | `SUPPORTED` для domain validation; parity каждого сценария отдельно | `<=0` или `>6,2` → `UNKNOWN_DOMAIN` |
| `responsibility_factor` | `0,8`, `1,0` | `SUPPORTED` | иные коэффициенты отклонить |
| `frame_step_override_m` | пусто/ноль = автоматический шаг | `SUPPORTED` | применяется `auto_frame_step_m` |
| `frame_step_override_m` | положительное ручное число; сохранённый effective fixture — `6` м | `UNKNOWN` | не обещать parity до golden tests по ручному шагу |
| `roof_covering` | точные 20 ключей `Подбор прогонов 2!N44:N63` | `SUPPORTED` | exact-match; неизвестный ключ → `#N/A`/typed lookup error |
| `roof_deck_grade` | `С44-1000-0,5`, `С44-1000-0,7`, `Н60-845-0,7`, `Н60-845-0,8` | `SUPPORTED` | неизвестный ключ → typed lookup error; пустые `O10:O11` не являются вариантами |
| `snow_retention_purlin` | `есть`, `нет` | `SUPPORTED` | иное значение отклонить без coercion |
| `enclosure_purlin` | `есть`, `нет` | `SUPPORTED` | иное значение отклонить; это не материал стены |
| материал стены | отдельного входа нет | `SUPPORTED` | Core принимает отсутствие поля; переданное поле не участвует в parity-расчёте |
| ворота/двери | целые неотрицательные количества; формульные branches ≤6 м, >6 м и двери доказаны | `SUPPORTED` для реализации; `PARITY_PROVEN` только для нулевого baseline | отрицательные и дробные значения отклонить; ненулевые результаты требуют golden oracle для parity |
| окна отсутствуют | `window_height_m=0`, `window_strip_length_m=0`, `separate_windows_count=0` | `SUPPORTED` | оконный подбор не требуется |
| окна присутствуют | ненулевые `D64:D66`, обязательный `window_type` 1..5 | `SUPPORTED` для реализации локальной формульной цепочки; `PARITY_PROVEN` ожидает non-zero golden oracle | реализовать `WindowGirtCalculator`; до реализации вернуть typed module diagnostic, не подставлять v2.0 |
| `city` для основного каркаса | exact keys, которые после экспорта локальных таблиц основной книги успешно разрешаются во всех обязательных frame/climate lookup; доказаны `RU|Роза|SP_20` и `RU|Сургут|SP_20` | `SUPPORTED` | ключ с lookup error → typed climate error; без fuzzy matching |
| `city` для Kazakhstan membership окон | локальный lookup `Лист1!J18:K18:J19` и snapshots основной книги | `SUPPORTED` для доказанных локальных ключей; `UNKNOWN` вне них | exact-match; fuzzy/fallback запрещены |
| `terrain_type` | `А`, `В`, `С` как enum | `SUPPORTED` | значение передаётся в локальную ветровую ветку; J20 не является blocker |
| normative branch основного каркаса | локальная ветка основной книги, выбранная явным `normative_system` | `SUPPORTED` | ошибки lookup передаются без замены |
| normative branch окон | локальные `Ветер СП` (`SP_20`) и `Ветер по СП РК EN` (`SP_RK_EN`); для KZ выбор обязателен: «нет»→`SP_20`, «да»→`SP_RK_EN` | `SUPPORTED` для реализации; parity требует non-zero golden | маршрутизировать напрямую по API; J20 только legacy trace |

## Пролёты

| Пролёт | Табличный источник | Статус v1 | Обязательный результат |
|---:|---|---|---|
| 9 м | `9м` | `SUPPORTED` | обычный расчёт после прохождения golden tests |
| 12 м | `12м` | `SUPPORTED` | обычный расчёт; сохранённый основной fixture |
| 15 м | `15м` | `SUPPORTED` | обычный расчёт после прохождения golden tests |
| 18 м | `18м` | `SUPPORTED` | обычный расчёт после прохождения golden tests |
| 21 м | `21м` | `SUPPORTED` | обычный расчёт после прохождения golden tests |
| 24 м family | `24м` | `SUPPORTED_WITH_LEGACY_ANOMALY` | `#N/A`/`SPAN_24_LEGACY_NA`; запрещено выдавать якобы нормальный профиль |

`SUPPORTED` означает, что архитектура и локальный источник доказаны. До выпуска каждый вариант всё равно должен пройти golden test; отсутствие теста не расширяет domain.

Для literal `span_m` используется `resolveDesignSpanFamily`: `<=9→9`, `(9,12]→12`, `(12,15]→15`, `(15,18]→18`, `(18,21]→21`, `(21,24]→24`. Это закрывает `ARBITRARY_SPAN_DOMAIN_GAP` на уровне generic validation и family routing; отсутствие отдельного non-canonical golden oracle ограничивает только `PARITY_PROVEN` downstream.

## Числовая валидация

Геометрическая граница подтверждена отдельно от инженерной допустимости: `D5` положителен и не имеет доказанного верхнего предела, а `D6` положителен и должен попадать в последнюю доказанную высотную таблицу `FrameSelector` (`<=6,2`). Это закрывает `UNKNOWN_DOMAIN_GEOMETRY_GAP`, но не объявляет parity для всех длин/высот доказанным. Количества ворот/дверей ограничены доказанным schema domain (целые ≥0) и рассчитываются отдельными локальными branches; отсутствие ненулевого golden oracle ограничивает только `PARITY_PROVEN`. Остальные недоказанные значения получают `UNKNOWN_DOMAIN`, а не приблизительный расчёт.

## Геометрический аудит 22318

Исходная книга `E:\SprintMv1_reference\22318_SOURCE_SELECTION.xlsx` содержит `вывод!D5=24` и `вывод!D6=5`. Для `D5` найдены прямые downstream-зависимости `вывод!D40`, `вывод!D41`, `подбор!V11`, `Подбор прогонов 2!B3`, `Лист1!B11`; для `D6` — `вывод!D41`, `подбор!V8`, `Лист1!B9`. Ни одна из этих ячеек не задаёт произвольный верхний предел. Структурная таблица `15м` содержит высотную группу `4,8` и ветку `4/1`; это существующий legacy bucket, в который `5` попадает по `FrameSelector`. Поэтому валидация расширена общим доказанным правилом, а не перечнем `[18,24]` или `[3,5]`.
