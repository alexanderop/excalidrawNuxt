import { shallowRef } from "vue";
import type { ToolType } from "~/features/tools/types";
import { withSetup } from "~/__test-utils__/withSetup";
import { createEventHandlerMap } from "~/__test-utils__/mocks/eventListenerMock";
import { createCanvasStub } from "~/__test-utils__/mocks/canvasStub";
import { usePanning } from "./usePanning";

type EventHandler = (...args: unknown[]) => void;

const { handlers, mockUseEventListener, mockOnKeyStroke } = vi.hoisted(() => {
  const handlers = new Map<string, EventHandler[]>();
  const mockUseEventListener = (
    _target: unknown,
    event: string,
    handler: EventHandler,
    _opts?: unknown,
  ): void => {
    const existing = handlers.get(event) ?? [];
    existing.push(handler);
    handlers.set(event, existing);
  };
  const mockOnKeyStroke = (
    key: string | string[],
    handler: EventHandler,
    options?: { eventName?: string; target?: unknown; dedupe?: boolean },
  ): void => {
    const eventName = options?.eventName ?? "keydown";
    const keys = Array.isArray(key) ? key : [key];
    const wrappedHandler: EventHandler = (...args: unknown[]) => {
      const e = args[0] as { key?: string };
      if (e.key && keys.includes(e.key)) handler(...args);
    };
    mockUseEventListener(null, eventName, wrappedHandler);
  };
  return { handlers, mockUseEventListener, mockOnKeyStroke };
});

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return { ...actual, useEventListener: mockUseEventListener, onKeyStroke: mockOnKeyStroke };
});

function createPanningSetup() {
  const canvasRef = shallowRef<HTMLCanvasElement | null>(createCanvasStub());
  const panBy = vi.fn();
  const zoomBy = vi.fn();
  const activeTool = shallowRef<ToolType>("selection");
  return { canvasRef, panBy, zoomBy, activeTool };
}

describe("usePanning", () => {
  let eventMap: ReturnType<typeof createEventHandlerMap>;

  beforeAll(() => {
    if (globalThis.document === undefined) {
      (globalThis as Record<string, unknown>).document = {};
    }
    if (globalThis.HTMLElement === undefined) {
      // oxlint-ignore no-extraneous-class -- minimal stub for node environment
      (globalThis as Record<string, unknown>).HTMLElement = class {};
    }
  });

  // eslint-disable-next-line vitest/no-hooks -- shared handler map must be reset between tests
  beforeEach(() => {
    handlers.clear();
  });

  describe("cursorClass", () => {
    it("defaults to cursor-default for selection tool", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      expect(panning.cursorClass.value).toBe("cursor-default");
    });

    it("returns cursor-crosshair for drawing tools", () => {
      const setup = createPanningSetup();
      setup.activeTool.value = "rectangle";
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      expect(panning.cursorClass.value).toBe("cursor-crosshair");
    });

    it("returns cursor-grab for hand tool", () => {
      const setup = createPanningSetup();
      setup.activeTool.value = "hand";
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      expect(panning.cursorClass.value).toBe("cursor-grab");
    });

    it("returns cursor-grab when space is held", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("keydown", { key: " ", preventDefault: vi.fn() });

      expect(panning.spaceHeld.value).toBe(true);
      expect(panning.cursorClass.value).toBe("cursor-grab");
    });

    it("returns cursor-grabbing when panning", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("keydown", { key: " ", preventDefault: vi.fn() });
      eventMap.fire("pointerdown", { clientX: 100, clientY: 100, pointerId: 1 });

      expect(panning.isPanning.value).toBe(true);
      expect(panning.cursorClass.value).toBe("cursor-grabbing");
    });
  });

  describe("wheel events", () => {
    it("wheel event without ctrl calls panBy", () => {
      const setup = createPanningSetup();
      using _panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("wheel", { deltaX: 10, deltaY: 20, ctrlKey: false, metaKey: false });

      expect(setup.panBy).toHaveBeenCalledWith(-10, -20);
      expect(setup.zoomBy).not.toHaveBeenCalled();
    });

    it("wheel event with ctrl calls zoomBy", () => {
      const setup = createPanningSetup();
      using _panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("wheel", {
        deltaY: -100,
        ctrlKey: true,
        metaKey: false,
        offsetX: 50,
        offsetY: 60,
      });

      expect(setup.zoomBy).toHaveBeenCalled();
      expect(setup.panBy).not.toHaveBeenCalled();
    });
  });

  describe("space key", () => {
    it("space keydown sets spaceHeld to true", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("keydown", { key: " ", preventDefault: vi.fn() });

      expect(panning.spaceHeld.value).toBe(true);
    });

    it("space keyup sets spaceHeld to false and isPanning to false", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("keydown", { key: " ", preventDefault: vi.fn() });
      eventMap.fire("keyup", { key: " " });

      expect(panning.spaceHeld.value).toBe(false);
      expect(panning.isPanning.value).toBe(false);
    });
  });

  describe("pointer panning", () => {
    it("pointer drag while space held triggers panning", () => {
      const setup = createPanningSetup();
      using _panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("keydown", { key: " ", preventDefault: vi.fn() });
      eventMap.fire("pointerdown", { clientX: 100, clientY: 100, pointerId: 1 });
      eventMap.fire("pointermove", { clientX: 120, clientY: 130, pointerId: 1 });

      expect(setup.panBy).toHaveBeenCalledWith(20, 30);
    });

    it("pointer up stops panning", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("keydown", { key: " ", preventDefault: vi.fn() });
      eventMap.fire("pointerdown", { clientX: 100, clientY: 100, pointerId: 1 });
      expect(panning.isPanning.value).toBe(true);

      eventMap.fire("pointerup", { clientX: 120, clientY: 130, pointerId: 1 });
      expect(panning.isPanning.value).toBe(false);
    });
  });
});
