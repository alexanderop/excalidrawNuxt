import { onTestFinished } from "vitest";
import { CanvasPage, API } from "~/__test-utils__/browser";
import { createElement } from "@drawvue/core";
import type { FileId } from "@drawvue/core";

/**
 * Create a solid-colored test image as an HTMLImageElement.
 * Uses an offscreen canvas to produce a deterministic image.
 */
function createTestImage(width: number, height: number, color: string): Promise<HTMLImageElement> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = canvas.toDataURL("image/png");
  });
}

/** Populate the image cache with a test image; auto-resets on test finish. */
async function addTestImage(
  fileId: FileId,
  width: number,
  height: number,
  color: string,
): Promise<void> {
  const { addImage, $reset } = API.h.imageCache;
  const img = await createTestImage(width, height, color);
  addImage(fileId, img, "image/png");
  onTestFinished(() => $reset());
}

describe("image rendering", () => {
  it("renders cached image on canvas", async () => {
    const page = await CanvasPage.create();

    const fileId = "test-file-1" as FileId;
    await addTestImage(fileId, 400, 300, "#6c5ce7");

    const el = createElement("image", 150, 100, {
      width: 300,
      height: 225,
      fileId,
      status: "saved",
    });
    API.h.addElement(el);
    await page.scene.flush();

    expect(API.elements).toHaveLength(1);
    expect(API.elements[0]!.type).toBe("image");
  });
});
