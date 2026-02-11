# Drawly — Excalidraw Clone in Nuxt/Vue

## Tech Spec v1.0

> **Goal**: Minimum viable Excalidraw-compatible drawing app using Nuxt 3 (SPA mode), Vue 3, Canvas 2D + roughjs, VueUse, and the exact same `.excalidraw` JSON format.
>
> **MVP scope**: Rectangle, ellipse, diamond, line, arrow, freedraw, text. Selection, move, resize, delete. Keyboard shortcuts. Looks and feels like Excalidraw.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Data Model — Excalidraw JSON Compatibility](#4-data-model)
5. [Canvas Rendering Architecture](#5-canvas-rendering-architecture)
6. [State Management](#6-state-management)
7. [Composable Architecture](#7-composable-architecture)
8. [Tool System & Interaction Pipeline](#8-tool-system)
9. [Keyboard Shortcuts](#9-keyboard-shortcuts)
10. [Hit Testing & Selection](#10-hit-testing--selection)
11. [Undo/Redo](#11-undoredo)
12. [VueUse Integration Map](#12-vueuse-integration-map)
13. [Phased Implementation Roadmap](#13-phased-implementation-roadmap)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Nuxt 3 SPA Shell                         │
│  ssr: false · Tailwind CSS · No server routes                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐│
│  │   Toolbar    │  │           Canvas Container               ││
│  │  (Vue comp)  │  │  ┌────────────────────────────────────┐  ││
│  │              │  │  │ Static Canvas (z-index: 1)         │  ││
│  │  Tool btns   │  │  │ - All committed elements           │  ││
│  │  w/ shortcuts│  │  │ - Grid background                  │  ││
│  │              │  │  │ - pointer-events: none              │  ││
│  │              │  │  ├────────────────────────────────────┤  ││
│  │              │  │  │ New Element Canvas (z-index: 1)    │  ││
│  │              │  │  │ - Element being drawn (live)       │  ││
│  │              │  │  │ - pointer-events: none              │  ││
│  │              │  │  ├────────────────────────────────────┤  ││
│  │              │  │  │ Interactive Canvas (z-index: 2)    │  ││
│  │              │  │  │ - Selection borders/handles        │  ││
│  │              │  │  │ - Receives all pointer events       │  ││
│  └──────────────┘  │  └────────────────────────────────────┘  ││
│                     └──────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Text Editor Overlay (absolute positioned <textarea>)    │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                     Composable Layer                             │
│                                                                 │
│  useCanvas · useViewport · useRenderer · useElements ·          │
│  useSelection · useTool · useHistory · useKeyboard ·            │
│  useDrawingInteraction · useStorage · useTheme                  │
├─────────────────────────────────────────────────────────────────┤
│                     Core Libraries                              │
│  roughjs · perfect-freehand · @excalidraw/math (optional)       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision            | Choice                                             | Rationale                                                               |
| ------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| Rendering           | Canvas 2D + roughjs                                | Same as Excalidraw; hand-drawn aesthetic; exact format compat           |
| Canvas layers       | Triple canvas (static / new-element / interactive) | Avoids re-rendering all elements during draw; isolates UI overlays      |
| State management    | Composables + shallowRef (no Pinia)                | Canvas apps need raw performance; Pinia adds unnecessary Proxy overhead |
| Reactivity strategy | shallowRef for hot data, reactive for UI state     | Prevent Proxy overhead in 60fps render loop                             |
| Element mutation    | Mutable in-place (like Excalidraw)                 | Performance — immutable cloning of element arrays at 60fps is expensive |
| File format         | `.excalidraw` JSON (identical schema)              | Full interoperability with excalidraw.com                               |
| SSR                 | Disabled (ssr: false)                              | Canvas API is browser-only; no SSR benefit                              |

---

## 2. Technology Stack

| Layer         | Technology       | Version | Purpose                                  |
| ------------- | ---------------- | ------- | ---------------------------------------- |
| Framework     | Nuxt 3           | 3.x     | SPA shell, routing, DX                   |
| UI            | Vue 3.5+         | 3.5+    | Composition API, shallowRef              |
| Styling       | Tailwind CSS 4   | 4.x     | UI components (not canvas)               |
| Canvas shapes | roughjs          | 4.x     | Hand-drawn rendering                     |
| Freedraw      | perfect-freehand | 1.x     | Pressure-sensitive stroke outlines       |
| Composables   | VueUse           | 14.x    | Keyboard, events, storage, etc.          |
| Icons         | Lucide Vue       | latest  | Toolbar icons                            |
| Math          | Custom utils     | —       | Point/vector math, coordinate transforms |
| Build         | Vite (via Nuxt)  | 6.x     | Dev server, HMR, bundling                |
| Types         | TypeScript       | 5.x     | Strict mode                              |

### NPM Dependencies

```json
{
  "dependencies": {
    "nuxt": "^3.x",
    "roughjs": "^4.6.6",
    "perfect-freehand": "^1.2.2",
    "@vueuse/core": "^14.x",
    "lucide-vue-next": "latest",
    "nanoid": "^5.x"
  },
  "devDependencies": {
    "@nuxtjs/tailwindcss": "^6.x",
    "typescript": "^5.x"
  }
}
```

---

## 3. Project Structure

We use a **feature-based architecture** — code is grouped by domain feature rather than by technical layer. Each feature owns its components, composables, and logic in a self-contained folder with a barrel `index.ts` export. This gives us:

- **Discoverability**: everything related to "selection" lives in `features/selection/`
- **Isolation**: features can be developed and tested independently
- **Clear boundaries**: imports between features go through barrel exports, making dependencies explicit
- **Scalability**: adding a new feature (e.g. collaboration, image support) is a new folder, not scattered edits across `composables/`, `core/`, `components/`

### Import Rules

1. Features import from other features only via barrel `index.ts` (e.g. `@/features/elements`)
2. `shared/` is dependency-free — any feature can import from it, but it imports from nothing
3. Circular feature imports are forbidden — if two features need each other, extract the shared contract into `shared/`

```
drawly/
├── nuxt.config.ts                # ssr: false, modules
├── app.vue                       # Root — mounts DrawingApp
├── assets/
│   └── css/
│       └── main.css              # Tailwind + canvas cursor styles
│
├── components/
│   └── DrawingApp.vue            # Top-level orchestrator (wires features together)
│
├── features/
│   ├── canvas/                   # Canvas setup, viewport, render loop
│   │   ├── components/
│   │   │   ├── CanvasContainer.vue     # Triple-canvas wrapper
│   │   │   ├── StaticCanvas.vue        # Element rendering canvas
│   │   │   ├── NewElementCanvas.vue    # In-progress element preview
│   │   │   └── InteractiveCanvas.vue   # Selection UI overlay
│   │   ├── composables/
│   │   │   ├── useCanvas.ts            # Canvas context + DPR setup
│   │   │   ├── useViewport.ts          # Pan, zoom, coord transforms
│   │   │   └── useRenderer.ts          # Render loop + dirty flag
│   │   ├── coords.ts                   # Coordinate transform utilities
│   │   └── index.ts                    # Barrel export
│   │
│   ├── elements/                 # Element data model + CRUD
│   │   ├── composables/
│   │   │   └── useElements.ts          # Element array management
│   │   ├── types.ts                    # Element types (Excalidraw-compatible)
│   │   ├── constants.ts                # Default props, colors, dimensions
│   │   ├── createElement.ts            # Element factory functions
│   │   ├── mutateElement.ts            # In-place mutation + version bump
│   │   └── index.ts
│   │
│   ├── rendering/                # Painting elements to canvas
│   │   ├── renderElement.ts            # Per-element Canvas 2D rendering
│   │   ├── renderScene.ts              # Full scene render orchestrator
│   │   ├── renderInteractive.ts        # Selection borders, handles
│   │   ├── shapeGenerator.ts           # roughjs shape generation + cache
│   │   ├── textMeasure.ts              # Text measurement (Canvas API)
│   │   └── index.ts
│   │
│   ├── tools/                    # Tool system + individual tool handlers
│   │   ├── components/
│   │   │   ├── Toolbar.vue             # Tool selection bar
│   │   │   ├── TextEditor.vue          # Floating <textarea> for text editing
│   │   │   └── ContextMenu.vue         # Right-click menu (stretch)
│   │   ├── composables/
│   │   │   ├── useTool.ts              # Active tool + state machine dispatch
│   │   │   └── useDrawingInteraction.ts # Pointer events → tool dispatch
│   │   ├── handlers/
│   │   │   ├── SelectionTool.ts        # Selection + drag + resize
│   │   │   ├── RectangleTool.ts        # Rectangle creation
│   │   │   ├── EllipseTool.ts          # Ellipse creation
│   │   │   ├── DiamondTool.ts          # Diamond creation
│   │   │   ├── LineTool.ts             # Line creation (multi-click)
│   │   │   ├── ArrowTool.ts            # Arrow creation (multi-click)
│   │   │   ├── FreeDrawTool.ts         # Freedraw (pen) strokes
│   │   │   ├── TextTool.ts             # Text element creation
│   │   │   └── HandTool.ts             # Pan/scroll
│   │   ├── types.ts                    # Tool interface + ToolContext
│   │   └── index.ts
│   │
│   ├── selection/                # Hit testing, selection state, transforms
│   │   ├── composables/
│   │   │   └── useSelection.ts         # Selection state + bounding box
│   │   ├── hitTest.ts                  # Point-in-element collision detection
│   │   ├── bounds.ts                   # Bounding box calculations
│   │   ├── transformHandles.ts         # Resize/rotation handle positions
│   │   └── index.ts
│   │
│   ├── history/                  # Undo/redo
│   │   ├── composables/
│   │   │   └── useHistory.ts           # Snapshot-based undo/redo
│   │   └── index.ts
│   │
│   ├── persistence/              # Save/load, file import/export
│   │   ├── composables/
│   │   │   └── useStorage.ts           # Auto-save to localStorage
│   │   ├── serialize.ts                # .excalidraw file import/export
│   │   └── index.ts
│   │
│   ├── keyboard/                 # Shortcut handling
│   │   ├── composables/
│   │   │   └── useKeyboard.ts          # Shortcuts + modifier tracking
│   │   └── index.ts
│   │
│   └── theme/                    # Dark/light mode
│       ├── composables/
│       │   └── useTheme.ts             # Dark mode toggle
│       └── index.ts
│
└── shared/                       # Zero-dependency utilities (no feature imports)
    ├── math.ts                   # Point, vector, angle utilities
    ├── random.ts                 # ID generation, random seed
    └── dom.ts                    # DOM helpers
```

### Feature Dependency Graph

```
keyboard ──→ tools ──→ elements
                │         ↑
                ├──→ selection ──→ rendering
                │                     ↑
                └──→ canvas ──────────┘
                       ↑
history ──→ elements   │
persistence ──→ elements
theme ──→ canvas

shared ← (imported by all features)
```

---

## 4. Data Model

### 4.1 Element Types (Excalidraw-Compatible)

We use the **exact same JSON schema** as Excalidraw. Every element we create can be opened in excalidraw.com and vice versa.

```typescript
// features/elements/types.ts

// ─── Base Element ───────────────────────────────────────────
interface ExcalidrawElementBase {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number; // radians
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: number; // 0=architect, 1=artist, 2=cartoonist
  opacity: number; // 0-100
  roundness: { type: number; value?: number } | null;
  seed: number; // roughjs PRNG seed
  version: number;
  versionNonce: number;
  index: string | null; // fractional index for ordering
  isDeleted: boolean;
  groupIds: string[];
  frameId: string | null;
  boundElements: BoundElement[] | null;
  updated: number; // epoch ms
  link: string | null;
  locked: boolean;
  customData?: Record<string, any>;
}

// ─── Concrete Types ─────────────────────────────────────────
type ElementType =
  | "selection"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "freedraw"
  | "text";

type FillStyle = "solid" | "hachure" | "cross-hatch" | "zigzag";
type StrokeStyle = "solid" | "dashed" | "dotted";

type Arrowhead =
  | "arrow"
  | "bar"
  | "circle"
  | "circle_outline"
  | "triangle"
  | "triangle_outline"
  | "diamond"
  | "diamond_outline"
  | null;

interface BoundElement {
  id: string;
  type: "arrow" | "text";
}

// ─── Generic Elements (no extra props) ──────────────────────
interface ExcalidrawRectangleElement extends ExcalidrawElementBase {
  type: "rectangle";
}
interface ExcalidrawDiamondElement extends ExcalidrawElementBase {
  type: "diamond";
}
interface ExcalidrawEllipseElement extends ExcalidrawElementBase {
  type: "ellipse";
}

// ─── Text Element ───────────────────────────────────────────
interface ExcalidrawTextElement extends ExcalidrawElementBase {
  type: "text";
  fontSize: number;
  fontFamily: number; // 5=Excalifont, 6=Nunito, 7=Lilita One, 8=Comic Shanns
  text: string; // displayed (wrapped) text
  originalText: string; // unwrapped original
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  containerId: string | null; // bound to shape
  autoResize: boolean;
  lineHeight: number; // unitless multiplier
}

// ─── Linear Elements ────────────────────────────────────────
interface ExcalidrawLinearElement extends ExcalidrawElementBase {
  type: "line" | "arrow";
  points: [number, number][]; // relative to (x,y); [0] always [0,0]
  startBinding: FixedPointBinding | null;
  endBinding: FixedPointBinding | null;
  startArrowhead: Arrowhead;
  endArrowhead: Arrowhead;
}

interface ExcalidrawArrowElement extends ExcalidrawLinearElement {
  type: "arrow";
  elbowed: boolean;
}

interface ExcalidrawLineElement extends ExcalidrawLinearElement {
  type: "line";
  polygon: boolean;
}

interface FixedPointBinding {
  elementId: string;
  fixedPoint: [number, number]; // [0-1, 0-1] ratio within target
  mode: "inside" | "orbit" | "skip";
}

// ─── FreeDraw Element ───────────────────────────────────────
interface ExcalidrawFreeDrawElement extends ExcalidrawElementBase {
  type: "freedraw";
  points: [number, number][];
  pressures: number[];
  simulatePressure: boolean;
}

// ─── Union Type ─────────────────────────────────────────────
type ExcalidrawElement =
  | ExcalidrawRectangleElement
  | ExcalidrawDiamondElement
  | ExcalidrawEllipseElement
  | ExcalidrawTextElement
  | ExcalidrawArrowElement
  | ExcalidrawLineElement
  | ExcalidrawFreeDrawElement;
```

### 4.2 Default Values

```typescript
// features/elements/constants.ts

export const DEFAULT_ELEMENT_PROPS = {
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "solid" as const,
  strokeWidth: 2,
  strokeStyle: "solid" as const,
  roughness: 1,
  opacity: 100,
  locked: false,
};

export const DEFAULT_FONT_SIZE = 20;
export const DEFAULT_FONT_FAMILY = 5; // Excalifont
export const DEFAULT_TEXT_ALIGN = "left";
export const DEFAULT_VERTICAL_ALIGN = "top";

export const ROUNDNESS = {
  LEGACY: 1,
  PROPORTIONAL_RADIUS: 2,
  ADAPTIVE_RADIUS: 3,
} as const;

// Default roundness by type
export function getDefaultRoundness(type: string) {
  switch (type) {
    case "rectangle":
      return { type: ROUNDNESS.ADAPTIVE_RADIUS };
    case "diamond":
      return { type: ROUNDNESS.PROPORTIONAL_RADIUS };
    case "line":
    case "arrow":
      return { type: ROUNDNESS.PROPORTIONAL_RADIUS };
    default:
      return null; // ellipse, freedraw, text
  }
}

export const BOUND_TEXT_PADDING = 5;
export const DEFAULT_ADAPTIVE_RADIUS = 32;
export const DEFAULT_PROPORTIONAL_RADIUS = 0.25;
```

### 4.3 `.excalidraw` File Format

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://drawly.app",
  "elements": [],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": null,
    "theme": "light"
  },
  "files": {}
}
```

---

## 5. Canvas Rendering Architecture

### 5.1 Triple-Canvas Stack

Identical to Excalidraw's approach — three `<canvas>` elements stacked with CSS:

| Canvas          | z-index | pointer-events | Purpose                                             |
| --------------- | ------- | -------------- | --------------------------------------------------- |
| **Static**      | 1       | none           | All committed elements + grid                       |
| **NewElement**  | 1       | none           | Element currently being drawn                       |
| **Interactive** | 2       | all            | Selection borders, resize handles, rotation handles |

Why triple canvas?

- During drawing, only the NewElement canvas re-renders (1 element vs. hundreds)
- Interactive overlays (selection handles) update independently from element rendering
- Static canvas can be throttled independently

### 5.2 Render Pipeline

```
State change (element mutation, viewport change, selection change)
    │
    ├─→ markStaticDirty()
    │     └─→ useRafFn tick
    │           └─→ renderStaticScene()
    │                 ├─→ bootstrapCanvas(ctx, dpr, width, height, bgColor)
    │                 ├─→ ctx.scale(zoom, zoom)
    │                 ├─→ renderGrid() (if enabled)
    │                 └─→ for each visible element:
    │                       ├─→ getOrGenerateShape(element)  // roughjs + cache
    │                       ├─→ renderElementToOffscreenCanvas(element, shape)
    │                       └─→ ctx.drawImage(offscreenCanvas, x + scrollX, y + scrollY)
    │
    ├─→ markNewElementDirty()
    │     └─→ useRafFn tick
    │           └─→ renderNewElement()
    │                 ├─→ clear canvas
    │                 └─→ renderElement(newElement)
    │
    └─→ markInteractiveDirty()
          └─→ useRafFn tick
                └─→ renderInteractiveScene()
                      ├─→ clear canvas (transparent)
                      ├─→ ctx.scale(zoom, zoom)
                      ├─→ renderSelectionBorders()
                      ├─→ renderTransformHandles()
                      ├─→ renderSelectionRectangle()
                      └─→ renderSnapGuides() (if snapping)
```

### 5.3 Shape Generation with roughjs

```typescript
// features/rendering/shapeGenerator.ts

import { RoughGenerator } from "roughjs/bin/generator";
import type { Drawable, Options } from "roughjs/bin/core";

const generator = new RoughGenerator();

// WeakMap cache: when element reference changes (mutation creates new object),
// old entry is GC'd automatically
const shapeCache = new WeakMap<
  ExcalidrawElement,
  {
    shape: Drawable | Drawable[] | null;
    theme: "light" | "dark";
  }
>();

export function getOrGenerateShape(
  element: ExcalidrawElement,
  theme: "light" | "dark",
): Drawable | Drawable[] | null {
  const cached = shapeCache.get(element);
  if (cached && cached.theme === theme) return cached.shape;

  const shape = generateShape(element, theme);
  shapeCache.set(element, { shape, theme });
  return shape;
}

function generateShape(el: ExcalidrawElement, theme: string) {
  const options = buildRoughOptions(el);

  switch (el.type) {
    case "rectangle":
      return el.roundness
        ? generator.path(roundedRectPath(el.width, el.height, getCornerRadius(el)))
        : generator.rectangle(0, 0, el.width, el.height, options);

    case "ellipse":
      return generator.ellipse(el.width / 2, el.height / 2, el.width, el.height, {
        ...options,
        curveFitting: 1,
      });

    case "diamond":
      const [tX, tY, rX, rY, bX, bY, lX, lY] = getDiamondPoints(el);
      return generator.polygon(
        [
          [tX, tY],
          [rX, rY],
          [bX, bY],
          [lX, lY],
        ],
        options,
      );

    case "arrow":
    case "line":
      return generateLinearShape(el, options);

    case "freedraw":
      return null; // rendered via perfect-freehand SVG path

    case "text":
      return null; // rendered via ctx.fillText

    default:
      return null;
  }
}

function buildRoughOptions(el: ExcalidrawElement): Options {
  return {
    seed: el.seed,
    strokeLineDash:
      el.strokeStyle === "dashed" ? [12, 8] : el.strokeStyle === "dotted" ? [3, 6] : undefined,
    disableMultiStroke: el.strokeStyle !== "solid",
    strokeWidth: el.strokeWidth,
    fillWeight: el.strokeWidth / 2,
    hachureGap: el.strokeWidth * 4,
    roughness: adjustRoughness(el),
    stroke: el.strokeColor,
    fill: el.backgroundColor !== "transparent" ? el.backgroundColor : undefined,
    fillStyle: el.fillStyle,
    preserveVertices: el.roughness < 2,
  };
}
```

### 5.4 Per-Element Canvas Cache

Like Excalidraw, each element is rendered to its own off-screen canvas, then `drawImage()`'d to the main canvas. This avoids re-running roughjs on every frame.

```typescript
// features/rendering/renderElement.ts

const elementCanvasCache = new WeakMap<
  ExcalidrawElement,
  {
    canvas: HTMLCanvasElement;
    zoom: number;
    theme: string;
    version: number;
  }
>();

export function renderElement(
  element: ExcalidrawElement,
  mainCtx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  scrollX: number,
  scrollY: number,
  zoom: number,
  theme: string,
) {
  // Check cache validity
  const cached = elementCanvasCache.get(element);
  if (
    cached &&
    cached.zoom === zoom &&
    cached.theme === theme &&
    cached.version === element.version
  ) {
    drawCachedElement(mainCtx, element, cached.canvas, scrollX, scrollY, zoom);
    return;
  }

  // Generate off-screen canvas
  const { canvas, offsetX, offsetY } = generateElementCanvas(element, rc, zoom, theme);
  elementCanvasCache.set(element, { canvas, zoom, theme, version: element.version });
  drawCachedElement(mainCtx, element, canvas, scrollX, scrollY, zoom);
}
```

### 5.5 Text Rendering

```typescript
function renderText(ctx: CanvasRenderingContext2D, el: ExcalidrawTextElement) {
  ctx.font = `${el.fontSize}px ${getFontName(el.fontFamily)}`;
  ctx.fillStyle = el.strokeColor;
  ctx.textAlign = el.textAlign as CanvasTextAlign;

  const lines = el.text.split("\n");
  const lineHeightPx = el.fontSize * el.lineHeight;

  for (let i = 0; i < lines.length; i++) {
    const x = el.textAlign === "center" ? el.width / 2 : el.textAlign === "right" ? el.width : 0;
    ctx.fillText(lines[i], x, i * lineHeightPx + el.fontSize);
  }
}
```

### 5.6 FreeDraw Rendering (perfect-freehand)

```typescript
import { getStroke } from "perfect-freehand";

function renderFreeDraw(ctx: CanvasRenderingContext2D, el: ExcalidrawFreeDrawElement) {
  const outlinePoints = getStroke(
    el.points.map((p, i) => [...p, el.pressures[i] ?? 0.5]),
    {
      simulatePressure: el.simulatePressure,
      size: el.strokeWidth * 4.25,
      thinning: 0.6,
      smoothing: 0.5,
      streamline: 0.5,
      easing: (t) => Math.sin((t * Math.PI) / 2),
      last: true,
    },
  );

  const svgPath = getSvgPathFromStroke(outlinePoints);
  ctx.fillStyle = el.strokeColor;
  ctx.fill(new Path2D(svgPath));
}
```

### 5.6 Zoom & Pan Transform

```typescript
function bootstrapCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dpr: number,
  width: number,
  height: number,
  bgColor?: string,
) {
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }
}

// In render loop:
ctx.scale(zoom, zoom);
// Elements positioned at: (element.x + scrollX, element.y + scrollY)
```

---

## 6. State Management

### 6.1 App State Shape

```typescript
// features/elements/types.ts (AppState section)

interface AppState {
  // Viewport
  scrollX: number;
  scrollY: number;
  zoom: number; // normalized zoom value
  width: number; // canvas width (CSS px)
  height: number; // canvas height (CSS px)
  viewBackgroundColor: string;

  // Active tool
  activeTool: {
    type: ToolType;
    locked: boolean; // Q key — don't revert to selection
    lastActiveTool: ToolType | null;
  };

  // Current item defaults (sticky — new elements inherit these)
  currentItemStrokeColor: string;
  currentItemBackgroundColor: string;
  currentItemFillStyle: FillStyle;
  currentItemStrokeWidth: number;
  currentItemStrokeStyle: StrokeStyle;
  currentItemRoughness: number;
  currentItemOpacity: number;
  currentItemFontFamily: number;
  currentItemFontSize: number;
  currentItemRoundness: "round" | "sharp";
  currentItemStartArrowhead: Arrowhead;
  currentItemEndArrowhead: Arrowhead;

  // Selection
  selectedElementIds: Record<string, true>;

  // Transient interaction state
  newElement: ExcalidrawElement | null;
  editingTextElement: ExcalidrawTextElement | null;
  resizingElement: ExcalidrawElement | null;
  selectionElement: { x: number; y: number; width: number; height: number } | null;
  cursorButton: "up" | "down";
  isResizing: boolean;
  isRotating: boolean;
  isDragging: boolean;

  // Theme
  theme: "light" | "dark";

  // Grid
  gridSize: number | null;
  gridModeEnabled: boolean;
}

type ToolType =
  | "selection"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "freedraw"
  | "text"
  | "hand"
  | "eraser";
```

### 6.2 Reactivity Strategy

```
┌─────────────────────────────────────────────────────┐
│  REACTIVE LAYER (Vue Proxy)                          │
│  Fine for UI binding, triggers template re-renders   │
│                                                      │
│  • activeTool        → shallowRef<ActiveTool>        │
│  • selectedElementIds → shallowRef<Record>           │
│  • theme             → useDark()                     │
│  • canvasSize        → useElementSize()              │
│  • modifiers         → useKeyModifier()              │
│  • UI flags          → ref<boolean>                  │
└──────────┬──────────────────────────────────────────┘
           │ markDirty() on change
           ▼
┌─────────────────────────────────────────────────────┐
│  RENDER LAYER (raw JS, zero Proxy)                   │
│  60fps render loop reads via toRaw()                 │
│                                                      │
│  • elements[]        → shallowRef (toRaw in render)  │
│  • viewport          → shallowRef (toRaw in render)  │
│  • newElement        → plain object (not reactive)    │
│  • Canvas2D context  → markRaw()                     │
│  • RoughCanvas       → markRaw()                     │
│  • ShapeCache        → WeakMap (not reactive)         │
│  • Hit testing       → pure functions on raw data     │
└─────────────────────────────────────────────────────┘
```

**Critical rule**: Never make `CanvasRenderingContext2D`, `RoughCanvas`, or element arrays deeply reactive. Use `shallowRef` and `toRaw()` in the render loop.

---

## 7. Composable Architecture

### 7.1 Dependency Graph (by feature)

```
features/canvas          features/tools                  features/keyboard
  useCanvas ←───── useRenderer ←── useDrawingInteraction ←── useKeyboard
      ↑                 ↑                    ↑
      │          features/elements     features/tools
      │            useElements           useTool
      │                 ↑                    ↑
      │          features/selection   features/history
  useViewport      useSelection         useHistory
      │
features/persistence                features/theme
  useStorage (reads elements)         useTheme (shared by renderer + UI)
```

### 7.2 Composable Specifications

#### `useCanvas(containerRef)` — `features/canvas/composables/useCanvas.ts`

```typescript
export function useCanvas(containerRef: Ref<HTMLElement | null>) {
  const staticCanvas = shallowRef<HTMLCanvasElement | null>(null);
  const newElementCanvas = shallowRef<HTMLCanvasElement | null>(null);
  const interactiveCanvas = shallowRef<HTMLCanvasElement | null>(null);

  const staticCtx = shallowRef<CanvasRenderingContext2D | null>(null);
  const newElementCtx = shallowRef<CanvasRenderingContext2D | null>(null);
  const interactiveCtx = shallowRef<CanvasRenderingContext2D | null>(null);

  const rc = shallowRef<RoughCanvas | null>(null); // for roughjs

  // Auto-resize with DPR
  const { width, height } = useElementSize(containerRef);
  // ... setup on mount, resize handling

  return { staticCtx, newElementCtx, interactiveCtx, rc, width, height };
}
```

#### `useViewport()` — `features/canvas/composables/useViewport.ts`

```typescript
export function useViewport() {
  const scrollX = ref(0)
  const scrollY = ref(0)
  const zoom = ref(1)

  function screenToScene(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX / zoom.value) - scrollX.value,
      y: (screenY / zoom.value) - scrollY.value,
    }
  }

  function sceneToScreen(sceneX: number, sceneY: number): { x: number; y: number } {
    return {
      x: (sceneX + scrollX.value) * zoom.value,
      y: (sceneY + scrollY.value) * zoom.value,
    }
  }

  function zoomTo(newZoom: number, center?: { x: number; y: number }) { ... }
  function panBy(dx: number, dy: number) { ... }

  return { scrollX, scrollY, zoom, screenToScene, sceneToScreen, zoomTo, panBy }
}
```

#### `useElements()` — `features/elements/composables/useElements.ts`

```typescript
export function useElements() {
  const elements = shallowRef<ExcalidrawElement[]>([]);
  const elementsMap = computed(() => {
    const map = new Map<string, ExcalidrawElement>();
    for (const el of elements.value) map.set(el.id, el);
    return map;
  });

  function addElement(el: ExcalidrawElement) {
    elements.value = [...elements.value, el];
  }

  function updateElement(id: string, updates: Partial<ExcalidrawElement>) {
    // In-place mutation + version bump (for performance)
    const el = elementsMap.value.get(id);
    if (!el) return;
    Object.assign(el, updates);
    el.version++;
    el.versionNonce = randomInteger();
    el.updated = Date.now();
    triggerRef(elements); // notify Vue
  }

  function deleteElement(id: string) {
    updateElement(id, { isDeleted: true });
  }

  function getNonDeleted(): ExcalidrawElement[] {
    return elements.value.filter((el) => !el.isDeleted);
  }

  return { elements, elementsMap, addElement, updateElement, deleteElement, getNonDeleted };
}
```

#### `useSelection()` — `features/selection/composables/useSelection.ts`

```typescript
export function useSelection(elements: ShallowRef<ExcalidrawElement[]>) {
  const selectedIds = shallowRef<Record<string, true>>({})

  const selectedElements = computed(() =>
    elements.value.filter(el => selectedIds.value[el.id] && !el.isDeleted)
  )

  const selectionBounds = computed(() =>
    getCommonBounds(selectedElements.value)
  )

  function select(id: string) { selectedIds.value = { [id]: true } }
  function addToSelection(id: string) { selectedIds.value = { ...selectedIds.value, [id]: true } }
  function toggleSelection(id: string) { ... }
  function clearSelection() { selectedIds.value = {} }
  function selectAll() { ... }

  return { selectedIds, selectedElements, selectionBounds, select, addToSelection, toggleSelection, clearSelection, selectAll }
}
```

#### `useRenderer()` — `features/canvas/composables/useRenderer.ts`

```typescript
export function useRenderer(
  staticCtx: ShallowRef<CanvasRenderingContext2D | null>,
  interactiveCtx: ShallowRef<CanvasRenderingContext2D | null>,
  newElementCtx: ShallowRef<CanvasRenderingContext2D | null>,
  // ... other deps
) {
  const staticDirty = ref(false)
  const interactiveDirty = ref(false)
  const newElementDirty = ref(false)

  function markStaticDirty() { staticDirty.value = true }
  function markInteractiveDirty() { interactiveDirty.value = true }
  function markNewElementDirty() { newElementDirty.value = true }

  useRafFn(({ delta }) => {
    if (staticDirty.value) {
      renderStaticScene(toRaw(staticCtx.value), ...)
      staticDirty.value = false
    }
    if (newElementDirty.value) {
      renderNewElementScene(toRaw(newElementCtx.value), ...)
      newElementDirty.value = false
    }
    if (interactiveDirty.value) {
      renderInteractiveScene(toRaw(interactiveCtx.value), ...)
      interactiveDirty.value = false
    }
  })

  return { markStaticDirty, markInteractiveDirty, markNewElementDirty }
}
```

#### `useHistory()` — `features/history/composables/useHistory.ts`

```typescript
interface HistoryEntry {
  elements: ExcalidrawElement[]; // snapshot (deep clone)
  selectedIds: Record<string, true>;
}

export function useHistory(elements: ShallowRef<ExcalidrawElement[]>) {
  const undoStack: HistoryEntry[] = [];
  const redoStack: HistoryEntry[] = [];
  const canUndo = computed(() => undoStack.length > 0);
  const canRedo = computed(() => redoStack.length > 0);

  function snapshot() {
    undoStack.push({
      elements: structuredClone(toRaw(elements.value)),
      selectedIds: { ...selectedIds.value },
    });
    redoStack.length = 0; // clear redo on new action
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(currentSnapshot());
    const entry = undoStack.pop()!;
    applySnapshot(entry);
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(currentSnapshot());
    const entry = redoStack.pop()!;
    applySnapshot(entry);
  }

  return { snapshot, undo, redo, canUndo, canRedo };
}
```

> **Note**: MVP uses snapshot-based undo for simplicity. Production should migrate to delta-based undo (like Excalidraw) for memory efficiency with large drawings.

---

## 8. Tool System

### 8.1 Tool Interface

```typescript
// features/tools/types.ts

interface Tool {
  type: ToolType;
  cursor: string;

  onPointerDown(ctx: ToolContext, event: PointerEvent): void;
  onPointerMove(ctx: ToolContext, event: PointerEvent): void;
  onPointerUp(ctx: ToolContext, event: PointerEvent): void;
  onKeyDown?(ctx: ToolContext, event: KeyboardEvent): void;
}

interface ToolContext {
  // Coordinate transforms
  screenToScene(x: number, y: number): { x: number; y: number };

  // Element operations
  addElement(el: ExcalidrawElement): void;
  updateElement(id: string, updates: Partial<ExcalidrawElement>): void;
  deleteElement(id: string): void;
  getElements(): ExcalidrawElement[];

  // Selection
  select(id: string): void;
  clearSelection(): void;
  getSelectedElements(): ExcalidrawElement[];

  // Viewport
  scrollX: number;
  scrollY: number;
  zoom: number;

  // Transient state
  setNewElement(el: ExcalidrawElement | null): void;
  setCursor(cursor: string): void;

  // History
  snapshot(): void;

  // Modifiers
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;

  // Render triggers
  markStaticDirty(): void;
  markInteractiveDirty(): void;
  markNewElementDirty(): void;

  // Current defaults
  currentDefaults: CurrentItemDefaults;
}
```

### 8.2 Generic Shape Tool (Rectangle, Ellipse, Diamond)

```typescript
// features/tools/handlers/RectangleTool.ts (same pattern for Ellipse, Diamond)

export const RectangleTool: Tool = {
  type: "rectangle",
  cursor: "crosshair",

  onPointerDown(ctx, event) {
    ctx.snapshot(); // for undo
    const { x, y } = ctx.screenToScene(event.offsetX, event.offsetY);
    const element = createElement("rectangle", {
      x,
      y,
      width: 0,
      height: 0,
      ...ctx.currentDefaults,
    });
    ctx.addElement(element);
    ctx.setNewElement(element);
  },

  onPointerMove(ctx, event) {
    const newEl = ctx.getNewElement();
    if (!newEl) return;
    const { x, y } = ctx.screenToScene(event.offsetX, event.offsetY);

    let width = x - newEl.x;
    let height = y - newEl.y;

    // Shift = square constraint
    if (ctx.shiftKey) {
      const size = Math.max(Math.abs(width), Math.abs(height));
      width = Math.sign(width) * size;
      height = Math.sign(height) * size;
    }

    // Alt = draw from center
    if (ctx.altKey) {
      newEl.x = newEl.x - width; // double size, center at origin
      width *= 2;
      height *= 2;
    }

    ctx.updateElement(newEl.id, { width, height });
    ctx.markNewElementDirty();
  },

  onPointerUp(ctx, event) {
    const newEl = ctx.getNewElement();
    if (!newEl) return;

    // Normalize negative width/height
    normalizeElementDimensions(newEl);

    ctx.setNewElement(null);
    ctx.select(newEl.id);
    ctx.markStaticDirty();
    ctx.markInteractiveDirty();

    // Revert to selection unless tool is locked
    if (!ctx.toolLocked) ctx.setTool("selection");
  },
};
```

### 8.3 Selection Tool State Machine

```
┌──────────┐
│   Idle   │◄──── pointerUp (no drag)
└────┬─────┘
     │ pointerDown
     ▼
┌──────────────────────────────────────────────┐
│ Hit test: what did the user click?            │
├──────────────┬──────────────┬────────────────┤
│ Hit element  │ Hit handle   │ Hit nothing     │
│              │              │                 │
│ ┌──────────┐│ ┌──────────┐ │ ┌─────────────┐│
│ │ Dragging ││ │ Resizing │ │ │ Box-select  ││
│ │ element  ││ │ element  │ │ │ (marquee)   ││
│ └──────────┘│ └──────────┘ │ └─────────────┘│
└──────────────┴──────────────┴────────────────┘
     │                │                │
     ▼                ▼                ▼
  pointerUp        pointerUp       pointerUp
  (select el)      (finalize)      (select enclosed)
```

### 8.4 Tool → Composable Wiring

```typescript
// features/tools/composables/useDrawingInteraction.ts

export function useDrawingInteraction(
  interactiveCanvas: Ref<HTMLCanvasElement | null>,
  toolContext: ToolContext,
) {
  const currentTool = computed(() => getToolInstance(toolContext.activeTool.value.type));

  useEventListener(interactiveCanvas, "pointerdown", (e: PointerEvent) => {
    interactiveCanvas.value?.setPointerCapture(e.pointerId);
    currentTool.value.onPointerDown(toolContext, e);
  });

  useEventListener(interactiveCanvas, "pointermove", (e: PointerEvent) => {
    currentTool.value.onPointerMove(toolContext, e);
  });

  useEventListener(interactiveCanvas, "pointerup", (e: PointerEvent) => {
    interactiveCanvas.value?.releasePointerCapture(e.pointerId);
    currentTool.value.onPointerUp(toolContext, e);
  });

  // Wheel for zoom
  useEventListener(
    interactiveCanvas,
    "wheel",
    (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Pinch zoom
        const delta = -e.deltaY * 0.01;
        toolContext.zoomBy(delta, { x: e.offsetX, y: e.offsetY });
      } else {
        // Pan
        toolContext.panBy(-e.deltaX, -e.deltaY);
      }
    },
    { passive: false },
  );
}
```

---

## 9. Keyboard Shortcuts

### 9.1 Tool Selection Shortcuts

| Key | Tool           | Numeric Alt |
| --- | -------------- | ----------- |
| V   | Selection      | 1           |
| R   | Rectangle      | 2           |
| D   | Diamond        | 3           |
| O   | Ellipse        | 4           |
| A   | Arrow          | 5           |
| L   | Line           | 6           |
| P   | Freedraw (Pen) | 7           |
| T   | Text           | 8           |
| H   | Hand (pan)     | —           |
| E   | Eraser         | 0           |

### 9.2 Action Shortcuts

| Shortcut           | Action                               |
| ------------------ | ------------------------------------ |
| Ctrl+Z             | Undo                                 |
| Ctrl+Shift+Z       | Redo                                 |
| Ctrl+A             | Select all                           |
| Delete / Backspace | Delete selected                      |
| Ctrl+C             | Copy                                 |
| Ctrl+V             | Paste                                |
| Ctrl+D             | Duplicate                            |
| Escape             | Deselect / cancel                    |
| Arrow keys         | Move selected (1px, 10px with Shift) |
| Q                  | Lock tool mode                       |
| Space (hold)       | Temporary hand tool                  |
| Ctrl+= / Ctrl+-    | Zoom in/out                          |
| Ctrl+0             | Reset zoom                           |

### 9.3 Implementation with useMagicKeys

```typescript
// features/keyboard/composables/useKeyboard.ts

export function useKeyboard(toolContext: ToolContext) {
  const keys = useMagicKeys({ passive: false });
  const shift = useKeyModifier("Shift", { initial: false });
  const alt = useKeyModifier("Alt", { initial: false });
  const ctrl = useKeyModifier("Control", { initial: false });
  const meta = useKeyModifier("Meta", { initial: false });
  const activeEl = useActiveElement();

  // Guard: don't fire tool shortcuts while typing
  const notTyping = computed(() => {
    const tag = activeEl.value?.tagName;
    return tag !== "INPUT" && tag !== "TEXTAREA" && !activeEl.value?.isContentEditable;
  });

  // Tool shortcuts
  whenever(logicAnd(keys.v, notTyping), () => toolContext.setTool("selection"));
  whenever(logicAnd(keys.r, notTyping), () => toolContext.setTool("rectangle"));
  whenever(logicAnd(keys.d, notTyping), () => toolContext.setTool("diamond"));
  whenever(logicAnd(keys.o, notTyping), () => toolContext.setTool("ellipse"));
  whenever(logicAnd(keys.a, notTyping), () => toolContext.setTool("arrow"));
  whenever(logicAnd(keys.l, notTyping), () => toolContext.setTool("line"));
  whenever(logicAnd(keys.p, notTyping), () => toolContext.setTool("freedraw"));
  whenever(logicAnd(keys.t, notTyping), () => toolContext.setTool("text"));
  whenever(logicAnd(keys.h, notTyping), () => toolContext.setTool("hand"));

  // Numeric shortcuts (1-8 for tools, 0 for eraser)
  whenever(logicAnd(keys["1"], notTyping), () => toolContext.setTool("selection"));
  whenever(logicAnd(keys["2"], notTyping), () => toolContext.setTool("rectangle"));
  // ... etc

  // Space for temporary hand tool
  const spaceHeld = ref(false);
  useEventListener("keydown", (e: KeyboardEvent) => {
    if (e.code === "Space" && !spaceHeld.value && notTyping.value) {
      e.preventDefault();
      spaceHeld.value = true;
      toolContext.setTemporaryTool("hand");
    }
  });
  useEventListener("keyup", (e: KeyboardEvent) => {
    if (e.code === "Space" && spaceHeld.value) {
      spaceHeld.value = false;
      toolContext.revertTemporaryTool();
    }
  });

  // Action shortcuts (Ctrl/Cmd aware)
  const cmdOrCtrl = computed(() => ctrl.value || meta.value);

  useEventListener("keydown", (e: KeyboardEvent) => {
    if (!notTyping.value && e.key !== "Escape") return;

    // Undo: Ctrl+Z (not shift)
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      toolContext.undo();
    }
    // Redo: Ctrl+Shift+Z or Ctrl+Y
    if ((e.ctrlKey || e.metaKey) && ((e.key === "z" && e.shiftKey) || e.key === "y")) {
      e.preventDefault();
      toolContext.redo();
    }
    // Delete
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      toolContext.deleteSelected();
    }
    // Select all
    if ((e.ctrlKey || e.metaKey) && e.key === "a") {
      e.preventDefault();
      toolContext.selectAll();
    }
    // Escape
    if (e.key === "Escape") {
      toolContext.clearSelection();
      toolContext.setTool("selection");
    }
    // Arrow key movement
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      toolContext.moveSelected(dx, dy);
    }
    // Zoom
    if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
      e.preventDefault();
      toolContext.zoomIn();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "-") {
      e.preventDefault();
      toolContext.zoomOut();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "0") {
      e.preventDefault();
      toolContext.resetZoom();
    }
  });

  return { shift, alt, cmdOrCtrl };
}
```

---

## 10. Hit Testing & Selection

### 10.1 Hit Test Pipeline

```typescript
// features/selection/hitTest.ts

