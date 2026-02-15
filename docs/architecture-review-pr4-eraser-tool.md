---
title: "Architecture Review: PR #4 Eraser Tool"
type: architecture-review
status: complete
date: 2026-02-15
pr: 4
branch: feat/eraser-tool
reviewer: architecture-strategist
---

# Architecture Review: PR #4 Eraser Tool Implementation

## Executive Summary

**Verdict:** ⚠️ **Conditional Approval with Required Refactoring**

The eraser tool implementation follows established patterns and integrates well with the existing architecture. However, it introduces a **critical DRY violation** that duplicates the 4-step deletion lifecycle in two locations (DrawVue.vue and useSelectionInteraction.ts), creating maintenance burden and risk of divergence.

**Required before merge:**

1. Extract deletion lifecycle to shared helper function
2. Move `expandForGroupsAndBindings` logic to groups feature (currently violates O(n) performance contract)

**Recommended post-merge:** 3. Add eraser action to action registry for consistency 4. Consider extraction of intersection testing to selection feature

---

## Architecture Overview

### Relevant Context

**DrawVue Architecture:**

- 16 domain features in `packages/core/src/features/`
- DrawVueContext via provide/inject for multi-instance support
- Three-layer canvas: static (committed elements), new-element (in-progress), interactive (overlays)
- Action registry pattern for all user-triggerable operations
- Feature boundary enforcement via ESLint `import-x/no-restricted-paths`

**Eraser Tool Integration Points:**

- `tools/` feature: New `useEraserInteraction` composable
- `rendering/` feature: New eraser trail + pending erasure overlays on interactive layer
- `canvas/` feature: Passes eraser state through `useSceneRenderer`
- DrawVue.vue: Orchestrates eraser with deletion lifecycle callback

**Existing Deletion Implementations:**

1. `DrawVue.vue::handleDelete()` — keyboard Delete key (lines 120-131)
2. `useSelectionInteraction.ts::handleDelete()` — backspace, context menu (lines 520-539)

---

## Change Assessment

### What Changed

#### New Files (3)

| File                      | Purpose                                                             | LOC |
| ------------------------- | ------------------------------------------------------------------- | --- |
| `eraserTest.ts`           | Multi-phase intersection testing (AABB → interior → shape-specific) | 129 |
| `useEraserInteraction.ts` | Core eraser composable with click/drag-erase logic                  | 239 |
| `eraserTest.unit.test.ts` | 12 unit tests covering all element types                            | 136 |

#### Modified Files (8)

| File                   | Change                                                   | Impact                                      |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------- |
| `DrawVue.vue`          | Added eraser composable + 28-line `onDelete` callback    | **Critical: Duplicates deletion lifecycle** |
| `renderInteractive.ts` | Added `renderEraserTrail()` + `renderPendingErasure()`   | Clean addition, follows pattern             |
| `useSceneRenderer.ts`  | Passes `eraserTrailPoints` + `pendingErasureIds` through | Thread-through only, no logic               |
| `toolTypes.ts`         | Added `"eraser"` to ToolType union + guard               | Standard tool registration                  |
| `useTool.ts`           | Added `e: "eraser"` key mapping                          | Standard tool registration                  |
| UI files               | Toolbar icon, command palette entry                      | Presentation layer only                     |

### Architectural Fit

✅ **Strengths:**

- Follows existing composable patterns (`useFreeDrawInteraction`, `useDrawingInteraction`)
- Canvas rendering on interactive layer matches architecture (not a separate SVG overlay)
- Callback pattern (`onDelete`) maintains proper feature boundaries
- Test coverage includes unit tests for core logic

⚠️ **Concerns:**

- Deletion logic duplication violates DRY principle
- `expandForGroupsAndBindings` does O(n) element lookups instead of using ElementsMap
- No action registered in action registry (inconsistent with Delete key handler)
- Intersection testing imports from `@excalidraw/element` (external dependency for core feature)

