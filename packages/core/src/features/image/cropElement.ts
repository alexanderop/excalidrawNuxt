/**
 * Pure-function crop math for image elements.
 *
 * Adapted from Excalidraw's cropElement.ts — simplified for MVP:
 * - Corner handles only (nw, ne, sw, se)
 * - No flip handling
 * - No aspect-ratio locking
 */

import type { ImageCrop, ExcalidrawImageElement } from "@excalidraw/element/types";
import type { Radians } from "../../shared/math";
import { pointFrom, pointRotateRads, pointCenter, clamp, isCloseTo } from "../../shared/math";
import type { GlobalPoint } from "../../shared/math";

export type CropHandleType = "nw" | "ne" | "sw" | "se";

export const MINIMAL_CROP_SIZE = 10;
export const CROP_HANDLE_SIZE = 10;

interface CropResult {
  x: number;
  y: number;
  width: number;
  height: number;
  crop: ImageCrop | null;
}

/**
 * Returns the uncropped (original) width and height of the image element.
 * If the element has no crop, returns the element's current dimensions.
 */
export function getUncroppedWidthAndHeight(element: ExcalidrawImageElement): {
  width: number;
  height: number;
} {
  if (!element.crop) {
    return { width: element.width, height: element.height };
  }

  return {
    width: element.width / (element.crop.width / element.crop.naturalWidth),
    height: element.height / (element.crop.height / element.crop.naturalHeight),
  };
}

/** Unrotate a scene-space pointer into the element's local coordinate system. */
function unrotatePointer(
  element: ExcalidrawImageElement,
  pointerX: number,
  pointerY: number,
): GlobalPoint {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  return pointRotateRads(
    pointFrom<GlobalPoint>(pointerX, pointerY),
    pointFrom<GlobalPoint>(cx, cy),
    -element.angle as Radians,
  );
}

/** Compute new width/height based on how the pointer moved relative to a handle edge. */
function computeNextDimensions(
  handle: CropHandleType,
  element: ExcalidrawImageElement,
  rpx: number,
  rpy: number,
  croppedLeft: number,
  croppedTop: number,
  uncroppedWidth: number,
  uncroppedHeight: number,
): { nextWidth: number; nextHeight: number } {
  let nextWidth = element.width;
  let nextHeight = element.height;

  if (handle.includes("n")) {
    nextHeight = clamp(
      element.height - (rpy - element.y),
      MINIMAL_CROP_SIZE,
      element.height + croppedTop,
    );
  }
  if (handle.includes("s")) {
    nextHeight = clamp(
      element.height + (rpy - element.y - element.height),
      MINIMAL_CROP_SIZE,
      uncroppedHeight - croppedTop,
    );
  }
  if (handle.includes("e")) {
    nextWidth = clamp(
      element.width + (rpx - element.x - element.width),
      MINIMAL_CROP_SIZE,
      uncroppedWidth - croppedLeft,
    );
  }
  if (handle.includes("w")) {
    nextWidth = clamp(
      element.width - (rpx - element.x),
      MINIMAL_CROP_SIZE,
      element.width + croppedLeft,
    );
  }

  return { nextWidth, nextHeight };
}

/**
 * Core crop calculation. Given a pointer position and corner handle,
 * computes the new element dimensions, position, and crop rect.
 */
