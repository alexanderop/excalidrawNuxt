import type { ExcalidrawElement, ExcalidrawRectangleElement } from "~/features/elements/types";
import type { ToolType } from "~/features/tools/types";
import { API } from "../api";
import { waitForPaint } from "../waiters";

export class ScenePO {
  addElement(overrides?: Partial<ExcalidrawRectangleElement>): ExcalidrawElement {
    return API.addElement(overrides);
  }

  addElements(...overrides: Array<Partial<ExcalidrawRectangleElement>>): ExcalidrawElement[] {
    return overrides.map((o) => API.addElement(o));
  }

  /** Mark static layer dirty and wait for paint — encapsulates the rendering flush. */
  async flush(): Promise<void> {
    API.h.markStaticDirty();
    await waitForPaint();
  }

  get elements(): readonly ExcalidrawElement[] {
    return API.elements;
  }

  getElement(id: string): ExcalidrawElement {
    const el = API.getElementByID(id);
    if (!el) throw new Error(`Element "${id}" not found`);
    return el;
  }

  expectElementCount(n: number): void {
    expect(API.elements).toHaveLength(n);
  }

  expectElementType(index: number, type: string): void {
    expect(API.elements[index]!.type).toBe(type);
  }

  get activeTool(): ToolType {
    return API.activeTool;
  }
}