export function hitTest(
  point: { x: number; y: number },
  element: ExcalidrawElement,
  zoom: number,
): boolean {
  const threshold = Math.max(element.strokeWidth / 2 + 0.1, 10 / zoom);

  switch (element.type) {
    case "rectangle":
      return hitTestRectangle(point, element, threshold);
    case "ellipse":
      return hitTestEllipse(point, element, threshold);
    case "diamond":
      return hitTestDiamond(point, element, threshold);
    case "line":
    case "arrow":
      return hitTestLinear(point, element, threshold);
    case "freedraw":
      return hitTestFreeDraw(point, element, threshold);
    case "text":
      return hitTestBoundingBox(point, element);
    default:
      return hitTestBoundingBox(point, element);
  }
}

function hitTestRectangle(
  point: { x: number; y: number },
  el: ExcalidrawElement,
  threshold: number,
): boolean {
  // If filled, test if point is inside
  if (el.backgroundColor !== "transparent") {
    return isPointInRotatedRect(point, el);
  }
  // Otherwise, test against stroke outline only
  return isPointNearRectOutline(point, el, threshold);
}

// Ellipse uses: ((px-cx)/rx)^2 + ((py-cy)/ry)^2 <= 1 (for filled)
// Diamond uses: point-in-polygon with 4 vertices
// Linear: distance from point to each line segment < threshold
// FreeDraw: distance from point to any segment < threshold
```

### 10.2 Element-at-Position

```typescript
export function getElementAtPosition(
  sceneX: number,
  sceneY: number,
  elements: ExcalidrawElement[],
  zoom: number,
): ExcalidrawElement | null {
  // Iterate back-to-front (highest z-index first)
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.isDeleted || el.locked) continue;
    if (hitTest({ x: sceneX, y: sceneY }, el, zoom)) {
      return el;
    }
  }
  return null;
}
```

### 10.3 Transform Handles

```typescript
export type TransformHandleType = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "rotation";

