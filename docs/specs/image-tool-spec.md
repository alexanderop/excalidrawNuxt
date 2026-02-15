# Image Tool — Feature Spec & Architecture Plan

## Overview

Add an **image tool** that lets users insert images onto the canvas via file picker, drag & drop, or clipboard paste. Images become first-class canvas elements that can be selected, moved, resized (aspect-ratio-locked by default), rotated, and deleted like any other element.

## How Excalidraw Does It (Reference)

Excalidraw's image flow:

1. User activates image tool → native file dialog opens
2. Selected files are normalized (resized if >2MB, SVGs validated)
3. Placeholder elements (`status: "pending"`) are inserted immediately at scene position
4. Files are read as DataURLs, assigned a `FileId` (branded string), stored in `BinaryFiles` map
5. `HTMLImageElement` is loaded from the DataURL and cached in `imageCache` (Map<FileId, {image, mimeType}>)
6. Placeholder is replaced with initialized element (`status: "saved"`, `fileId` set)
7. Rendering checks `imageCache` — draws loaded image or placeholder icon

Key Excalidraw types:

```ts
ExcalidrawImageElement = ElementBase & {
  type: "image"
  fileId: FileId | null        // branded string → binary data lookup
  status: "pending" | "saved" | "error"
  scale: [number, number]      // [-1,1] for horizontal/vertical flip
  crop: ImageCrop | null
}
```

Three input methods: toolbar button (file dialog), drop onto canvas, Ctrl+V paste.

## Our Vue-Idiomatic Design

### Principles

- Use VueUse composables over manual browser API wiring
- `createGlobalState` for shared stores (matches existing `useElements`, `useTool` patterns)
- Composable pipeline: each composable does one thing
- No React patterns — reactive refs, `watchEffect`, `<script setup>`
- Follow the **code tool pattern**: own feature directory, own interaction composable, early check in render pipeline

### Input Pipeline (VueUse)

```
User Action              VueUse Composable            Output
────────────────────────────────────────────────────────────────
Toolbar "Image" click  → useFileDialog({accept})    → File[]
Drag file onto canvas  → useDropZone(canvasRef)     → File[]
Ctrl+V paste           → useEventListener('paste')  → Blob
                              ↓
                        useObjectUrl(file/blob)      → string (auto-revoked)
                              ↓
                        useImage({ src })            → HTMLImageElement
                              ↓
                        useBase64(blob)              → dataURL (for persistence)
                              ↓
                        createGlobalState            → image cache (shared)
                              ↓
                        useThrottleFn                → throttled resize
```

---

## File Structure

```
app/features/image/
├── index.ts                    # Public API barrel
├── types.ts                    # Image-specific types & type guards
├── useImageTool.ts             # Tool activation & file dialog trigger
├── useImageUpload.ts           # File → DataURL → HTMLImageElement pipeline
├── useImageCache.ts            # Global FileId → image cache store
├── useImageInteraction.ts      # Canvas interaction (placement, drop, paste)
├── renderImageElement.ts       # Canvas 2D rendering for image elements
└── constants.ts                # Supported MIME types, max file size, placeholders
```

---

## Detailed Design

### 1. Types (`types.ts`)

```ts
import type { ExcalidrawImageElement, FileId } from "@excalidraw/element/types";
import type { ExcalidrawElement } from "~/features/elements/types";

// Re-export upstream types
export type { ExcalidrawImageElement, FileId };

// Our binary file data (simplified from Excalidraw's BinaryFileData)
export interface BinaryFileData {
  id: FileId;
  dataURL: string;
  mimeType: string;
  created: number;
}

// Type guard
export function isImageElement(el: ExcalidrawElement): el is ExcalidrawImageElement {
  return el.type === "image";
}

// Initialized = has fileId set
export function isInitializedImageElement(
  el: ExcalidrawElement,
): el is ExcalidrawImageElement & { fileId: FileId } {
  return isImageElement(el) && el.fileId !== null;
}
```

**Integration**: Add `ExcalidrawImageElement` to `SupportedElement` union in `elements/types.ts`. Add `isImageElement` re-export.

### 2. Image Cache Store (`useImageCache.ts`)

```ts
// Global store: FileId → { image: HTMLImageElement, mimeType: string }
// Uses createGlobalState (matches useElements, useTool patterns)

createGlobalState(() => {
  const cache = shallowRef(new Map<FileId, CacheEntry>());
  // addFile(id, dataURL, mimeType) → load HTMLImageElement, store in cache
  // getImage(id) → HTMLImageElement | undefined
  // hasImage(id) → boolean
  // clear() → reset (for tests)
});
```

