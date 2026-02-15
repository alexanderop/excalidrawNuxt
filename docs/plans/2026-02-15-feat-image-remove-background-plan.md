---
title: "Image Background Removal via Context Menu"
type: feat
status: active
date: 2026-02-15
deepened: 2026-02-15
---

# Image Background Removal via Context Menu

## Enhancement Summary

**Deepened on:** 2026-02-15
**Research agents used:** Performance Oracle, Architecture Strategist, Best Practices Researcher + Context7 docs

### Critical Changes from Research

1. **Architecture: App-side action registration instead of callback props** — DrawVue has zero props today; adding one violates established patterns and doesn't scale to future image operations. The app registers actions directly via `useDrawVue()`.
2. **Model API: Use `AutoModel` + `AutoProcessor` instead of `pipeline()`** — All production implementations (bg-remove, HF official) use the lower-level API with explicit processor config for reliability.
3. **Performance: Use Transferable objects for worker messages** — Eliminates 48MB structured clone per large image transfer.
4. **Performance: Downscale to 1024px, not 2048px** — RMBG-1.4 internally resizes to 1024x1024; sending larger data is pure waste.
5. **Memory: Image cache needs eviction or GC** — Current `useImageCache` is unbounded; undo leaves orphaned entries.
6. **Correctness: Re-validate element after async await** — The 2-5s inference window means the element could be deleted/moved.
7. **Safari: JSEP mode memory bug** — Use standard WASM backend only (not JSEP). Set `env.backends.onnx.wasm.proxy = false` inside worker.

---

## Overview

Add a "Remove Background" action to the right-click context menu for image elements. Uses **RMBG-1.4** (~45MB quantized) via `@huggingface/transformers` running entirely in-browser through a Web Worker. The model is lazy-loaded on first use and cached by the browser for subsequent sessions. The result is a **new image element** placed next to the original, preserving the original for comparison. The entire operation is undoable.

## Problem Statement / Motivation

Users frequently paste photos or screenshots onto the canvas and need to isolate subjects from their backgrounds. Currently they must leave DrawVue, use an external tool (remove.bg, Photoshop, etc.), and re-import. A one-click local solution keeps users in flow, protects privacy (images never leave the browser), and avoids external service costs.

## Proposed Solution

```
Right-click image → "Remove Background" → lazy-load model → Web Worker inference → new element
```

### Key Decisions

