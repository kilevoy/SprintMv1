# Master template schema v1.5

Источник: `Таблица по подбору сечений теплых ангаров пролетами 9м, 12м, 15м,
18м, 21м, 24м версия 1,5.xlsx`. Книга не изменяется.

## Inputs, лист `вывод`

`D2` city, `D4` span, `D5` building length, `D6` height, `D7` responsibility,
`D9` manual frame step, `D20` roof covering, `D21` deck grade, `D26` snow
retention, `D27` legacy enclosure-purlin flag, `D29` special bracing flag,
`D60:D62` gate/door counts, `D64:D67` window inputs.

## Replay outputs

`D16/D17` displayed snow/wind regions; `D22` selected frame step; `D28` selected
purlin step; `D33:E34` beam/column profiles and steel; `D35:E35` purlin profile
and steel; `E24` purlin mass; `E8/E9` primary and alternate structural base;
`D68/E68` opening mass; `D69` total specific mass in kg/m².

Branch-specific frame mass and secondary tube mass are read from the selected
`подбор!G14:G15` and `подбор!H14:H15` branch after the legacy `E8>E9` selector.

`frame_count`, `frame_total_kg`, and an absolute `secondary_mass_kg` cell were
not proven in the source map and are kept NULL.

## Known error branches

The 24 m legacy branch can return `#N/A`; the 500 mm purlin branch can return
`#REF!`. These are retained as typed errors and never wrapped in `IFERROR`.
