# Modernize PropertiesPanel container

**Points:** 3
**Phase:** 2 - Property Panel
**Priority:** Low

## Description

Refactor `PropertiesPanel.vue` sidebar container to use Nuxt UI layout components. Currently a fixed-position div with manual z-index and overflow handling.

## Tasks

- Consider using `<DashboardPanel>` or `<USlideover>` for the panel container
- Use `<USeparator>` for section dividers (replacing manual border classes)
- Use `<UButton>` for layer ordering buttons (bring to front, send to back, etc.)
- Use `<UButton>` for action buttons (duplicate, delete)
- Add `<UTooltip>` to all icon buttons in the panel

## Acceptance Criteria

- Panel renders in same position (left side, z-10)
- All sections display correctly with separators
- Layer and action buttons work with tooltips
- Panel scrolls correctly when content overflows
