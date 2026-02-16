---
title: "feat: Add 5 Browser Test Suites for User Workflow Coverage"
type: feat
status: active
date: 2026-02-16
---

# Add 5 Browser Test Suites for User Workflow Coverage

## Overview

Add 5 browser test suites targeting the lowest-coverage, highest-impact user-facing features. These tests simulate real user workflows (right-click menus, style copy/paste, pan/zoom, command palette, drag/move) to increase browser test coverage from 63.7% to an estimated ~75%+ on the targeted files.

## Problem Statement

Current browser test coverage has significant gaps in core user interaction paths:

| Feature         | File                   | Statement Coverage |
| --------------- | ---------------------- | ------------------ |
| Context Menu    | `useContextMenu.ts`    | **12.5%**          |
| Style Clipboard | `useStyleClipboard.ts` | **14.28%**         |
| Panning         | `usePanning.ts`        | **43.24%**         |
| Viewport/Zoom   | `useViewport.ts`       | **47.36%**         |
| Command Palette | `CommandPalette.vue`   | **33.33%**         |
| Element Drag    | `dragElements.ts`      | **58.82%**         |

These are features users interact with constantly. Testing them as end-to-end browser workflows gives the highest confidence.

## Infrastructure Prerequisites

The SpecFlow analysis revealed critical infrastructure gaps that must be addressed before writing tests.

### Phase 0: Test Infrastructure (MUST complete first)

#### 0a. Create `canvasRightClick` browser command

**File:** `app/__test-utils__/commands/canvasRightClick.ts`

A right-click command that dispatches:

1. `pointerdown` with `button: 2`
2. `pointerup` with `button: 2`
3. `contextmenu` MouseEvent (what `DrawVue.vue` `@contextmenu` handler listens for)

Must set `offsetX`/`offsetY` via `Object.defineProperty` (same pattern as `canvasClick`).

Register in `vitest.config.browser.ts` alongside existing commands.

#### 0b. Create `canvasWheel` browser command

**File:** `app/__test-utils__/commands/canvasWheel.ts`

A wheel event command that dispatches `WheelEvent` on the canvas with configurable:

- `deltaX`, `deltaY` (scroll amount)
- `ctrlKey`, `shiftKey`, `metaKey` (modifier keys)
- `clientX`, `clientY` (cursor position for zoom centering)

Set `cancelable: true` because `usePanning` calls `e.preventDefault()`.

Register in `vitest.config.browser.ts`.

#### 0c. Extend `canvasDrag` to support `button` parameter

**File:** `app/__test-utils__/commands/canvasDrag.ts`

Add optional `button` parameter (default `0`) so middle-mouse-button drag (`button: 1`) works for pan tests.

#### 0d. Update `DrawVueTestHarness.vue` for context menu support

**File:** `app/__test-utils__/browser/DrawVueTestHarness.vue`

Wrap `<DrawVue>` in `<UContextMenu :items="drawvueRef?.contextMenuItems ?? []">` matching production `app/pages/index.vue`. This enables the context menu UI to render in tests.

Alternative: Create a separate `DrawVueTestHarnessWithContextMenu.vue` if changing the shared harness causes regressions in existing tests.

#### 0e. Add `TestDrawVue` convenience methods

**File:** `app/__test-utils__/browser/TestDrawVue.ts`

Add high-level helpers to the unified facade:

```typescript
async rightClick(cell: [number, number]): Promise<void>
async wheel(cell: [number, number], options: { deltaY?: number; deltaX?: number; ctrlKey?: boolean; shiftKey?: boolean }): Promise<void>
async middleClickDrag(from: [number, number], to: [number, number]): Promise<void>
```

#### 0f. Verify `UModal`/`UCommandPalette` rendering in test environment

Write a minimal spike test confirming Nuxt UI modal components render in browser test mode. If they don't render (teleport issues, module resolution), document the workaround before writing Test Suite 4.

---

## Test Suites

### Implementation Order

