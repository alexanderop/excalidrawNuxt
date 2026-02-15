import { describe, it, expect } from "vitest";
import { createTestImageElement } from "../../../__test-utils__/factories/element";
import { pointFrom } from "../../../shared/math";
import type { GlobalPoint, Radians } from "../../../shared/math";
import type { ImageCrop } from "@excalidraw/element/types";
import type { ExcalidrawImageElement } from "../types";
import {
  cropElement,
  getUncroppedWidthAndHeight,
  getCropHandleAtPosition,
  MINIMAL_CROP_SIZE,
} from "../cropElement";
import type { CropHandleType } from "../cropElement";

/**
 * Factory: image element at (100, 100) with 200x100 dimensions.
 * `naturalWidth` / `naturalHeight` represent the original image pixels.
 */
function makeImage(overrides: Partial<Omit<ExcalidrawImageElement, "type">> = {}) {
  return createTestImageElement({
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    angle: 0 as Radians,
    ...overrides,
  });
}

const NATURAL_W = 400;
const NATURAL_H = 200;

describe("getUncroppedWidthAndHeight", () => {
  it("returns element dimensions when no crop exists", () => {
    const el = makeImage();
    const { width, height } = getUncroppedWidthAndHeight(el);

    expect(width).toBe(200);
    expect(height).toBe(100);
  });

  it("returns original dimensions from a cropped element", () => {
    const el = makeImage({
      width: 100,
      height: 50,
      crop: {
        x: 0,
        y: 0,
        width: NATURAL_W / 2,
        height: NATURAL_H / 2,
        naturalWidth: NATURAL_W,
        naturalHeight: NATURAL_H,
      } satisfies ImageCrop,
    });

    const { width, height } = getUncroppedWidthAndHeight(el);
    expect(width).toBeCloseTo(200, 5);
    expect(height).toBeCloseTo(100, 5);
  });
});

describe("cropElement — corner handles", () => {
  it("SE handle: shrinks element width/height from bottom-right", () => {
    const el = makeImage();
    const result = cropElement(
      el,
      "se",
      NATURAL_W,
      NATURAL_H,
      // Pointer at center of element (shrinks by half)
      el.x + el.width / 2,
      el.y + el.height / 2,
    );

    expect(result.width).toBeCloseTo(100, 0);
    expect(result.height).toBeCloseTo(50, 0);
    expect(result.crop).not.toBeNull();
    // Top-left stays fixed for SE handle
    expect(result.x).toBeCloseTo(el.x, 0);
    expect(result.y).toBeCloseTo(el.y, 0);
  });

  it("NW handle: shrinks element from top-left", () => {
    const el = makeImage();
    const result = cropElement(
      el,
      "nw",
      NATURAL_W,
      NATURAL_H,
      // Pointer halfway into the element
      el.x + el.width / 2,
      el.y + el.height / 2,
    );

    expect(result.width).toBeCloseTo(100, 0);
    expect(result.height).toBeCloseTo(50, 0);
    expect(result.crop).not.toBeNull();
    // Bottom-right stays fixed for NW handle
    expect(result.x + result.width).toBeCloseTo(el.x + el.width, 0);
    expect(result.y + result.height).toBeCloseTo(el.y + el.height, 0);
  });

  it("NE handle: shrinks element from top-right", () => {
    const el = makeImage();
    const result = cropElement(
      el,
      "ne",
      NATURAL_W,
      NATURAL_H,
      el.x + el.width / 2,
      el.y + el.height / 2,
    );

    expect(result.width).toBeLessThan(el.width);
    expect(result.height).toBeLessThan(el.height);
    expect(result.crop).not.toBeNull();
    // Bottom-left stays fixed for NE handle
    expect(result.x).toBeCloseTo(el.x, 0);
    expect(result.y + result.height).toBeCloseTo(el.y + el.height, 0);
  });

  it("SW handle: shrinks element from bottom-left", () => {
    const el = makeImage();
    const result = cropElement(
      el,
      "sw",
      NATURAL_W,
      NATURAL_H,
      el.x + el.width / 2,
      el.y + el.height / 2,
    );

    expect(result.width).toBeLessThan(el.width);
    expect(result.height).toBeLessThan(el.height);
    expect(result.crop).not.toBeNull();
    // Top-right stays fixed for SW handle
    expect(result.x + result.width).toBeCloseTo(el.x + el.width, 0);
    expect(result.y).toBeCloseTo(el.y, 0);
  });
});

describe("cropElement — minimum size", () => {
  it("clamps to minimal crop size when dragged fully inward", () => {
    const el = makeImage();
    // Drag NW handle past the bottom-right corner
    const result = cropElement(
      el,
      "nw",
      NATURAL_W,
      NATURAL_H,
      el.x + el.width + 100,
      el.y + el.height + 100,
    );

    expect(result.width).toBeGreaterThanOrEqual(MINIMAL_CROP_SIZE);
    expect(result.height).toBeGreaterThanOrEqual(MINIMAL_CROP_SIZE);
  });

  it("clamps SE handle to minimal size", () => {
    const el = makeImage();
    // Drag SE handle past the top-left corner
    const result = cropElement(el, "se", NATURAL_W, NATURAL_H, el.x - 100, el.y - 100);

    expect(result.width).toBeGreaterThanOrEqual(MINIMAL_CROP_SIZE);
    expect(result.height).toBeGreaterThanOrEqual(MINIMAL_CROP_SIZE);
  });
});

