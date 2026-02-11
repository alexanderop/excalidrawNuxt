import { shallowRef, watch } from "vue";
import type { Ref, ShallowRef } from "vue";
import { useDropZone, useEventListener, useFileDialog } from "@vueuse/core";
import type { ExcalidrawElement } from "~/features/elements/types";
import type { ToolType } from "~/features/tools/types";
import type { GlobalPoint } from "~/shared/math";
import { createElement } from "~/features/elements/createElement";
import { useImageUpload } from "./useImageUpload";
import { DEFAULT_IMAGE_MAX_DIMENSION, SUPPORTED_IMAGE_EXTENSIONS } from "./constants";

interface UseImageInteractionOptions {
  canvasRef: Ref<HTMLCanvasElement | null>;
  activeTool: ShallowRef<ToolType>;
  setTool: (tool: ToolType) => void;
  toScene: (x: number, y: number) => GlobalPoint;
  zoom: Ref<number>;
  width: Ref<number>;
  height: Ref<number>;
  addElement: (el: ExcalidrawElement) => void;
  select: (id: string) => void;
  markStaticDirty: () => void;
  markInteractiveDirty: () => void;
}

interface UseImageInteractionReturn {
  isOverDropZone: Ref<boolean>;
}

function computeFitDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxDim: number,
): { width: number; height: number } {
  if (naturalWidth <= maxDim && naturalHeight <= maxDim) {
    return { width: naturalWidth, height: naturalHeight };
  }
  const ratio = naturalWidth / naturalHeight;
  if (naturalWidth >= naturalHeight) {
    return { width: maxDim, height: maxDim / ratio };
  }
  return { width: maxDim * ratio, height: maxDim };
}

export function useImageInteraction(
  options: UseImageInteractionOptions,
): UseImageInteractionReturn {
  const {
    canvasRef,
    activeTool,
    setTool,
    toScene,
    zoom,
    width,
    height,
    addElement,
    select,
    markStaticDirty,
    markInteractiveDirty,
  } = options;

  const { processFiles } = useImageUpload();
  const isOverDropZone = shallowRef(false);

  function viewportCenter(): GlobalPoint {
    return toScene(width.value / 2 / zoom.value, height.value / 2 / zoom.value);
  }

  async function createImageElements(files: File[], sceneX: number, sceneY: number): Promise<void> {
    const results = await processFiles(files);

    for (const [i, result] of results.entries()) {
      const { width: fitW, height: fitH } = computeFitDimensions(
        result.naturalWidth,
        result.naturalHeight,
        DEFAULT_IMAGE_MAX_DIMENSION,
      );

      // Center the element at the target position, offset multiple images
      const offsetX = sceneX - fitW / 2 + i * 20;
      const offsetY = sceneY - fitH / 2 + i * 20;

      const el = createElement("image", offsetX, offsetY, {
        width: fitW,
        height: fitH,
        fileId: result.fileId,
        status: "saved" as const,
      });

      addElement(el);
      select(el.id);
    }

    markStaticDirty();
    markInteractiveDirty();
  }

  // --- A) File dialog (triggered when image tool is selected) ---
  const { open: openFileDialog, onChange: onFileDialogChange } = useFileDialog({
    accept: SUPPORTED_IMAGE_EXTENSIONS,
    multiple: true,
    reset: true,
  });

  onFileDialogChange((fileList) => {
    if (!fileList || fileList.length === 0) return;
    const center = viewportCenter();
    createImageElements([...fileList], center[0], center[1]);
  });

  // Watch for image tool activation → open file dialog
  watch(activeTool, (tool) => {
    if (tool !== "image") return;
    openFileDialog();
    // Switch back immediately — the dialog is async
    setTool("selection");
  });

  // --- B) Drop zone & C) Paste handler ---
  // Guards needed: composable may run in Node test environment where document is undefined
  if (typeof document !== "undefined") {
    useDropZone(canvasRef, {
      dataTypes: ["Files"],
      onDrop(files) {
        if (!files || files.length === 0) return;
        const imageFiles = [...files].filter((f) => f.type.startsWith("image/"));
        if (imageFiles.length === 0) return;

        const center = viewportCenter();
        createImageElements(imageFiles, center[0], center[1]);
      },
      onOver() {
        isOverDropZone.value = true;
      },
      onLeave() {
        isOverDropZone.value = false;
      },
    });

    useEventListener(document, "paste", async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) return;
      e.preventDefault();

      const center = viewportCenter();
      await createImageElements(imageFiles, center[0], center[1]);
    });
  }

  return { isOverDropZone };
}