**VueUse**: `createGlobalState` for singleton shared across components.

### 3. Image Upload Pipeline (`useImageUpload.ts`)

Composable that takes a `File | Blob` and produces a cached `HTMLImageElement`:

```ts
// Pipeline: File → useObjectUrl → useImage → useBase64 → store in cache
//
// 1. Generate FileId via generateId()
// 2. Create object URL from file (useObjectUrl — auto-revoked on cleanup)
// 3. Load HTMLImageElement from URL (useImage — reactive loading state)
// 4. Convert to base64/dataURL for persistence (useBase64)
// 5. Store in image cache
// 6. Return { fileId, image, naturalWidth, naturalHeight }
```

**VueUse**: `useObjectUrl` (memory-safe URL management), `useImage` (reactive image loading), `useBase64` (serialization).

**File validation**: Check MIME type against allowed list, enforce max file size (configurable, default 5MB), normalize SVGs via DOMParser.

### 4. Image Tool Activation (`useImageTool.ts`)

```ts
// When image tool is selected:
// 1. Open file dialog via useFileDialog({ accept: 'image/*', multiple: true })
// 2. onChange → process each file through useImageUpload
// 3. Create ExcalidrawImageElement for each at viewport center
// 4. Switch back to selection tool
//
// Keyboard shortcut: '9' or 'i'
```

**VueUse**: `useFileDialog` (no hidden input element management needed).

### 5. Canvas Interaction (`useImageInteraction.ts`)

Handles the three input methods and wires them to element creation:

```ts
// Composable arguments: canvasRef, elements, viewport, tool state
//
// A) Drop handler:
//    useDropZone(canvasRef, { dataTypes: IMAGE_MIME_TYPES, onDrop })
//    → convert drop coordinates to scene coords
//    → process files, create elements at drop position
//
// B) Paste handler:
//    useEventListener(document, 'paste', handler)
//    → extract image blobs from clipboardData.items
//    → process, create elements at viewport center
//
// C) Tool click (delegated from useImageTool):
//    → file dialog result → create elements at viewport center
//
// Element creation:
//    1. Create pending element (fileId: null, status: "pending")
//    2. Process file through upload pipeline
//    3. Mutate element: set fileId, status: "saved", width/height from natural dims
//    4. Size to fit: scale to reasonable default (e.g. max 400px on longest side)
//
// Returns: { isOverDropZone } for visual feedback
```

**VueUse**: `useDropZone` (drag & drop with MIME filtering, `isOverDropZone` for UI feedback), `useEventListener` (paste detection).

### 6. Rendering (`renderImageElement.ts`)

```ts
export function renderImageElement(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawImageElement,
  imageCache: Map<FileId, CacheEntry>,
): void {
  ctx.save();
  ctx.translate(element.x, element.y);
  if (element.angle) {
    ctx.translate(element.width / 2, element.height / 2);
    ctx.rotate(element.angle);
    ctx.translate(-element.width / 2, -element.height / 2);
  }
  ctx.globalAlpha = element.opacity / 100;

  // Apply scale (flip)
  const [sx, sy] = element.scale;
  if (sx !== 1 || sy !== 1) {
    ctx.translate(sx < 0 ? element.width : 0, sy < 0 ? element.height : 0);
    ctx.scale(sx, sy);
  }

  const cached = element.fileId ? imageCache.get(element.fileId) : null;
  if (cached?.image instanceof HTMLImageElement) {
    // Draw the actual image
    ctx.drawImage(cached.image, 0, 0, element.width, element.height);
  } else {
    // Draw placeholder (loading spinner or error icon)
    drawImagePlaceholder(ctx, element);
  }

  ctx.restore();
}
```

**Integration in `renderElement.ts`**: Add early check before text/shape rendering:

```ts
if (isImageElement(element)) {
  renderImageElement(ctx, element, imageCache);
  return;
}
```

### 7. Hit Testing & Selection

Images are rectangular — reuse the existing rectangle hit test:

```ts
// In selection/hitTest.ts, add:
case 'image':
  return hitTestRectangle(element, point)
```

**Resize behavior**: Aspect-ratio-locked by default (inverted from shapes where Shift locks). Hold Shift to free-resize.

### 8. Element Creation

In `elements/createElement.ts`, add image branch:

```ts
if (type === "image") {
  return newElement({
    type: "image",
    x,
    y,
    width: 100, // placeholder size, updated after load
    height: 100,
    fileId: null,
    status: "pending",
    scale: [1, 1],
    crop: null,
    ...commonProps,
  });
}
```

