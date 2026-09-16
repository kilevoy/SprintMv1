# Sprint M — Core 1 calculator

Browser-side инженерный калькулятор для подбора сечений металлокаркаса. React UI собирает `Core1Input`, передаёт его в независимое расчётное ядро `calculateCore1()` и отображает типизированный `Core1Result`. Формулы, выбор профилей, климат и массы не дублируются в React.

## Локальный запуск

```bash
npm install
npm run dev
```

Откройте адрес Vite, обычно `http://localhost:5173/SprintMv1/`.

## Проверки и production build

```bash
npm test
npm run typecheck
npm run build
```

Vite настроен с base `/SprintMv1/` для GitHub Pages. Static datasets остаются в lazy `BrowserCore1DataRepository`; они не импортируются целиком в основной bundle. Текущий интерфейс не включает Core 2, цены, backend или Excel runtime. Публикация GitHub Pages пока не включена.
