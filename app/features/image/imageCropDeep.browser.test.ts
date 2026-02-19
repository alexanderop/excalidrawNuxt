import { commands, userEvent } from "vitest/browser";
import { CanvasPage, API, waitForPaint, addTestImage } from "~/__test-utils__/browser";
import { createElement, toFileId } from "@drawvue/core";

const SEL = '[data-testid="interactive-canvas"]';

const NATURAL_W = 400;
const NATURAL_H = 200;
const FILE_ID_1 = toFileId("crop-deep-file-1");
const FILE_ID_2 = toFileId("crop-deep-file-2");

async function setupImageElement(
  page: Awaited<ReturnType<typeof CanvasPage.create>>,
  fileId = FILE_ID_1,
  color = "#6c5ce7",
) {
  await addTestImage(fileId, NATURAL_W, NATURAL_H, color);

  const el = createElement("image", 150, 100, {
    width: 200,
    height: 100,
    fileId,
    status: "saved",
  });
  API.h.addElement(el);
  API.setSelectedElements([el]);
  await page.scene.flush();

  return el;
}

describe("image crop deep", () => {
  it("crop sets crop property and modifies dimensions", async () => {
    const page = await CanvasPage.create();
    const el = await setupImageElement(page);

    const initialWidth = el.width;
    const initialHeight = el.height;

    // Enter crop mode
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await commands.canvasDblClick(SEL, cx, cy);
    await waitForPaint();
    expect(API.h.croppingElementId.value).toBe(el.id);

    // Drag SE handle inward
    const seX = el.x + el.width;
    const seY = el.y + el.height;
    await page.canvas.pointer.drag(seX, seY, seX - 50, seY - 25, { steps: 5 });
    await waitForPaint();

    // Crop should be set and dimensions reduced
    expect(el.width).toBeLessThan(initialWidth);
    expect(el.height).toBeLessThan(initialHeight);
    expect(el.crop).not.toBeNull();

    // Exit crop mode
    await userEvent.keyboard("{Escape}");
    await waitForPaint();
    expect(API.h.croppingElementId.value).toBeNull();
  });

  it("redo after undo-crop restores cropped state", async () => {
    const page = await CanvasPage.create();
    const el = await setupImageElement(page);

    // Enter crop mode and crop
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await commands.canvasDblClick(SEL, cx, cy);
    await waitForPaint();

    const seX = el.x + el.width;
    const seY = el.y + el.height;
    await page.canvas.pointer.drag(seX, seY, seX - 50, seY - 25, { steps: 5 });
    await waitForPaint();

    const croppedWidth = el.width;

    // Exit crop mode
    await userEvent.keyboard("{Escape}");
    await waitForPaint();

    // Undo
    await userEvent.keyboard("{Control>}z{/Control}");
    await waitForPaint();

    // Redo
    await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    await waitForPaint();

    expect(el.width).toBeCloseTo(croppedWidth, 0);
  });

  it("two images coexist independently", async () => {
    const page = await CanvasPage.create();

    await addTestImage(FILE_ID_1, NATURAL_W, NATURAL_H, "#6c5ce7");
    await addTestImage(FILE_ID_2, NATURAL_W, NATURAL_H, "#e74c3c");

    const el1 = createElement("image", 100, 100, {
      width: 200,
      height: 100,
      fileId: FILE_ID_1,
      status: "saved",
    });
    const el2 = createElement("image", 400, 100, {
      width: 200,
      height: 100,
      fileId: FILE_ID_2,
      status: "saved",
    });
    API.h.addElement(el1);
    API.h.addElement(el2);
    await page.scene.flush();

    expect(API.elements).toHaveLength(2);
    expect(API.elements[0]!.type).toBe("image");
    expect(API.elements[1]!.type).toBe("image");

    // Different fileIds
    const img1 = API.elements[0] as ReturnType<typeof createElement<"image">>;
    const img2 = API.elements[1] as ReturnType<typeof createElement<"image">>;
    expect(img1.fileId).not.toBe(img2.fileId);
  });

  it("deleting one image preserves the other", async () => {
    const page = await CanvasPage.create();

    await addTestImage(FILE_ID_1, NATURAL_W, NATURAL_H, "#6c5ce7");
    await addTestImage(FILE_ID_2, NATURAL_W, NATURAL_H, "#e74c3c");

    const el1 = createElement("image", 100, 100, {
      width: 200,
      height: 100,
      fileId: FILE_ID_1,
      status: "saved",
    });
    const el2 = createElement("image", 400, 100, {
      width: 200,
      height: 100,
      fileId: FILE_ID_2,
      status: "saved",
    });
    API.h.addElement(el1);
    API.h.addElement(el2);
    await page.scene.flush();

    // Select and delete first image
    API.setSelectedElements([el1]);
    await userEvent.keyboard("{Delete}");
    await waitForPaint();

    const nonDeleted = API.elements.filter((e) => !e.isDeleted);
    expect(nonDeleted).toHaveLength(1);
    expect(nonDeleted[0]!.id).toBe(el2.id);
  });

  it("undo delete restores image", async () => {
    const page = await CanvasPage.create();
    const el = await setupImageElement(page);
    const fileId = el.fileId;

    // Delete
    await userEvent.keyboard("{Delete}");
    await waitForPaint();

    const nonDeletedAfterDel = API.elements.filter((e) => !e.isDeleted);
    expect(nonDeletedAfterDel).toHaveLength(0);

    // Undo
    await userEvent.keyboard("{Control>}z{/Control}");
    await waitForPaint();

    const nonDeletedAfterUndo = API.elements.filter((e) => !e.isDeleted);
    expect(nonDeletedAfterUndo).toHaveLength(1);
    expect(nonDeletedAfterUndo[0]!.type).toBe("image");

    const restoredImg = nonDeletedAfterUndo[0] as ReturnType<typeof createElement<"image">>;
    expect(restoredImg.fileId).toBe(fileId);
  });

  it("clicking image selects it", async () => {
    const page = await CanvasPage.create();
    const el = await setupImageElement(page);

    // Clear selection
    API.clearSelection();
    expect(API.getSelectedElements()).toHaveLength(0);

    // Click at image center
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    await page.canvas.pointer.clickAt(cx, cy);
    await waitForPaint();

    const selected = API.getSelectedElements();
    expect(selected).toHaveLength(1);
    expect(selected[0]!.id).toBe(el.id);
  });
});
