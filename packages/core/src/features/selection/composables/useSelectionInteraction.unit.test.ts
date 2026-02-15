import { shallowRef } from "vue";
import { withSetup } from "../../../__test-utils__/withSetup";
import { createEventHandlerMap } from "../../../__test-utils__/mocks/eventListenerMock";
import { createCanvasStub } from "../../../__test-utils__/mocks/canvasStub";
import { createTestElement } from "../../../__test-utils__/factories/element";
import type { ExcalidrawElement } from "../../elements/types";
import { pointFrom } from "../../../shared/math";
import type { GlobalPoint } from "../../../shared/math";
import type { ToolType } from "../../tools/types";
import { hitTest, getElementAtPosition } from "../hitTest";
import { getTransformHandleAtPosition } from "../transformHandles";
import { continueDrag } from "../dragElements";
import { resizeElement } from "../resizeElement";
import { useSelectionInteraction } from "./useSelectionInteraction";

type EventHandler = (...args: unknown[]) => void;

const { handlers, mockUseEventListener } = vi.hoisted(() => {
  const noop = () => ({});
  // Stub `document` so useEventListener(document, ...) doesn't throw in node
  if (globalThis.document === undefined) {
    const stubElement = {
      style: {},
      setAttribute: noop,
      getAttribute: noop,
      addEventListener: noop,
      removeEventListener: noop,
    };
    (globalThis as Record<string, unknown>).document = {
      createElement: () => ({ ...stubElement }),
      createElementNS: () => ({ ...stubElement }),
      createTextNode: () => ({ ...stubElement }),
      createComment: () => ({ ...stubElement }),
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: noop,
      removeEventListener: noop,
      documentElement: { ...stubElement },
      body: { ...stubElement },
      head: { ...stubElement },
    };
  }
  const handlers = new Map<string, EventHandler[]>();
  const mockUseEventListener = (_target: unknown, event: string, handler: EventHandler): void => {
    const existing = handlers.get(event) ?? [];
    existing.push(handler);
    handlers.set(event, existing);
  };
  return { handlers, mockUseEventListener };
});

const { firePointer, fire, clear } = createEventHandlerMap(handlers);

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return { ...actual, useEventListener: mockUseEventListener };
});

vi.mock("../hitTest", () => ({
  hitTest: vi.fn(() => false),
  getElementAtPosition: vi.fn(() => null),
}));

vi.mock("../transformHandles", () => ({
  getTransformHandleAtPosition: vi.fn(() => null),
}));

vi.mock("../dragElements", () => ({
  startDrag: vi.fn(() => ({ origin: [0, 0], originalPositions: new Map() })),
  continueDrag: vi.fn(),
}));

vi.mock("../resizeElement", () => ({
  resizeElement: vi.fn(),
}));

vi.mock("../bounds", () => ({
  getElementBounds: vi.fn(() => [0, 0, 100, 100]),
}));

vi.mock("../../binding", () => ({
  updateBoundArrowEndpoints: vi.fn(),
  unbindArrow: vi.fn(),
  unbindAllArrowsFromShape: vi.fn(),
  deleteBoundTextForContainer: vi.fn(),
}));

const mockedGetElementAtPosition = getElementAtPosition as ReturnType<typeof vi.fn>;
const mockedGetTransformHandleAtPosition = getTransformHandleAtPosition as ReturnType<typeof vi.fn>;
const mockedContinueDrag = continueDrag as unknown as ReturnType<typeof vi.fn>;
const mockedResizeElement = resizeElement as unknown as ReturnType<typeof vi.fn>;
const mockedHitTest = hitTest as unknown as ReturnType<typeof vi.fn>;

function createSelectionSetup() {
  const canvasRef = shallowRef<HTMLCanvasElement | null>(createCanvasStub());
  const activeTool = shallowRef<ToolType>("selection");
  const spaceHeld = shallowRef(false);
  const isPanning = shallowRef(false);
  const zoom = shallowRef(1);
  const elements = shallowRef<readonly ExcalidrawElement[]>([]);
  const selectedIdSet = shallowRef<ReadonlySet<string>>(new Set());
  const selectFn = vi.fn((id: string) => {
    selectedIdSet.value = new Set([id]);
  });
  const toggleSelectionFn = vi.fn();
  const clearSelectionFn = vi.fn(() => {
    selectedIdSet.value = new Set();
  });
  const replaceSelectionFn = vi.fn((ids: Set<string>) => {
    selectedIdSet.value = ids;
  });
  const selectAllFn = vi.fn();
  const isSelectedFn = vi.fn((id: string) => selectedIdSet.value.has(id));
  const markStaticDirty = vi.fn();
  const markInteractiveDirty = vi.fn();
  const setTool = vi.fn();

  return {
    canvasRef,
    activeTool,
    spaceHeld,
    isPanning,
    zoom,
    elements,
    toScene: (x: number, y: number) => pointFrom<GlobalPoint>(x, y),
    selectedElements: () => elements.value.filter((el) => selectedIdSet.value.has(el.id)),
    select: selectFn,
    toggleSelection: toggleSelectionFn,
    clearSelection: clearSelectionFn,
    replaceSelection: replaceSelectionFn,
    selectAll: selectAllFn,
    isSelected: isSelectedFn,
    markStaticDirty,
    markInteractiveDirty,
    setTool,
    // expose for assertions:
    selectFn,
    clearSelectionFn,
    replaceSelectionFn,
    selectAllFn,
    toggleSelectionFn,
    isSelectedFn,
    selectedIdSet,
  };
}

