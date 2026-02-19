import { CanvasPage, API, addTestImage } from "~/__test-utils__/browser";
import { createElement, toFileId } from "@drawvue/core";

describe("image rendering", () => {
  it("renders cached image on canvas", async () => {
    const page = await CanvasPage.create();

    const fileId = toFileId("test-file-1");
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
