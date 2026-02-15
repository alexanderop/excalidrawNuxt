---
title: "fix: Crosshair cursor not showing for drawing tools"
type: fix
status: completed
date: 2026-02-15
---

# fix: Crosshair cursor not showing for drawing tools

## Overview

When a drawing tool is selected (rectangle, ellipse, diamond, arrow, line, text, code, image, freedraw), the cursor should change to a crosshair to signal the user can draw. The logic exists but the cursor doesn't visually change — likely because Tailwind v4 isn't generating the dynamic cursor CSS classes.

## Problem Statement

The crosshair cursor logic is fully implemented across two layers:

1. **`usePanning.ts:33-38`** — returns `cursor-crosshair` for drawing tools via `isDrawingTool()`
2. **`DrawVue.vue:651-662`** — `CROSSHAIR_TOOLS` set covers text, code, image, freedraw; `combinedCursorClass` computed merges both layers

The class is correctly bound to `.drawvue-container` via `:class="combinedCursorClass"`. The interactive canvas (child element) should inherit the cursor via CSS inheritance.

**Root cause hypothesis:** Tailwind v4 uses on-demand class generation via content scanning. The cursor classes are constructed **dynamically** in TypeScript computed properties (e.g., `"cursor-crosshair"`, `` `cursor-${cursorStyle.value}` ``). These are inside `packages/core/src/` — a workspace dependency that Tailwind may not scan, or the dynamic string construction prevents static analysis.

## Proposed Solution

Replace Tailwind cursor utility classes with **inline `cursor` styles** in the computed property. This removes the dependency on Tailwind's content scanner and is the most reliable approach for programmatic cursor changes.

**Why inline styles over safelisting:**

- No Tailwind config changes needed
- Works regardless of how `@drawvue/core` is consumed (dev stub, built output, different apps)
- Cursor is a single CSS property — inline style is cleaner than managing a safelist
- Matches how Excalidraw does it (`canvas.style.cursor = CURSOR_TYPE.CROSSHAIR`)

## Acceptance Criteria

- [x] Crosshair cursor appears when selecting any drawing tool (rectangle, diamond, ellipse, arrow, line)
- [x] Crosshair cursor appears for text, code, image, freedraw tools
- [x] Grab cursor appears when space is held or hand tool is active
- [x] Grabbing cursor appears while actively panning
- [x] Selection tool shows resize/move cursors on element hover
- [x] Default cursor shows for selection tool on empty canvas
- [x] Existing unit tests for `usePanning` still pass

## Implementation

### Phase 1: Switch from CSS classes to inline styles

**`packages/core/src/features/canvas/composables/usePanning.ts`**

Change `cursorClass` to return CSS cursor values instead of Tailwind classes:

```typescript
// Before
const cursorClass = computed<string>(() => {
  if (isPanning.value) return "cursor-grabbing";
  if (spaceHeld.value || activeTool.value === "hand") return "cursor-grab";
  if (isDrawingTool(activeTool.value)) return "cursor-crosshair";
  return "cursor-default";
});

// After — rename to cursorStyle, return CSS values
const cursorStyle = computed<string>(() => {
  if (isPanning.value) return "grabbing";
  if (spaceHeld.value || activeTool.value === "hand") return "grab";
  if (isDrawingTool(activeTool.value)) return "crosshair";
  return "default";
});
```

**`packages/core/src/components/DrawVue.vue`**

Change `combinedCursorClass` to `combinedCursor` returning CSS values, bind as inline style:

```typescript
// Before
const CROSSHAIR_TOOLS = new Set<ToolType>(["text", "code", "image", "freedraw"]);
const combinedCursorClass = computed(() => {
  if (cursorClass.value !== "cursor-default") return cursorClass.value;
  if (multiElement.value) return "cursor-crosshair";
  if (editingLinearElement.value) return "cursor-pointer";
  if (CROSSHAIR_TOOLS.has(activeTool.value)) return "cursor-crosshair";
  if (activeTool.value === "selection" && cursorStyle.value !== "default") {
    return `cursor-${cursorStyle.value}`;
  }
  return "cursor-default";
});

// After — return CSS cursor values
const CROSSHAIR_TOOLS = new Set<ToolType>(["text", "code", "image", "freedraw"]);
const combinedCursor = computed(() => {
  if (panningCursor.value !== "default") return panningCursor.value;
  if (multiElement.value) return "crosshair";
  if (editingLinearElement.value) return "pointer";
  if (CROSSHAIR_TOOLS.has(activeTool.value)) return "crosshair";
  if (activeTool.value === "selection" && selectionCursor.value !== "default") {
    return selectionCursor.value;
  }
  return "default";
});
```

Template change:

```vue
<!-- Before -->
<div class="drawvue-container" :class="combinedCursorClass">

<!-- After -->
<div class="drawvue-container" :style="{ cursor: combinedCursor }">
```

### Phase 2: Update tests

**`packages/core/src/features/canvas/composables/usePanning.unit.test.ts`**

Update assertions to expect CSS cursor values instead of Tailwind class names:

```typescript
// Before
expect(cursorClass.value).toBe("cursor-crosshair");

// After
expect(cursorStyle.value).toBe("crosshair");
```

### Files to modify

| File                                                                    | Change                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| `packages/core/src/features/canvas/composables/usePanning.ts`           | Rename `cursorClass` → `cursorStyle`, return CSS values |
| `packages/core/src/components/DrawVue.vue`                              | Use inline `style` binding, rename variables            |
| `packages/core/src/features/canvas/composables/usePanning.unit.test.ts` | Update expected values                                  |
| `packages/core/src/features/canvas/index.ts`                            | Update export if `cursorClass` is exported              |

## References

- `packages/core/src/features/canvas/composables/usePanning.ts:33-38` — current cursor logic
- `packages/core/src/components/DrawVue.vue:651-662` — combined cursor class logic
- `packages/core/src/shared/toolTypes.ts:14-20` — `isDrawingTool` type guard
- `excalidraw/packages/excalidraw/cursor.ts` — Excalidraw reference (uses `canvas.style.cursor`)