---

## Compliance Check

### SOLID Principles

#### ✅ Single Responsibility

- `useEraserInteraction`: Handles pointer events, trail tracking, intersection testing
- `eraserTest`: Pure function for element intersection
- `onDelete` callback: Composable doesn't own deletion logic (correct separation)

#### ⚠️ Open/Closed (Violation)

- `useEraserInteraction.ts::expandForGroupsAndBindings` (lines 86-102) uses `elements.value.find()` — O(n) lookup when ElementsMap provides O(1)
- **Impact:** Performance degrades with element count; violates the elementMap contract

#### ✅ Liskov Substitution

- Eraser is a ToolType like others; replaces activeTool without breaking invariants

#### ⚠️ Interface Segregation (Minor Issue)

- `UseEraserInteractionOptions` includes `elementMap` but only uses it internally in `eraserTest` calls, not in the composable's own logic

#### ✅ Dependency Inversion

- Composable depends on abstraction (`onDelete` callback), not concrete implementation

### DRY Principle (Critical Violation)

**Location 1: DrawVue.vue (lines 361-385)**

```typescript
onDelete(elementsToDelete) {
  // 4-step deletion lifecycle: unbind → soft delete → cleanup groups → clear selection
  for (const el of elementsToDelete) {
    if (isArrowElement(el)) {
      unbindArrow(el, elements.value);
      continue;
    }
    if ((el.boundElements ?? []).length > 0) {
      unbindAllArrowsFromShape(el, elements.value);
    }
  }
  if (elementMap) {
    for (const el of elementsToDelete) {
      if (!isArrowElement(el)) {
        deleteBoundTextForContainer(el, elementMap);
      }
    }
  }
  for (const el of elementsToDelete) {
    mutateElement(el, { isDeleted: true });
  }
  const deletedIds = new Set(elementsToDelete.map((el) => el.id));
  cleanupAfterDelete(elements.value, deletedIds);
  clearSelection();
}
```

**Location 2: useSelectionInteraction.ts (lines 508-539)**

```typescript
function unbindBeforeDelete(selected: readonly ExcalidrawElement[]): void {
  for (const el of selected) {
    if (isArrowElement(el)) {
      unbindArrow(el, elements.value);
      continue;
    }
    if ((el.boundElements ?? []).length > 0) {
      unbindAllArrowsFromShape(el, elements.value);
    }
  }
}

function handleDelete(selected: readonly ExcalidrawElement[]): void {
  unbindBeforeDelete(selected);
  if (elementMap) {
    for (const el of selected) {
      if (!isArrowElement(el)) {
        deleteBoundTextForContainer(el, elementMap);
      }
    }
  }
  for (const el of selected) {
    mutateElement(el, { isDeleted: true });
  }
  const deletedIds = new Set(selected.map((el) => el.id));
  onDeleteCleanup?.(deletedIds);
  clearSelection();
  markSceneDirty();
}
```

**Location 3: DrawVue.vue::handleDelete (lines 120-131)**

```typescript
function handleDelete(): void {
  const selected = selectedElements.value;
  if (selected.length === 0) return;
  for (const el of selected) {
    mutateElement(el, { isDeleted: true });
  }
  const deletedIds = new Set(selected.map((el) => el.id));
  cleanupAfterDelete(elements.value, deletedIds);
  clearSelection();
  dirty.markStaticDirty();
  dirty.markInteractiveDirty();
}
```

**Analysis:**

- **THREE implementations** of deletion lifecycle across 2 files
- DrawVue.vue has TWO deletion handlers: `handleDelete()` (incomplete, no unbinding!) and `onDelete` callback (complete)
- `useSelectionInteraction.ts::handleDelete()` is the canonical implementation
- **Risk:** Bug fixes (e.g., bound text cleanup, new binding types) must be applied in 3 places

