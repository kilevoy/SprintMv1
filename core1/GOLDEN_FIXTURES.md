# Golden fixtures Core 1

## Формат

Каждый сценарий состоит из двух файлов:

- `<id>.input.json` — утверждённые поля `Core1Input`;
- `<id>.expected.json` — `expected_output`, diagnostics, source cells и confidence.

`manifest.json` связывает пары файлов и фиксирует `supported_domain`, `legacy_scenario`, confidence и status.

Expected status:

- `PROVEN` — значение прочитано из сохранённого cache основной книги;
- `LEGACY_ERROR` — доказан исходный Excel error;
- `UNSUPPORTED` — строгий parity невозможен по конкретному доказанному контрактному blocker;
- `UNKNOWN` — expected values не доказаны и не вычислены самостоятельно.

## Состав

Создано 17 fixtures:

| Status manifest | Count | Сценарии |
|---|---:|---|
| `READY` | 4 | baseline 12 м, zero openings, snow retention `нет`, enclosure purlin `нет` |
| `EXPECTED_LEGACY_ERROR` | 2 | 24 м `#N/A`, purlin step 500 `#REF!` |
| `UNKNOWN` | 11 | включая ненулевые окна без независимого golden oracle |
| `UNKNOWN` | 10 | нормальные 9/15/18/21 м, флаги `есть`, manual frame step, roof/deck variants, responsibility 1,0 |

READY-сценарии используют один доказанный сохранённый Excel state и поэтому не считаются четырьмя независимыми пересчётами. Baseline содержит 31 конкретное поле результата; `engineering_loads` оставлено `null`, потому что единый утверждённый output object нагрузки не был зафиксирован.

## Доказанный baseline

`baseline_12m`:

- `Роза`, 12×18×3 м;
- responsibility `0,8`;
- automatic/effective frame step `6 м`;
- `С-П 200`, `С44-1000-0,7`;
- без дополнительных прогонов и проёмов;
- beam `ПГС300/20х80х2,5`, column `ПГС245/20х80х2`;
- purlin `2ПС 200х65х2`, step `2140 мм`, `7,539 кг/м²`, `1550,88 кг`;
- `kg_per_m2=30,25967361111111 кг/м²`.

## UNKNOWN policy

UNKNOWN fixture — обязательная заготовка теста, но не разрешение на расчёт. Разработчик не должен получать expected value из собственной реализации. Значение становится golden только после независимого доказанного Excel fixture или утверждённого source cache.

Особенно это относится к:

- нормальным сценариям 9, 15, 18 и 21 м;
- `snow_retention_purlin="есть"`;
- `enclosure_purlin="есть"`;
- ручному шагу рам;
- альтернативным roof/deck combinations;
- responsibility `1,0`.

## Windows

Zero-window fixture подтверждает, что Core 1 может работать без внешних ID,
когда оконный расчёт не требуется. Ненулевой fixture сохраняет отсутствие
числового oracle; runtime рассчитывает локальный `WindowGirtResult`, но общий
fixture остаётся `UNKNOWN` до независимого golden результата. Отсутствие
non-zero oracle блокирует PARITY_PROVEN, но не IMPLEMENTED. ID3/ID4/ID5 и J20
не являются blocker нового API.
