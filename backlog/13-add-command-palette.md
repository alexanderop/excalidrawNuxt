# Add command palette with UCommandPalette

**Points:** 3
**Phase:** 3 - New Capabilities
**Priority:** Low

## Description

Add a keyboard-driven command palette (`Cmd+K` / `Ctrl+K`) for quick access to tools, actions, and settings. Currently no command palette exists.

## Tasks

- Add `<UCommandPalette>` triggered by `Cmd+K` / `Ctrl+K`
- Register tool switching commands (Rectangle, Ellipse, Arrow, etc.)
- Register action commands (Delete, Duplicate, Copy, Paste, Select All)
- Register layer commands (Bring to Front, Send to Back)
- Register theme toggle command
- Use `defineShortcuts()` for the trigger shortcut
- Group commands by category (Tools, Actions, Layers, Settings)

## Acceptance Criteria

- `Cmd+K` opens command palette
- Typing filters commands fuzzy-match style
- Selecting a command executes it and closes palette
- Escape closes palette
- All major actions accessible via palette