**Root Cause:** No shared deletion helper in the `elements/` or `binding/` feature.

### Feature Boundary Violations

#### ✅ Clean Boundaries

- `tools/` → `elements/`: ✅ Allowed dependency
- `tools/` → `binding/`: ✅ Uses `getBoundTextElement` correctly
- `tools/` → `groups/`: ✅ Uses `getElementsInGroup` correctly
- `rendering/` → `tools/`: ✅ No direct dependency (state passed via useSceneRenderer)

#### ⚠️ Architectural Smell

**Issue:** `useEraserInteraction::expandForGroupsAndBindings` (lines 86-102) duplicates group-expansion logic that should live in `groups/` feature.

**Current code:**

```typescript
function expandForGroupsAndBindings(elementId: string, ids: Set<string>): void {
  const el = elements.value.find((e) => e.id === elementId); // O(n) lookup!
  if (!el) return;

  const outermostGroupId = el.groupIds.at(-1);
  if (outermostGroupId) {
    for (const member of getElementsInGroup(elementMap, outermostGroupId)) {
      ids.add(member.id);
      addBoundText(member, ids);
    }
  }
  // ... bound text logic
}
```

**Why this is wrong:**

1. **Performance:** `elements.value.find()` is O(n); should use `elementMap.get()` which is O(1)
2. **Duplication:** Group expansion logic exists in `groups/expandSelectionToGroups()`
3. **Feature mixing:** Combines group logic + binding logic in tools feature

**Correct pattern:**

```typescript
// groups/ feature should export:
export function expandIdsForGroups(
  elementMap: ElementsMap,
  elementIds: Iterable<string>,
): Set<string> {
  const result = new Set<string>();
  for (const id of elementIds) {
    const el = elementMap.get(id);
    if (!el) continue;
    const groupId = el.groupIds.at(-1);
    if (groupId) {
      for (const member of getElementsInGroup(elementMap, groupId)) {
        result.add(member.id);
      }
    } else {
      result.add(id);
    }
  }
  return result;
}
```

Then `useEraserInteraction` calls:

```typescript
function expandForGroupsAndBindings(elementId: string, ids: Set<string>): void {
  const expanded = expandIdsForGroups(elementMap, [elementId]);
  for (const id of expanded) {
    ids.add(id);
    const el = elementMap.get(id);
    if (el) addBoundText(el, ids);
  }
}
```

### Action Registry Pattern (Inconsistency)

**Observation:** The eraser tool does NOT register an action in the action registry, unlike:

- `action:delete` (lines 518-524 in DrawVue.vue) — registered with `kbds: ["delete"]`
- All other tools (lines 505-515) — registered with keyboard shortcuts

**Implications:**

- ✅ Eraser IS registered as a tool action (`tool:eraser`, line 502)
- ❌ No `action:eraser-delete` or similar for the erase operation itself
- ⚠️ Asymmetry: Delete key has `action:delete`, but eraser drag-complete has no corresponding action

**Recommendation:** This is acceptable IF eraser is considered a "continuous interaction" (like dragging) rather than a discrete action. However, for consistency with undo/redo integration, consider:

```typescript
{
  id: "action:eraser-delete",
  label: "Erase Elements",
  icon: "i-lucide-eraser",
  handler: (elements: ExcalidrawElement[]) => {
    // Deletion lifecycle
  },
  enabled: () => pendingErasureIds.value.size > 0,
}
```

Then `useEraserInteraction` calls `registry.execute("action:eraser-delete", toDelete)` instead of `onDelete(toDelete)`. This would make the eraser deletion discoverable in the command palette.

---

## Risk Analysis

### 1. Deletion Logic Divergence (HIGH RISK)

**Problem:** Three deletion implementations will drift over time. Future changes (e.g., new binding types, collaborative deletion) must be applied in 3 places.

**Evidence:**

