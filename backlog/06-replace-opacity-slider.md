# Replace OpacitySlider with USlider

**Points:** 3
**Phase:** 1 - Quick Wins
**Priority:** Medium

## Description

Replace hand-rolled `OpacitySlider.vue` (raw `<input type="range">`) with `<USlider>`. Gains consistent styling, better accessibility, and thumb customization.

## Tasks

- Refactor `app/features/properties/components/OpacitySlider.vue` to use `<USlider>`
- Configure min=0, max=100, step=1
- Keep percentage label display
- Style slider track and thumb to match our accent/surface colors

## Acceptance Criteria

- Slider controls opacity 0-100
- Percentage label updates in real-time
- Styled to match our dark theme
- Works with keyboard (arrow keys)