| Decision                | Choice                        | Rationale                                                                                                       |
| ----------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Trigger**             | Context menu only             | Low-frequency action, not worth properties panel space                                                          |
| **Model**               | RMBG-1.4 (int8, ~45MB)        | Works on all image types (not portraits-only like MODNet), cross-browser WASM fallback, good quality            |
| **Model API**           | `AutoModel` + `AutoProcessor` | All production refs (bg-remove, HF official) use this; `pipeline()` lacks control for explicit processor config |
| **Result**              | New element next to original  | Non-destructive, user can compare, undo removes only the new element                                            |
| **Model loading**       | Lazy on first use             | Avoids 45MB penalty on app load; cached via Cache API for next session                                          |
| **Execution**           | Web Worker                    | Keeps canvas interactive during inference (~2-5s)                                                               |
| **Dependency location** | App layer (dynamic import)    | Keeps `@drawvue/core` lightweight; ~45MB model stays out of the library bundle                                  |
| **Core/App bridge**     | App-side action registration  | DrawVue has zero props; callback props don't scale. App registers via `useDrawVue()`                            |

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ @drawvue/core  (minimal changes)                            │
│                                                             │
│  useActionRegistry.ts   ← new ActionId: "image:remove-bg"  │
│  contextMenuItems.ts    ← new menu entry                    │
│  image/types.ts         ← re-export isImageElement          │
│                                                             │
│  DrawVue.vue            ← NO CHANGES (zero props preserved) │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Nuxt App Layer  (owns all ML logic)                         │
│                                                             │
│  composables/useImageActions.ts                             │
│   ├─ registers "image:remove-background" action via         │
│   │  useDrawVue().actionRegistry.register()                 │
│   ├─ owns enabled() predicate and handler                   │
│   └─ delegates ML work to useBackgroundRemoval              │
│                                                             │
│  composables/useBackgroundRemoval.ts                        │
│   ├─ lazy creates Web Worker (singleton, keep-alive)        │
│   ├─ manages model state (idle/downloading/ready/processing)│
│   ├─ sends raw pixel ArrayBuffer via Transferable           │
│   ├─ receives mask ArrayBuffer via Transferable             │
│   ├─ composites mask on main thread (cheap canvas work)     │
│   └─ returns processed HTMLImageElement                     │
│                                                             │
│  workers/background-removal.worker.ts                       │
│   ├─ AutoModel + AutoProcessor (singleton pattern)          │
│   ├─ progress_callback for download tracking                │
│   ├─ env.backends.onnx.wasm.proxy = false                   │
│   └─ returns mask ArrayBuffer via Transferable              │
│                                                             │
│  pages/index.vue                                            │
│   └─ calls useImageActions() (registers action on mount)    │
└─────────────────────────────────────────────────────────────┘
```

**Why app-side registration?** DrawVue currently has **zero props**. The callback prop pattern from the original plan would:

- Break the established slot/context-based extension pattern
- Violate Open/Closed (each new image operation requires modifying DrawVue.vue)
- Not scale to future operations (crop, filter, enhance, upscale)

With app-side registration, core provides only the type and menu entry (2 one-line additions). All logic lives in the app. Future image operations require zero core changes.

### Implementation Phases

#### Phase 1: Core — ActionId Type & Context Menu Entry

**Files to modify (minimal):**

1. **`packages/core/src/shared/useActionRegistry.ts`** — Extend `ActionId` union:

   ```typescript
   type ImageActionId = "image:remove-background";

   export type ActionId =
     | ToolActionId
     | ActionActionId
     | LayerActionId
     | ClipboardActionId
     | StyleActionId
     | SettingsActionId
     | FlipActionId
     | HistoryActionId
     | ImageActionId; // ← add
   ```

2. **`packages/core/src/features/context-menu/contextMenuItems.ts`** — Add menu entry after flip actions:
   ```typescript
   export const elementMenuItems: readonly ContextMenuItemDef[] = [
     // ...existing items...
     { actionId: "flip:horizontal" },
     { actionId: "flip:vertical" },
     separator, // ← new separator
     { actionId: "image:remove-background" }, // ← new entry
   ];
   ```

**That's it for core.** No changes to DrawVue.vue. No new props. The action ID exists in the type system and menu; if not registered, it's silently hidden (same as existing `flip:*` actions that are declared but not yet registered).

**Success criteria:**

- `ActionId` type includes `"image:remove-background"`
- `elementMenuItems` includes the entry after flip actions
- Existing tests for context menu and action registry still pass

#### Phase 2: App Layer — Action Registration + Web Worker + Transformers.js

**New files:**

3. **`app/workers/background-removal.worker.ts`** — Web Worker with AutoModel/AutoProcessor:

   ```typescript
   import { AutoModel, AutoProcessor, RawImage, env } from "@huggingface/transformers";

   env.allowLocalModels = false;
   // Since we're already in a worker, disable ONNX's internal proxy worker
   if (env.backends?.onnx?.wasm) {
     env.backends.onnx.wasm.proxy = false;
   }

   // Singleton pattern — store the PROMISE to handle concurrent calls
   class SegmentationPipeline {
     static instance: Promise<{ model: any; processor: any }> | null = null;

     static getInstance(progressCallback?: (data: any) => void) {
       this.instance ??= this.load(progressCallback);
       return this.instance;
     }

     private static async load(progressCallback?: (data: any) => void) {
       const model = await AutoModel.from_pretrained("briaai/RMBG-1.4", {
         config: { model_type: "custom" },
         progress_callback: progressCallback,
       });
       const processor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4", {
         config: {
           do_normalize: true,
           do_pad: false,
           do_rescale: true,
           do_resize: true,
           image_mean: [0.5, 0.5, 0.5],
           feature_extractor_type: "ImageFeatureExtractor",
           image_std: [1, 1, 1],
           resample: 2,
           rescale_factor: 0.00392156862745098,
           size: { width: 1024, height: 1024 },
         },
       });
       return { model, processor };
     }
   }

   self.onmessage = async (e: MessageEvent) => {
     const { type, imageData, originalWidth, originalHeight } = e.data;
     if (type !== "process") return;

     try {
       const { model, processor } = await SegmentationPipeline.getInstance((progress) =>
         self.postMessage({ type: "progress", progress }),
       );

       self.postMessage({ type: "status", status: "processing" });

       // Reconstruct RawImage from transferred ArrayBuffer
       const image = new RawImage(
         new Uint8ClampedArray(imageData),
         originalWidth,
         originalHeight,
         4,
       );

       const { pixel_values } = await processor(image);
       const { output } = await model({ input: pixel_values });

       // Resize mask to original dimensions
       const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
         originalWidth,
         originalHeight,
       );

       // Transfer mask buffer (zero-copy)
       const maskBuffer = mask.data.buffer;
       self.postMessage(
         { type: "result", maskData: maskBuffer, width: originalWidth, height: originalHeight },
         [maskBuffer],
       );
     } catch (error) {
       self.postMessage({
         type: "error",
         error: error instanceof Error ? error.message : "Unknown error",
       });
     }
   };
   ```

   ### Research Insights — Worker Design

   **Why `AutoModel` + `AutoProcessor` instead of `pipeline()`:**
   - All production implementations (bg-remove, HF official examples) use the lower-level API
   - Explicit processor config avoids relying on remote `config.json` which can fail
   - `progress_callback` on `AutoModel.from_pretrained` enables granular download tracking
   - `pipeline()` may work but lacks control for cross-browser reliability

   **Why `env.backends.onnx.wasm.proxy = false`:**
   - ONNX Runtime's proxy creates its own internal Web Worker
   - Since we're already in a Web Worker, the proxy is unnecessary overhead
   - On Safari, JSEP mode (which proxy may trigger) causes severe CPU (400%+) and memory (14GB+) issues ([onnxruntime #26827](https://github.com/microsoft/onnxruntime/issues/26827))

   **Singleton stores the Promise, not the resolved value:**
   - `??=` on the promise means concurrent `getInstance()` calls share one loading process
   - Prevents race conditions if user clicks "Remove Background" during model download

4. **`app/composables/useBackgroundRemoval.ts`** — Composable managing the worker lifecycle:

   ```typescript
   import { ref, onUnmounted, shallowRef } from "vue";

   export function useBackgroundRemoval() {
     const worker = shallowRef<Worker | null>(null);
     const status = ref<"idle" | "downloading" | "ready" | "processing" | "error">("idle");
     const errorMessage = ref<string | null>(null);

     function ensureWorker(): Worker {
       if (!worker.value) {
         worker.value = new Worker(
           new URL("../workers/background-removal.worker.ts", import.meta.url),
           { type: "module" },
         );
         worker.value.onerror = () => {
           status.value = "error";
           errorMessage.value = "Background removal failed unexpectedly.";
           worker.value = null; // Force recreation on next attempt
         };
       }
       return worker.value;
     }

     async function removeBackground(img: HTMLImageElement): Promise<HTMLImageElement | null> {
       return new Promise((resolve) => {
         const w = ensureWorker();

         const handleMessage = (e: MessageEvent) => {
           switch (e.data.type) {
             case "progress":
               status.value = "downloading";
               break;
             case "status":
               status.value = e.data.status;
               break;
             case "result": {
               w.removeEventListener("message", handleMessage);
               status.value = "ready";
               const result = compositeAlphaMask(
                 img,
                 new Uint8ClampedArray(e.data.maskData),
                 e.data.width,
                 e.data.height,
               );
               resolve(result);
               break;
             }
             case "error": {
               w.removeEventListener("message", handleMessage);
               status.value = "error";
               errorMessage.value = e.data.error;
               resolve(null);
               break;
             }
           }
         };

         w.addEventListener("message", handleMessage);

         // Convert image to raw pixel ArrayBuffer, downscale if needed
         const { buffer, width, height } = imageToPixelBuffer(img, 1024);
         w.postMessage(
           { type: "process", imageData: buffer, originalWidth: width, originalHeight: height },
           [buffer], // Transfer, don't copy
         );
       });
     }

     onUnmounted(() => {
       worker.value?.terminate();
       worker.value = null;
     });

     return { status, errorMessage, removeBackground };
   }
   ```

   ### Research Insights — Data Transfer Pipeline

   **Why raw pixel ArrayBuffer instead of PNG blob:**
   - The original plan sent PNG blobs to the worker, requiring PNG encode (100-500ms main thread blocking) + PNG decode in the worker
   - Sending raw `ImageData.data.buffer` via `Transferable` is zero-copy and eliminates both encode/decode steps
   - For 4000x3000 image: saves ~100-500ms of main-thread blocking

   **Why `maxSize = 1024` instead of 2048:**
   - RMBG-1.4 internally resizes all input to 1024x1024 for inference
   - Sending 2048px data is pure waste: 4x larger transfer, 4x more worker memory, zero quality improvement
   - For 4000x3000 image: transfer drops from 48MB to ~12MB (4x reduction)

   **Compositing on main thread, not worker:**
   - The worker returns the raw mask ArrayBuffer (lightweight)
   - Main thread does the cheap canvas compositing (draw original + apply alpha)
   - Avoids needing `OffscreenCanvas` in the worker
   - Keeps the worker focused on ML inference

5. **`app/composables/useImageActions.ts`** — Action registration (replaces callback prop pattern):

   ```typescript
   import { computed } from "vue";
   import { useDrawVue, isInitializedImageElement, createElement, toFileId } from "@drawvue/core";
   import { useBackgroundRemoval } from "./useBackgroundRemoval";

   export function useImageActions() {
     const ctx = useDrawVue();
     const { register } = ctx.actionRegistry;
     const { elements, selection, history, imageCache, dirty } = ctx;
     const { status, removeBackground } = useBackgroundRemoval();

     const isProcessing = computed(
       () => status.value === "downloading" || status.value === "processing",
     );

     register([
       {
         id: "image:remove-background",
         label: "Remove Background",
         icon: "i-lucide-image-minus",
         handler: () => handleRemoveBackground(),
         enabled: () =>
           selection.selectedElements.value.length === 1 &&
           isInitializedImageElement(selection.selectedElements.value[0]!) &&
           !selection.selectedElements.value[0]!.locked &&
           !isProcessing.value,
       },
     ]);

     async function handleRemoveBackground() {
       if (isProcessing.value) return; // Programmatic guard

       const el = selection.selectedElements.value[0]!;
       const elementId = el.id; // Capture ID before async
       const cachedImage = imageCache.getImage(el.fileId!);
       if (!cachedImage) return;

       const resultImage = await removeBackground(cachedImage);
       if (!resultImage) return;

       // Re-validate: element may have been deleted/moved during 2-5s inference
       const currentEl = elements.getElementById(elementId);
       if (!currentEl || currentEl.isDeleted) return;

       history.recordAction(() => {
         const newFileId = toFileId(generateId());
         imageCache.addImage(newFileId, resultImage, "image/png");

         const newElement = createElement(
           "image",
           currentEl.x + currentEl.width + 20,
           currentEl.y,
           {
             width: currentEl.width,
             height: currentEl.height,
             angle: currentEl.angle,
             opacity: currentEl.opacity,
             fileId: newFileId,
             status: "saved",
             scale: currentEl.scale,
           },
         );
         elements.addElement(newElement);
         selection.select(newElement.id);
         dirty.markStaticDirty();
       });
     }
   }
   ```

   ### Research Insights — Async Handler Safety

   **Re-validate after await:** The 2-5 second inference window means:
   - User could delete the image element during processing
   - User could move/resize the element
   - User could deselect and select something else
   - Capturing `elementId` before the await and re-fetching via `getElementById` after prevents stale reference bugs

   **Programmatic guard at handler top:** The `enabled()` predicate only controls UI visibility. The handler should also check `isProcessing` to prevent programmatic invocation via the action registry.

   **Async handler + action registry:** The registry's `execute()` does not `await` handlers. Errors in async handlers produce unhandled promise rejections. The handler should use internal `.catch()` or wrap with error handling (the composable's error state handles this).

6. **`app/pages/index.vue`** — Wire the action registration:

   ```typescript
   // In <script setup>
   import { useImageActions } from "~/composables/useImageActions";

   useImageActions(); // Registers "image:remove-background" action
   ```

**Success criteria:**

- Model downloads only on first "Remove Background" click
- Model is cached via browser Cache API (no re-download on page reload)
- Canvas remains interactive during download and inference
- Errors show user-friendly messages (download failure, inference failure)
- Action handler re-validates element state after async inference

#### Phase 3: Loading State UX

7. **Loading overlay on image element** — While processing, show a subtle overlay on the source image element:
   - Semi-transparent backdrop over the image
   - Spinner icon + status text ("Downloading model..." / "Removing background...")
   - Model download progress (file-level tracking via `progress_callback`)
   - Implemented in the app layer (not core) since it's tied to the AI feature

   This could be a small Vue component rendered via a Teleport, positioned using the element's screen coordinates from the viewport transform.

**Success criteria:**

- User sees progress feedback during model download and inference
- Canvas interaction (pan, zoom) remains possible
- Overlay follows the image element if the viewport changes

### Error Handling

| Scenario                             | User sees                                             | Recovery                                    |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------- |
| Network error during model download  | "Failed to download AI model. Check your connection." | Retry by clicking "Remove Background" again |
| Inference fails (OOM, corrupt image) | "Background removal failed. Try a smaller image."     | User can try different image                |
| Worker crashes                       | "Background removal failed unexpectedly."             | Worker is re-created on next attempt        |
| Image has no fileId                  | Action is disabled (never fires)                      | N/A                                         |
| Image not in cache                   | Handler returns early                                 | N/A                                         |
| Element deleted during inference     | Handler returns early (re-validation)                 | N/A                                         |
| Safari JSEP memory spike             | N/A — mitigated by `wasm.proxy = false`               | N/A                                         |

### Memory Considerations

- RMBG-1.4 int8 model: ~45MB in memory (held in worker)
- Per-image inference: raw pixels (W x H x 4 bytes) transferred to worker via **Transferable** (zero-copy), mask returned via Transferable
- Downscale to **1024px max** before transfer (RMBG-1.4 internally works at 1024x1024)
- For 4000x3000 image: downscaled to ~1024x768 = ~3MB transfer (vs 48MB without downscaling)
- Worker stays alive after first use (model stays loaded); terminated on page unload
- **Known limitation:** Undo does not remove orphaned image cache entries (the new image's fileId persists in cache after undo removes the element). Acceptable for v1; future cache GC can sweep unreferenced entries.

### Research Insights — Memory Budget

| Scenario                                | Peak Memory (estimated)                              | Main Thread Impact         |
| --------------------------------------- | ---------------------------------------------------- | -------------------------- |
| Single small image (800x600)            | ~50MB (model) + ~2MB (pixels)                        | Negligible                 |
| Single large image (4000x3000)          | ~50MB (model) + ~3MB (downscaled transfer)           | Negligible (no PNG encode) |
| 5 sequential operations on large images | ~50MB (model) + ~240MB (cached results, no eviction) | ~0ms (Transferable)        |
| 10 operations with undo/redo            | ~50MB (model) + ~480MB (leaked cache entries)        | Tab crash on mobile        |

**Mobile limits:** Mobile Safari ~1-1.5GB, Mobile Chrome ~2-3GB. After 5 operations on large images with cached results, total is ~295MB. Combined with canvas rendering and history, this approaches mobile limits. Consider LRU eviction (3-5 cached images) for v2.

### Browser Compatibility Notes

| Browser       | Status              | Notes                                                                                                    |
| ------------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| Chrome 121+   | Full support        | WebGPU available for future acceleration                                                                 |
| Firefox       | Full support (WASM) | No WebGPU yet                                                                                            |
| Safari 16.4+  | Works with caveats  | Use WASM only (not JSEP). `do_pad: false` required. iOS 16.4 had WASM-SIMD bug (fixed in later versions) |
| Mobile Safari | Works with limits   | Memory pressure, `do_pad: false`, consider 1024px max dimension on mobile                                |
| Mobile Chrome | Full support (WASM) | More generous memory limits than Safari                                                                  |

## Acceptance Criteria

### Functional

- [ ] Right-clicking an image element shows "Remove Background" in the context menu
- [ ] "Remove Background" is hidden for non-image elements, multi-select, locked images, pending images (no fileId)
- [ ] Clicking "Remove Background" runs RMBG-1.4 inference locally in a Web Worker
- [ ] A new image element appears 20px to the right of the original with the background removed (transparent PNG)
- [ ] The new element preserves the original's dimensions, angle, opacity, and scale
- [ ] The new element is auto-selected after creation
- [ ] Undo (Cmd+Z) removes the new element; redo (Cmd+Shift+Z) restores it
- [ ] Model is lazy-loaded on first use and cached for subsequent sessions
- [ ] Canvas remains interactive during processing (no main-thread blocking)
- [ ] Error states show user-friendly messages
- [ ] Handler re-validates element existence after async inference completes

### Non-Functional

- [ ] `@huggingface/transformers` is NOT bundled in `@drawvue/core`; stays in app layer
- [ ] Web Worker is used for inference (no main-thread blocking)
- [ ] Images are downscaled to max 1024px before inference (model's native resolution)
- [ ] Image data transferred via `Transferable` objects (zero-copy, no structured clone)
- [ ] Action is disabled while inference is in progress (prevents concurrent jobs)
- [ ] DrawVue.vue has zero new props (action registered from app layer)
- [ ] `env.backends.onnx.wasm.proxy = false` set in worker (avoids Safari JSEP bug)

## Dependencies & Risks

| Dependency/Risk                                                                                    | Mitigation                                                    |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `@huggingface/transformers` (~45MB model)                                                          | Lazy load, Cache API caching, worker-only import              |
| RMBG-2.0 onnxruntime-web bug ([#1107](https://github.com/huggingface/transformers.js/issues/1107)) | Use RMBG-1.4 (stable); upgrade when 2.0 is fixed              |
| Browser WASM support                                                                               | All modern browsers support it; no polyfill needed            |
| Safari JSEP memory bug ([#26827](https://github.com/microsoft/onnxruntime/issues/26827))           | `wasm.proxy = false`, WASM-only backend                       |
| Memory on mobile browsers                                                                          | Downscale to 1024px; consider LRU eviction in cache           |
| CDN availability (huggingface.co)                                                                  | Model cached after first download; offline-capable after that |
| Image cache memory leak on undo                                                                    | Document as known limitation; future GC can sweep orphans     |
| Element deletion during async inference                                                            | Re-validate element by ID after await returns                 |

## Testing Strategy

### Unit Tests (Core)

- `ActionId` type includes `"image:remove-background"` (compile-time check)
- Context menu inclusion: verify item appears in `elementMenuItems`

### Unit Tests (App)

- `useBackgroundRemoval` composable: mock worker, test state transitions (idle → downloading → ready → processing → idle)
- Error handling: mock worker failure, verify error state and message
- `useImageActions`: mock `useDrawVue()`, verify action registration with correct id/label/icon
- `enabled()` predicate: single image, non-image, multi-select, locked, processing states
- Handler without element: verify early return when element not found after async
- Handler re-validation: verify no element creation when source element was deleted during inference

### Browser Tests

- Full flow: insert image → right-click → verify "Remove Background" appears → click → verify new element
- Mock the Web Worker / model to avoid 45MB download in CI
- Verify context menu hides the action for non-image elements
- Verify action is disabled during processing (second click does nothing)

## Future Considerations

- **WebGPU acceleration at launch**: Detect `navigator.gpu` and pass `device: "webgpu"` to model. 5-10x faster inference on Chrome 121+, Edge 121+. Note: WebGPU not yet available in workers in all browsers.
- **Batch processing**: `enabled()` predicate changes to "all selected are initialized images"; handler iterates. No core changes needed with app-side registration.
- **Model selection**: Let users choose between RMBG-1.4 (general) and MODNet (portraits, WebGPU-only)
- **Quality preview**: Show a low-res preview before committing the full-res result
- **RMBG-2.0 upgrade**: When the onnxruntime-web bug is fixed, upgrade for better quality
- **Cancel mechanism**: AbortController to cancel in-flight downloads/inference
- **Image cache GC**: Periodically sweep entries not referenced by any element to reclaim memory from undo orphans
- **iOS-specific config**: Detect iOS, force RMBG-1.4 with `do_pad: false` and `image_std: [1, 1, 1]`

## References

### Internal

- Action registry: `packages/core/src/shared/useActionRegistry.ts`
- Context menu items: `packages/core/src/features/context-menu/contextMenuItems.ts`
- Image cache: `packages/core/src/features/image/useImageCache.ts`
- Image types: `packages/core/src/features/image/types.ts`
- Image upload: `packages/core/src/features/image/useImageUpload.ts`
- Element creation: `packages/core/src/features/elements/createElement.ts`
- DrawVue component: `packages/core/src/components/DrawVue.vue`

### External

- [RMBG-1.4 on Hugging Face](https://huggingface.co/briaai/RMBG-1.4) — model card, ONNX variants
- [Transformers.js v3](https://huggingface.co/blog/transformersjs-v3) — WebGPU support, pipeline API
- [bg-remove by Addy Osmani](https://github.com/addyosmani/bg-remove) — production reference implementation
- [HF official remove-background-web](https://github.com/huggingface/transformers.js-examples/tree/main/remove-background-web) — minimal RMBG-1.4 example
- [HF official remove-background-webgpu](https://github.com/huggingface/transformers.js-examples/tree/main/remove-background-webgpu) — WebGPU + MODNet example
- [Transformers.js React Worker tutorial](https://huggingface.co/docs/transformers.js/en/tutorials/react) — authoritative worker pattern
- [Safari JSEP memory issue](https://github.com/microsoft/onnxruntime/issues/26827) — avoid JSEP mode
- [RMBG-2.0 unsupported in Transformers.js](https://github.com/huggingface/transformers.js/issues/1107) — confirms 1.4 is correct choice
- [Vite Web Worker docs](https://vite.dev/guide/features) — `new URL()` pattern for workers
