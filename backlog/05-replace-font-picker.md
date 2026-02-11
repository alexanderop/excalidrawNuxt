# Replace FontPicker with USelectMenu

**Points:** 3
**Phase:** 1 - Quick Wins
**Priority:** Medium

## Description

Replace hand-rolled `FontPicker.vue` (custom listbox dropdown) with `<USelectMenu>`. Current implementation manually handles toggle state, `onClickOutside`, and absolute positioning.

## Tasks

- Refactor `app/features/properties/components/FontPicker.vue` to use `<USelectMenu>`
- Map font options (Virgil, Helvetica, Cascadia) to select items
- Style to match our theme (surface background, foreground text, accent highlight)
- Remove manual `onClickOutside` and `useToggle` logic

## Acceptance Criteria

- Font dropdown opens/closes correctly
- Font selection updates the active element
- Styled consistently with our dark theme
- Keyboard navigation works (arrow keys, Enter, Escape)