---

## Integration Points (Existing Files to Modify)

| File                                           | Change                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `features/elements/types.ts`                   | Add `ExcalidrawImageElement` to `SupportedElement`, re-export `isImageElement` |
| `features/tools/types.ts`                      | Add `'image'` to `ToolType`, add `isImageTool()` guard                         |
| `features/tools/useTool.ts`                    | Add keyboard shortcut (`9`)                                                    |
| `features/tools/components/DrawingToolbar.vue` | Add image tool button                                                          |
| `features/tools/toolIcons.ts`                  | Add image icon SVG definition                                                  |
| `features/rendering/renderElement.ts`          | Add `isImageElement` early check → `renderImageElement()`                      |
| `features/rendering/shapeGenerator.ts`         | Add throw guard for `'image'` type                                             |
| `features/selection/hitTest.ts`                | Add `case 'image'` → rectangle hit test                                        |
| `features/selection/resizeElement.ts`          | Default aspect-ratio-locked for images                                         |
| `features/elements/createElement.ts`           | Add `if (type === 'image')` branch                                             |
| `components/DrawVue.vue`                       | Wire `useImageInteraction`, pass imageCache to renderer                        |

## New Files

| File                                    | Purpose                                                         |
| --------------------------------------- | --------------------------------------------------------------- |
| `features/image/index.ts`               | Barrel exports                                                  |
| `features/image/types.ts`               | `BinaryFileData`, `isImageElement`, `isInitializedImageElement` |
| `features/image/constants.ts`           | MIME types, max size, placeholder SVGs                          |
| `features/image/useImageCache.ts`       | Global `FileId → HTMLImageElement` cache                        |
| `features/image/useImageUpload.ts`      | `File → DataURL → HTMLImageElement` pipeline                    |
| `features/image/useImageTool.ts`        | Tool activation + file dialog                                   |
| `features/image/useImageInteraction.ts` | Drop zone, paste handler, element creation                      |
| `features/image/renderImageElement.ts`  | Canvas 2D `drawImage` rendering                                 |

---

## VueUse Composables Used

| Composable          | Where                 | Why                                                  |
| ------------------- | --------------------- | ---------------------------------------------------- |
| `useFileDialog`     | `useImageTool`        | Native file picker without hidden input management   |
| `useDropZone`       | `useImageInteraction` | Drag & drop with MIME filtering + `isOverDropZone`   |
| `useEventListener`  | `useImageInteraction` | Paste event detection (already used in project)      |
| `useObjectUrl`      | `useImageUpload`      | Auto-revoked blob URLs (prevents memory leaks)       |
| `useImage`          | `useImageUpload`      | Reactive `HTMLImageElement` loading with error state |
| `useBase64`         | `useImageUpload`      | File → DataURL conversion for persistence            |
| `createGlobalState` | `useImageCache`       | Singleton cache shared across components             |
| `useThrottleFn`     | `useImageInteraction` | Throttle resize operations during drag               |

---

## Testing Strategy

### Unit Tests

- `useImageCache` — add/get/clear, singleton behavior
- `useImageUpload` — mock File, verify cache population
- `isImageElement` / `isInitializedImageElement` type guards
- `renderImageElement` — mock canvas context, verify `drawImage` calls

### Browser Tests

- Insert image via file dialog → element appears on canvas
- Drag & drop image file → element at drop position
- Paste image from clipboard → element at viewport center
- Select + resize image → maintains aspect ratio
- Select + Shift+resize → free resize
- Delete image element
- Image with loading state shows placeholder
- Multiple images → grid positioning

---

## Implementation Order

1. **Types & constants** — `types.ts`, `constants.ts`, update `SupportedElement`
2. **Image cache** — `useImageCache.ts` (standalone, testable)
3. **Upload pipeline** — `useImageUpload.ts` (depends on cache)
4. **Rendering** — `renderImageElement.ts` + integration in `renderElement.ts`
5. **Tool registration** — `ToolType`, toolbar button, icon, keyboard shortcut
6. **Interaction** — `useImageInteraction.ts` (file dialog, drop, paste)
7. **Hit testing & resize** — selection integration
8. **Wire into DrawVue** — final integration
9. **Tests** — unit + browser tests

---

## Out of Scope (V1)

- Image cropping (Excalidraw has this but it's complex)
- Image filters/effects
- SVG normalization (can add later)
- File persistence to IndexedDB (in-memory only for V1)
- Image compression/resize on upload
- `useFileSystemAccess` (Chrome-only, not needed)