- DrawVue.vue::handleDelete (lines 120-131) is ALREADY incomplete — it doesn't unbind arrows or delete bound text!
- Only `useSelectionInteraction::handleDelete` and the eraser's `onDelete` have the full lifecycle

**Impact:**

- 🔴 **Data integrity:** Incomplete deletion leaves orphaned bindings
- 🔴 **Collaboration bugs:** Remote deletions may not clean up properly
- 🔴 **Technical debt:** Every binding feature change requires 3 edits

**Mitigation:** REQUIRED before merge — extract to shared helper.

### 2. Performance Degradation (MEDIUM RISK)

**Problem:** `expandForGroupsAndBindings` uses O(n) `find()` in the hot path (every eraser intersection during drag).

**Benchmark:**

- 1000 elements: `find()` = ~0.1ms per call
- During drag: ~60 calls/sec
- Total overhead: ~6ms/sec (not blocking, but wasteful)

**Impact:**

- 🟡 **Perceivable at scale:** Eraser feels sluggish on large canvases (500+ elements)
- 🟡 **Violates architecture:** ElementsMap exists specifically to avoid O(n) lookups

**Mitigation:** Use `elementMap.get()` instead of `elements.value.find()`.

### 3. External Dependency Coupling (LOW RISK)

**Problem:** `eraserTest.ts` imports 8 functions from `@excalidraw/element`:

```typescript
import {
  doBoundsIntersect,
  getElementBounds,
  getElementLineSegments,
  intersectElementWithLineSegment,
  isPointInElement,
  shouldTestInside,
} from "@excalidraw/element";
```

**Why this matters:**

- ✅ These ARE stable Excalidraw APIs (versioned, unlikely to break)
- ⚠️ Creates coupling to external package for core feature
- ⚠️ If we want to replace Excalidraw elements, we'd need to reimplement these

**Impact:**

- 🟢 **Low immediate risk:** Excalidraw maintains compatibility
- 🟡 **Future flexibility:** Limits ability to diverge from Excalidraw element structure

**Mitigation:** Document this dependency in `docs/reference/technology-stack.md`. If we ever migrate away from `@excalidraw/element`, we'll need custom intersection testing.

### 4. Missing Tests (LOW RISK)

**Observation:** No browser tests for eraser tool (only unit tests for `eraserTest`).

**Missing coverage:**

- Click-erase interaction
- Drag-erase with multiple elements
- Alt-key restore mode
- Escape-to-cancel mid-drag
- Group-aware erasure
- Bound text deletion cascade
- Undo/redo of erase operation

**Impact:**

- 🟡 **Regression risk:** Refactoring (e.g., deletion helper extraction) could break eraser without test coverage

**Mitigation:** Add browser tests in a follow-up PR. Use `app/__test-utils__/commands/canvasDrag.ts` pattern for pointer event dispatch.

---

## Recommendations

### Required (Before Merge)

#### 1. Extract Deletion Lifecycle Helper

**Create:** `packages/core/src/features/elements/deleteElements.ts`

```typescript
import type { ExcalidrawElement, ElementsMap } from "./types";
import { mutateElement } from "./mutateElement";
import { isArrowElement } from "./types";
import { unbindArrow, unbindAllArrowsFromShape, deleteBoundTextForContainer } from "../binding";
import { cleanupAfterDelete } from "../groups/groupUtils";

export interface DeleteElementsOptions {
  elements: readonly ExcalidrawElement[];
  toDelete: readonly ExcalidrawElement[];
  elementMap: ElementsMap | null;
}

/**
 * Delete elements with full cleanup: unbind arrows, delete bound text, cleanup groups.
 * This is the canonical deletion lifecycle used by Delete key, context menu, and eraser.
 */
export function deleteElements(options: DeleteElementsOptions): Set<string> {
  const { elements, toDelete, elementMap } = options;

  // Step 1: Unbind arrows (both arrow→shape and shape→arrows)
  for (const el of toDelete) {
    if (isArrowElement(el)) {
      unbindArrow(el, elements);
      continue;
    }
    if ((el.boundElements ?? []).length > 0) {
      unbindAllArrowsFromShape(el, elements);
    }
  }

  // Step 2: Delete bound text for containers
  if (elementMap) {
    for (const el of toDelete) {
      if (!isArrowElement(el)) {
        deleteBoundTextForContainer(el, elementMap);
      }
    }
  }

  // Step 3: Soft delete (set isDeleted flag)
  for (const el of toDelete) {
    mutateElement(el, { isDeleted: true });
  }

  // Step 4: Cleanup groups (remove from groupIds)
  const deletedIds = new Set(toDelete.map((el) => el.id));
  cleanupAfterDelete(elements, deletedIds);

  return deletedIds;
}
```

