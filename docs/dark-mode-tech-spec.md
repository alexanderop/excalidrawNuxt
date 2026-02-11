# Dark Mode Technical Specification

> Reverse-engineered from Excalidraw source code. Use as the authoritative reference when implementing dark mode in our Nuxt/Vue canvas.
>
> **Source root:** `excalidraw/packages/` (git-ignored, reference only)

---

## Table of Contents

1. [Data Model](#1-data-model)
2. [Color Transformation Algorithm](#2-color-transformation-algorithm)
3. [Color Palette System](#3-color-palette-system)
4. [Canvas Rendering Pipeline](#4-canvas-rendering-pipeline)
5. [CSS Theming System](#5-css-theming-system)
6. [Theme Switching Mechanism](#6-theme-switching-mechanism)
7. [Image Handling in Dark Mode](#7-image-handling-in-dark-mode)
8. [Export with Dark Mode](#8-export-with-dark-mode)
9. [Interactive Canvas Overlays](#9-interactive-canvas-overlays)
10. [Constants Reference](#10-constants-reference)

---

## 1. Data Model

> **Core sources:**
>
> - `common/src/constants.ts` — `THEME` constant, `DARK_THEME_FILTER`
> - `element/src/types.ts` — `Theme` type definition
> - `excalidraw/appState.ts` — default app state, persistence config
> - `excalidraw/scene/types.ts` — render config types

### Theme Type

<!-- Source: common/src/constants.ts — THEME (line 192), element/src/types.ts — Theme (line 22) -->

```typescript
// common/src/constants.ts:192
export const THEME = {
  LIGHT: "light",
  DARK: "dark",
} as const;

// element/src/types.ts:22
export type Theme = (typeof THEME)[keyof typeof THEME]; // "light" | "dark"
```

### Dark Theme CSS Filter Constant

<!-- Source: common/src/constants.ts — DARK_THEME_FILTER (line 197) -->

```typescript
export const DARK_THEME_FILTER = "invert(93%) hue-rotate(180deg)";
```

This filter is the **core of the entire dark mode system**. Rather than maintaining separate color palettes for dark mode, Excalidraw applies an `invert(93%) + hue-rotate(180deg)` transformation to all element colors. This is applied both as a CSS filter (for images/SVG) and programmatically (for canvas-rendered elements).

### AppState Theme Fields

<!-- Source: excalidraw/appState.ts — getDefaultAppState() (line 22) -->

```typescript
// In AppState:
{
  theme: Theme; // Current UI + canvas theme ("light" | "dark")
  exportWithDarkMode: boolean; // Whether exports use dark mode (default: false)
}
```

**Defaults:**

- `theme`: `THEME.LIGHT` (line 28)
- `exportWithDarkMode`: `false` (line 68)

### State Persistence Config

<!-- Source: excalidraw/appState.ts — persistence flags (lines 151, 190) -->

```typescript
// Which contexts each field is persisted to:
theme:              { browser: true,  export: false, server: false }
exportWithDarkMode: { browser: true,  export: false, server: false }
```

Both are browser-only — theme is **not** saved to exported files or synced to server. Each user sees their own preferred theme.

### Render Config Types

<!-- Source: excalidraw/scene/types.ts — StaticCanvasRenderConfig, SVGRenderConfig -->

```typescript
type StaticCanvasRenderConfig = {
  // ...other fields
  theme: AppState["theme"]; // line 39
};

type SVGRenderConfig = {
  // ...other fields
  theme: AppState["theme"]; // line 58
};
```

Theme is passed through the render config to every rendering function, so each layer can apply the correct color transformations.

---

## 2. Color Transformation Algorithm

> **Core source:**
>
> - `common/src/colors.ts` — `applyDarkModeFilter()`, `cssInvert()`, `cssHueRotate()`

### The Core Insight

Excalidraw does **not** maintain a separate dark-mode color palette for elements. Instead, it **programmatically transforms** every element color at render time using the same `invert(93%) + hue-rotate(180deg)` filter that CSS uses. This means:

- Light backgrounds become dark
- Dark strokes become light
- Hues are preserved (via the 180° hue rotation that compensates for inversion)

### `applyDarkModeFilter(color: string): string`

<!-- Source: common/src/colors.ts — applyDarkModeFilter() (line 83) -->

```typescript
export const applyDarkModeFilter = (color: string): string => {
  // 1. Check cache (browser-only WeakMap avoids SSR memory leaks)
  const cached = DARK_MODE_COLORS_CACHE?.get(color);
  if (cached) return cached;

  // 2. Parse color to RGB
  const tc = tinycolor(color);
  const alpha = tc.getAlpha();
  const rgb = tc.toRgb();

  // 3. Apply CSS invert(93%)
  const inverted = cssInvert(rgb.r, rgb.g, rgb.b, 93);

  // 4. Apply CSS hue-rotate(180deg)
  const rotated = cssHueRotate(inverted.r, inverted.g, inverted.b, 180);

  // 5. Convert back to hex string (preserving alpha)
  const result = rgbToHex(rotated.r, rotated.g, rotated.b, alpha);

  // 6. Cache result
  DARK_MODE_COLORS_CACHE?.set(color, result);

  return result;
};
```

### Invert Operation

<!-- Source: common/src/colors.ts — cssInvert() (line 59) -->

```
For each channel (R, G, B):
  inverted = channel × (1 - percent/100) + (255 - channel) × (percent/100)

With percent = 93:
  inverted ≈ channel × 0.07 + (255 - channel) × 0.93
```

Note: 93% inversion (not 100%) preserves slight warmth rather than producing a pure negative.

### Hue-Rotate Operation

<!-- Source: common/src/colors.ts — cssHueRotate() (line 16) -->

```
Uses a 3×3 color rotation matrix derived from the angle (180°).
This is an exact replica of the CSS hue-rotate() algorithm:

  Matrix coefficients for angle a:
  [0.213 + cos(a)×0.787 - sin(a)×0.213,  ...]
  [0.213 - cos(a)×0.213 + sin(a)×0.143,  ...]
  [0.213 - cos(a)×0.213 - sin(a)×0.787,  ...]

  newR = r×M[0] + g×M[1] + b×M[2]
  newG = r×M[3] + g×M[4] + b×M[5]
  newB = r×M[6] + g×M[7] + b×M[8]
```

### Caching Strategy

<!-- Source: common/src/colors.ts — DARK_MODE_COLORS_CACHE (line 13) -->

```typescript
// Browser-only cache (null on server to avoid memory leaks)
const DARK_MODE_COLORS_CACHE: Map<string, string> | null =
  globalThis.window === undefined ? null : new Map();
```

The cache is a simple `Map<string, string>` that persists for the lifetime of the page. Since the transformation is deterministic and involves `tinycolor` parsing + matrix math, caching is important for performance during render loops.

### Example Transformations

```
Input (Light Mode)     → Output (Dark Mode)
─────────────────────────────────────────────
#1e1e1e (near-black)   → #e3e3e3 (near-white)
#ffffff (white)         → #121212 (near-black)
#e03131 (red)           → #3bc9cb (teal-ish)
#228be6 (blue)          → #dd7419 (orange-ish)
#dddddd (light gray)    → #242424 (dark gray)
```

---

## 3. Color Palette System

> **Core source:**
>
> - `common/src/colors.ts` — `COLOR_PALETTE`, default picks, utilities

### COLOR_PALETTE

<!-- Source: common/src/colors.ts — COLOR_PALETTE (line 143) -->

The palette is theme-agnostic — same colors in both modes. Dark mode transformation happens at render time.

```typescript
export const COLOR_PALETTE = {
  transparent: "transparent",
  black: "#1e1e1e",
  white: "#ffffff",
  // Open Color library — indexes [0,2,4,6,8] (weights: 50,200,400,600,800)
  gray: ["#f8f9fa", "#e9ecef", "#ced4da", "#868e96", "#343a40"],
  red: ["#fff5f5", "#ffc9c9", "#ff8787", "#fa5252", "#e03131"],
  pink: ["#fff0f6", "#fcc2d7", "#f783ac", "#e64980", "#c2255c"],
  grape: ["#f8f0fc", "#eebefa", "#da77f2", "#be4bdb", "#9c36b5"],
  violet: ["#f3f0ff", "#d0bfff", "#9775fa", "#7950f2", "#6741d9"],
  blue: ["#e7f5ff", "#a5d8ff", "#4dabf7", "#228be6", "#1971c2"],
  cyan: ["#e3fafc", "#99e9f2", "#3bc9db", "#15aabf", "#0c8599"],
  teal: ["#e6fcf5", "#96f2d7", "#38d9a9", "#12b886", "#099268"],
  green: ["#ebfbee", "#b2f2bb", "#69db7c", "#40c057", "#2f9e44"],
  yellow: ["#fff9db", "#ffec99", "#ffd43b", "#fab005", "#f08c00"],
  orange: ["#fff4e6", "#ffd8a8", "#ffa94d", "#fd7e14", "#e8590c"],
  bronze: ["#f8f1ee", "#eaddd7", "#d2bab0", "#a18072", "#846358"],
} as const;
```

### Default Element Colors

<!-- Source: common/src/colors.ts — DEFAULT_ELEMENT_STROKE_COLOR_INDEX (line 140), DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX (line 141) -->

```typescript
DEFAULT_ELEMENT_STROKE_COLOR_INDEX = 4; // darkest shade (index 4 = weight 800)
DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX = 1; // lightest shade (index 1 = weight 200)
```

Default stroke = `#1e1e1e` (black), default background = `transparent`.

### Color Contrast Utilities

<!-- Source: common/src/colors.ts — isColorDark() (line 311), calculateContrast() (line 305) -->

```typescript
// YIQ algorithm for contrast detection
const calculateContrast = (r: number, g: number, b: number): number => {
  return (r * 299 + g * 587 + b * 114) / 1000;
};

export const isColorDark = (color: string, threshold = 160): boolean => {
  if (!color) return true; // empty → assume black
  if (isTransparent(color)) return false;
  const { r, g, b } = tinycolor(color).toRgb();
  return calculateContrast(r, g, b) < threshold;
};
```

---

## 4. Canvas Rendering Pipeline

> **Core sources:**
>
> - `element/src/shape.ts` — `ShapeCache`, `generateRoughOptions()`
> - `element/src/renderElement.ts` — `drawElementOnCanvas()`, `generateElementCanvas()`
> - `excalidraw/renderer/staticScene.ts` — grid rendering, background
> - `excalidraw/renderer/helpers.ts` — `bootstrapCanvas()`

### Pipeline Overview

```
┌──────────────────────────────────────────────────────────────┐
│              DARK MODE RENDERING PIPELINE                     │
│                                                              │
│  1. SHAPE GENERATION (shape.ts — generateRoughOptions)       │
│     ├─ stroke = applyDarkModeFilter(element.strokeColor)     │
│     ├─ fill = applyDarkModeFilter(element.backgroundColor)   │
│     └─ Cache keyed by (element, theme) — invalidates on      │
│        theme change                                          │
│                                                              │
│  2. CANVAS BACKGROUND (helpers.ts — bootstrapCanvas)         │
│     └─ fillStyle = applyDarkModeFilter(viewBackgroundColor)  │
│                                                              │
│  3. ELEMENT DRAWING (renderElement.ts — drawElementOnCanvas)  │
│     ├─ Text: fillStyle = applyDarkModeFilter(strokeColor)    │
│     ├─ Freedraw: fillStyle = applyDarkModeFilter(strokeColor)│
│     ├─ Image/SVG: context.filter = DARK_THEME_FILTER         │
│     ├─ Frame stroke: applyDarkModeFilter(FRAME_STYLE.stroke) │
│     └─ Other shapes: colors already baked into RoughJS shape │
│                                                              │
│  4. GRID (staticScene.ts — strokeGrid)                       │
│     └─ Pre-computed: GridLineColor[THEME.DARK] =             │
│        applyDarkModeFilter("#dddddd" / "#e5e5e5")           │
│                                                              │
│  5. ELEMENT CANVAS CACHE (renderElement.ts)                  │
│     └─ Invalidated when prevElementWithCanvas.theme          │
│        !== appState.theme                                    │
└──────────────────────────────────────────────────────────────┘
```

### Shape Generation (RoughJS Options)

<!-- Source: element/src/shape.ts — generateRoughOptions() (line 170+), isDarkMode check (line 645) -->

```typescript
const generateRoughOptions = (element, continuousPath, renderConfig) => {
  const isDarkMode = renderConfig.theme === THEME.DARK;

  const options = {
    // ...other options
    stroke: isDarkMode ? applyDarkModeFilter(element.strokeColor) : element.strokeColor,
  };

  // For filled shapes (rectangle, diamond, ellipse):
  options.fill = isTransparent(element.backgroundColor)
    ? undefined
    : isDarkMode
      ? applyDarkModeFilter(element.backgroundColor)
      : element.backgroundColor;

  return options;
};
```

### Shape Cache Invalidation

<!-- Source: element/src/shape.ts — ShapeCache class (line 81) -->

```typescript
class ShapeCache {
  private static cache = new WeakMap<
    ExcalidrawElement,
    { shape: ElementShape; theme: AppState["theme"] } // ← theme stored
  >();

  public static get(element, theme) {
    const cached = this.cache.get(element);
    // Only return if theme matches (or theme is null = don't care)
    if (cached && (theme === null || cached.theme === theme)) {
      return cached.shape;
    }
    return undefined;
  }
}
```

**Key insight:** Each cached shape is tagged with the theme it was generated for. When the theme changes, all shapes are effectively cache-missed and regenerated with the new color transformation.

### Element Canvas Cache Invalidation

<!-- Source: element/src/renderElement.ts — getOrGenerateElementCanvas() (line 637) -->

```typescript
// The per-element offscreen canvas is also re-rendered on theme change:
if (
  !prevElementWithCanvas ||
  prevElementWithCanvas.theme !== appState.theme ||  // ← theme change
  // ...other invalidation conditions
) {
  const elementWithCanvas = generateElementCanvas(element, ...);
  elementWithCanvasCache.set(element, elementWithCanvas);
}
```

### Canvas Background

<!-- Source: excalidraw/renderer/helpers.ts — bootstrapCanvas() (line 65) -->

```typescript
context.fillStyle =
  theme === THEME.DARK ? applyDarkModeFilter(viewBackgroundColor) : viewBackgroundColor;
context.fillRect(0, 0, normalizedWidth, normalizedHeight);
```

### Grid Colors

<!-- Source: excalidraw/renderer/staticScene.ts — GridLineColor (line 45) -->

```typescript
const GridLineColor = {
  [THEME.LIGHT]: {
    bold: "#dddddd",
    regular: "#e5e5e5",
  },
  [THEME.DARK]: {
    bold: applyDarkModeFilter("#dddddd"), // pre-computed at module load
    regular: applyDarkModeFilter("#e5e5e5"),
  },
};
```

Grid colors are pre-computed (not computed per-frame) since the source colors are constant.

### Text Rendering

<!-- Source: element/src/renderElement.ts — drawElementOnCanvas() (line 562) -->

```typescript
// Text elements
context.fillStyle =
  renderConfig.theme === THEME.DARK
    ? applyDarkModeFilter(element.strokeColor)
    : element.strokeColor;
```

### Freedraw Rendering

<!-- Source: element/src/renderElement.ts — drawElementOnCanvas() (line 429) -->

```typescript
// Freedraw shapes contain SVG path strings
context.fillStyle =
  renderConfig.theme === THEME.DARK
    ? applyDarkModeFilter(element.strokeColor)
    : element.strokeColor;
context.fill(new Path2D(shape));
```

### Frame Rendering

<!-- Source: element/src/renderElement.ts — lines 818-827 -->

```typescript
// Frame borders
context.strokeStyle =
  appState.theme === THEME.DARK
    ? applyDarkModeFilter(FRAME_STYLE.strokeColor)
    : FRAME_STYLE.strokeColor;

// Magic frames (AI) use different colors per theme
if (isMagicFrameElement(element)) {
  context.strokeStyle = appState.theme === THEME.LIGHT ? "#7affd7" : applyDarkModeFilter("#1d8264");
}
```

---

## 5. CSS Theming System

> **Core sources:**
>
> - `excalidraw/css/theme.scss` — all CSS custom property definitions
> - `excalidraw/css/variables.module.scss` — SCSS variables (Open Color)
> - Various component `.scss` files — `&.theme--dark` overrides

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│              CSS THEME ARCHITECTURE                           │
│                                                              │
│  .excalidraw                    ← Light mode (default)       │
│    --island-bg-color: #ffffff                                │
│    --default-bg-color: #fff                                  │
│    --popup-text-color: #000                                  │
│    --color-on-surface: #1b1b1f                               │
│    --color-surface-high: #f1f0ff                             │
│    --theme-filter: none                                      │
│                                                              │
│  .excalidraw.theme--dark        ← Dark mode overrides        │
│    --island-bg-color: #232329                                │
│    --default-bg-color: #121212                               │
│    --popup-text-color: #ced4da                               │
│    --color-on-surface: #e3e3e8                               │
│    --color-surface-high: #2e2d39                             │
│    --theme-filter: invert(93%) hue-rotate(180deg)            │
│                                                              │
│  Components use var(--*) → automatically adapt               │
└──────────────────────────────────────────────────────────────┘
```

### Theme Class Toggle

<!-- Source: excalidraw/components/App.tsx — componentDidUpdate (line 3235) -->

```typescript
// Applied on every React render cycle:
this.excalidrawContainerRef.current?.classList.toggle(
  "theme--dark",
  this.state.theme === THEME.DARK,
);
```

The class `theme--dark` is toggled on the root `.excalidraw` container, which activates all CSS custom property overrides defined in `theme.scss`.

### Key CSS Custom Properties (Light → Dark)

<!-- Source: excalidraw/css/theme.scss — full file -->

| Property                 | Light               | Dark                             | Purpose                  |
| ------------------------ | ------------------- | -------------------------------- | ------------------------ |
| `--theme-filter`         | `none`              | `invert(93%) hue-rotate(180deg)` | CSS filter for images    |
| `--default-bg-color`     | `#fff`              | `#121212`                        | Page background          |
| `--island-bg-color`      | `#ffffff`           | `#232329`                        | Panel/toolbar background |
| `--popup-text-color`     | `#000`              | `#ced4da`                        | Text in popups           |
| `--color-on-surface`     | `#1b1b1f`           | `#e3e3e8`                        | Primary text/icon color  |
| `--color-surface-high`   | `#f1f0ff`           | `#2e2d39`                        | Hover/active backgrounds |
| `--color-surface-mid`    | `#f6f6f9`           | `hsl(240 6% 10%)`                | Secondary surfaces       |
| `--color-surface-low`    | `#ececf4`           | `hsl(240, 8%, 15%)`              | Tertiary surfaces        |
| `--color-surface-lowest` | `#ffffff`           | `hsl(0, 0%, 7%)`                 | Deepest background       |
| `--color-primary`        | `#6965db`           | `#a8a5ff`                        | Brand/accent color       |
| `--color-primary-light`  | `#e3e2fe`           | `#4f4d6f`                        | Light brand variant      |
| `--color-selection`      | `#6965db`           | `#3530c4`                        | Selection outline        |
| `--color-danger`         | `#db6965`           | `#ffa8a5`                        | Error/destructive        |
| `--input-bg-color`       | `#fff`              | `#121212`                        | Form input background    |
| `--input-border-color`   | `#ced4da`           | `#2e2e2e`                        | Form input border        |
| `--scrollbar-thumb`      | `#ced4da`           | `#343a40`                        | Scrollbar color          |
| `--shadow-island`        | rgba(0,0,0, subtle) | rgba(0,0,0, subtle)              | Panel shadows (same)     |
| `--color-icon-white`     | `#fff`              | `#1e1e1e`                        | White icons (inverted)   |

### SCSS Variables (Open Color)

<!-- Source: excalidraw/css/variables.module.scss -->

```scss
// These are theme-invariant — used as source values in theme.scss
$color-gray-1: #f1f3f5;
$color-gray-8: #343a40;
$color-red-1: #ffe3e3;
$color-red-9: #c92a2a;
$color-blue-2: #a5d8ff;
$color-blue-7: #1c7ed6;
$color-green-0: #ebfbee;
$color-green-9: #2b8a3e;
```

### Component-Level Dark Overrides

Many components have `&.theme--dark` SCSS blocks for specific adjustments:

```scss
// Example: excalidraw/components/ColorPicker/ColorPicker.scss:488
&.theme--dark {
  // Dark-specific color picker styles
}

// Example: excalidraw/components/HintViewer.scss:43
&.theme--dark {
  // Dark-specific hint styles
}

// Pattern: @at-root for nested dark selectors
@at-root .excalidraw.theme--dark#{&} {
  // Dark-specific overrides in deeply nested components
}
```

### Dark Background Opt-Out

<!-- Source: excalidraw/css/theme.scss — line 178 -->

```scss
&.theme--dark {
  &.theme--dark-background-none {
    background: none; // Allows embedding with custom dark backgrounds
  }
}
```

---

## 6. Theme Switching Mechanism

> **Core sources:**
>
> - `excalidraw/actions/actionCanvas.tsx` — `actionToggleTheme` (line 469)
> - `excalidraw/components/DarkModeToggle.tsx` — toggle button component
> - `excalidraw/actions/actionExport.tsx` — `exportWithDarkMode` action
> - `excalidraw/components/App.tsx` — theme prop sync (line 3231)

### actionToggleTheme

<!-- Source: excalidraw/actions/actionCanvas.tsx — line 469 -->

```typescript
export const actionToggleTheme = register<AppState["theme"]>({
  name: "toggleTheme",
  label: (_, appState) =>
    appState.theme === THEME.DARK ? "buttons.lightMode" : "buttons.darkMode",
  keywords: ["toggle", "dark", "light", "mode", "theme"],
  icon: (appState) => (appState.theme === THEME.LIGHT ? MoonIcon : SunIcon),
  viewMode: true,
  trackEvent: { category: "canvas" },
  perform: (_, appState, value) => ({
    appState: {
      ...appState,
      theme: value || (appState.theme === THEME.LIGHT ? THEME.DARK : THEME.LIGHT),
    },
    captureUpdate: CaptureUpdateAction.EVENTUALLY,
  }),
  keyTest: (event) => event.altKey && event.shiftKey && event.code === CODES.D,
  predicate: (elements, appState, props, app) => !!app.props.UIOptions.canvasActions.toggleTheme,
});
```

**Key details:**

- Keyboard shortcut: **Alt+Shift+D**
- Can be disabled via `UIOptions.canvasActions.toggleTheme`
- Uses `CaptureUpdateAction.EVENTUALLY` (not immediate — batched)
- Can accept a forced value or toggle between light/dark

### DarkModeToggle Component

<!-- Source: excalidraw/components/DarkModeToggle.tsx -->

```typescript
// Simple toggle button:
// - Light mode → shows Moon icon (click to go dark)
// - Dark mode → shows Sun icon (click to go light)
// - No system theme detection (explicit toggle only)
// - Comment in source: "We chose to use only explicit toggle and
//   not a third option for system value"
```

### Theme Propagation Flow

```
┌──────────────────────────────────────────────────────────┐
│              THEME PROPAGATION                            │
│                                                          │
│  User clicks toggle / presses Alt+Shift+D                │
│    │                                                     │
│    ▼                                                     │
│  actionToggleTheme.perform()                             │
│    │  sets appState.theme                                │
│    ▼                                                     │
│  App.componentDidUpdate() (App.tsx:3231)                 │
│    │  syncs props.theme → state.theme                    │
│    │  toggles .theme--dark CSS class                     │
│    ▼                                                     │
│  React re-render triggers:                               │
│    ├─ CSS custom properties activate (theme.scss)        │
│    ├─ Static canvas re-renders with new theme in config  │
│    ├─ ShapeCache invalidates (theme mismatch)            │
│    ├─ Element canvas cache invalidates                   │
│    └─ Interactive canvas re-renders overlays             │
│                                                          │
│  Portal containers also updated:                         │
│    useCreatePortalContainer.ts:27                        │
│    div.classList.toggle("theme--dark", theme === DARK)   │
└──────────────────────────────────────────────────────────┘
```

### External Theme Control

<!-- Source: excalidraw/components/App.tsx — componentDidUpdate (line 3231) -->

```typescript
// Host apps can control theme via props:
if (prevProps.theme !== this.props.theme && this.props.theme) {
  this.setState({ theme: this.props.theme });
}
```

---

## 7. Image Handling in Dark Mode

> **Core sources:**
>
> - `element/src/renderElement.ts` — image rendering (line 473+)
> - `excalidraw/renderer/staticSvgScene.ts` — SVG image rendering (line 526)

### Strategy by Image Type

```
┌──────────────────────────────────────────────────────────┐
│              IMAGE DARK MODE HANDLING                     │
│                                                          │
│  SVG images in dark mode:                                │
│    → Apply CSS filter: "invert(93%) hue-rotate(180deg)"  │
│    → Inverts colors to match dark theme                  │
│    → Safari workaround: pixel-level inversion via        │
│       ImageData manipulation (canvas filter not supported)│
│                                                          │
│  Raster images (PNG, JPG):                               │
│    → NO transformation applied                           │
│    → Displayed as-is in both modes                       │
│    → Only SVGs get the dark mode filter                  │
│                                                          │
│  Image placeholders:                                     │
│    → Dark: #2E2E2E background                            │
│    → Light: #E7E7E7 background                           │
└──────────────────────────────────────────────────────────┘
```

### Canvas Rendering (Non-Safari)

<!-- Source: element/src/renderElement.ts — line 473 -->

```typescript
const shouldInvertImage =
  renderConfig.theme === THEME.DARK &&
  cacheEntry?.mimeType === MIME_TYPES.svg;    // Only SVGs!

if (shouldInvertImage) {
  context.filter = DARK_THEME_FILTER;         // "invert(93%) hue-rotate(180deg)"
}
context.drawImage(img, ...);
```

### Safari Workaround

<!-- Source: element/src/renderElement.ts — line 477 -->

Safari doesn't support `context.filter`, so a manual pixel inversion is used:

```typescript
if (shouldInvertImage && isSafari) {
  // 1. Create offscreen canvas at device pixel ratio
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = element.width * devicePixelRatio;
  tempCanvas.height = element.height * devicePixelRatio;

  // 2. Draw image to temp canvas
  tempContext.drawImage(img, ...);

  // 3. Get pixel data and invert each channel
  const imageData = tempContext.getImageData(0, 0, ...);
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = 255 - data[i];       // R
    data[i + 1] = 255 - data[i + 1];   // G
    data[i + 2] = 255 - data[i + 2];   // B
    // Alpha unchanged
  }
  tempContext.putImageData(imageData, 0, 0);

  // 4. Draw inverted temp canvas to real canvas
  context.drawImage(tempCanvas, ...);
}
```

Note: The Safari fallback uses full 100% inversion (not 93%) and no hue-rotate — this is a known approximation.

### SVG Export

<!-- Source: excalidraw/renderer/staticSvgScene.ts — line 526 -->

```typescript
if (renderConfig.theme === THEME.DARK && fileData.mimeType === MIME_TYPES.svg) {
  g.setAttribute("filter", DARK_THEME_FILTER);
}
```

In SVG exports, the CSS filter string is applied directly as an SVG `filter` attribute.

### Image Placeholder Colors

<!-- Source: element/src/renderElement.ts — drawImagePlaceholder() (line 370) -->

```typescript
context.fillStyle = theme === THEME.DARK ? "#2E2E2E" : "#E7E7E7";
```

---

## 8. Export with Dark Mode

> **Core sources:**
>
> - `excalidraw/scene/export.ts` — `exportToCanvas()`, `exportToSvg()`
> - `excalidraw/actions/actionExport.tsx` — `exportWithDarkMode` action

### Export Architecture

```
┌──────────────────────────────────────────────────────────┐
│              EXPORT DARK MODE                             │
│                                                          │
│  exportWithDarkMode (AppState flag, default: false)      │
│                                                          │
│  Canvas Export (PNG):                                    │
│    theme = exportWithDarkMode ? THEME.DARK : THEME.LIGHT │
│    → Passed to both appState.theme and renderConfig.theme│
│    → Full re-render with dark mode color transformations │
│    → Background = applyDarkModeFilter(viewBackgroundColor)│
│                                                          │
│  SVG Export:                                             │
│    theme = exportWithDarkMode ? THEME.DARK : THEME.LIGHT │
│    → Passed to SVGRenderConfig.theme                     │
│    → Element colors transformed inline via               │
│      applyDarkModeFilter()                               │
│    → SVG images get filter="invert(93%) hue-rotate(180°)"│
│                                                          │
│  Key: export theme is INDEPENDENT from UI theme          │
│    → User can be in light mode but export dark           │
│    → Toggle in export dialog (DarkModeToggle component)  │
└──────────────────────────────────────────────────────────┘
```

### Canvas (PNG) Export

<!-- Source: excalidraw/scene/export.ts — exportToCanvas() (line 260) -->

```typescript
// Theme is injected into both render paths:
appState: {
  ...appState,
  theme: appState.exportWithDarkMode ? THEME.DARK : THEME.LIGHT,
},
renderConfig: {
  theme: appState.exportWithDarkMode ? THEME.DARK : THEME.LIGHT,
  isExporting: true,
  // Note: when isExporting=true, ShapeCache always regenerates
  // (no stale cached shapes from the other theme)
},
```

### SVG Export

<!-- Source: excalidraw/scene/export.ts — exportToSvg() (line 495) -->

```typescript
{
  theme: exportWithDarkMode ? THEME.DARK : THEME.LIGHT,
  isExporting: true,
}
```

SVG export uses `staticSvgScene.ts` which applies `applyDarkModeFilter()` to stroke/fill colors and `DARK_THEME_FILTER` attribute to SVG images.

### Export Dialog Toggle

<!-- Source: excalidraw/actions/actionExport.tsx — line 298 -->

The export dialog has its own dark mode toggle, independent of the main UI theme:

```typescript
<DarkModeToggle
  value={appState.exportWithDarkMode ? THEME.DARK : THEME.LIGHT}
  onChange={(theme) => updateData(theme === THEME.DARK)}
  title={t("imageExportDialog.label.darkMode")}
/>
```

---

## 9. Interactive Canvas Overlays

> **Core sources:**
>
> - `excalidraw/renderer/interactiveScene.ts` — selection, resize handles
> - `excalidraw/renderer/renderSnaps.ts` — snap guide colors

### Selection Outline Colors

<!-- Source: excalidraw/renderer/interactiveScene.ts — lines 248, 285, 438, 480 -->

| Element          | Light Mode                       | Dark Mode                     |
| ---------------- | -------------------------------- | ----------------------------- |
| Selected frame   | `rgba(106, 189, 252, 1)`         | `rgba(3, 93, 161, 1)`         |
| Selected element | `rgba(106, 189, 252, 1)`         | `rgba(3, 93, 161, 1)`         |
| Hover frame      | `rgba(106, 189, 252, opacity)`   | `rgba(3, 93, 161, opacity)`   |
| Hover element    | `rgba(106, 189, 252, opacity/2)` | `rgba(3, 93, 161, opacity/2)` |

**Pattern:** Selection uses a **blue** color with different intensities:

- Light: bright blue `rgba(106, 189, 252, ...)`
- Dark: deep blue `rgba(3, 93, 161, ...)`

These are hardcoded per-theme (not using `applyDarkModeFilter`).

### Search Highlight Colors

<!-- Source: excalidraw/renderer/interactiveScene.ts — line 1691 -->

```typescript
if (appState.theme === THEME.LIGHT) {
  context.fillStyle = focus
    ? "rgba(255, 124, 0, 0.4)" // focused match: orange
    : "rgba(255, 226, 0, 0.4)"; // other match: yellow
} else {
  context.fillStyle = focus
    ? "rgba(229, 82, 0, 0.4)" // focused match: dark orange
    : "rgba(99, 52, 0, 0.4)"; // other match: dark brown
}
```

### Snap Guide Colors

<!-- Source: excalidraw/renderer/renderSnaps.ts — lines 9, 25 -->

```typescript
const SNAP_COLOR_LIGHT = "#6b5ce7"; // purple
const SNAP_COLOR_DARK = "#ff0000"; // red

const snapColor =
  appState.theme === THEME.LIGHT || appState.zenModeEnabled ? SNAP_COLOR_LIGHT : SNAP_COLOR_DARK;
```

### Frame Name Colors

<!-- Source: common/src/constants.ts — FRAME_STYLE (line 199) -->

```typescript
FRAME_STYLE = {
  nameColorLightTheme: "#999999",
  nameColorDarkTheme: "#7a7a7a",
};
```

---

## 10. Constants Reference

| Constant                   | Value                              | Source                             |
| -------------------------- | ---------------------------------- | ---------------------------------- |
| `THEME.LIGHT`              | `"light"`                          | `common/src/constants.ts:193`      |
| `THEME.DARK`               | `"dark"`                           | `common/src/constants.ts:194`      |
| `DARK_THEME_FILTER`        | `"invert(93%) hue-rotate(180deg)"` | `common/src/constants.ts:197`      |
| Invert percentage          | 93%                                | `common/src/colors.ts:95`          |
| Hue-rotate degrees         | 180°                               | `common/src/colors.ts:100`         |
| Default theme              | `"light"`                          | `excalidraw/appState.ts:28`        |
| Default exportWithDarkMode | `false`                            | `excalidraw/appState.ts:68`        |
| Toggle shortcut            | Alt+Shift+D                        | `actions/actionCanvas.tsx:491`     |
| Image placeholder (dark)   | `#2E2E2E`                          | `element/src/renderElement.ts:370` |
| Image placeholder (light)  | `#E7E7E7`                          | `element/src/renderElement.ts:370` |
| Grid bold (light)          | `#dddddd`                          | `renderer/staticScene.ts:47`       |
| Grid regular (light)       | `#e5e5e5`                          | `renderer/staticScene.ts:48`       |
| Selection color (light)    | `rgba(106, 189, 252, 1)`           | `renderer/interactiveScene.ts:250` |
| Selection color (dark)     | `rgba(3, 93, 161, 1)`              | `renderer/interactiveScene.ts:249` |
| Snap color (light)         | `#6b5ce7`                          | `renderer/renderSnaps.ts:8`        |
| Snap color (dark)          | `#ff0000`                          | `renderer/renderSnaps.ts:9`        |
| Frame name (light)         | `#999999`                          | `common/src/constants.ts:209`      |
| Frame name (dark)          | `#7a7a7a`                          | `common/src/constants.ts:210`      |
| `isColorDark` threshold    | 160                                | `common/src/colors.ts:311`         |
| Outline contrast threshold | 240                                | `common/src/colors.ts:303`         |

### CSS Custom Property Quick Reference

| Property               | Light     | Dark      |
| ---------------------- | --------- | --------- |
| `--default-bg-color`   | `#fff`    | `#121212` |
| `--island-bg-color`    | `#ffffff` | `#232329` |
| `--color-on-surface`   | `#1b1b1f` | `#e3e3e8` |
| `--color-surface-high` | `#f1f0ff` | `#2e2d39` |
| `--color-primary`      | `#6965db` | `#a8a5ff` |
| `--color-selection`    | `#6965db` | `#3530c4` |
| `--color-danger`       | `#db6965` | `#ffa8a5` |

---

## Source Files Quick Reference

> All paths relative to `excalidraw/packages/`. Browse these files directly for implementation details.

| File                                           | Size  | Purpose                                                             |
| ---------------------------------------------- | ----- | ------------------------------------------------------------------- |
| `common/src/constants.ts`                      | —     | `THEME`, `DARK_THEME_FILTER`, `FRAME_STYLE` colors                  |
| `common/src/colors.ts`                         | 10KB  | `applyDarkModeFilter()`, color palette, contrast utilities          |
| `element/src/types.ts`                         | 13KB  | `Theme` type definition                                             |
| `element/src/shape.ts`                         | 31KB  | `ShapeCache` (theme-keyed), `generateRoughOptions()` dark transform |
| `element/src/renderElement.ts`                 | 35KB  | Canvas rendering with dark mode (text, freedraw, images, frames)    |
| `excalidraw/appState.ts`                       | —     | Default theme values, persistence config                            |
| `excalidraw/css/theme.scss`                    | 7KB   | All CSS custom properties (light + dark)                            |
| `excalidraw/css/variables.module.scss`         | 6KB   | SCSS source variables (Open Color)                                  |
| `excalidraw/renderer/staticScene.ts`           | —     | Grid rendering with theme colors                                    |
| `excalidraw/renderer/interactiveScene.ts`      | —     | Selection/hover overlays per theme                                  |
| `excalidraw/renderer/staticSvgScene.ts`        | —     | SVG export with dark mode                                           |
| `excalidraw/renderer/helpers.ts`               | —     | `bootstrapCanvas()` background fill                                 |
| `excalidraw/renderer/renderSnaps.ts`           | —     | Snap guide colors per theme                                         |
| `excalidraw/scene/export.ts`                   | —     | PNG/SVG export theme injection                                      |
| `excalidraw/actions/actionCanvas.tsx`          | —     | `actionToggleTheme` (Alt+Shift+D)                                   |
| `excalidraw/actions/actionExport.tsx`          | —     | `exportWithDarkMode` toggle                                         |
| `excalidraw/components/DarkModeToggle.tsx`     | 1.5KB | Toggle button (Moon/Sun icons)                                      |
| `excalidraw/components/App.tsx`                | —     | Theme class toggle, prop sync                                       |
| `excalidraw/hooks/useCreatePortalContainer.ts` | —     | Portal container theme class                                        |
