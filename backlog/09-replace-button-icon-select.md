# Replace ButtonIconSelect with UButton group

**Points:** 3
**Phase:** 2 - Property Panel
**Priority:** Medium

## Description

Replace hand-rolled `ButtonIconSelect.vue` (toggle button group with single-select and aria-pressed) with styled `<UButton>` components. Used ~8 times in PropertiesPanel for fill style, stroke width, stroke style, roughness, roundness, text alignment.

## Tasks

- Refactor `ButtonIconSelect.vue` to use `<UButton>` with active/inactive variants
- Maintain single-select behavior (only one active at a time)
- Keep custom SVG icons as button content
- Style active state with accent color, inactive with surface
- Also refactor `ArrowheadPicker.vue` which uses the same pattern

## Acceptance Criteria

- Toggle groups work with single-select
- Active button highlighted with accent color
- All 8 usages in PropertiesPanel render correctly
- ArrowheadPicker works with custom SVG arrowhead icons
