import { provide, inject, shallowRef, type InjectionKey } from "vue";
import type { ShallowRef, Ref, ComputedRef } from "vue";
import type { ExcalidrawElement, ElementsMap } from "./features/elements/types";
import type { ToolType } from "./features/tools/types";
import type { ActionRegistry, ActionId } from "./shared/useActionRegistry";
import type { FileId, ImageCacheEntry, ImageMimeType } from "./features/image/types";
import type { Result } from "./utils/tryCatch";
import type { FillStyle, StrokeStyle, TextAlign, Arrowhead } from "./features/elements/types";
import type { ArrowSubtype, Roundness } from "./features/properties/types";
import type { GlobalPoint } from "./shared/math";
import { createElements } from "./features/elements/useElements";
import { createToolStore } from "./features/tools/useTool";
import { createActionRegistry } from "./shared/useActionRegistry";
import { createClipboard } from "./features/clipboard/useClipboard";
import { createImageCache } from "./features/image/useImageCache";
import { createStyleDefaults } from "./features/properties/composables/useStyleDefaults";
import { createStyleClipboard } from "./features/properties/composables/useStyleClipboard";
import { createCommandPalette } from "./features/command-palette/useCommandPalette";

// ── Slice return types ──────────────────────────────────────────────

export interface ElementsSlice {
  elements: ShallowRef<readonly ExcalidrawElement[]>;
  elementMap: ElementsMap;
  addElement: (element: ExcalidrawElement) => void;
  replaceElements: (newElements: readonly ExcalidrawElement[]) => void;
  getElementById: (id: string) => ExcalidrawElement | undefined;
}

export interface ToolSlice {
  activeTool: ShallowRef<ToolType>;
  setTool: (tool: ToolType) => void;
  onBeforeToolChange: (fn: () => void) => void;
  $reset: () => void;
}

export interface ClipboardSlice {
  clipboard: ShallowRef<readonly ExcalidrawElement[]>;
  copy: (elements: readonly ExcalidrawElement[]) => void;
  cut: (
    elements: readonly ExcalidrawElement[],
    callbacks: { markDeleted: (els: readonly ExcalidrawElement[]) => void },
  ) => void;
  paste: (callbacks: {
    addElement: (el: ExcalidrawElement) => void;
    select: (id: string) => void;
    replaceSelection: (ids: Set<string>) => void;
    markStaticDirty: () => void;
    markInteractiveDirty: () => void;
  }) => void;
}

export interface ImageCacheSlice {
  cache: ShallowRef<Map<FileId, ImageCacheEntry>>;
  addImage: (id: FileId, entry: ImageCacheEntry) => void;
  registerImage: (image: HTMLImageElement, mimeType: ImageMimeType) => Result<FileId>;
  getImage: (id: FileId) => HTMLImageElement | undefined;
  getEntry: (id: FileId) => ImageCacheEntry | undefined;
  hasImage: (id: FileId) => boolean;
  removeImage: (id: FileId) => void;
  $reset: () => void;
}

export interface StyleDefaultsSlice {
  strokeColor: Ref<string>;
  backgroundColor: Ref<string>;
  fillStyle: Ref<FillStyle>;
  strokeWidth: Ref<number>;
  strokeStyle: Ref<StrokeStyle>;
  opacity: Ref<number>;
  roughness: Ref<number>;
  roundness: Ref<Roundness>;
  arrowSubtype: Ref<ArrowSubtype>;
  fontFamily: Ref<number>;
  fontSize: Ref<number>;
  textAlign: Ref<TextAlign>;
  startArrowhead: Ref<Arrowhead | null>;
  endArrowhead: Ref<Arrowhead | null>;
  recentColors: Ref<string[]>;
  getStyleOverrides: () => Record<string, unknown>;
}

export interface StyleClipboardSlice {
  storedStyles: Ref<Partial<Record<string, unknown>> | null>;
  hasStoredStyles: ComputedRef<boolean>;
  copyStyles: (element: ExcalidrawElement) => void;
  pasteStyles: (elements: ExcalidrawElement[], markDirty: () => void) => void;
}

export interface CommandPaletteSlice {
  isOpen: Ref<boolean>;
  execute: (id: ActionId) => void;
}

export interface SelectionSlice {
  selectedElements: ComputedRef<readonly ExcalidrawElement[]>;
  select: (id: string) => void;
  replaceSelection: (ids: Set<string>) => void;
}

export interface HistorySlice {
  recordAction: (fn: () => void) => void;
}

export interface DirtySlice {
  markStaticDirty: () => void;
}

export interface CropSlice {
  croppingElementId: ShallowRef<string | null>;
  enterCropMode: (elementId: string) => void;
  exitCropMode: (confirm: boolean) => void;
}

export interface ViewportSlice {
  scrollX: Ref<number>;
  scrollY: Ref<number>;
  zoom: Ref<number>;
  toScreen: (sceneX: number, sceneY: number) => GlobalPoint;
}

export type EmbeddableState = {
  elementId: string;
  state: "hover" | "active";
} | null;

export interface EmbeddableSlice {
  activeEmbeddable: ShallowRef<EmbeddableState>;
}

// ── Context ─────────────────────────────────────────────────────────

export interface DrawVueContext {
  elements: ElementsSlice;
  tool: ToolSlice;
  actionRegistry: ActionRegistry;
  clipboard: ClipboardSlice;
  imageCache: ImageCacheSlice;
  styleDefaults: StyleDefaultsSlice;
  styleClipboard: StyleClipboardSlice;
  commandPalette: CommandPaletteSlice;
  selection: ShallowRef<SelectionSlice | null>;
  history: ShallowRef<HistorySlice | null>;
  dirty: ShallowRef<DirtySlice | null>;
  crop: ShallowRef<CropSlice | null>;
  viewport: ShallowRef<ViewportSlice | null>;
  embeddable: ShallowRef<EmbeddableSlice | null>;
}

export const DRAWVUE_KEY: InjectionKey<DrawVueContext> = Symbol("drawvue");

// ── Factory ─────────────────────────────────────────────────────────

export function createDrawVue(): DrawVueContext {
  // Create in dependency order
  const elements = createElements();
  const tool = createToolStore();
  const actionRegistry = createActionRegistry();
  const clipboard = createClipboard();
  const imageCache = createImageCache();
  const styleDefaults = createStyleDefaults();
  const styleClipboard = createStyleClipboard(styleDefaults);
  const commandPalette = createCommandPalette(actionRegistry);

  return {
    elements,
    tool,
    actionRegistry,
    clipboard,
    imageCache,
    styleDefaults,
    styleClipboard,
    commandPalette,
    selection: shallowRef(null),
    history: shallowRef(null),
    dirty: shallowRef(null),
    crop: shallowRef(null),
    viewport: shallowRef(null),
    embeddable: shallowRef(null),
  };
}

// ── Provide / Inject ────────────────────────────────────────────────

export function provideDrawVue(ctx?: DrawVueContext): DrawVueContext {
  const context = ctx ?? createDrawVue();
  provide(DRAWVUE_KEY, context);
  return context;
}

export function useDrawVue(): DrawVueContext {
  const ctx = inject(DRAWVUE_KEY);
  if (!ctx) {
    throw new Error(
      "[DrawVue] No DrawVue context found. Did you forget to call provideDrawVue() in an ancestor component?",
    );
  }
  return ctx;
}
