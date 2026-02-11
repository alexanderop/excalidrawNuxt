# Replace ContextMenu with UContextMenu

**Points:** 3
**Phase:** 1 - Quick Wins
**Priority:** Medium

## Description

Replace hand-rolled `ContextMenu.vue` with Nuxt UI's `<UContextMenu>`. Current implementation uses manual Teleport, positioning, and `onClickOutside`. Nuxt UI provides keyboard navigation, proper ARIA roles, and separator support out of the box.

## Tasks

- Refactor `app/features/context-menu/components/ContextMenu.vue` to use `<UContextMenu>`
- Map existing menu items (label + keyboard shortcut) to `<UContextMenu>` item format
- Use `<UKbd>` for shortcut display
- Remove manual `onClickOutside` and Teleport logic
- Test right-click opens menu, keyboard navigation works, Escape closes

## Acceptance Criteria

- Right-click on canvas opens context menu
- All existing items and shortcuts displayed
- Keyboard navigation (arrow keys, Enter) works
- Escape and click-outside close the menu