Based on infrastructure dependency analysis:

1. **Test 5: Element Drag/Move** — No new infra needed
2. **Test 2: Style Copy/Paste** — Only needs keyboard shortcuts (already available)
3. **Test 3: Pan & Zoom** — Needs `canvasWheel` command (Phase 0b)
4. **Test 4: Command Palette** — Needs UModal verification (Phase 0f)
5. **Test 1: Context Menu** — Needs `canvasRightClick` + harness update (Phase 0a, 0d)

---

### Test Suite 5: Element Drag/Move

**File:** `app/features/selection/drag.browser.test.ts`
**Target:** `dragElements.ts` (58%), `useSelectionInteraction.ts` drag paths

```
describe("element drag and move")
  it("moves element to new position when dragged")
  it("moves all selected elements when dragging one of them")
  it("nudges element by 1px with arrow keys")
  it("nudges element by 10px with shift+arrow keys")
  it("does not start drag for sub-threshold movement")
  it("bound arrows follow dragged containers")
  it("dragging arrow away from container unbinds it")
  it("drag is undoable with Ctrl+Z")
```

**Pattern:**

- Use `TestDrawVue.create()` + `td.addElement()` for fast setup
- Assert positions via `API.elements[i].x` / `API.elements[i].y`
- For arrow binding: create arrow bound to rectangle, drag rectangle, check arrow endpoints updated
- For unbind: create arrow bound to rectangle, select only arrow, drag away, check binding removed

---

### Test Suite 2: Style Copy/Paste

**File:** `app/features/properties/styleCopyPaste.browser.test.ts`
**Target:** `useStyleClipboard.ts` (14.28%), `usePropertyActions.ts` (41.3%)

```
describe("style copy and paste")
  it("copies styles from element with Cmd+Alt+C and pastes with Cmd+Alt+V")
  it("skips text-only properties when pasting to non-text elements")
  it("pastes styles to all selected elements")
  it("updates style defaults after paste so new elements inherit pasted styles")
  it("style paste is undoable")
```

**Pattern:**

- Create rectangle with custom strokeColor/fillStyle, create second rectangle with defaults
- Select first, Cmd+Alt+C, select second, Cmd+Alt+V
- Assert second rectangle now has first's styles
- For text-only: paste from text element to rectangle, assert fontFamily NOT applied
- Properties to check: `strokeColor`, `backgroundColor`, `fillStyle`, `strokeWidth`, `strokeStyle`, `opacity`, `roughness`, `roundness`
- Text-only keys: `fontFamily`, `fontSize`, `textAlign`

---

### Test Suite 3: Pan & Zoom

**File:** `app/features/canvas/panZoom.browser.test.ts`
**Target:** `usePanning.ts` (43.24%), `useViewport.ts` (47.36%)

```
describe("pan and zoom")
  describe("zoom")
    it("zooms in with BottomBar zoom-in button")
    it("zooms out with BottomBar zoom-out button")
    it("resets zoom to 100% with BottomBar reset button")
    it("zooms with Ctrl+wheel")
    it("updates zoom percentage display in BottomBar")

  describe("pan")
    it("pans vertically with plain mouse wheel")
    it("pans horizontally with Shift+wheel")
    it("pans with Space+drag")
    it("pans with hand tool drag")
    it("pans with middle mouse button drag")
```

**Pattern:**

- Assert zoom via `API.zoom` (not DOM)
- Assert pan via `API.scrollX` / `API.scrollY`
- BottomBar buttons: find by aria-label (`Zoom In`, `Zoom Out`, `Reset Zoom`)
- For Space+drag: keyDown space, pointer drag, keyUp space, check scrollX/scrollY changed
- For hand tool: `td.selectTool("hand")`, drag, assert scroll changed

**Important notes:**

- `panBy(dx, dy)` divides by zoom internally — scroll values are in scene coords
- Zoom clamped to 0.1–30 range
- Space key ignored in INPUT/TEXTAREA elements

