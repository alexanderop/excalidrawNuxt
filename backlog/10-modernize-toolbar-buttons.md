# Modernize DrawingToolbar with UButton + UTooltip + UKbd

**Points:** 3
**Phase:** 2 - Property Panel
**Priority:** Medium

## Description

Refactor `DrawingToolbar.vue` to use `<UButton>` for tool buttons and `<UKbd>` for shortcut number badges. Currently uses hand-rolled buttons with inline SVG + Tailwind classes (~20 icon button instances across toolbar and panel).

## Tasks

- Replace tool button elements with `<UButton>` (icon variant, ghost style)
- Use `<UKbd>` for shortcut number badges on each tool
- Style active tool state with accent color
- Keep divider between tool groups (use `<USeparator>`)
- Maintain theme toggle button

## Acceptance Criteria

- All 10 tool buttons render with correct icons
- Active tool highlighted with accent color
- Shortcut badges display correctly
- Theme toggle works
- Toolbar centered and floating as before
