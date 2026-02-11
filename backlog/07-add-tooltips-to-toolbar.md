# Add UTooltip to toolbar buttons

**Points:** 3
**Phase:** 1 - Quick Wins
**Priority:** Medium

## Description

Wrap toolbar tool buttons and property panel icon buttons with `<UTooltip>` to show tool names and keyboard shortcuts on hover. Currently we have `aria-label` only — no visual tooltips exist in the app.

## Tasks

- Add `<UTooltip>` to each tool button in `DrawingToolbar.vue` (10 tools)
- Include tool name + shortcut key in tooltip content (e.g. "Rectangle (R)")
- Add `<UTooltip>` to layer buttons and action buttons in `PropertiesPanel.vue`
- Use `<UKbd>` inside tooltips for shortcut display

## Acceptance Criteria

- Hovering any toolbar button shows tooltip with name + shortcut
- Hovering property panel icon buttons shows tooltip
- Tooltips dismiss on click and on mouse leave
- No layout shift when tooltips appear