---

### Test Suite 4: Command Palette

**File:** `app/features/command-palette/commandPalette.browser.test.ts`
**Target:** `CommandPalette.vue` (33.33%), `useCommandPalette.ts` (60%)

```
describe("command palette")
  it("opens with Cmd+K")
  it("closes with Escape")
  it("toggles closed with Cmd+K when open")
  it("lists commands in groups")
  it("executes tool switch command and closes palette")
  it("search filters commands by label")
```

**Pattern:**

- Open: `td.keyboard.press("meta+k")`, assert modal visible in DOM
- Close: `td.keyboard.press("Escape")`, assert modal gone
- Execute: find command item in DOM, click it, assert tool changed + modal closed
- Search: type in search input, assert filtered results
- Uses `UModal` + `UCommandPalette` from Nuxt UI — verify rendering first (Phase 0f)

---

### Test Suite 1: Context Menu

**File:** `app/features/context-menu/contextMenu.browser.test.ts`
**Target:** `useContextMenu.ts` (12.5%)

```
describe("context menu")
  it("shows canvas menu items on right-click on empty canvas")
  it("shows element menu items on right-click on element")
  it("auto-selects element on right-click if not already selected")
  it("executes delete action from context menu")
  it("removes paste item when clipboard is empty")
  it("collapses adjacent separators")
```

**Pattern:**

- Right-click via `td.rightClick([col, row])` (uses new `canvasRightClick` command)
- Assert menu items by querying DOM for `UContextMenu` rendered items
- Note: disabled items are **removed** (not grayed out) — `resolveItem` returns null
- Canvas menu contains: paste, select-all (currently registered)
- Element menu contains: cut, copy, paste, style copy/paste, duplicate, delete, layer ops, group/ungroup
- Flip and image actions are NOT registered — test only currently-registered actions

**Known gap:** `flip:horizontal`, `flip:vertical`, `settings:toggle-grid`, and `image:*` actions referenced in `contextMenuItems.ts` are not registered in `DrawVue.vue`. Tests should only assert on registered actions.

---

## Acceptance Criteria

### Functional Requirements

- [ ] All 5 test suites pass in `pnpm test:browser`
- [ ] Each test is self-contained (no shared mutable state between `it()` blocks)
- [ ] Tests use `TestDrawVue` facade (not legacy `CanvasPage`)
- [ ] No `page.mouse` usage — all interactions through custom commands

### Infrastructure Requirements

- [ ] `canvasRightClick` command created and registered
- [ ] `canvasWheel` command created and registered
- [ ] `canvasDrag` supports `button` parameter
- [ ] `DrawVueTestHarness.vue` supports context menu rendering
- [ ] `TestDrawVue` has `rightClick()`, `wheel()`, `middleClickDrag()` helpers

### Coverage Targets

- [ ] `useContextMenu.ts`: 12.5% → **60%+**
- [ ] `useStyleClipboard.ts`: 14.28% → **70%+**
- [ ] `usePanning.ts`: 43.24% → **70%+**
- [ ] `useViewport.ts`: 47.36% → **65%+**
- [ ] `CommandPalette.vue`: 33.33% → **70%+**
- [ ] `dragElements.ts`: 58.82% → **85%+**

## References

### Internal

- Existing test patterns: `app/features/clipboard/clipboard.browser.test.ts`
- Test harness: `app/__test-utils__/browser/DrawVueTestHarness.vue`
- Custom commands: `app/__test-utils__/commands/`
- Context menu wiring: `packages/core/src/components/DrawVue.vue` (`handleContextMenu`)
- Context menu items: `packages/core/src/features/context-menu/contextMenuItems.ts`
- Production context menu usage: `app/pages/index.vue`

### Conventions

- Use `it()` not `test()` (ESLint rule)
- Max 2 nested describes (ESLint rule)
- `TestDrawVue.create()` handles seeding and cleanup
- Assertions via `API.*` and `td.expect*()` helpers
