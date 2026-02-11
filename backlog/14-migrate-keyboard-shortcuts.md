# Migrate keyboard shortcuts to defineShortcuts

**Points:** 3
**Phase:** 3 - New Capabilities
**Priority:** Low

## Description

Replace manual keyboard event handling with Nuxt UI's `defineShortcuts()` composable. Supports single keys, combinations (`meta_k`), and sequences (`g-d`). Auto-adjusts meta to ctrl on non-macOS.

## Tasks

- Audit all current keyboard shortcut handlers across the codebase
- Migrate tool shortcuts (1-9, 0) to `defineShortcuts()`
- Migrate action shortcuts (Ctrl+C, Ctrl+V, Ctrl+Z, Delete, etc.)
- Migrate color picker shortcuts (Escape, 1-5 shade quick-pick)
- Use `extractShortcuts()` for menu item shortcut definitions
- Remove manual `addEventListener`/`useEventListener` keyboard handlers

## Acceptance Criteria

- All existing keyboard shortcuts work as before
- Shortcuts auto-adjust meta/ctrl per platform
- No duplicate event listeners
- Shortcuts disabled when typing in text inputs
