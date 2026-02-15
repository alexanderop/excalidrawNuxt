/**
 * Stubs browser globals that @excalidraw/common accesses at the top level
 * WITHOUT a typeof guard. Must run before any module imports @excalidraw/common.
 *
 * Only stub `navigator` — other packages guard with `typeof document/window`
 * checks and provide their own fallbacks, so leaving those undefined is correct.
 */
if (globalThis.navigator === undefined) {
  // @ts-expect-error — minimal stub for @excalidraw/common platform detection
  globalThis.navigator = {
    platform: "Linux",
    userAgent: "",
  };
}