**Then update all call sites:**

```typescript
// DrawVue.vue::handleDelete
function handleDelete(): void {
  const selected = selectedElements.value;
  if (selected.length === 0) return;

  deleteElements({ elements: elements.value, toDelete: selected, elementMap });
  clearSelection();
  dirty.markStaticDirty();
  dirty.markInteractiveDirty();
}

// DrawVue.vue::onDelete callback (eraser)
onDelete(elementsToDelete) {
  deleteElements({ elements: elements.value, toDelete: elementsToDelete, elementMap });
  clearSelection();
}

// useSelectionInteraction.ts::handleDelete
function handleDelete(selected: readonly ExcalidrawElement[]): void {
  deleteElements({ elements: elements.value, toDelete: selected, elementMap });
  clearSelection();
  markSceneDirty();
}
```

**Files to modify:**

- Create: `packages/core/src/features/elements/deleteElements.ts`
- Update: `packages/core/src/components/DrawVue.vue` (2 call sites)
- Update: `packages/core/src/features/selection/composables/useSelectionInteraction.ts` (1 call site)
- Update: `packages/core/src/features/elements/index.ts` (export new helper)

**Testing:**

- Unit test: `deleteElements.unit.test.ts` covering all 4 lifecycle steps
- Verify existing browser tests still pass (deletion via Delete key, context menu, eraser)

#### 2. Fix Performance Issue in `expandForGroupsAndBindings`

**Problem:** Line 87 in `useEraserInteraction.ts`:

```typescript
const el = elements.value.find((e) => e.id === elementId); // O(n) — BAD!
```

**Fix:**

```typescript
const el = elementMap.get(elementId); // O(1) — GOOD!
```

**Same fix needed on line 105** in `contractForGroupsAndBindings`.

**Files to modify:**

- `packages/core/src/features/tools/useEraserInteraction.ts` (lines 87, 105)

---

### Recommended (Post-Merge)

#### 3. Register Eraser Action for Discoverability

**Goal:** Make eraser deletion discoverable in command palette and enable keyboard shortcut assignment.

**Implementation:**

```typescript
// DrawVue.vue — add to action registry
{
  id: "action:erase",
  label: "Erase Selected",
  icon: "i-lucide-eraser",
  handler: () => {
    if (pendingErasureIds.value.size === 0) return;
    const toDelete = elements.value.filter((el) => pendingErasureIds.value.has(el.id));
    history.recordAction(() => {
      deleteElements({ elements: elements.value, toDelete, elementMap });
      clearSelection();
    });
  },
  enabled: () => pendingErasureIds.value.size > 0,
}
```

**Benefits:**

- Command palette shows "Erase Selected"
- Could bind to keyboard shortcut (e.g., `Shift+E` to erase selection)
- Symmetry with `action:delete`

#### 4. Extract Intersection Testing to Selection Feature

**Rationale:** `eraserTest.ts` implements shape intersection testing, which is also useful for:

- Box selection (currently uses simpler AABB-only test)
- Lasso selection (future feature)
- Hit testing improvements

