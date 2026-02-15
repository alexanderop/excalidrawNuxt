import { computed } from "vue";
import {
  useDrawVue,
  isInitializedImageElement,
  isImageElement,
  createElement,
  toFileId,
  generateId,
  mutateElement,
  getUncroppedWidthAndHeight,
} from "@drawvue/core";
import { useBackgroundRemoval } from "./useBackgroundRemoval";
import { useObjectSegmentation } from "./useObjectSegmentation";

/** Horizontal gap between original image and new elements */
const GAP = 20;

export function useImageActions() {
  const ctx = useDrawVue();

  const selectionSlice = ctx.selection.value;
  const historySlice = ctx.history.value;
  const dirtySlice = ctx.dirty.value;

  const cropSlice = ctx.crop.value;

  if (!selectionSlice || !historySlice || !dirtySlice) {
    throw new Error(
      "[useImageActions] Selection/history/dirty slices not found on DrawVueContext. " +
        "Ensure this composable is called from a component inside <DrawVue>.",
    );
  }

  const { register } = ctx.actionRegistry;
  const { getElementById, addElement } = ctx.elements;
  const { getImage, addImage } = ctx.imageCache;
  const { selectedElements, select, replaceSelection } = selectionSlice;
  const { recordAction } = historySlice;
  const { markStaticDirty } = dirtySlice;
  const { status, downloadProgress, removeBackground } = useBackgroundRemoval();
  const {
    status: segStatus,
    errorMessage: segErrorMessage,
    progress: segProgress,
    segmentObjects,
    cancel: cancelSegmentation,
  } = useObjectSegmentation();

  const isProcessing = computed(
    () => status.value === "downloading" || status.value === "processing",
  );

  const segIsProcessing = computed(
    () =>
      segStatus.value === "downloading" ||
      segStatus.value === "processing" ||
      segStatus.value === "compositing",
  );

  const isAnythingProcessing = computed(() => isProcessing.value || segIsProcessing.value);

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
        !isAnythingProcessing.value,
    },
    {
      id: "image:split-objects",
      label: "Split into Objects",
      icon: "i-lucide-grid-2x2",
      handler() {
        void handleSplitObjects();
      },
      enabled: () =>
        selectedElements.value.length === 1 &&
        isInitializedImageElement(selectedElements.value[0]!) &&
        !selectedElements.value[0]!.locked &&
        !isAnythingProcessing.value,
    },
    {
      id: "image:crop",
      label: "Crop Image",
      icon: "i-lucide-crop",
      handler() {
        if (!cropSlice) return;
        const el = selectedElements.value[0];
        if (!el || !isInitializedImageElement(el)) return;
        cropSlice.enterCropMode(el.id);
      },
      enabled: () =>
        !!cropSlice &&
        selectedElements.value.length === 1 &&
        isInitializedImageElement(selectedElements.value[0]!) &&
        !isAnythingProcessing.value &&
        !cropSlice.croppingElementId.value,
    },
    {
      id: "image:reset-crop",
      label: "Reset Crop",
      icon: "i-lucide-maximize",
      handler() {
        const el = selectedElements.value[0];
        if (!el || !isImageElement(el) || !el.crop) return;
        const { width, height } = getUncroppedWidthAndHeight(el);
        recordAction(() => {
          mutateElement(el, { crop: null, width, height });
          markStaticDirty();
        });
      },
      enabled: () => {
        if (selectedElements.value.length !== 1) return false;
        const el = selectedElements.value[0];
        return !!el && isImageElement(el) && el.crop !== null;
      },
    },
  ]);

  async function handleRemoveBackground(): Promise<void> {
    if (isAnythingProcessing.value) return;

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

      const newElement = createElement("image", currentEl.x + currentEl.width + GAP, currentEl.y, {
        width: currentEl.width,
        height: currentEl.height,
        angle: currentEl.angle,
        opacity: currentEl.opacity,
        fileId: newFileId,
        status: "saved",
        scale: currentEl.scale ?? [1, 1],
      });
      addElement(newElement);
      select(newElement.id);
      markStaticDirty();
    });
  }

  async function handleSplitObjects(): Promise<void> {
    if (isAnythingProcessing.value) return;

    const el = selectedElements.value[0] ?? null;
    if (!isInitializedImageElement(el)) return;

    const elementId = el.id;
    const cachedImage = getImage(el.fileId);
    if (!cachedImage) {
      console.warn("[split-objects] No cached image for fileId:", el.fileId);
      return;
    }

    const segments = await segmentObjects(cachedImage);
    if (!segments || segments.length === 0) return;

    // Re-validate: element may have been deleted during the async inference
    const currentEl = getElementById(elementId);
    if (!currentEl || currentEl.isDeleted) return;
    if (!isInitializedImageElement(currentEl)) return;

    recordAction(() => {
      let xCursor = currentEl.x + currentEl.width + GAP;
      // Use mask dimensions (resized input space) for correct scaling at any resolution
      const maskHeight = segments[0]?.maskHeight ?? cachedImage.naturalHeight;
      const scaleRatio = currentEl.height / maskHeight;
      const newIds: string[] = [];

      for (const segment of segments) {
        const newFileId = toFileId(generateId());
        addImage(newFileId, segment.image, "image/png");

        const scaledW = segment.bbox.width * scaleRatio;
        const scaledH = segment.bbox.height * scaleRatio;

        const newElement = createElement("image", xCursor, currentEl.y, {
          width: scaledW,
          height: scaledH,
          fileId: newFileId,
          status: "saved",
          scale: [1, 1],
        });
        addElement(newElement);
        newIds.push(newElement.id);
        xCursor += scaledW + GAP;
      }

      replaceSelection(new Set(newIds));
      markStaticDirty();
    });
  }

  return {
    status,
    downloadProgress,
    isProcessing,
    segStatus,
    segErrorMessage,
    segProgress,
    isAnythingProcessing,
    cancelSegmentation,
  };
}