export function getTransformHandleAtPosition(
  sceneX: number,
  sceneY: number,
  element: ExcalidrawElement,
  zoom: number,
): TransformHandleType | null {
  const handles = getTransformHandles(element, zoom);
  const handleSize = 8 / zoom;

  for (const [type, [hx, hy]] of Object.entries(handles)) {
    if (Math.abs(sceneX - hx) < handleSize && Math.abs(sceneY - hy) < handleSize) {
      return type as TransformHandleType;
    }
  }
  return null;
}
```

---

## 11. Undo/Redo

### MVP Approach: Snapshot-Based

For the MVP, use full-state snapshots. Each significant action (element create, delete, move, resize) pushes a snapshot of the entire elements array.

```
Action Flow:

User creates rectangle
  → snapshot() pushes current state to undoStack
  → clear redoStack
  → mutate elements
  → render

User presses Ctrl+Z
  → push current state to redoStack
  → pop undoStack → apply as current state
  → render

User presses Ctrl+Shift+Z
  → push current state to undoStack
  → pop redoStack → apply as current state
  → render
```

### Snapshot Triggers

Create a history entry when:

- Element created (pointerUp after drawing)
- Element(s) deleted
- Element(s) moved (pointerUp after drag)
- Element(s) resized (pointerUp after resize)
- Text edited (blur/Enter after editing)
- Paste / duplicate

Do NOT create entry during:

- Active drawing (pointerMove)
- Active dragging (pointerMove)
- Selection changes (click to select)

### Memory Optimization

```typescript
const MAX_HISTORY_SIZE = 100;