describe("cropElement — crop reset", () => {
  it("returns crop: null when dragged back to full image", () => {
    const el = makeImage();
    // Drag SE handle beyond the element bounds (no actual crop)
    const result = cropElement(
      el,
      "se",
      NATURAL_W,
      NATURAL_H,
      el.x + el.width + 50,
      el.y + el.height + 50,
    );

    expect(result.crop).toBeNull();
    expect(result.width).toBeCloseTo(el.width, 0);
    expect(result.height).toBeCloseTo(el.height, 0);
  });
});

describe("cropElement — already-cropped element", () => {
  it("further cropping a pre-cropped element works correctly", () => {
    const crop: ImageCrop = {
      x: 100,
      y: 50,
      width: 200,
      height: 100,
      naturalWidth: NATURAL_W,
      naturalHeight: NATURAL_H,
    };
    const el = makeImage({ width: 100, height: 50, crop });

    const result = cropElement(
      el,
      "se",
      NATURAL_W,
      NATURAL_H,
      el.x + el.width / 2,
      el.y + el.height / 2,
    );

    expect(result.width).toBeLessThan(el.width);
    expect(result.height).toBeLessThan(el.height);
    expect(result.crop).not.toBeNull();
  });
});

describe("cropElement — rotation", () => {
  it("crops correctly with a rotated element", () => {
    const angle = (Math.PI / 4) as Radians; // 45 degrees
    const el = makeImage({ angle });

    const result = cropElement(
      el,
      "se",
      NATURAL_W,
      NATURAL_H,
      // Pointer at approximate center — after unrotation this maps to a crop
      el.x + el.width / 2,
      el.y + el.height / 2,
    );

    // The result should still produce valid dimensions
    expect(result.width).toBeGreaterThanOrEqual(MINIMAL_CROP_SIZE);
    expect(result.height).toBeGreaterThanOrEqual(MINIMAL_CROP_SIZE);
    expect(result.width).toBeLessThanOrEqual(el.width);
  });
});

describe("getCropHandleAtPosition", () => {
  const zoom = 1;

  it("detects NW corner handle", () => {
    const el = makeImage();
    const point = pointFrom<GlobalPoint>(el.x, el.y);
    expect(getCropHandleAtPosition(point, el, zoom)).toBe("nw");
  });

  it("detects NE corner handle", () => {
    const el = makeImage();
    const point = pointFrom<GlobalPoint>(el.x + el.width, el.y);
    expect(getCropHandleAtPosition(point, el, zoom)).toBe("ne");
  });

  it("detects SW corner handle", () => {
    const el = makeImage();
    const point = pointFrom<GlobalPoint>(el.x, el.y + el.height);
    expect(getCropHandleAtPosition(point, el, zoom)).toBe("sw");
  });

  it("detects SE corner handle", () => {
    const el = makeImage();
    const point = pointFrom<GlobalPoint>(el.x + el.width, el.y + el.height);
    expect(getCropHandleAtPosition(point, el, zoom)).toBe("se");
  });

  it("returns null for center of element", () => {
    const el = makeImage();
    const point = pointFrom<GlobalPoint>(el.x + el.width / 2, el.y + el.height / 2);
    expect(getCropHandleAtPosition(point, el, zoom)).toBeNull();
  });

  it("returns null for point far outside element", () => {
    const el = makeImage();
    const point = pointFrom<GlobalPoint>(500, 500);
    expect(getCropHandleAtPosition(point, el, zoom)).toBeNull();
  });

  it("accounts for zoom when detecting handles", () => {
    const el = makeImage();
    // At zoom 0.5, handle radius is 20px (10 / 0.5), so points farther away should still hit
    const point = pointFrom<GlobalPoint>(el.x + 15, el.y + 15);
    expect(getCropHandleAtPosition(point, el, 0.5)).toBe("nw");
    // At zoom 2, handle radius is 5px, so the same point should miss
    expect(getCropHandleAtPosition(point, el, 2)).toBeNull();
  });

  it("detects handles on a rotated element", () => {
    const angle = (Math.PI / 2) as Radians; // 90 degrees
    const el = makeImage({ angle });
    // After 90-degree rotation around center (200, 150):
    // NW corner (100, 100) rotates to approximately (250, 50)
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    // The rotated NW corner position
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = el.x - cx;
    const dy = el.y - cy;
    const rotatedX = cx + dx * cos - dy * sin;
    const rotatedY = cy + dx * sin + dy * cos;
    const point = pointFrom<GlobalPoint>(rotatedX, rotatedY);

    // getCropHandleAtPosition unrotates the point back, so it should find "nw"
    expect(getCropHandleAtPosition(point, el, zoom)).toBe("nw");
  });

  it.each<[CropHandleType, number, number]>([
    ["nw", 0, 0],
    ["ne", 200, 0],
    ["sw", 0, 100],
    ["se", 200, 100],
  ])("detects %s handle at offset (%d, %d)", (expected, dx, dy) => {
    const el = makeImage();
    const point = pointFrom<GlobalPoint>(el.x + dx, el.y + dy);
    expect(getCropHandleAtPosition(point, el, zoom)).toBe(expected);
  });
});
