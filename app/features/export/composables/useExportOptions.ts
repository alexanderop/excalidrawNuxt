import { shallowRef, computed, watch, type ShallowRef } from "vue";
import {
  useDrawVue,
  getExportSize,
  prepareElementsForExport,
  DEFAULT_EXPORT_PADDING,
  type ExcalidrawElement,
  type ExportOptions,
  type ExportDimensions,
} from "@drawvue/core";

export function useExportOptions(isOpen: ShallowRef<boolean>) {
  const ctx = useDrawVue();

  const onlySelected = shallowRef(false);
  const background = shallowRef(true);
  const darkMode = shallowRef(false);
  const embedScene = shallowRef(false);
  const scale = shallowRef(2);
  const filename = shallowRef("drawvue-export");

  // Snapshot state when dialog opens so preview doesn't change while open
  const snapshotElements = shallowRef<readonly ExcalidrawElement[]>([]);
  const snapshotSelectedIds = shallowRef<ReadonlySet<string> | null>(null);

  watch(isOpen, (open) => {
    if (!open) return;

    // Snapshot current elements
    snapshotElements.value = ctx.elements.elements.value;

    // Snapshot selected IDs
    const sel = ctx.selection.value;
    const selectedEls = sel?.selectedElements.value ?? [];
    const ids = new Set(selectedEls.map((el) => el.id));
    snapshotSelectedIds.value = ids.size > 0 ? ids : null;

    // Auto-enable "only selected" when there IS a selection
    onlySelected.value = ids.size > 0;
  });

  const hasSelection = computed(() => {
    return snapshotSelectedIds.value !== null && snapshotSelectedIds.value.size > 0;
  });

  const elementsToExport = computed(() => {
    const selectedIds = onlySelected.value ? snapshotSelectedIds.value : null;
    return prepareElementsForExport(snapshotElements.value, selectedIds);
  });

  const isEmpty = computed(() => elementsToExport.value.length === 0);

  const dimensions = computed<ExportDimensions | null>(() =>
    getExportSize(elementsToExport.value, DEFAULT_EXPORT_PADDING, scale.value),
  );

  const exportOptions = computed<ExportOptions>(() => ({
    elements: elementsToExport.value,
    theme: darkMode.value ? "dark" : "light",
    background: background.value,
    padding: DEFAULT_EXPORT_PADDING,
    scale: scale.value,
    imageCache: ctx.imageCache.cache.value,
  }));

  return {
    onlySelected,
    background,
    darkMode,
    embedScene,
    scale,
    filename,
    hasSelection,
    elementsToExport,
    dimensions,
    isEmpty,
    exportOptions,
  };
}