function snapshot() {
  if (undoStack.length >= MAX_HISTORY_SIZE) {
    undoStack.shift(); // drop oldest
  }
  undoStack.push(structuredClone(toRaw(elements.value)));
  redoStack.length = 0;
}
```

---

## 12. VueUse Integration Map

| Feature        | VueUse Composable                   | Usage                                        |
| -------------- | ----------------------------------- | -------------------------------------------- |
| Tool shortcuts | `useMagicKeys`                      | R/O/D/V/A/L/P/T/H/E key → tool switch        |
| Modifier keys  | `useKeyModifier`                    | Shift (constrain), Alt (center), Ctrl (snap) |
| Canvas events  | `useEventListener`                  | pointer/wheel events on interactive canvas   |
| Render loop    | `useRafFn`                          | 60fps dirty-flag render cycle                |
| Canvas sizing  | `useElementSize`                    | Responsive canvas + DPR handling             |
| Dark mode      | `useDark`                           | Theme toggle with localStorage persist       |
| Auto-save      | `useLocalStorage` + `useDebounceFn` | Debounced save to localStorage               |
| Clipboard      | `useClipboard`                      | Copy/paste elements as JSON                  |
| File drop      | `useDropZone`                       | Import .excalidraw files via drag & drop     |
| Document title | `useTitle`                          | Show drawing name in browser tab             |
| Event throttle | `useThrottleFn`                     | Throttle expensive hit-test recalcs          |
| Typing guard   | `useActiveElement`                  | Suppress shortcuts during text input         |
| Boolean logic  | `whenever` + `logicAnd`             | Clean reactive shortcut registration         |

### VueUse Composables NOT Used (and why)

| Composable          | Reason to skip                                                   |
| ------------------- | ---------------------------------------------------------------- |
| `usePointer`        | Too simple; custom pointer handling needed for drawing lifecycle |
| `useMouse`          | Mouse-only, no pen/touch support                                 |
| `useRefHistory`     | Too expensive for large drawings; custom snapshot undo instead   |
| `useColorMode`      | Overkill — `useDark` is sufficient for binary theme              |
| `useResizeObserver` | `useElementSize` is a cleaner API for our needs                  |

---

## 13. Phased Implementation Roadmap

### Phase 1: Canvas Foundation (Est. ~2 days)

**Goal**: Blank canvas with zoom/pan that looks like Excalidraw

**Deliverables**:

- [ ] Nuxt 3 project scaffold (ssr: false, Tailwind)
- [ ] `features/canvas/` — `useCanvas`, `useViewport`, `useRenderer` composables
- [ ] Canvas components: `CanvasContainer`, `StaticCanvas`, `NewElementCanvas`, `InteractiveCanvas`
- [ ] `shared/math.ts` — point/vector utilities
- [ ] Background rendering (white/off-white with optional dot grid)
- [ ] Canvas auto-resizing via `useElementSize`
- [ ] Cursor changes based on mode (crosshair, grab, grabbing)

**Acceptance criteria**:

- Canvas fills viewport, responds to resize
- Ctrl+Scroll zooms in/out around cursor
- Space+drag pans the canvas
- Grid dots visible at default zoom
- HiDPI rendering is crisp

---

### Phase 2: Shape Drawing (Est. ~2 days)

**Goal**: Draw rectangles, ellipses, diamonds with roughjs

**Deliverables**:

- [ ] `features/elements/` — types, constants, `createElement`, `mutateElement`, `useElements`
- [ ] `features/rendering/` — `shapeGenerator`, `renderElement`, `renderScene`
- [ ] `features/tools/` — `useTool`, `useDrawingInteraction`, `Toolbar.vue`
- [ ] `features/tools/handlers/` — `RectangleTool`, `EllipseTool`, `DiamondTool`
- [ ] `shared/random.ts` — ID generation, random seed
- [ ] Keyboard shortcuts (R, O, D) via `useMagicKeys`
- [ ] Shift constraint (square rect, circle ellipse)

**Acceptance criteria**:

- Press R, click-drag on canvas → roughjs rectangle appears
- Press O, click-drag → ellipse; Press D → diamond
- Shift constrains to equal proportions
- Elements persist across zoom/pan
- Shapes have hand-drawn roughjs aesthetic with seed-based determinism
- Multiple shapes can coexist on canvas

---

### Phase 3: Selection & Manipulation (Est. ~3 days)

**Goal**: Select, move, resize, delete, undo/redo elements

**Deliverables**:

- [ ] `features/selection/` — `hitTest`, `bounds`, `transformHandles`, `useSelection`
- [ ] `features/rendering/renderInteractive.ts` — selection borders, resize handles
- [ ] `features/tools/handlers/SelectionTool.ts` — click-to-select, Shift+click, box-select
- [ ] Drag to move selected elements
- [ ] Resize handles (8 cardinal + diagonal)
- [ ] Rotation handle (stretch goal)
- [ ] Delete key / Backspace to remove selected
- [ ] `features/history/` — `useHistory` (snapshot-based undo/redo)
- [ ] `features/keyboard/` — `useKeyboard` (Ctrl+Z, Ctrl+Shift+Z, Ctrl+A, arrows, Escape)
- [ ] Arrow key movement (1px, 10px with Shift)

**Acceptance criteria**:

- V key switches to selection tool
- Click on element selects it (blue border + handles)
- Drag moves selected elements
- Corner handles resize elements
- Delete key removes elements
- Ctrl+Z undoes last action, Ctrl+Shift+Z redoes
- Box-select (drag on empty space) selects enclosed elements
- Shift+click toggles multi-selection

---

### Phase 4: Lines, Arrows & FreeDraw (Est. ~2 days)

**Goal**: Draw lines, arrows, and freehand strokes

**Deliverables**:

- [ ] `features/tools/handlers/LineTool.ts` — click to place points, double-click/Enter to finish
- [ ] `features/tools/handlers/ArrowTool.ts` — same as line but with arrowhead rendering
- [ ] `features/tools/handlers/FreeDrawTool.ts` — continuous stroke on pointerdown/move/up
- [ ] perfect-freehand integration for pressure-sensitive strokes
- [ ] Arrowhead rendering (triangle at end)
- [ ] Linear element points storage (relative to element x,y)
- [ ] Hit testing for linear elements in `features/selection/hitTest.ts`
- [ ] Keyboard shortcuts: A (arrow), L (line), P (freedraw)

**Acceptance criteria**:

- A key → arrow tool, click two points → arrow with arrowhead
- L key → line tool, click multiple points → multi-segment line
- P key → freedraw, click-drag → smooth hand-drawn stroke
- All linear elements selectable, movable, deletable
- Arrow has triangle arrowhead at end
- FreeDraw strokes have variable width (simulated pressure)

---

### Phase 5: Text Tool (Est. ~2 days)

**Goal**: Add and edit text elements

**Deliverables**:

- [ ] `features/tools/handlers/TextTool.ts` — click to place text, opens floating textarea
- [ ] `features/tools/components/TextEditor.vue` — absolutely positioned textarea overlay
- [ ] `features/rendering/textMeasure.ts` — text width/height calculation via Canvas API
- [ ] Text rendering via `ctx.fillText` with proper line breaks
- [ ] Double-click to edit existing text
- [ ] Escape / click outside to commit text
- [ ] Excalifont (fontFamily: 5) as default font
- [ ] Font loading (Excalifont WOFF2)
- [ ] Keyboard shortcut: T
- [ ] Text wrapping (auto-resize width to content)

**Acceptance criteria**:

- T key → text tool, click on canvas → floating textarea appears
- Type text → live preview on canvas
- Click outside / Escape → commits text as element
- Double-click existing text → re-opens editor
- Text renders with Excalifont (hand-written look)
- Multi-line text wraps and renders correctly

---

### Phase 6: Persistence & Polish (Est. ~1 day)

**Goal**: Save/load drawings, dark mode, export/import .excalidraw files

**Deliverables**:

- [ ] `features/persistence/` — `useStorage` (debounced auto-save), `serialize.ts` (import/export)
- [ ] `useDropZone` — drag & drop .excalidraw file to import
- [ ] `features/theme/` — `useTheme` (dark mode toggle via `useDark`)
- [ ] Dark mode canvas colors (dark background, adjusted element colors)
- [ ] `useClipboard` — copy/paste elements via Ctrl+C/V
- [ ] `useTitle` — dynamic document title
- [ ] Tool lock mode (Q key — persist tool after use)
- [ ] `features/tools/components/ContextMenu.vue` — right-click menu (delete, duplicate, z-order)
- [ ] `features/tools/handlers/HandTool.ts` — H key for pan mode

**Acceptance criteria**:

- Drawings auto-save and persist on page reload
- Export button downloads `.excalidraw` file
- Drag-drop `.excalidraw` file loads the drawing
- File is valid — opens correctly in excalidraw.com
- Dark mode toggle works, canvas adjusts
- Copy/paste elements works within the app
- Q key locks tool, Space key temporarily pans

---

### Phase Summary

| Phase | Focus                     | Cumulative State                        |
| ----- | ------------------------- | --------------------------------------- |
| 1     | Canvas + viewport         | Empty canvas with zoom/pan              |
| 2     | Shape drawing             | Can draw rectangles, ellipses, diamonds |
| 3     | Selection + manipulation  | Can select, move, resize, delete, undo  |
| 4     | Lines + arrows + freedraw | Full shape toolkit                      |
| 5     | Text                      | Complete element types                  |
| 6     | Persistence + polish      | Save/load, dark mode, file compat       |

After Phase 6, the MVP is complete: a functional Excalidraw-like drawing app that produces `.excalidraw`-compatible files, with all core shapes, keyboard shortcuts, and the hand-drawn aesthetic.

---

## Appendix A: Critical Implementation Notes

### A1: roughjs Seed Determinism

Every element MUST have a stable `seed` (random integer). This ensures roughjs produces identical strokes on every render. The seed is set once at creation and never changes.

### A2: Element Points[0] Invariant

For linear elements (line, arrow, freedraw), `points[0]` is always `[0, 0]`. The element's `(x, y)` position is the absolute position of the first point. All subsequent points are relative offsets.

### A3: strokeWidth: 0 Gotcha

Excalidraw uses `element.strokeWidth || 2`, meaning `strokeWidth: 0` silently becomes `2`. We must replicate this behavior for format compatibility.

### A4: Canvas Size Limits

Safari limits canvas area to 16,777,216 pixels and max dimension to 32,767px. Off-screen element canvases must be capped to these limits.

### A5: Text in Containers

When text is bound to a shape (containerId), the shape's `boundElements` array has `{id, type: "text"}` and the text's `containerId` points back. Text capacity varies by container type:

- Rectangle: ~full width minus padding
- Ellipse: ~71% of dimensions
- Diamond: ~50% of dimensions

### A6: Version Bumping

Every element mutation MUST increment `version`, regenerate `versionNonce`, and update `updated` timestamp. This is critical for future collaboration support and undo/redo correctness.
