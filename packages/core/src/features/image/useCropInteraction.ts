/**
 * Crop mode interaction composable — handles entering/exiting crop mode,
 * dragging L-shaped corner handles, and confirming/cancelling.
 *
 * Follows the same pattern as useLinearEditor.
 */

import { shallowRef } from "vue";
import type { Ref, ShallowRef } from "vue";
import { useEventListener } from "@vueuse/core";
import { useKeyboardShortcuts } from "../../shared/useKeyboardShortcuts";
import type { ExcalidrawElement } from "../elements/types";
import type { ExcalidrawImageElement } from "./types";
import { isImageElement } from "./types";
import { mutateElement } from "../elements/mutateElement";
import type { GlobalPoint } from "../../shared/math";
import type { ImageCacheSlice } from "../../context";
import { cropElement, getCropHandleAtPosition } from "./cropElement";
import type { CropHandleType } from "./cropElement";

type CropInteraction = { type: "idle" } | { type: "dragging"; handle: CropHandleType };

interface UseCropInteractionOptions {
  canvasRef: Readonly<Ref<HTMLCanvasElement | null>>;
  zoom: Ref<number>;
  toScene: (screenX: number, screenY: number) => GlobalPoint;
  elements: ShallowRef<readonly ExcalidrawElement[]>;
  imageCache: ImageCacheSlice;
  markStaticDirty: () => void;
  markInteractiveDirty: () => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  onInteractionDiscard: () => void;
}

interface UseCropInteractionReturn {
  croppingElementId: ShallowRef<string | null>;
  enterCropMode: (elementId: string) => void;
  exitCropMode: (confirm: boolean) => void;
}

export function useCropInteraction(options: UseCropInteractionOptions): UseCropInteractionReturn {
  const {
    canvasRef,
    zoom,
    toScene,
    elements,
    imageCache,
    markStaticDirty,
    markInteractiveDirty,
    onInteractionStart,
    onInteractionEnd,
    onInteractionDiscard,
  } = options;

  const croppingElementId = shallowRef<string | null>(null);
  let interaction: CropInteraction = { type: "idle" };

  function getCroppingElement(): ExcalidrawImageElement | null {
    if (!croppingElementId.value) return null;
    const el = elements.value.find((e) => e.id === croppingElementId.value);
    if (!el || !isImageElement(el)) return null;
    return el;
  }

  function enterCropMode(elementId: string): void {
    croppingElementId.value = elementId;
    interaction = { type: "idle" };
    onInteractionStart();
    markInteractiveDirty();
  }

  function exitCropMode(confirm: boolean): void {
    if (!croppingElementId.value) return;

    if (confirm) {
      onInteractionEnd();
    }
    if (!confirm) {
      onInteractionDiscard();
    }

    croppingElementId.value = null;
    interaction = { type: "idle" };
    markStaticDirty();
    markInteractiveDirty();
  }

  function getNaturalDimensions(element: ExcalidrawImageElement): { w: number; h: number } | null {
    if (!element.fileId) return null;
    const img = imageCache.getImage(element.fileId);
    if (!img) return null;
    return { w: img.naturalWidth, h: img.naturalHeight };
  }

  useEventListener(canvasRef, "pointerdown", (e: PointerEvent) => {
    const el = getCroppingElement();
    if (!el) return;
    if (e.button !== 0) return;

    const scene = toScene(e.offsetX, e.offsetY);

    // Check crop handle hit
    const handle = getCropHandleAtPosition(scene, el, zoom.value);
    if (handle) {
      interaction = { type: "dragging", handle };
      canvasRef.value?.setPointerCapture(e.pointerId);
      return;
    }

    // Click outside the crop handles — confirm and exit
    exitCropMode(true);
  });

  useEventListener(canvasRef, "pointermove", (e: PointerEvent) => {
    if (interaction.type !== "dragging") return;

    const el = getCroppingElement();
    if (!el) return;

    const dims = getNaturalDimensions(el);
    if (!dims) return;

    const scene = toScene(e.offsetX, e.offsetY);
    const result = cropElement(el, interaction.handle, dims.w, dims.h, scene[0], scene[1]);

    mutateElement(el, {
      x: result.x,
      y: result.y,
      width: result.width,
      height: result.height,
      crop: result.crop,
    });

    markStaticDirty();
    markInteractiveDirty();
  });

  useEventListener(canvasRef, "pointerup", (e: PointerEvent) => {
    if (interaction.type !== "dragging") return;

    canvasRef.value?.releasePointerCapture(e.pointerId);
    interaction = { type: "idle" };
    markStaticDirty();
    markInteractiveDirty();
  });

  function exitIfActive(confirm: boolean): void {
    if (!croppingElementId.value) return;
    exitCropMode(confirm);
  }

  useKeyboardShortcuts({
    enter: () => exitIfActive(true),
    escape: () => exitIfActive(false),
  });

  return {
    croppingElementId,
    enterCropMode,
    exitCropMode,
  };
}
