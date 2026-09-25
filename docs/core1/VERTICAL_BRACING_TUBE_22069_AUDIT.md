# Vertical bracing tube audit: project 22069

Source: `Z:/Предварительные расчеты/Архив предрасчетов/2026/Сурова/Май 2026/22069 (12х20х6, спринт сп)/22069.xlsx`. Read-only audit; source workbook was not modified.

## Proven cells on active sheet `12м`

- `C9 = 20` m;
- `C10 = 6` m;
- `C11 = 5` m;
- `I17 = CEILING(C9/C11+1,1) = 5` frames;
- `K83 = 120х3`, `L83 = 0.011` t/m;
- `K85 = 80х3`, `L85 = 0.0072` t/m;
- `K92 = гор.св/м`, `L92 = SQRT(6*6+O90*O90)`;
- `K93 = дл верт св`, `L93 = SQRT(N90*N90+O90*O90)`;
- `K95 = 3` tube spacers;
- `C96 = (4*(C10+0.5)*J87 + L85*K95*C9 + (4*2)*L92*L85*1.1 + (2*2)*L93*L83*1.1) + 0.436 + J85*L156`.

The formula uses `L85` (80x3 mass) for the horizontal-bracing/spacer terms and `L83` (120x3 mass) for the vertical-bracing term. This proves the semantic mapping for this project:

- horizontal bracing: `80x3`;
- vertical bracing: `120x3`.

## Core1 comparison

For span 20 m and frame step 5 m, the current `SecondarySteelCalculator` selects `vertical1 = 120х3` and `horizontal1 = 80x3`. The 22069 result therefore matches the current selection for this case.

This is a case match, not yet a generic proof. The current Core1 rule also depends on span and frame step, while the workbook formula derives lengths and quantities from project geometry. Additional projects are required before changing the generic rule or adding a height-based selector.