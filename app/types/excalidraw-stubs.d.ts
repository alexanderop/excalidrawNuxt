/**
 * Minimal type stubs for @excalidraw/excalidraw types referenced by
 * @excalidraw/element. These satisfy the structural typing requirements
 * without pulling in the full React-based excalidraw package.
 */

declare module "@excalidraw/excalidraw/types" {
  export interface NormalizedZoomValue {
    _brand: "normalizedZoom";
  }

  export interface Zoom {
    value: NormalizedZoomValue;
  }

  export interface AppState {
    zoom: Zoom;
    width: number;
    height: number;
    scrollX: number;
    scrollY: number;
  }
}