export function cropElement(
  element: ExcalidrawImageElement,
  handle: CropHandleType,
  naturalWidth: number,
  naturalHeight: number,
  pointerX: number,
  pointerY: number,
): CropResult {
  const { width: uncroppedWidth, height: uncroppedHeight } = getUncroppedWidthAndHeight(element);

  const naturalWidthToUncropped = naturalWidth / uncroppedWidth;
  const naturalHeightToUncropped = naturalHeight / uncroppedHeight;

  const croppedLeft = (element.crop?.x ?? 0) / naturalWidthToUncropped;
  const croppedTop = (element.crop?.y ?? 0) / naturalHeightToUncropped;

  const rotatedPointer = unrotatePointer(element, pointerX, pointerY);

  let crop: ImageCrop = element.crop ?? {
    x: 0,
    y: 0,
    width: naturalWidth,
    height: naturalHeight,
    naturalWidth,
    naturalHeight,
  };
  const previousCropHeight = crop.height;
  const previousCropWidth = crop.width;

  const { nextWidth, nextHeight } = computeNextDimensions(
    handle,
    element,
    rotatedPointer[0],
    rotatedPointer[1],
    croppedLeft,
    croppedTop,
    uncroppedWidth,
    uncroppedHeight,
  );

  // Update crop dimensions in natural pixels and adjust position
  crop = {
    ...crop,
    height: nextHeight * naturalHeightToUncropped,
    width: nextWidth * naturalWidthToUncropped,
  };
  if (handle.includes("n")) {
    crop.y += previousCropHeight - crop.height;
  }
  if (handle.includes("w")) {
    crop.x += previousCropWidth - crop.width;
  }

  const newOrigin = recomputeOrigin(element, handle, nextWidth, nextHeight);

  // Reset crop to null if we're back to full image
  if (isCloseTo(crop.width, crop.naturalWidth) && isCloseTo(crop.height, crop.naturalHeight)) {
    return { x: newOrigin[0], y: newOrigin[1], width: nextWidth, height: nextHeight, crop: null };
  }

  return { x: newOrigin[0], y: newOrigin[1], width: nextWidth, height: nextHeight, crop };
}

/**
 * Recompute element x,y so the opposite corner of the crop handle stays fixed.
 * Accounts for rotation via the rotate-around-center pattern.
 */
function recomputeOrigin(
  element: ExcalidrawImageElement,
  handle: CropHandleType,
  width: number,
  height: number,
): [number, number] {
  const x1 = element.x;
  const y1 = element.y;
  const x2 = element.x + element.width;
  const y2 = element.y + element.height;
  const startTopLeft = pointFrom<GlobalPoint>(x1, y1);
  const startBottomRight = pointFrom<GlobalPoint>(x2, y2);
  const startCenter = pointCenter(startTopLeft, startBottomRight);

  // Calculate new topLeft based on which corner is fixed
  let newTopLeft: [number, number];

  switch (handle) {
    case "nw": {
      newTopLeft = [startBottomRight[0] - width, startBottomRight[1] - height];
      break;
    }
    case "ne": {
      newTopLeft = [startTopLeft[0], startBottomRight[1] - height];
      break;
    }
    case "sw": {
      newTopLeft = [startBottomRight[0] - width, startTopLeft[1]];
      break;
    }
    case "se": {
      newTopLeft = [startTopLeft[0], startTopLeft[1]];
      break;
    }
  }

  // Rotate adjustment: rotate newTopLeft around the old center,
  // compute new center, then unrotate
  const angle = element.angle;
  if (angle === 0) {
    return newTopLeft;
  }

  const rotatedTopLeft = pointRotateRads(
    pointFrom<GlobalPoint>(newTopLeft[0], newTopLeft[1]),
    startCenter,
    angle as Radians,
  );
  const newCenter = pointFrom<GlobalPoint>(newTopLeft[0] + width / 2, newTopLeft[1] + height / 2);
  const rotatedNewCenter = pointRotateRads(newCenter, startCenter, angle as Radians);
  const finalTopLeft = pointRotateRads(rotatedTopLeft, rotatedNewCenter, -angle as Radians);

  return [finalTopLeft[0], finalTopLeft[1]];
}

/**
 * Hit-test the 4 corner crop handles. Returns the handle type or null.
 */
export function getCropHandleAtPosition(
  scenePoint: GlobalPoint,
  element: ExcalidrawImageElement,
  zoom: number,
): CropHandleType | null {
  const handleRadius = CROP_HANDLE_SIZE / zoom;

  // Unrotate point into element space
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const local = pointRotateRads(
    scenePoint,
    pointFrom<GlobalPoint>(cx, cy),
    -element.angle as Radians,
  );

  const px = local[0];
  const py = local[1];

  const corners: [CropHandleType, number, number][] = [
    ["nw", element.x, element.y],
    ["ne", element.x + element.width, element.y],
    ["sw", element.x, element.y + element.height],
    ["se", element.x + element.width, element.y + element.height],
  ];

  for (const [type, hx, hy] of corners) {
    if (Math.abs(px - hx) <= handleRadius && Math.abs(py - hy) <= handleRadius) {
      return type;
    }
  }

  return null;
}
