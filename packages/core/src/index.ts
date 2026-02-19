// @drawvue/core — public API

// Components
export { DrawVue } from "./components";

// Context (provide/inject for multi-instance support)
export { createDrawVue, provideDrawVue, useDrawVue, DRAWVUE_KEY } from "./context";
export type {
  DrawVueContext,
  SelectionSlice,
  HistorySlice,
  DirtySlice,
  CropSlice,
  ViewportSlice,
  EmbeddableSlice,
  EmbeddableState,
} from "./context";

// Features
export * from "./features/binding";
export * from "./features/canvas";
export * from "./features/clipboard";
export * from "./features/code";
export * from "./features/command-palette";
export * from "./features/context-menu";
export * from "./features/elbow";
export * from "./features/elements";
export * from "./features/groups";
export * from "./features/history/useHistory";
export * from "./features/image";
export * from "./features/linear-editor";
export * from "./features/properties";
export * from "./features/rendering";
export * from "./features/selection";
export * from "./features/theme";
export * from "./features/tools";
export * from "./features/embeddable";

// Shared utilities
export * from "./shared/math";
export * from "./shared/random";
export * from "./shared/toolTypes";
export * from "./shared/useActionRegistry";
export type { ActionRegistry } from "./shared/useActionRegistry";
export * from "./shared/useKeyboardShortcuts";
export * from "./shared/isTypingElement";

// Utils
export * from "./utils/tryCatch";