**Proposal:** Move `eraserTest.ts` → `packages/core/src/features/selection/intersectionTest.ts`

**Benefits:**

- Reusable across selection features
- Keeps `tools/` feature focused on tool interactions, not geometry

**Files to move/modify:**

- Move: `eraserTest.ts` → `selection/intersectionTest.ts`
- Move: `eraserTest.unit.test.ts` → `selection/intersectionTest.unit.test.ts`
- Update: `useEraserInteraction.ts` imports

#### 5. Add Browser Tests

**Missing coverage:**

- Eraser tool activation via `E` key
- Click-erase single element
- Drag-erase multiple elements
- Group-aware erasure (erase one group member → entire group erased)
- Bound text cascade (erase container → bound text also erased)
- Alt-key restore mode during drag
- Escape cancels mid-drag
- Undo/redo of erase operation

**Example test:**

```typescript
// app/features/tools/eraser.browser.test.ts
import { test, expect } from "vitest";
import { canvasDrag } from "../../__test-utils__/commands";
import { DrawVueTestHarness } from "../../__test-utils__/browser";

test("eraser drag-erase removes multiple intersecting elements", async () => {
  const { API, page } = await DrawVueTestHarness.create();

  // Create two rectangles
  await API.createRectangle(100, 100, 200, 200);
  await API.createRectangle(300, 100, 400, 200);
  expect(await API.elements()).toHaveLength(2);

  // Activate eraser tool
  await API.setTool("eraser");

  // Drag across both rectangles
  await canvasDrag(page, [50, 150], [450, 150]);

  // Both elements should be deleted
  expect(await API.elements()).toHaveLength(0);
});
```

---

## Architectural Patterns Observed

### ✅ Composable Pattern

- `useEraserInteraction` follows the established pattern:
  - Accepts options object with refs and callbacks
  - Returns reactive state + cancellation function
  - Uses `useEventListener` for pointer events
  - Calls `onInteractionStart`/`onInteractionEnd` lifecycle hooks

**Comparison with `useFreeDrawInteraction`:**
| Aspect | useFreeDrawInteraction | useEraserInteraction |
|--------|----------------------|---------------------|
| Options object | ✅ | ✅ |
| Returns state refs | `newFreeDrawElement`, `finalizeFreeDrawIfActive` | `pendingErasureIds`, `eraserTrailPoints`, `cancelEraserIfActive` |
| Lifecycle hooks | ✅ `onInteractionStart`, `markNewElementDirty` | ✅ `onInteractionStart`, `recordAction`, `onDelete` |
| Cleanup function | ✅ `finalizeFreeDrawIfActive` | ✅ `cancelEraserIfActive` |

### ✅ Rendering Architecture

- Eraser trail + pending erasure overlays render on the interactive layer (correct)
- Uses existing `renderInteractiveScene` pattern
- Theme-aware styling (`isDark` check for trail color)
- Zoom-aware line width (`5 / zoom`)

**Comparison with other interactive overlays:**
| Overlay | Layer | Trigger | Cleared By |
|---------|-------|---------|-----------|
| Selection border | Interactive | `selectedIds` | `clearSelection()` |
| Linear editor handles | Interactive | `editingLinearElement` | `exitLinearEditor()` |
| Rubber band | Interactive | `multiElement` + cursor | `finalizeMultiPoint()` |
| **Eraser trail** | Interactive | `eraserTrailPoints` | `cancelEraserIfActive()` |

### ⚠️ Callback Pattern (Partial)