function fireKeydown(overrides: Record<string, unknown> = {}): void {
  fire("keydown", {
    key: "Delete",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    target: { tagName: "CANVAS" },
    preventDefault: vi.fn(),
    ...overrides,
  });
}

describe("useSelectionInteraction", () => {
  // eslint-disable-next-line vitest/no-hooks -- shared handler map must be reset between tests
  beforeEach(() => {
    clear();
    vi.restoreAllMocks();
    // Re-apply default mock implementations after restore
    mockedHitTest.mockReturnValue(false);
    mockedGetElementAtPosition.mockReturnValue(null);
    mockedGetTransformHandleAtPosition.mockReturnValue(null);
  });

  describe("basics", () => {
    it("returns selectionBox and cursorStyle refs", () => {
      const opts = createSelectionSetup();
      using ctx = withSetup(() => useSelectionInteraction(opts));
      expect(ctx.selectionBox).toBeDefined();
      expect(ctx.cursorStyle).toBeDefined();
    });

    it("selectionBox starts as null", () => {
      const opts = createSelectionSetup();
      using ctx = withSetup(() => useSelectionInteraction(opts));
      expect(ctx.selectionBox.value).toBeNull();
    });

    it("cursorStyle defaults to default", () => {
      const opts = createSelectionSetup();
      using ctx = withSetup(() => useSelectionInteraction(opts));
      expect(ctx.cursorStyle.value).toBe("default");
    });
  });

  describe("space-held guard", () => {
    it("pointerdown does nothing when spaceHeld is true", () => {
      const opts = createSelectionSetup();
      opts.spaceHeld.value = true;

      using _ctx = withSetup(() => useSelectionInteraction(opts));

      firePointer("pointerdown", 50, 50);

      expect(opts.clearSelectionFn).not.toHaveBeenCalled();
      expect(opts.selectFn).not.toHaveBeenCalled();
      expect(opts.markInteractiveDirty).not.toHaveBeenCalled();
    });
  });

  describe("box selection", () => {
    it("pointerdown on empty space starts box selection", () => {
      const opts = createSelectionSetup();

      using ctx = withSetup(() => useSelectionInteraction(opts));

      firePointer("pointerdown", 10, 10);

      // clearSelection is called when clicking empty space
      expect(opts.clearSelectionFn).toHaveBeenCalled();

      // Move to create a box
      firePointer("pointermove", 100, 100);

      expect(ctx.selectionBox.value).not.toBeNull();
    });

    it("pointermove during box select updates selectionBox", () => {
      const opts = createSelectionSetup();

      using ctx = withSetup(() => useSelectionInteraction(opts));

      firePointer("pointerdown", 10, 10);
      firePointer("pointermove", 50, 50);

      expect(ctx.selectionBox.value).toEqual({
        x: 10,
        y: 10,
        width: 40,
        height: 40,
      });

      firePointer("pointermove", 80, 80);

      expect(ctx.selectionBox.value).toEqual({
        x: 10,
        y: 10,
        width: 70,
        height: 70,
      });
    });

    it("pointerup ends box selection", () => {
      const opts = createSelectionSetup();

      using ctx = withSetup(() => useSelectionInteraction(opts));

      firePointer("pointerdown", 10, 10);
      firePointer("pointermove", 100, 100);

      expect(ctx.selectionBox.value).not.toBeNull();

      firePointer("pointerup", 100, 100);

      expect(ctx.selectionBox.value).toBeNull();
    });
  });

  describe("element drag", () => {
    it("pointerdown on element selects it", () => {
      const el = createTestElement({ id: "el-1", x: 50, y: 50, width: 100, height: 100 });
      mockedGetElementAtPosition.mockReturnValue(el);

      const opts = createSelectionSetup();
      opts.elements.value = [el];

      using _ctx = withSetup(() => useSelectionInteraction(opts));

      firePointer("pointerdown", 75, 75);

      expect(opts.selectFn).toHaveBeenCalledWith("el-1");
    });

    it("pointermove during drag calls continueDrag", () => {
      const el = createTestElement({ id: "el-1", x: 50, y: 50, width: 100, height: 100 });
      mockedGetElementAtPosition.mockReturnValue(el);

      const opts = createSelectionSetup();
      opts.elements.value = [el];
      opts.selectedIdSet.value = new Set(["el-1"]);

      using _ctx = withSetup(() => useSelectionInteraction(opts));

      firePointer("pointerdown", 75, 75);
      firePointer("pointermove", 100, 100);

      expect(mockedContinueDrag).toHaveBeenCalled();
    });
  });

  describe("resize", () => {
    it("pointerdown with transform handle starts resize", () => {
      const el = createTestElement({ id: "el-1", x: 0, y: 0, width: 100, height: 100 });
      mockedGetTransformHandleAtPosition.mockReturnValue("se");

      const opts = createSelectionSetup();
      opts.elements.value = [el];
      opts.selectedIdSet.value = new Set(["el-1"]);

      using _ctx = withSetup(() => useSelectionInteraction(opts));

      firePointer("pointerdown", 100, 100);
      firePointer("pointermove", 120, 120);

      expect(mockedResizeElement).toHaveBeenCalled();
    });
  });

  describe("keyboard - Delete", () => {
    it("Delete key marks selected elements as deleted", () => {
      const el = createTestElement({ id: "del-1", x: 0, y: 0, width: 50, height: 50 });
      const opts = createSelectionSetup();
      opts.elements.value = [el];
      opts.selectedIdSet.value = new Set(["del-1"]);

      using _ctx = withSetup(() => useSelectionInteraction(opts));

      fireKeydown({ key: "Delete" });

      expect(el.isDeleted).toBe(true);
      expect(opts.clearSelectionFn).toHaveBeenCalled();
    });
  });

  describe("keyboard - Escape", () => {
    it("Escape key clears selection and sets tool to selection", () => {
      const opts = createSelectionSetup();

      using _ctx = withSetup(() => useSelectionInteraction(opts));

      fireKeydown({ key: "Escape" });

      expect(opts.clearSelectionFn).toHaveBeenCalled();
      expect(opts.setTool).toHaveBeenCalledWith("selection");
    });
  });

  describe("keyboard - Ctrl+A", () => {
    it("Ctrl+A calls selectAll", () => {
      const opts = createSelectionSetup();

      using _ctx = withSetup(() => useSelectionInteraction(opts));

      fireKeydown({ key: "a", ctrlKey: true });

      expect(opts.selectAllFn).toHaveBeenCalled();
    });
  });

  describe("keyboard - Arrow keys", () => {
    it("ArrowRight moves selected elements by 1px", () => {
      const el = createTestElement({ id: "arr-1", x: 10, y: 20, width: 50, height: 50 });
      const opts = createSelectionSetup();
      opts.elements.value = [el];
      opts.selectedIdSet.value = new Set(["arr-1"]);

      using _ctx = withSetup(() => useSelectionInteraction(opts));

      fireKeydown({ key: "ArrowRight" });

      expect(el.x).toBe(11);
      expect(el.y).toBe(20);
    });

    it("Shift+ArrowRight moves selected elements by 10px", () => {
      const el = createTestElement({ id: "arr-2", x: 10, y: 20, width: 50, height: 50 });
      const opts = createSelectionSetup();
      opts.elements.value = [el];
      opts.selectedIdSet.value = new Set(["arr-2"]);

      using _ctx = withSetup(() => useSelectionInteraction(opts));

      fireKeydown({ key: "ArrowRight", shiftKey: true });

      expect(el.x).toBe(20);
      expect(el.y).toBe(20);
    });
  });

  describe("tool guard", () => {
    it("does nothing when activeTool is not selection", () => {
      const opts = createSelectionSetup();
      opts.activeTool.value = "rectangle";

      using _ctx = withSetup(() => useSelectionInteraction(opts));

      firePointer("pointerdown", 50, 50);

      expect(opts.clearSelectionFn).not.toHaveBeenCalled();
      expect(opts.selectFn).not.toHaveBeenCalled();
      expect(opts.markInteractiveDirty).not.toHaveBeenCalled();
    });
  });

  describe("shift-click", () => {
    it("Shift+click calls toggleSelection", () => {
      const el = createTestElement({ id: "shift-1", x: 0, y: 0, width: 100, height: 100 });
      mockedGetElementAtPosition.mockReturnValue(el);

      const opts = createSelectionSetup();
      opts.elements.value = [el];

      using _ctx = withSetup(() => useSelectionInteraction(opts));

      firePointer("pointerdown", 50, 50, { shiftKey: true });

      expect(opts.toggleSelectionFn).toHaveBeenCalledWith("shift-1");
    });
  });

  describe("cursor", () => {
    it("cursor updates to move when hovering over selected element", () => {
      mockedHitTest.mockReturnValue(true);

      const el = createTestElement({ id: "cur-1", x: 0, y: 0, width: 100, height: 100 });
      const opts = createSelectionSetup();
      opts.elements.value = [el];
      opts.selectedIdSet.value = new Set(["cur-1"]);

      using ctx = withSetup(() => useSelectionInteraction(opts));

      // idle pointermove triggers cursor update
      firePointer("pointermove", 50, 50);

      expect(ctx.cursorStyle.value).toBe("move");
    });
  });
});
