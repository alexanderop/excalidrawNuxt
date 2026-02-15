import { onTestFinished } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { CanvasPage, API, waitForPaint } from "~/__test-utils__/browser";
import { createElement } from "@drawvue/core";
import type { FileId, ExcalidrawImageElement } from "@drawvue/core";

const SEL = '[data-testid="interactive-canvas"]';

/** Create a solid-colored test image as an HTMLImageElement. */
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

/** Natural dimensions of the test image (twice the element size). */
const NATURAL_W = 400;
const NATURAL_H = 200;
const FILE_ID = "crop-test-file" as FileId;

/** Create an image element, add to scene, select it, and return it. */
async function setupImageElement(page: Awaited<ReturnType<typeof CanvasPage.create>>) {
  await addTestImage(FILE_ID, NATURAL_W, NATURAL_H, "#6c5ce7");

  const el = createElement("image", 150, 100, {
    width: 200,
    height: 100,
    fileId: FILE_ID,
    status: "saved",
  });
  API.h.addElement(el);
  API.setSelectedElements([el]);
  await page.scene.flush();

  return el as ExcalidrawImageElement;
}

describe("image crop — enter/exit crop mode", () => {
  it("enters crop mode on double-click of selected image", async () => {
    const page = await CanvasPage.create();
    const el = await setupImageElement(page);

    expect(API.h.croppingElementId.value).toBeNull();

    // Double-click the image center
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await commands.canvasDblClick(SEL, cx, cy);
    await waitForPaint();

    expect(API.h.croppingElementId.value).toBe(el.id);
  });

  it("exits crop mode on Escape", async () => {
    const page = await CanvasPage.create();
    const el = await setupImageElement(page);

    // Enter crop mode
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await commands.canvasDblClick(SEL, cx, cy);
    await waitForPaint();
    expect(API.h.croppingElementId.value).toBe(el.id);

    // Exit via Escape
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    expect(API.h.croppingElementId.value).toBeNull();
  });

  it("exits crop mode on Enter (confirm)", async () => {
    const page = await CanvasPage.create();
    const el = await setupImageElement(page);

    // Enter crop mode
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await commands.canvasDblClick(SEL, cx, cy);
    await waitForPaint();
    expect(API.h.croppingElementId.value).toBe(el.id);

    // Confirm via Enter
    await userEvent.keyboard("{Enter}");
    await waitForPaint();

    expect(API.h.croppingElementId.value).toBeNull();
  });

  it("exits crop mode when clicking outside the image", async () => {
    const page = await CanvasPage.create();
    const el = await setupImageElement(page);

    // Enter crop mode
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await commands.canvasDblClick(SEL, cx, cy);
    await waitForPaint();
    expect(API.h.croppingElementId.value).toBe(el.id);

    // Click far outside the element
    await page.canvas.pointer.clickAt(10, 10);
    await waitForPaint();

    expect(API.h.croppingElementId.value).toBeNull();
  });
});

describe("image crop — drag handles", () => {
  it("dragging SE corner handle reduces element dimensions", async () => {
    const page = await CanvasPage.create();
    const el = await setupImageElement(page);

    const initialWidth = el.width;
    const initialHeight = el.height;

    // Enter crop mode via double-click
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await commands.canvasDblClick(SEL, cx, cy);
    await waitForPaint();
    expect(API.h.croppingElementId.value).toBe(el.id);

    // Drag the SE corner handle inward (toward center)
    const seX = el.x + el.width;
    const seY = el.y + el.height;
    await page.canvas.pointer.drag(seX, seY, seX - 50, seY - 25, { steps: 5 });
    await waitForPaint();

    expect(el.width).toBeLessThan(initialWidth);
    expect(el.height).toBeLessThan(initialHeight);
    expect(el.crop).not.toBeNull();
  });

  it("dragging NW corner handle reduces element dimensions", async () => {
    const page = await CanvasPage.create();
    const el = await setupImageElement(page);

    const initialWidth = el.width;
    const initialHeight = el.height;

    // Enter crop mode
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await commands.canvasDblClick(SEL, cx, cy);
    await waitForPaint();

    // Drag NW corner inward
    const nwX = el.x;
    const nwY = el.y;
    await page.canvas.pointer.drag(nwX, nwY, nwX + 50, nwY + 25, { steps: 5 });
    await waitForPaint();

    expect(el.width).toBeLessThan(initialWidth);
    expect(el.height).toBeLessThan(initialHeight);
    expect(el.crop).not.toBeNull();
  });
});

describe("image crop — tool switch exits crop", () => {
  it("switching tools auto-confirms crop mode", async () => {
    const page = await CanvasPage.create();
    const el = await setupImageElement(page);

    // Enter crop mode
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await commands.canvasDblClick(SEL, cx, cy);
    await waitForPaint();
    expect(API.h.croppingElementId.value).toBe(el.id);

    // Switch to rectangle tool
    await page.toolbar.select("rectangle");
    await waitForPaint();

    expect(API.h.croppingElementId.value).toBeNull();
  });
});
