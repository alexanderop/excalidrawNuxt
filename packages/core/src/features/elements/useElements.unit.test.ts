import { withDrawVue } from "../../__test-utils__/withDrawVue";
import { createTestElement } from "../../__test-utils__/factories/element";

describe("useElements", () => {
  it("starts with an empty array", () => {
    using ctx = withDrawVue(() => ({}));
    expect(ctx.drawVue.elements.elements.value).toEqual([]);
  });

  describe("addElement", () => {
    it("adds an element to the array", () => {
      using ctx = withDrawVue(() => ({}));
      const el = createTestElement();
      ctx.drawVue.elements.addElement(el);
      expect(ctx.drawVue.elements.elements.value).toHaveLength(1);
      expect(ctx.drawVue.elements.elements.value[0]).toBe(el);
    });

    it("creates a new array reference on each add", () => {
      using ctx = withDrawVue(() => ({}));
      const before = ctx.drawVue.elements.elements.value;
      ctx.drawVue.elements.addElement(createTestElement());
      expect(ctx.drawVue.elements.elements.value).not.toBe(before);
    });

    it("preserves existing elements when adding", () => {
      using ctx = withDrawVue(() => ({}));
      const first = createTestElement({ versionNonce: 1 });
      const second = createTestElement({ versionNonce: 2 });
      ctx.drawVue.elements.addElement(first);
      ctx.drawVue.elements.addElement(second);
      expect(ctx.drawVue.elements.elements.value).toHaveLength(2);
      expect(ctx.drawVue.elements.elements.value[0]).toBe(first);
      expect(ctx.drawVue.elements.elements.value[1]).toBe(second);
    });
  });

  describe("replaceElements", () => {
    it("replaces all elements", () => {
      using ctx = withDrawVue(() => ({}));
      ctx.drawVue.elements.addElement(createTestElement({ versionNonce: 1 }));
      ctx.drawVue.elements.addElement(createTestElement({ versionNonce: 2 }));

      const replacement = [createTestElement({ versionNonce: 99 })];
      ctx.drawVue.elements.replaceElements(replacement);

      expect(ctx.drawVue.elements.elements.value).toHaveLength(1);
      expect(ctx.drawVue.elements.elements.value.at(0)?.versionNonce).toBe(99);
    });

    it("can replace with an empty array", () => {
      using ctx = withDrawVue(() => ({}));
      ctx.drawVue.elements.addElement(createTestElement());
      ctx.drawVue.elements.replaceElements([]);
      expect(ctx.drawVue.elements.elements.value).toEqual([]);
    });

    it("creates a new array reference", () => {
      using ctx = withDrawVue(() => ({}));
      const before = ctx.drawVue.elements.elements.value;
      ctx.drawVue.elements.replaceElements([createTestElement()]);
      expect(ctx.drawVue.elements.elements.value).not.toBe(before);
    });
  });
});
