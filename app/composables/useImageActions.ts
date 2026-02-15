import { computed } from "vue";
import {
  useDrawVue,
  isInitializedImageElement,
  createElement,
  toFileId,
  generateId,
} from "@drawvue/core";
import { useBackgroundRemoval } from "./useBackgroundRemoval";

/** Horizontal gap between original image and the new background-removed copy */
const DUPLICATE_OFFSET_X = 20;

export function useImageActions() {
  const ctx = useDrawVue();

  const selectionSlice = ctx.selection.value;
  const historySlice = ctx.history.value;
  const dirtySlice = ctx.dirty.value;

  if (!selectionSlice || !historySlice || !dirtySlice) {
    throw new Error(
      "[useImageActions] Selection/history/dirty slices not found on DrawVueContext. " +
        "Ensure this composable is called from a component inside <DrawVue>.",
    );
  }

  const { register } = ctx.actionRegistry;
  const { getElementById, addElement } = ctx.elements;
  const { getImage, addImage } = ctx.imageCache;
  const { selectedElements, select } = selectionSlice;
  const { recordAction } = historySlice;
  const { markStaticDirty } = dirtySlice;
  const { status, downloadProgress, removeBackground } = useBackgroundRemoval();

  const isProcessing = computed(
    () => status.value === "downloading" || status.value === "processing",
  );

  register([
    {
      id: "image:remove-background",
      label: "Remove Background",
      icon: "i-lucide-image-minus",
      handler() {
        void handleRemoveBackground();
      },
      enabled: () =>
        selectedElements.value.length === 1 &&
        isInitializedImageElement(selectedElements.value[0]!) &&
        !selectedElements.value[0]!.locked &&
        !isProcessing.value,
    },
  ]);

  async function handleRemoveBackground(): Promise<void> {
    if (isProcessing.value) return;

    const el = selectedElements.value[0] ?? null;
    if (!isInitializedImageElement(el)) return;

    const elementId = el.id;
    const cachedImage = getImage(el.fileId);
    if (!cachedImage) return;

    const resultImage = await removeBackground(cachedImage);
    if (!resultImage) return;

    // Re-validate: element may have been deleted/moved during the async inference
    const currentEl = getElementById(elementId);
    if (!currentEl || currentEl.isDeleted) return;
    if (!isInitializedImageElement(currentEl)) return;

    recordAction(() => {
      const newFileId = toFileId(generateId());
      addImage(newFileId, resultImage, "image/png");

      const newElement = createElement(
        "image",
        currentEl.x + currentEl.width + DUPLICATE_OFFSET_X,
        currentEl.y,
        {
          width: currentEl.width,
          height: currentEl.height,
          angle: currentEl.angle,
          opacity: currentEl.opacity,
          fileId: newFileId,
          status: "saved",
          scale: currentEl.scale ?? [1, 1],
        },
      );
      addElement(newElement);
      select(newElement.id);
      markStaticDirty();
    });
  }

  return { status, downloadProgress, isProcessing };
}