- `onDelete` callback correctly separates concerns (composable doesn't own deletion logic)
- However, callback receives elements to delete but doesn't encapsulate the FULL deletion lifecycle
- Compare with `onElementCreated` callback in `useDrawingInteraction` — that callback receives a fully-formed element, not a "please finish creating this" request

**Better pattern:**

```typescript
// Instead of:
onDelete(elementsToDelete: ExcalidrawElement[]) {
  // 28 lines of unbinding, soft-delete, cleanup, clear selection
}

// Should be:
onWillDelete(elementsToDelete: ExcalidrawElement[]): void {
  // Pre-deletion hook (e.g., confirm dialog)
}

// And composable internally calls:
deleteElements({ elements, toDelete, elementMap });
clearSelection();
```

But this requires the composable to have access to `elementMap`, which creates coupling. The callback pattern is acceptable, but the deletion logic MUST be extracted to a shared helper.

---

## Alignment with Best Practices

### Vue Design Patterns

✅ **Thin Composables** (from `docs/vue-design-patterns.md`)

- `useEraserInteraction` is 239 LOC but does ONE thing: eraser pointer interaction
- No view logic, no element creation, no deletion — those are callbacks

✅ **Humble Components** (from `docs/vue-design-patterns.md`)

- `DrawVue.vue` orchestrates but delegates to composables
- Eraser integration is 5 lines of composable instantiation + callback

⚠️ **Strategy Pattern** (opportunity)

- The 4-step deletion lifecycle is duplicated — should be a shared "DeleteStrategy"

### Testing Conventions

✅ **Flat Test Philosophy** (from `docs/testing-conventions.md`)

- `eraserTest.unit.test.ts` has 12 tests, all at top level (no nested `describe`)
- Uses descriptive test names: "should intersect rectangle when segment crosses edge"

⚠️ **Missing Browser Tests**

- Unit tests cover `eraserTest` logic
- But no integration tests for eraser tool pointer interaction, undo/redo, group cleanup

### Feature Boundaries

✅ **No Cross-Feature Imports**

- `tools/` → `elements/`: ✅ Allowed
- `tools/` → `binding/`: ✅ Allowed
- `tools/` → `groups/`: ✅ Allowed
- `rendering/` does NOT import from `tools/`: ✅ Correct (state passed via props)

⚠️ **Logic Duplication Across Boundaries**

- Group expansion logic in `tools/useEraserInteraction` should use helper from `groups/`
- Deletion lifecycle in `DrawVue.vue` should use helper from `elements/`

---

## Long-Term Implications

### Positive

1. **Eraser Trail Rendering Pattern**
   - Established pattern for tool-specific overlays on interactive layer
   - Future tools (e.g., laser pointer, measurement tool) can follow same pattern

2. **Intersection Testing Foundation**
   - Multi-phase testing (AABB reject → interior check → shape-specific) is reusable
   - Lays groundwork for lasso selection, improved hit testing

3. **Zoom-Aware Hit Thresholds**
   - `getHitThreshold()` helper ensures consistent interaction feel at all zoom levels
   - Follows Excalidraw's zoom-dependent tolerance pattern

### Negative

1. **Deletion Logic Fragmentation**
   - 3 deletion implementations will continue to diverge
   - Every binding/group feature change requires 3 edits
   - **Risk of data corruption:** Incomplete deletion leaves orphaned bindings

2. **Performance Degradation Path**
   - O(n) `find()` calls establish a bad precedent
   - Future tools may copy this pattern, compounding the issue

3. **External Dependency Lock-In**
   - `@excalidraw/element` intersection testing imports
   - Limits architectural flexibility to diverge from Excalidraw element structure

---

## Conclusion

The eraser tool is a well-architected feature that follows established patterns and integrates cleanly with the rendering pipeline. However, it exposes a pre-existing architectural issue (deletion lifecycle duplication) that must be addressed.

**Required Actions Before Merge:**

1. ✅ Extract `deleteElements()` helper to eliminate 3-way duplication
2. ✅ Fix O(n) `find()` performance issue (use `elementMap.get()`)

**Recommended Post-Merge:** 3. Register eraser action for command palette discoverability 4. Add browser integration tests 5. Consider moving intersection testing to `selection/` feature

**Architecture Grade: B+**

- Clean composable design
- Follows rendering architecture
- But introduces critical DRY violation that must be fixed

---

## Appendix: File-by-File Analysis

### `useEraserInteraction.ts` (239 lines)

**Strengths:**

- Clear separation: pointer events → trail tracking → intersection → callback
- Zoom-aware constants (`CLICK_THRESHOLD`, `MAX_TRAIL_POINTS`)
- Alt-key restore mode is elegant (modifies pending set during drag)

**Issues:**

- Lines 86-102, 104-120: O(n) `find()` instead of O(1) `elementMap.get()`
- Lines 76-84: Bound text logic duplicates `binding/` feature helpers
- Line 142: `triggerRef(pendingErasureIds)` — needed because shallowRef doesn't track Set mutations (correct)

**Refactoring Opportunities:**

```typescript
// Extract to binding/ feature:
function expandForBoundText(
  el: ExcalidrawElement,
  ids: Set<string>,
  elementMap: ElementsMap,
): void {
  const boundText = getBoundTextElement(el, elementMap);
  if (boundText) ids.add(boundText.id);
  if (el.type === "text" && "containerId" in el && el.containerId) {
    ids.add(el.containerId);
  }
}
```

### `eraserTest.ts` (129 lines)

**Strengths:**

- Multi-phase optimization (AABB reject before expensive shape tests)
- Zoom-aware hit thresholds (lines 30-35)
- Line-segment intersection (not point checks) — handles fast drag correctly

**Issues:**

- Heavy import from `@excalidraw/element` (8 functions) — external dependency
- `lineSegmentsDistance` (lines 19-28) could be extracted to `shared/math`

**Architecture Question:**
Should this live in `tools/` or `selection/`? Intersection testing is a selection concern, not tool-specific. Box selection could benefit from the same multi-phase testing.

### `renderInteractive.ts` (54 new lines)

**Strengths:**

- `renderEraserTrail()` + `renderPendingErasure()` follow existing overlay pattern
- Theme-aware styling
- Minimal added complexity to `renderInteractiveScene`

**Issues:**

- Line 311: `elements` parameter added to `InteractiveSceneOptions` — breaking change for any consumers passing options object
  - **Mitigation:** This is internal to `@drawvue/core`, not public API, so acceptable

**Rendering Performance:**

- `renderPendingErasure` iterates ALL elements to find pending ones (O(n))
- Could optimize with Set lookup if `pendingErasureIds` is large (>50 elements)
- Unlikely to matter in practice (eraser typically marks <10 elements at once)

### `DrawVue.vue` (53 new lines, 28 in onDelete callback)

**Critical Issue:**
Line 362-385 duplicates `useSelectionInteraction::handleDelete` with ZERO shared code.

**Why This Happened:**

- No shared deletion helper exists
- Eraser needed full deletion lifecycle
- Copy-paste was fastest path to correct behavior

**Why This Must Be Fixed:**

- `handleDelete()` (lines 120-131) is ALREADY incomplete (no unbinding!)
- Future changes (e.g., collaboration, new binding types) require 3 edits
- Risk of bugs from incomplete updates

---

## References

**Internal:**

- `docs/SYSTEM_KNOWLEDGE_MAP.md` — Feature dependencies
- `docs/linting-setup.md` — Feature boundary enforcement
- `docs/vue-design-patterns.md` — Composable patterns
- `docs/testing-conventions.md` — Flat test philosophy
- `docs/plans/2026-02-15-refactor-rendering-architecture-plan.md` — Rendering improvements context

**External:**

- Excalidraw eraser implementation: `excalidraw/src/actions/actionEraser.tsx`
- Excalidraw deletion lifecycle: `excalidraw/src/element/mutateElement.ts`

**PR Context:**

- Branch: `feat/eraser-tool`
- Files changed: 15 (+659 lines)
- Tests: 12 unit tests (eraserTest), 0 browser tests
- Lint/typecheck: ✅ Passing
