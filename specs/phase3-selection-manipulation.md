# Phase 3: Selection & Element Manipulation — Tech Spec

> **Goal**: Select elements, move them by dragging, resize via handles, delete, and support multi-selection. This is the phase that turns a drawing tool into an editing tool.

---

## Table of Contents

1. [Current State (What We Have)](#1-current-state)
2. [How Excalidraw Solves It](#2-how-excalidraw-solves-it)
3. [Our Architecture Plan](#3-our-architecture-plan)
4. [Hit Detection](#4-hit-detection)
5. [Selection State](#5-selection-state)
6. [Transform Handles](#6-transform-handles)
7. [Drag-to-Move](#7-drag-to-move)
8. [Resize via Handles](#8-resize-via-handles)
9. [Selection Rendering (Interactive Canvas)](#9-selection-rendering)
10. [Cursor Management](#10-cursor-management)
11. [Keyboard Actions](#11-keyboard-actions)
12. [Interaction State Machine](#12-interaction-state-machine)
13. [File Map](#13-file-map)
14. [Testing Strategy](#14-testing-strategy)
15. [Parallelization Plan (Agent Swarm)](#15-parallelization-plan)
16. [Implementation Order](#16-implementation-order)
17. [File Map](#13-file-map)
18. [Implementation Order](#14-implementation-order)

---

## 1. Current State

### Already Built (Phases 1 & 2)

```
Canvas Foundation          Element System              Tool System
├─ Triple canvas stack     ├─ Types: rect/ellipse/     ├─ useTool (V/R/O/D/H)
│  (static/new/interactive)│    diamond                 ├─ useDrawingInteraction
├─ RAF render loop         ├─ createElement()           │  (pointerdown → draw → up)
│  w/ dirty flags          ├─ mutateElement()           ├─ DrawingToolbar.vue
├─ HiDPI support           │  (version bump)            └─ Keyboard shortcuts
├─ Viewport (pan/zoom)     ├─ useElements store
├─ Coordinate conversion   │  (shallowRef + addElement)
│  (screen ↔ scene)        └─ Shape cache (versionNonce)
├─ usePanning
│  (space/hand/wheel)
└─ Dot grid rendering
```

### What's Missing for Phase 3

| Component                        | Status                    | Needed For                           |
| -------------------------------- | ------------------------- | ------------------------------------ |
| Hit detection (point-in-shape)   | Not built                 | Clicking to select                   |
| Bounding box calculation         | Not built                 | Selection borders, handles           |
| Selection state (`useSelection`) | Not built                 | Tracking what's selected             |
| Transform handles (positions)    | Not built                 | Resize/rotate affordances            |
| Handle hit detection             | Not built                 | Knowing which handle was clicked     |
| Drag-to-move logic               | Not built                 | Moving elements                      |
| Resize logic                     | Not built                 | Changing element dimensions          |
| Interactive canvas rendering     | Callbacks exist but empty | Drawing selection UI                 |
| Box-select (marquee)             | Not built                 | Multi-select by dragging empty space |
| Cursor changes on hover          | Partial (crosshair/grab)  | Resize cursors, move cursor          |
| Delete selected                  | Not built                 | Removing elements                    |
| Arrow key movement               | Not built                 | Nudging elements                     |

---

## 2. How Excalidraw Solves It

### 2.1 Hit Detection — Two-Phase Approach

Excalidraw uses a **fast-reject → precise-test** pipeline:

```
Pointer click at (px, py)
  │
  ▼
Phase 1: Bounding Box (cheap)
  ├─ getElementBounds(el) → [x1, y1, x2, y2]
  ├─ Inverse-rotate point by -el.angle
  ├─ Is point within padded AABB?
  │   NO  → skip (99% of elements filtered here)
  │   YES → continue to Phase 2
  ▼
Phase 2: Precise Shape Test (expensive)
  ├─ shouldTestInside(el)?
  │   YES (filled) → isPointInElement() — ray casting algorithm
  │   NO  (outline) → isPointOnElementOutline() — distance to edges
  └─ Return hit/miss
```

**Key files**: `packages/element/src/collision.ts` (lines 117-193)

Shape-specific intersection tests:

- **Rectangles**: Decompose into sides + rounded-corner Bezier curves
- **Ellipses**: Mathematical `(x/rx)² + (y/ry)² ≤ 1`
- **Diamonds**: 4-vertex polygon intersection
- **Threshold**: `max(strokeWidth/2, 10/zoom)` — easier to click at low zoom

### 2.2 Selection State

```typescript
// Excalidraw's approach (React state)
selectedElementIds: Record<string, true>; // O(1) lookup via object keys
selectedGroupIds: Record<string, boolean>; // group-level selection
```

Element selection is tracked as an **ID set** (object with `true` values). This makes toggle/add/remove O(1) and serializable.

### 2.3 Transform Handles

Excalidraw renders **8 resize handles + 1 rotation handle**:

```
        rotation
           ●
    nw ■───n───■ ne
       │       │
    w  ■   ●   ■  e     ● = center (not rendered)
       │       │
    sw ■───s───■ se
```

Handle sizes adapt to input device: mouse=8px, pen=16px, touch=28px.

Side handles (n/s/e/w) only shown if element is large enough (`> 5 * handleSize`).

**Key file**: `packages/element/src/transformHandles.ts`

### 2.4 Moving Elements

```
pointerDown on selected element
  → Store originalElements Map (snapshot of all selected element positions)
  → Store drag.offset (pointer position relative to element bounds)

pointerMove
  → newX = originalElement.x + (currentPointer.x - origin.x)
  → newY = originalElement.y + (currentPointer.y - origin.y)
  → mutateElement(el, { x: newX, y: newY })
  → markDirty()

pointerUp
  → Finalize (push to undo stack)
```

**Key pattern**: Excalidraw stores the **original position at pointerDown** and always calculates absolute position from `origin + delta`. This avoids floating-point drift that accumulates with incremental `+=` updates.

**Key file**: `packages/element/src/dragElements.ts`

### 2.5 Resizing Elements

```
pointerDown on handle (e.g. "se")
  → Store handleType, original element bounds
  → Store resize offset

pointerMove
  → Inverse-rotate pointer by -element.angle (work in unrotated space)
  → Calculate new width/height based on handleType:
      "se": width = pointerX - el.x,  height = pointerY - el.y
      "nw": width = el.x2 - pointerX, height = el.y2 - pointerY (+ reposition)
      "e":  width = pointerX - el.x   (height unchanged)
      etc.
  → Shift held? Lock aspect ratio
  → Alt held? Resize from center (both sides equally)
  → Apply min size constraint (1x1)
  → mutateElement(el, { x, y, width, height })
  → markDirty()

pointerUp
  → Finalize
```

**Key insight**: For corner handles that change the origin (nw, n, w, ne, sw), the element's `x`/`y` must also update — not just `width`/`height`.

**Key file**: `packages/element/src/resizeElements.ts`

### 2.6 Cursor Logic

```
Hovering over canvas (selection tool active):
  │
  ├─ Over resize handle? → directional cursor (ns, ew, nwse, nesw)
  │   └─ Rotated by element.angle
  ├─ Over rotation handle? → grab cursor
  ├─ Over selected element? → move cursor
  ├─ Over unselected element? → default cursor
  └─ Over empty space? → default cursor
```

**Key file**: `packages/element/src/resizeTest.ts` (line 219+)

---

## 3. Our Architecture Plan

### Design Principles

1. **Pure functions** for all geometry (hit test, bounds, handle positions) — easily testable
2. **Composable** for reactive state (`useSelection`) — integrates with Vue
3. **Origin-based deltas** for dragging — no floating-point drift
4. **Adapted from Excalidraw** but simplified — no groups, frames, linear editing, snapping (yet)

### What We Simplify vs. Excalidraw

| Excalidraw Has             | Our MVP                  | Reason                                       |
| -------------------------- | ------------------------ | -------------------------------------------- |
| Groups, frames, bound text | Skip                     | Complexity; add later                        |
| Lasso selection            | Skip                     | Box-select is sufficient for MVP             |
| Object snapping            | Skip                     | Nice-to-have, not essential                  |
| Rotation handle            | **Include**              | High value, low complexity for simple shapes |
| Multi-element resize       | Skip                     | Single-element resize first                  |
| Elbow arrows, bindings     | Skip                     | Phase 4+                                     |
| Per-element canvas cache   | Already have shape cache | Sufficient for MVP                           |

---

## 4. Hit Detection

### 4.1 API

```typescript
// features/selection/hitTest.ts

/**
 * Tests if a scene-space point hits an element.
 * Two-phase: fast bounding-box reject, then precise shape test.
 */
function hitTest(point: Point, element: ExcalidrawElement, zoom: number): boolean;

/**
 * Returns the topmost (highest z-index) element at a scene position.
 * Iterates elements back-to-front, returns first hit.
 */
function getElementAtPosition(
  scenePoint: Point,
  elements: readonly ExcalidrawElement[],
  zoom: number,
): ExcalidrawElement | null;
```

### 4.2 Algorithm — Rectangle

```typescript
function hitTestRectangle(point: Point, el: ExcalidrawElement, threshold: number): boolean {
  // 1. Inverse-rotate point around element center
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rotated = rotatePoint(point, { x: cx, y: cy }, -el.angle);

  // 2. If filled → test inside
  if (el.backgroundColor !== "transparent") {
    return (
      rotated.x >= el.x - threshold &&
      rotated.x <= el.x + el.width + threshold &&
      rotated.y >= el.y - threshold &&
      rotated.y <= el.y + el.height + threshold
    );
  }

  // 3. If outline-only → test distance to each edge
  return isPointNearRectOutline(rotated, el, threshold);
}
```

### 4.3 Algorithm — Ellipse

```typescript
function hitTestEllipse(point: Point, el: ExcalidrawElement, threshold: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rotated = rotatePoint(point, { x: cx, y: cy }, -el.angle);

  const rx = el.width / 2;
  const ry = el.height / 2;
  const dx = rotated.x - cx;
  const dy = rotated.y - cy;

  // Normalized distance from center
  const normalizedDist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);

  if (el.backgroundColor !== "transparent") {
    // Filled: point inside ellipse (with threshold for stroke)
    const outerRx = rx + threshold;
    const outerRy = ry + threshold;
    return (dx * dx) / (outerRx * outerRx) + (dy * dy) / (outerRy * outerRy) <= 1;
  }

  // Outline-only: point near the ellipse boundary
  const innerRx = Math.max(0, rx - threshold);
  const innerRy = Math.max(0, ry - threshold);
  const outerRx = rx + threshold;
  const outerRy = ry + threshold;
  const outerDist = (dx * dx) / (outerRx * outerRx) + (dy * dy) / (outerRy * outerRy);
  const innerDist = (dx * dx) / (innerRx * innerRx) + (dy * dy) / (innerRy * innerRy);
  return outerDist <= 1 && innerDist >= 1;
}
```

### 4.4 Algorithm — Diamond

```typescript
function hitTestDiamond(point: Point, el: ExcalidrawElement, threshold: number): boolean {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rotated = rotatePoint(point, { x: cx, y: cy }, -el.angle);

  // Diamond vertices: top, right, bottom, left
  const vertices: Point[] = [
    { x: cx, y: el.y }, // top
    { x: el.x + el.width, y: cy }, // right
    { x: cx, y: el.y + el.height }, // bottom
    { x: el.x, y: cy }, // left
  ];

  if (el.backgroundColor !== "transparent") {
    return isPointInPolygon(rotated, vertices, threshold);
  }
  return isPointNearPolygonOutline(rotated, vertices, threshold);
}
```

### 4.5 Threshold Calculation

```typescript
function getHitThreshold(element: ExcalidrawElement, zoom: number): number {
  return Math.max(element.strokeWidth / 2 + 0.1, 10 / zoom);
}
```

This ensures elements are always clickable — even thin strokes at low zoom.

---

## 5. Selection State

### 5.1 `useSelection` Composable

```typescript
// features/selection/composables/useSelection.ts

function useSelection(elements: ShallowRef<readonly ExcalidrawElement[]>) {
  // Core state: set of selected element IDs
  const selectedIds = shallowRef<ReadonlySet<string>>(new Set());

  // Derived: array of selected elements (non-deleted)
  const selectedElements = computed(() =>
    elements.value.filter((el) => selectedIds.value.has(el.id) && !el.isDeleted),
  );

  // Derived: common bounding box of all selected elements
  const selectionBounds = computed(() =>
    selectedElements.value.length > 0 ? getCommonBounds(selectedElements.value) : null,
  );

  // Actions
  function select(id: string): void; // Replace selection with single ID
  function addToSelection(id: string): void; // Add to existing selection
  function removeFromSelection(id: string): void;
  function toggleSelection(id: string): void; // Toggle (for shift-click)
  function clearSelection(): void;
  function selectAll(): void;
  function isSelected(id: string): boolean;

  return {
    selectedIds, // readonly
    selectedElements, // computed
    selectionBounds, // computed [x1, y1, x2, y2] | null
    select,
    addToSelection,
    removeFromSelection,
    toggleSelection,
    clearSelection,
    selectAll,
    isSelected,
  };
}
```

### 5.2 Why `Set<string>` over `Record<string, true>`

Excalidraw uses `Record<string, true>` (a React/Redux convention). We use `Set` because:

- Cleaner API: `.has()`, `.add()`, `.delete()` vs. `obj[key] = true`, `delete obj[key]`
- Better TypeScript support
- Same O(1) performance
- Wrapped in `shallowRef` for Vue reactivity (replace entire Set on change)

---

## 6. Transform Handles

### 6.1 Handle Types and Positions

```typescript
// features/selection/transformHandles.ts

type TransformHandleDirection = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
type TransformHandleType = TransformHandleDirection | "rotation";

// A handle is defined by its center point and dimensions [x, y, width, height]
type TransformHandle = [x: number, y: number, width: number, height: number];
type TransformHandles = Partial<Record<TransformHandleType, TransformHandle>>;
```

### 6.2 Handle Position Calculation

```typescript
const HANDLE_SIZE = 8; // px (screen space, divided by zoom for scene space)
const HANDLE_MARGIN = 4; // gap between element border and handle
const ROTATION_HANDLE_OFFSET = 20; // distance above element for rotation handle

function getTransformHandles(
  element: ExcalidrawElement,
  zoom: number,
  omitSides?: Set<TransformHandleType>,
): TransformHandles {
  const size = HANDLE_SIZE / zoom;
  const margin = HANDLE_MARGIN / zoom;
  const halfSize = size / 2;

  const [x1, y1, x2, y2] = getElementBounds(element);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const w = x2 - x1;
  const h = y2 - y1;

  const handles: TransformHandles = {};

  // Corner handles (always shown)
  handles.nw = [x1 - margin - size, y1 - margin - size, size, size];
  handles.ne = [x2 + margin, y1 - margin - size, size, size];
  handles.sw = [x1 - margin - size, y2 + margin, size, size];
  handles.se = [x2 + margin, y2 + margin, size, size];

  // Side handles (only if element large enough: > 5 * handleSize)
  if (w > 5 * size) {
    handles.n = [cx - halfSize, y1 - margin - size, size, size];
    handles.s = [cx - halfSize, y2 + margin, size, size];
  }
  if (h > 5 * size) {
    handles.w = [x1 - margin - size, cy - halfSize, size, size];
    handles.e = [x2 + margin, cy - halfSize, size, size];
  }

  // Rotation handle (above element)
  const rotOffset = ROTATION_HANDLE_OFFSET / zoom;
  handles.rotation = [cx - halfSize, y1 - margin - size - rotOffset, size, size];

  // Rotate all handle positions by element.angle around element center
  if (element.angle !== 0) {
    for (const [key, handle] of Object.entries(handles)) {
      const handleCenter = {
        x: handle[0] + handle[2] / 2,
        y: handle[1] + handle[3] / 2,
      };
      const rotated = rotatePoint(handleCenter, { x: cx, y: cy }, element.angle);
      handles[key as TransformHandleType] = [
        rotated.x - handle[2] / 2,
        rotated.y - handle[3] / 2,
        handle[2],
        handle[3],
      ];
    }
  }

  return handles;
}
```

### 6.3 Handle Hit Detection

```typescript
function getTransformHandleAtPosition(
  scenePoint: Point,
  element: ExcalidrawElement,
  zoom: number,
): TransformHandleType | null {
  const handles = getTransformHandles(element, zoom);

  for (const [type, [hx, hy, hw, hh]] of Object.entries(handles)) {
    if (
      scenePoint.x >= hx &&
      scenePoint.x <= hx + hw &&
      scenePoint.y >= hy &&
      scenePoint.y <= hy + hh
    ) {
      return type as TransformHandleType;
    }
  }
  return null;
}
```

---

## 7. Drag-to-Move

### 7.1 Core Algorithm

```typescript
// features/selection/dragElements.ts

interface DragState {
  /** Scene-space pointer position at drag start */
  origin: Point;
  /** Snapshot of each selected element's position at drag start */
  originalPositions: Map<string, Point>;
}

function startDrag(scenePoint: Point, selectedElements: readonly ExcalidrawElement[]): DragState {
  const originalPositions = new Map<string, Point>();
  for (const el of selectedElements) {
    originalPositions.set(el.id, { x: el.x, y: el.y });
  }
  return { origin: scenePoint, originalPositions };
}

function continueDrag(
  scenePoint: Point,
  dragState: DragState,
  selectedElements: readonly ExcalidrawElement[],
): void {
  const dx = scenePoint.x - dragState.origin.x;
  const dy = scenePoint.y - dragState.origin.y;

  for (const el of selectedElements) {
    const original = dragState.originalPositions.get(el.id);
    if (!original) continue;
    mutateElement(el, {
      x: original.x + dx,
      y: original.y + dy,
    });
  }
}
```

**Why origin-based**: Each frame computes `original + totalDelta` instead of `current + frameDelta`. This eliminates floating-point accumulation errors over many frames.

### 7.2 Shift-Constrained Drag

When Shift is held, lock movement to the dominant axis:

```typescript
function getConstrainedDelta(dx: number, dy: number): Point {
  if (Math.abs(dx) > Math.abs(dy)) {
    return { x: dx, y: 0 };
  }
  return { x: 0, y: dy };
}
```

---

## 8. Resize via Handles

### 8.1 Core Algorithm

```typescript
// features/selection/resizeElement.ts

interface ResizeState {
  handleType: TransformHandleDirection;
  /** Original element bounds at resize start */
  originalBounds: { x: number; y: number; width: number; height: number };
  /** Scene-space pointer position at resize start */
  origin: Point;
}

function resizeElement(
  scenePoint: Point,
  resizeState: ResizeState,
  element: ExcalidrawElement,
  shiftKey: boolean,
): void {
  const { handleType, originalBounds: ob, origin } = resizeState;

  // Work in unrotated coordinate space
  const center = { x: ob.x + ob.width / 2, y: ob.y + ob.height / 2 };
  const unrotatedPointer = rotatePoint(scenePoint, center, -element.angle);
  const unrotatedOrigin = rotatePoint(origin, center, -element.angle);
  const dx = unrotatedPointer.x - unrotatedOrigin.x;
  const dy = unrotatedPointer.y - unrotatedOrigin.y;

  let { x, y, width, height } = ob;

  // Apply delta based on which handle is being dragged
  if (handleType.includes("e")) {
    width += dx;
  }
  if (handleType.includes("w")) {
    x += dx;
    width -= dx;
  }
  if (handleType.includes("s")) {
    height += dy;
  }
  if (handleType.includes("n")) {
    y += dy;
    height -= dy;
  }

  // Shift: lock aspect ratio
  if (shiftKey) {
    const aspectRatio = ob.width / ob.height;
    if (handleType === "n" || handleType === "s") {
      width = height * aspectRatio;
    } else if (handleType === "e" || handleType === "w") {
      height = width / aspectRatio;
    } else {
      // Corner: use the dominant axis
      const newAspect = Math.abs(width) / Math.abs(height);
      if (newAspect > aspectRatio) {
        height = (Math.sign(height) * Math.abs(width)) / aspectRatio;
      } else {
        width = Math.sign(width) * Math.abs(height) * aspectRatio;
      }
    }
  }

  // Enforce minimum size
  const MIN_SIZE = 1;
  if (Math.abs(width) < MIN_SIZE) width = Math.sign(width) * MIN_SIZE || MIN_SIZE;
  if (Math.abs(height) < MIN_SIZE) height = Math.sign(height) * MIN_SIZE || MIN_SIZE;

  // Handle negative dimensions (dragging past opposite edge)
  if (width < 0) {
    x += width;
    width = Math.abs(width);
  }
  if (height < 0) {
    y += height;
    height = Math.abs(height);
  }

  mutateElement(element, { x, y, width, height });
}
```

### 8.2 Handle → Axis Mapping

```
Handle  │ Affects X  │ Affects Y  │ Affects Width  │ Affects Height
────────┼────────────┼────────────┼────────────────┼───────────────
  nw    │    yes     │    yes     │     yes        │     yes
  n     │    no      │    yes     │     no         │     yes
  ne    │    no      │    yes     │     yes        │     yes
  e     │    no      │    no      │     yes        │     no
  se    │    no      │    no      │     yes        │     yes
  s     │    no      │    no      │     no         │     yes
  sw    │    yes     │    no      │     yes        │     yes
  w     │    yes     │    no      │     yes        │     no
```

---

## 9. Selection Rendering

### 9.1 What Gets Drawn on the Interactive Canvas

```
Interactive Canvas renders:
├─ Selection border (dashed blue rectangle around each selected element)
├─ Transform handles (small squares at corners/sides + circle for rotation)
├─ Selection box / marquee (while drag-selecting on empty space)
└─ (Future: snap guidelines, multi-cursor)
```

### 9.2 Rendering Selection Border

```typescript
// features/rendering/renderInteractive.ts

const SELECTION_COLOR = "#4a90d9"; // Blue
const SELECTION_LINE_WIDTH = 1; // px (screen space)
const SELECTION_PADDING = 4; // gap around element

function renderSelectionBorder(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  zoom: number,
): void {
  const padding = SELECTION_PADDING / zoom;
  const lineWidth = SELECTION_LINE_WIDTH / zoom;

  ctx.save();
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([8 / zoom, 4 / zoom]);

  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;

  ctx.translate(cx, cy);
  ctx.rotate(element.angle);

  ctx.strokeRect(
    -element.width / 2 - padding,
    -element.height / 2 - padding,
    element.width + padding * 2,
    element.height + padding * 2,
  );

  ctx.restore();
}
```

### 9.3 Rendering Transform Handles

```typescript
const HANDLE_FILL = "#ffffff";
const HANDLE_STROKE = SELECTION_COLOR;

function renderTransformHandles(
  ctx: CanvasRenderingContext2D,
  handles: TransformHandles,
  zoom: number,
): void {
  const lineWidth = 1 / zoom;
  const cornerRadius = 2 / zoom;

  ctx.save();
  ctx.fillStyle = HANDLE_FILL;
  ctx.strokeStyle = HANDLE_STROKE;
  ctx.lineWidth = lineWidth;

  for (const [type, [x, y, w, h]] of Object.entries(handles)) {
    ctx.beginPath();
    if (type === "rotation") {
      // Rotation handle: circle
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
    } else {
      // Resize handle: rounded rectangle
      ctx.roundRect(x, y, w, h, cornerRadius);
    }
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
```

### 9.4 Rendering Box-Select Marquee

```typescript
function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  zoom: number,
): void {
  ctx.save();
  ctx.fillStyle = "rgba(74, 144, 217, 0.1)"; // Light blue fill
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([]);

  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.restore();
}
```

---

## 10. Cursor Management

### 10.1 Cursor Decision Tree

```typescript
function getSelectionCursor(
  scenePoint: Point,
  selectedElements: readonly ExcalidrawElement[],
  allElements: readonly ExcalidrawElement[],
  zoom: number,
): string {
  // 1. Check if hovering over a transform handle of any selected element
  for (const el of selectedElements) {
    const handleType = getTransformHandleAtPosition(scenePoint, el, zoom);
    if (handleType) {
      return getResizeCursor(handleType, el.angle);
    }
  }

  // 2. Check if hovering over a selected element → move cursor
  for (const el of selectedElements) {
    if (hitTest(scenePoint, el, zoom)) {
      return "move";
    }
  }

  // 3. Check if hovering over any element → pointer
  const hitElement = getElementAtPosition(scenePoint, allElements, zoom);
  if (hitElement) {
    return "default";
  }

  // 4. Empty space → default
  return "default";
}
```

### 10.2 Resize Cursor Rotation

```typescript
const RESIZE_CURSORS: Record<TransformHandleDirection, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
};

function getResizeCursor(handleType: TransformHandleType, angle: number): string {
  if (handleType === "rotation") return "grab";
  return RESIZE_CURSORS[handleType];
  // Note: for rotated elements, the cursor should also rotate.
  // MVP: skip cursor rotation. Enhancement: use CSS custom cursors.
}
```

---

## 11. Keyboard Actions

### 11.1 Selection-Related Shortcuts

| Shortcut               | Action                                     | Implementation                                    |
| ---------------------- | ------------------------------------------ | ------------------------------------------------- |
| `Delete` / `Backspace` | Delete selected elements                   | `mutateElement(el, { isDeleted: true })` for each |
| `Escape`               | Clear selection + revert to selection tool | `clearSelection()`, `setTool('selection')`        |
| `Ctrl+A`               | Select all non-deleted elements            | `selectAll()`                                     |
| `Arrow keys`           | Move selected by 1px                       | `moveSelected(dx, dy)`                            |
| `Shift+Arrow`          | Move selected by 10px                      | `moveSelected(dx*10, dy*10)`                      |

### 11.2 Arrow Key Movement

```typescript
function moveSelected(
  dx: number,
  dy: number,
  selectedElements: readonly ExcalidrawElement[],
): void {
  for (const el of selectedElements) {
    mutateElement(el, {
      x: el.x + dx,
      y: el.y + dy,
    });
  }
}
```

---

## 12. Interaction State Machine

### 12.1 Selection Tool States

```
                          ┌──────────────────────────────────┐
                          │             IDLE                   │
                          │  (selection tool active, no drag)  │
                          └──────────┬───────────────────────┘
                                     │ pointerDown
                                     ▼
                          ┌──────────────────────────────────┐
                          │         HIT TESTING               │
                          │  What did the user click?         │
                          └──┬────────┬────────────┬─────────┘
                             │        │            │
                  hit handle │  hit element  │  hit nothing
                             │        │            │
                             ▼        ▼            ▼
                    ┌──────────┐ ┌──────────┐ ┌──────────────┐
                    │ RESIZING │ │ DRAGGING │ │  BOX_SELECT  │
                    │          │ │          │ │  (marquee)   │
                    └────┬─────┘ └────┬─────┘ └──────┬───────┘
                         │            │              │
                    pointerMove  pointerMove    pointerMove
                         │            │              │
                    resize el    move el(s)     grow marquee
                         │            │              │
                         ▼            ▼              ▼
                    pointerUp    pointerUp      pointerUp
                         │            │              │
                    ┌────┴────────────┴──────────────┴────────┐
                    │              FINALIZE                     │
                    │  • Push undo snapshot (if changed)       │
                    │  • Update selection                      │
                    │  • Mark dirty                            │
                    │  • Return to IDLE                        │
                    └──────────────────────────────────────────┘
```

### 12.2 PointerDown Logic

```typescript
type InteractionState =
  | { type: "idle" }
  | { type: "dragging"; dragState: DragState }
  | { type: "resizing"; resizeState: ResizeState }
  | { type: "boxSelecting"; startPoint: Point };

function onPointerDown(scenePoint: Point, event: PointerEvent): InteractionState {
  const selectedElements = getSelectedElements();

  // 1. Check transform handles on selected elements (single selection only)
  if (selectedElements.length === 1) {
    const handleType = getTransformHandleAtPosition(scenePoint, selectedElements[0], zoom.value);
    if (handleType && handleType !== "rotation") {
      return {
        type: "resizing",
        resizeState: {
          handleType,
          originalBounds: { ...selectedElements[0] },
          origin: scenePoint,
        },
      };
    }
    // Rotation handle → future enhancement
  }

  // 2. Check if clicking on an element
  const hitElement = getElementAtPosition(scenePoint, elements.value, zoom.value);

  if (hitElement) {
    if (event.shiftKey) {
      // Shift+click: toggle in/out of selection
      toggleSelection(hitElement.id);
    } else if (!isSelected(hitElement.id)) {
      // Click unselected element: select it exclusively
      select(hitElement.id);
    }
    // else: clicking already-selected element — start drag

    return {
      type: "dragging",
      dragState: startDrag(scenePoint, getSelectedElements()),
    };
  }

  // 3. Clicked empty space
  if (!event.shiftKey) {
    clearSelection();
  }
  return {
    type: "boxSelecting",
    startPoint: scenePoint,
  };
}
```

### 12.3 PointerMove Logic

```typescript
function onPointerMove(scenePoint: Point, state: InteractionState): void {
  switch (state.type) {
    case "dragging":
      continueDrag(scenePoint, state.dragState, getSelectedElements());
      markStaticDirty();
      markInteractiveDirty();
      break;

    case "resizing":
      resizeElement(scenePoint, state.resizeState, getSelectedElements()[0], shiftKey);
      markStaticDirty();
      markInteractiveDirty();
      break;

    case "boxSelecting": {
      // Update marquee rectangle
      const box = normalizeBox(state.startPoint, scenePoint);
      setSelectionBox(box);
      // Live-update selection: select elements fully inside box
      const enclosed = getElementsInBox(box, elements.value);
      setSelectionFromBox(enclosed);
      markInteractiveDirty();
      break;
    }
  }
}
```

### 12.4 PointerUp Logic

```typescript
function onPointerUp(scenePoint: Point, state: InteractionState): void {
  switch (state.type) {
    case "dragging":
      // Only snapshot if actually moved
      if (hasMoved(state.dragState, scenePoint)) {
        snapshot(); // undo history
      }
      break;

    case "resizing":
      snapshot();
      break;

    case "boxSelecting":
      setSelectionBox(null);
      break;
  }

  markStaticDirty();
  markInteractiveDirty();
  // Return to idle (state machine resets)
}
```

---

## 13. File Map

### New Files

```
app/features/selection/                      ← NEW FEATURE
├── composables/
│   └── useSelection.ts                      ← Selection state (selectedIds, computed bounds)
├── hitTest.ts                               ← Point-in-shape collision detection
├── bounds.ts                                ← Bounding box calculations (single + multi)
├── transformHandles.ts                      ← Handle positions + handle hit detection
├── dragElements.ts                          ← Drag-to-move logic (origin-based)
├── resizeElement.ts                         ← Resize via handle logic
├── constants.ts                             ← HANDLE_SIZE, SELECTION_COLOR, etc.
└── index.ts                                 ← Barrel export

app/features/rendering/
├── renderInteractive.ts                     ← NEW: Selection borders, handles, marquee
└── (existing files unchanged)

app/features/tools/
├── composables/
│   └── useSelectionInteraction.ts           ← NEW: State machine for selection tool
└── (existing useDrawingInteraction.ts stays for shape tools)
```

### Modified Files

```
app/features/canvas/components/
└── CanvasContainer.vue                      ← Wire useSelection, useSelectionInteraction,
                                                hookup onRenderInteractive callback

app/features/canvas/composables/
└── useRenderer.ts                           ← Pass selection data to interactive render

app/features/tools/composables/
└── useTool.ts                               ← Cursor update on tool/hover change

app/features/tools/components/
└── DrawingToolbar.vue                       ← Already has selection tool button
```

---

## 14. Testing Strategy

### 14.1 Testing Infrastructure

We use **Vitest** with two project configs:

- **Unit tests** (`*.unit.test.ts`) — Node environment, fast, pure logic
- **Browser tests** (`*.browser.test.ts`) — Playwright/Chromium, real DOM + pointer events

Existing test utilities:

- `app/__test-utils__/factories/element.ts` — `createTestElement(overrides)`
- `app/__test-utils__/factories/viewport.ts` — `createViewport(overrides)`
- `app/__test-utils__/factories/point.ts` — `createTestPoint(overrides)`
- `app/__test-utils__/withSetup.ts` — composable test harness with `using` cleanup

### 14.2 Test Pyramid for Phase 3

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲         2 browser tests (full draw→select→move→resize flow)
                 ╱────────╲
                ╱Integration╲     6 browser tests (component-level interaction)
               ╱──────────────╲
              ╱   Unit Tests    ╲  ~40 unit tests (pure functions + composables)
             ╱────────────────────╲
```

### 14.3 Unit Tests (Node — `*.unit.test.ts`)

These test pure functions with zero DOM dependency. Fast, parallelizable, high coverage.

#### `hitTest.unit.test.ts` — Point-in-shape collision

```typescript
describe("hitTest", () => {
  describe("rectangle", () => {
    it("hits center of filled rectangle", () => {
      const el = createTestElement({
        type: "rectangle",
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        backgroundColor: "#ff0000",
      });
      expect(hitTest({ x: 60, y: 35 }, el, 1)).toBe(true);
    });

    it("misses interior of outline-only rectangle", () => {
      const el = createTestElement({
        type: "rectangle",
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        backgroundColor: "transparent",
      });
      expect(hitTest({ x: 60, y: 35 }, el, 1)).toBe(false); // center of outline rect
    });

    it("hits stroke of outline-only rectangle", () => {
      const el = createTestElement({
        type: "rectangle",
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        backgroundColor: "transparent",
      });
      expect(hitTest({ x: 10, y: 35 }, el, 1)).toBe(true); // left edge
    });

    it("respects rotation — point outside AABB but inside rotated rect", () => {
      const el = createTestElement({
        type: "rectangle",
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        angle: Math.PI / 4,
        backgroundColor: "#ff0000",
      });
      // Point along the diagonal of the rotated rect
      const insideRotated = rotatePoint({ x: 50, y: 10 }, { x: 50, y: 10 }, Math.PI / 4);
      expect(hitTest(insideRotated, el, 1)).toBe(true);
    });

    it("threshold grows at low zoom (easier to click)", () => {
      const el = createTestElement({
        type: "rectangle",
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        backgroundColor: "transparent",
      });
      // Point 15px from edge — misses at zoom=1 (threshold ~10px)
      expect(hitTest({ x: -5, y: 35 }, el, 1)).toBe(false);
      // But hits at zoom=0.2 (threshold = 10/0.2 = 50px)
      expect(hitTest({ x: -5, y: 35 }, el, 0.2)).toBe(true);
    });
  });

  describe("ellipse", () => {
    it("hits inside filled ellipse", () => {
      /* ... */
    });
    it("misses inside outline-only ellipse", () => {
      /* ... */
    });
    it("hits ellipse boundary within threshold", () => {
      /* ... */
    });
  });

  describe("diamond", () => {
    it("hits inside filled diamond", () => {
      /* ... */
    });
    it("misses corner region (outside diamond shape)", () => {
      /* ... */
    });
    it("hits diamond edge within threshold", () => {
      /* ... */
    });
  });

  describe("getElementAtPosition", () => {
    it("returns topmost element (last in array) when overlapping", () => {
      const bottom = createTestElement({
        id: "a",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        backgroundColor: "#f00",
      });
      const top = createTestElement({
        id: "b",
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        backgroundColor: "#00f",
      });
      expect(getElementAtPosition({ x: 75, y: 75 }, [bottom, top], 1)?.id).toBe("b");
    });

    it("skips deleted elements", () => {
      const el = createTestElement({
        isDeleted: true,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        backgroundColor: "#f00",
      });
      expect(getElementAtPosition({ x: 50, y: 50 }, [el], 1)).toBeNull();
    });

    it("returns null when clicking empty space", () => {
      const el = createTestElement({ x: 0, y: 0, width: 50, height: 50, backgroundColor: "#f00" });
      expect(getElementAtPosition({ x: 200, y: 200 }, [el], 1)).toBeNull();
    });
  });
});
```

#### `bounds.unit.test.ts` — Bounding box calculations

```typescript
describe("bounds", () => {
  describe("getElementBounds", () => {
    it("returns [x, y, x+w, y+h] for axis-aligned element", () => {
      const el = createTestElement({ x: 10, y: 20, width: 100, height: 50 });
      expect(getElementBounds(el)).toEqual([10, 20, 110, 70]);
    });

    it("expands bounds for rotated element", () => {
      const el = createTestElement({ x: 0, y: 0, width: 100, height: 0, angle: Math.PI / 4 });
      const [x1, y1, x2, y2] = getElementBounds(el);
      // 100px wide line rotated 45° — bounds should be ~70x70
      expect(x2 - x1).toBeCloseTo(70.71, 1);
      expect(y2 - y1).toBeCloseTo(70.71, 1);
    });
  });

  describe("getCommonBounds", () => {
    it("returns bounding box encompassing all elements", () => {
      const a = createTestElement({ x: 0, y: 0, width: 50, height: 50 });
      const b = createTestElement({ x: 100, y: 100, width: 50, height: 50 });
      expect(getCommonBounds([a, b])).toEqual([0, 0, 150, 150]);
    });

    it("returns null for empty array", () => {
      expect(getCommonBounds([])).toBeNull();
    });
  });
});
```

#### `transformHandles.unit.test.ts` — Handle positions + detection

```typescript
describe("transformHandles", () => {
  describe("getTransformHandles", () => {
    it("returns all 8 handles + rotation for large element", () => {
      const el = createTestElement({ x: 0, y: 0, width: 200, height: 200 });
      const handles = getTransformHandles(el, 1);
      expect(Object.keys(handles)).toEqual(
        expect.arrayContaining(["nw", "ne", "sw", "se", "n", "s", "e", "w", "rotation"]),
      );
    });

    it("omits side handles for small elements", () => {
      const el = createTestElement({ x: 0, y: 0, width: 20, height: 20 });
      const handles = getTransformHandles(el, 1);
      expect(handles.n).toBeUndefined();
      expect(handles.s).toBeUndefined();
      expect(handles.se).toBeDefined(); // corners always present
    });

    it("rotates handle positions with element angle", () => {
      const el = createTestElement({ x: 0, y: 0, width: 100, height: 100, angle: Math.PI / 2 });
      const handles = getTransformHandles(el, 1);
      // After 90° rotation, "ne" handle should be where "se" was
      expect(handles.ne).toBeDefined();
    });
  });

  describe("getTransformHandleAtPosition", () => {
    it("detects pointer inside SE handle", () => {
      const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
      const handles = getTransformHandles(el, 1);
      const seCenter = {
        x: handles.se![0] + handles.se![2] / 2,
        y: handles.se![1] + handles.se![3] / 2,
      };
      expect(getTransformHandleAtPosition(seCenter, el, 1)).toBe("se");
    });

    it("returns null when not on any handle", () => {
      const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
      expect(getTransformHandleAtPosition({ x: 50, y: 50 }, el, 1)).toBeNull();
    });
  });
});
```

#### `useSelection.unit.test.ts` — Composable state

```typescript
describe("useSelection", () => {
  it("starts with empty selection", () => {
    using sel = withSetup(() => useSelection(shallowRef([])));
    expect(sel.selectedIds.value.size).toBe(0);
    expect(sel.selectedElements.value).toEqual([]);
  });

  it("select() replaces selection with single element", () => {
    const elements = shallowRef([createTestElement({ id: "a" }), createTestElement({ id: "b" })]);
    using sel = withSetup(() => useSelection(elements));
    sel.select("a");
    expect(sel.selectedIds.value.has("a")).toBe(true);
    expect(sel.selectedIds.value.size).toBe(1);
  });

  it("toggleSelection() adds on first click, removes on second", () => {
    const elements = shallowRef([createTestElement({ id: "a" })]);
    using sel = withSetup(() => useSelection(elements));
    sel.toggleSelection("a");
    expect(sel.isSelected("a")).toBe(true);
    sel.toggleSelection("a");
    expect(sel.isSelected("a")).toBe(false);
  });

  it("selectedElements excludes deleted", () => {
    const elements = shallowRef([
      createTestElement({ id: "a", isDeleted: false }),
      createTestElement({ id: "b", isDeleted: true }),
    ]);
    using sel = withSetup(() => useSelection(elements));
    sel.select("a");
    sel.addToSelection("b");
    expect(sel.selectedElements.value.map((e) => e.id)).toEqual(["a"]);
  });

  it("selectionBounds computes common bounding box", () => {
    const elements = shallowRef([
      createTestElement({ id: "a", x: 0, y: 0, width: 50, height: 50 }),
      createTestElement({ id: "b", x: 100, y: 100, width: 50, height: 50 }),
    ]);
    using sel = withSetup(() => useSelection(elements));
    sel.select("a");
    sel.addToSelection("b");
    expect(sel.selectionBounds.value).toEqual([0, 0, 150, 150]);
  });
});
```

#### `dragElements.unit.test.ts` — Move logic

```typescript
describe("dragElements", () => {
  it("moves single element by pointer delta", () => {
    const el = createTestElement({ x: 100, y: 100, width: 50, height: 50 });
    const drag = startDrag({ x: 110, y: 110 }, [el]);
    continueDrag({ x: 160, y: 210 }, drag, [el]);
    expect(el.x).toBe(150); // 100 + (160-110)
    expect(el.y).toBe(200); // 100 + (210-110)
  });

  it("moves multiple elements preserving relative positions", () => {
    const a = createTestElement({ x: 0, y: 0, width: 50, height: 50 });
    const b = createTestElement({ x: 100, y: 100, width: 50, height: 50 });
    const drag = startDrag({ x: 25, y: 25 }, [a, b]);
    continueDrag({ x: 75, y: 75 }, drag, [a, b]);
    expect(a.x).toBe(50);
    expect(b.x).toBe(150);
    expect(b.x - a.x).toBe(100); // relative position preserved
  });

  it("origin-based: no float drift after many moves", () => {
    const el = createTestElement({ x: 0, y: 0, width: 50, height: 50 });
    const drag = startDrag({ x: 0, y: 0 }, [el]);
    // Simulate many small increments that would cause drift with +=
    for (let i = 1; i <= 1000; i++) {
      continueDrag({ x: i * 0.1, y: i * 0.1 }, drag, [el]);
    }
    expect(el.x).toBeCloseTo(100, 10); // 1000 * 0.1 = exactly 100
    expect(el.y).toBeCloseTo(100, 10);
  });

  it("shift-constrains to horizontal axis", () => {
    const delta = getConstrainedDelta(50, 10);
    expect(delta).toEqual({ x: 50, y: 0 });
  });

  it("shift-constrains to vertical axis", () => {
    const delta = getConstrainedDelta(5, 80);
    expect(delta).toEqual({ x: 0, y: 80 });
  });
});
```

#### `resizeElement.unit.test.ts` — Resize logic

```typescript
describe("resizeElement", () => {
  it("SE handle: increases width and height", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "se",
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: { x: 100, y: 100 },
    };
    resizeElement({ x: 150, y: 130 }, state, el, false);
    expect(el.width).toBe(150);
    expect(el.height).toBe(130);
    expect(el.x).toBe(0); // SE doesn't move origin
    expect(el.y).toBe(0);
  });

  it("NW handle: moves origin and shrinks", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "nw",
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: { x: 0, y: 0 },
    };
    resizeElement({ x: 20, y: 30 }, state, el, false);
    expect(el.x).toBe(20);
    expect(el.y).toBe(30);
    expect(el.width).toBe(80);
    expect(el.height).toBe(70);
  });

  it("E handle: only changes width", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "e",
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: { x: 100, y: 50 },
    };
    resizeElement({ x: 200, y: 80 }, state, el, false);
    expect(el.width).toBe(200);
    expect(el.height).toBe(100); // unchanged
  });

  it("shift locks aspect ratio", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 50 });
    const state: ResizeState = {
      handleType: "se",
      originalBounds: { x: 0, y: 0, width: 100, height: 50 },
      origin: { x: 100, y: 50 },
    };
    resizeElement({ x: 200, y: 80 }, state, el, true);
    expect(el.width / el.height).toBeCloseTo(2, 5); // 100/50 = 2:1 preserved
  });

  it("negative drag flips to positive dimensions", () => {
    const el = createTestElement({ x: 50, y: 50, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "se",
      originalBounds: { x: 50, y: 50, width: 100, height: 100 },
      origin: { x: 150, y: 150 },
    };
    resizeElement({ x: 30, y: 30 }, state, el, false);
    expect(el.width).toBeGreaterThan(0);
    expect(el.height).toBeGreaterThan(0);
  });

  it("enforces minimum size of 1x1", () => {
    const el = createTestElement({ x: 0, y: 0, width: 100, height: 100 });
    const state: ResizeState = {
      handleType: "se",
      originalBounds: { x: 0, y: 0, width: 100, height: 100 },
      origin: { x: 100, y: 100 },
    };
    resizeElement({ x: 0.1, y: 0.1 }, state, el, false);
    expect(el.width).toBeGreaterThanOrEqual(1);
    expect(el.height).toBeGreaterThanOrEqual(1);
  });
});
```

### 14.4 Browser Integration Tests (`*.browser.test.ts`)

These test **real user interactions** with the full Vue component tree and pointer events.

#### `SelectionInteraction.browser.test.ts` — Click, drag, resize flows

```typescript
// features/tools/composables/SelectionInteraction.browser.test.ts

describe("Selection interaction", () => {
  // Setup helper: renders CanvasContainer and draws a rectangle at known position
  async function setupWithRectangle() {
    const screen = render(CanvasContainer);
    const canvas = screen.getByTestId("interactive-canvas");

    // Switch to rectangle tool and draw a 100x100 rect at (200, 200)
    await userEvent.keyboard("r");
    await userEvent.pointer([
      { target: canvas, coords: { x: 200, y: 200 }, keys: "[MouseLeft>]" },
      { target: canvas, coords: { x: 300, y: 300 } },
      { target: canvas, keys: "[/MouseLeft]" },
    ]);

    // Tool auto-reverts to selection
    return { screen, canvas };
  }

  describe("click-to-select", () => {
    it("clicking on an element selects it", async () => {
      const { canvas } = await setupWithRectangle();
      // Click inside the drawn rectangle
      await userEvent.click(canvas, { position: { x: 250, y: 250 } });
      // Verify: interactive canvas should render selection border
      // (Check via exposed composable state or data-testid)
    });

    it("clicking empty space deselects", async () => {
      const { canvas } = await setupWithRectangle();
      await userEvent.click(canvas, { position: { x: 250, y: 250 } }); // select
      await userEvent.click(canvas, { position: { x: 50, y: 50 } }); // deselect
      // Verify: no selection
    });

    it("shift+click adds to selection", async () => {
      // Draw two rectangles, shift-click both
    });
  });

  describe("drag-to-move", () => {
    it("dragging selected element moves it", async () => {
      const { canvas } = await setupWithRectangle();
      // Select the rect
      await userEvent.click(canvas, { position: { x: 250, y: 250 } });
      // Drag it 50px right, 50px down
      await userEvent.pointer([
        { target: canvas, coords: { x: 250, y: 250 }, keys: "[MouseLeft>]" },
        { target: canvas, coords: { x: 300, y: 300 } },
        { target: canvas, keys: "[/MouseLeft]" },
      ]);
      // Verify: element.x and element.y updated
    });
  });

  describe("resize", () => {
    it("dragging SE handle resizes element", async () => {
      const { canvas } = await setupWithRectangle();
      // Select
      await userEvent.click(canvas, { position: { x: 250, y: 250 } });
      // Drag from SE handle position (~304, ~304 with margin)
      await userEvent.pointer([
        { target: canvas, coords: { x: 304, y: 304 }, keys: "[MouseLeft>]" },
        { target: canvas, coords: { x: 400, y: 400 } },
        { target: canvas, keys: "[/MouseLeft]" },
      ]);
      // Verify: element.width and element.height increased
    });
  });

  describe("box-select", () => {
    it("dragging on empty space creates selection marquee", async () => {
      // Draw two rectangles
      // Drag marquee around both
      // Verify both selected
    });

    it("only fully enclosed elements get selected", async () => {
      // Draw rect, drag marquee that partially overlaps
      // Verify not selected
    });
  });
});
```

#### `SelectionKeyboard.browser.test.ts` — Keyboard interaction flows

```typescript
describe("Selection keyboard shortcuts", () => {
  it("Delete key removes selected element", async () => {
    const { canvas } = await setupWithRectangle();
    await userEvent.click(canvas, { position: { x: 250, y: 250 } });
    await userEvent.keyboard("{Delete}");
    // Verify: element.isDeleted === true
  });

  it("Escape clears selection", async () => {
    const { canvas } = await setupWithRectangle();
    await userEvent.click(canvas, { position: { x: 250, y: 250 } });
    await userEvent.keyboard("{Escape}");
    // Verify: no selection
  });

  it("Ctrl+A selects all elements", async () => {
    // Draw two rectangles
    await userEvent.keyboard("{Control>}a{/Control}");
    // Verify: both selected
  });

  it("Arrow keys nudge selected element by 1px", async () => {
    const { canvas } = await setupWithRectangle();
    await userEvent.click(canvas, { position: { x: 250, y: 250 } });
    await userEvent.keyboard("{ArrowRight}");
    // Verify: element.x increased by 1
  });

  it("Shift+Arrow nudges by 10px", async () => {
    const { canvas } = await setupWithRectangle();
    await userEvent.click(canvas, { position: { x: 250, y: 250 } });
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
    // Verify: element.x increased by 10
  });
});
```

### 14.5 End-to-End Flow Tests (browser)

#### `DrawSelectMoveResize.browser.test.ts` — Full user journey

```typescript
describe("Full interaction flow: draw → select → move → resize → delete", () => {
  it("complete editing lifecycle", async () => {
    const screen = render(CanvasContainer);
    const canvas = screen.getByTestId("interactive-canvas");

    // 1. Draw a rectangle
    await userEvent.keyboard("r");
    await userEvent.pointer([
      { target: canvas, coords: { x: 100, y: 100 }, keys: "[MouseLeft>]" },
      { target: canvas, coords: { x: 200, y: 200 } },
      { target: canvas, keys: "[/MouseLeft]" },
    ]);

    // 2. Verify it exists (auto-selected after draw)
    // Tool should have reverted to selection

    // 3. Click somewhere else to deselect
    await userEvent.click(canvas, { position: { x: 50, y: 50 } });

    // 4. Click back on the rect to re-select
    await userEvent.click(canvas, { position: { x: 150, y: 150 } });

    // 5. Drag to move
    await userEvent.pointer([
      { target: canvas, coords: { x: 150, y: 150 }, keys: "[MouseLeft>]" },
      { target: canvas, coords: { x: 250, y: 250 } },
      { target: canvas, keys: "[/MouseLeft]" },
    ]);

    // 6. Resize via SE handle
    await userEvent.pointer([
      { target: canvas, coords: { x: 304, y: 304 }, keys: "[MouseLeft>]" },
      { target: canvas, coords: { x: 350, y: 350 } },
      { target: canvas, keys: "[/MouseLeft]" },
    ]);

    // 7. Delete
    await userEvent.keyboard("{Delete}");

    // 8. Verify element is gone (isDeleted)
  });

  it("draw multiple shapes and box-select all", async () => {
    const screen = render(CanvasContainer);
    const canvas = screen.getByTestId("interactive-canvas");

    // Draw rect
    await userEvent.keyboard("r");
    await userEvent.pointer([
      { target: canvas, coords: { x: 50, y: 50 }, keys: "[MouseLeft>]" },
      { target: canvas, coords: { x: 100, y: 100 } },
      { target: canvas, keys: "[/MouseLeft]" },
    ]);

    // Draw ellipse
    await userEvent.keyboard("o");
    await userEvent.pointer([
      { target: canvas, coords: { x: 200, y: 200 }, keys: "[MouseLeft>]" },
      { target: canvas, coords: { x: 300, y: 300 } },
      { target: canvas, keys: "[/MouseLeft]" },
    ]);

    // Box-select all (drag from top-left past both)
    await userEvent.pointer([
      { target: canvas, coords: { x: 10, y: 10 }, keys: "[MouseLeft>]" },
      { target: canvas, coords: { x: 350, y: 350 } },
      { target: canvas, keys: "[/MouseLeft]" },
    ]);

    // Verify: both elements selected

    // Move all
    await userEvent.pointer([
      { target: canvas, coords: { x: 150, y: 150 }, keys: "[MouseLeft>]" },
      { target: canvas, coords: { x: 200, y: 200 } },
      { target: canvas, keys: "[/MouseLeft]" },
    ]);

    // Verify: both elements moved by (50, 50), relative positions preserved
  });
});
```

### 14.6 Test Matrix Summary

| File                                   | Type    | Tests   | What It Verifies                                                      |
| -------------------------------------- | ------- | ------- | --------------------------------------------------------------------- |
| `hitTest.unit.test.ts`                 | Unit    | ~12     | Point-in-shape for rect/ellipse/diamond, rotation, threshold, z-order |
| `bounds.unit.test.ts`                  | Unit    | ~6      | Single + multi element bounds, rotation expansion                     |
| `transformHandles.unit.test.ts`        | Unit    | ~8      | Handle positions, visibility rules, hit detection                     |
| `useSelection.unit.test.ts`            | Unit    | ~8      | Select/toggle/clear, computed bounds, deleted filtering               |
| `dragElements.unit.test.ts`            | Unit    | ~5      | Single/multi move, origin-based drift-free, shift constraint          |
| `resizeElement.unit.test.ts`           | Unit    | ~7      | All 8 handles, aspect lock, negative flip, min size                   |
| `SelectionInteraction.browser.test.ts` | Browser | ~6      | Click/drag/resize/box-select with real pointer events                 |
| `SelectionKeyboard.browser.test.ts`    | Browser | ~5      | Delete/Escape/Ctrl+A/Arrow keys                                       |
| `DrawSelectMoveResize.browser.test.ts` | Browser | ~2      | Full lifecycle: draw → select → move → resize → delete                |
| **Total**                              |         | **~59** |                                                                       |

---

## 15. Parallelization Plan (Agent Swarm)

### 15.1 Dependency Analysis

Not all steps depend on each other. Here's the true dependency graph:

```
                    ┌─────────────────┐
                    │   constants.ts   │  (shared constants — no deps)
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
      ┌──────────────┐ ┌──────────┐ ┌──────────────────┐
      │  bounds.ts   │ │hitTest.ts│ │transformHandles.ts│
      │  + tests     │ │ + tests  │ │     + tests       │
      └──────┬───────┘ └────┬─────┘ └────────┬──────────┘
             │              │                 │
             └──────┬───────┘                 │
                    ▼                         │
         ┌──────────────────┐                 │
         │  useSelection.ts │                 │
         │     + tests      │                 │
         └────────┬─────────┘                 │
                  │          ┌────────────────┘
                  ▼          ▼
         ┌──────────────────────────┐  ┌───────────────────────┐
         │    dragElements.ts       │  │ renderInteractive.ts   │
         │       + tests            │  │   (borders + handles)  │
         └──────────┬───────────────┘  └───────────┬───────────┘
                    │                              │
         ┌──────────────────────────┐              │
         │    resizeElement.ts      │              │
         │       + tests            │              │
         └──────────┬───────────────┘              │
                    │                              │
                    └──────────┬───────────────────┘
                               ▼
                 ┌───────────────────────────────┐
                 │  useSelectionInteraction.ts    │
                 │  (state machine — wires all)   │
                 └───────────────┬───────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              CanvasContainer  Keyboard    Browser
              .vue wiring      shortcuts   integration tests
```

### 15.2 Swarm Work Packages

We split into **4 parallel agents** plus a **lead agent** that coordinates.

```
┌──────────────────────────────────────────────────────────────────────┐
│                         LEAD AGENT                                    │
│  Creates constants.ts + index.ts scaffold first, then spawns team    │
│  Reviews + integrates work from all agents                           │
│  Wires CanvasContainer.vue at the end                                │
└──────────────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
   │  AGENT A   │ │  AGENT B   │ │  AGENT C   │ │  AGENT D   │
   │  Geometry  │ │ Selection  │ │ Rendering  │ │   Resize   │
   │            │ │  State     │ │            │ │ + Keyboard │
   └────────────┘ └────────────┘ └────────────┘ └────────────┘
```

#### Agent A: Geometry (hit testing + bounds)

**Files**: `bounds.ts`, `hitTest.ts`, + unit tests
**Depends on**: `constants.ts` (created by lead), `shared/math.ts` (exists)
**Blocked by**: Nothing after constants
**Estimated tests**: ~18

```
Tasks:
1. bounds.ts — getElementBounds(), getCommonBounds()
2. bounds.unit.test.ts — all bounds tests
3. hitTest.ts — hitTest(), getElementAtPosition(), per-shape functions
4. hitTest.unit.test.ts — all hit detection tests
```

#### Agent B: Selection State (composable + drag)

**Files**: `useSelection.ts`, `dragElements.ts`, + unit tests
**Depends on**: `bounds.ts` (Agent A — for selectionBounds computed)
**Blocked by**: Agent A's `bounds.ts` (needs `getCommonBounds`)
**Estimated tests**: ~13

```
Tasks:
1. useSelection.ts — full composable
2. useSelection.unit.test.ts — composable tests
3. dragElements.ts — startDrag(), continueDrag(), getConstrainedDelta()
4. dragElements.unit.test.ts — move + drift + constraint tests
```

#### Agent C: Interactive Rendering (selection visuals)

**Files**: `renderInteractive.ts`, `transformHandles.ts`, + unit tests
**Depends on**: `constants.ts`, `bounds.ts` (for handle positioning)
**Blocked by**: Agent A's `bounds.ts`
**Estimated tests**: ~8

```
Tasks:
1. transformHandles.ts — getTransformHandles(), getTransformHandleAtPosition()
2. transformHandles.unit.test.ts — position + detection tests
3. renderInteractive.ts — renderSelectionBorder(), renderTransformHandles(), renderSelectionBox()
   (rendering functions are hard to unit test — verify via browser tests)
```

#### Agent D: Resize + Keyboard

**Files**: `resizeElement.ts`, keyboard shortcut wiring, + unit tests
**Depends on**: `transformHandles.ts` (Agent C — for handle types)
**Blocked by**: Agent C's handle types
**Estimated tests**: ~12

```
Tasks:
1. resizeElement.ts — resizeElement(), all handle directions
2. resizeElement.unit.test.ts — resize tests
3. Keyboard shortcut integration (Delete, Escape, Ctrl+A, Arrow keys)
```

### 15.3 Execution Timeline

```
Time →
────────────────────────────────────────────────────────────────────

Lead:  [scaffold constants + index]
                │
                ├── spawn A, B (partial), C (partial), D (partial)
                │
Agent A:  [bounds.ts + tests]──[hitTest.ts + tests]──done
                                    │
Agent B:         [useSelection]─────┤──[dragElements + tests]──done
                (stub bounds)       │
                                    │
Agent C:         [transformHandles]─┤──[renderInteractive]──done
                (stub bounds)       │
                                    │
Agent D:              (waiting)─────┤──[resizeElement + tests]──[keyboard]──done
                                    │
Lead:                               └──[useSelectionInteraction]
                                       [CanvasContainer wiring]
                                       [browser integration tests]
                                       [final review + run all tests]
```

### 15.4 Agent Communication Protocol

1. **Lead creates** `constants.ts` and barrel `index.ts` first — agents import from these
2. **Agents stub** cross-dependencies they don't yet have (e.g., Agent B stubs `getCommonBounds` return type)
3. **Lead unblocks** agents by messaging when dependencies are ready
4. **Each agent** marks their task complete and lead assigns the next unblocked task
5. **Lead integrates** all work into `useSelectionInteraction.ts` and `CanvasContainer.vue`
6. **Lead runs** full test suite (`pnpm test`) to verify integration

### 15.5 When NOT to Parallelize

Some tasks are inherently sequential and must be done by the lead:

- `useSelectionInteraction.ts` — the state machine that wires everything together
- `CanvasContainer.vue` changes — single integration point, too risky to parallelize
- Browser integration tests — depend on all pieces being wired up
- Final test run + lint check

---

## 16. Implementation Order

### Step 1: Scaffold + Constants (Lead, sequential)

```
Create:
  app/features/selection/constants.ts      ← HANDLE_SIZE, SELECTION_COLOR, etc.
  app/features/selection/index.ts          ← Barrel export (updated as files land)
```

### Step 2: Parallel Work (4 agents)

```
┌─ Agent A: bounds.ts + hitTest.ts + unit tests
├─ Agent B: useSelection.ts (stubs bounds) + dragElements.ts + unit tests
├─ Agent C: transformHandles.ts + renderInteractive.ts + unit tests
└─ Agent D: resizeElement.ts + unit tests (starts after C's types ready)
```

### Step 3: Integration (Lead, sequential)

```
Create:
  app/features/tools/composables/useSelectionInteraction.ts  ← State machine

Modify:
  app/features/canvas/components/CanvasContainer.vue         ← Wire everything
  app/features/canvas/composables/useRenderer.ts             ← Pass selection to interactive render
  app/features/tools/composables/useTool.ts                  ← Cursor updates
```

### Step 4: Keyboard Shortcuts (Lead or Agent D)

```
Add: Delete, Escape, Ctrl+A, Arrow keys wiring
```

### Step 5: Browser Integration Tests (Lead)

```
Create:
  SelectionInteraction.browser.test.ts
  SelectionKeyboard.browser.test.ts
  DrawSelectMoveResize.browser.test.ts
```

### Step 6: Final Validation

```
pnpm test          ← All unit + browser tests pass
pnpm run lint      ← No lint errors
Manual smoke test ← Draw, select, move, resize, delete works visually
```

---

## Appendix: Key Differences from Excalidraw

| Aspect            | Excalidraw                   | Our Approach                             |
| ----------------- | ---------------------------- | ---------------------------------------- |
| Framework         | React setState               | Vue shallowRef + mutateElement           |
| Selection IDs     | `Record<string, true>`       | `Set<string>` in `shallowRef`            |
| Drag calculation  | Origin-based (same)          | Origin-based (same)                      |
| Resize            | Supports multi-element       | Single-element only (MVP)                |
| Rotation          | Full rotation support        | Include rotation handle (single element) |
| Hit detection     | Two-phase (same)             | Two-phase (same)                         |
| Shape cache       | WeakMap on element ref       | Map keyed by `id + versionNonce`         |
| Interaction state | Implicit in pointerDownState | Explicit discriminated union             |
| Rendering         | React component lifecycle    | RAF dirty-flag loop (already built)      |
| Groups/frames     | Full support                 | Skipped for MVP                          |
| Snapping          | Object + grid snapping       | Skipped for MVP                          |
| Lasso select      | Yes                          | Skipped for MVP                          |
