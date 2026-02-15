import { shallowRef } from "vue";
import type { ToolType } from "../../tools/types";
import { withSetup } from "../../../__test-utils__/withSetup";
import { createEventHandlerMap } from "../../../__test-utils__/mocks/eventListenerMock";
import { createCanvasStub } from "../../../__test-utils__/mocks/canvasStub";
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
      // oxlint-disable-next-line unicorn/consistent-function-scoping -- minimal stub for node environment
      (globalThis as Record<string, unknown>).HTMLElement = function HTMLElement() {} as unknown;
    }
    if (globalThis.window === undefined) {
      (globalThis as Record<string, unknown>).window = {};
    }
  });

  // eslint-disable-next-line vitest/no-hooks -- shared handler map must be reset between tests
  beforeEach(() => {
    handlers.clear();
  });

  describe("panningCursor", () => {
    it("defaults to default for selection tool", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      expect(panning.panningCursor.value).toBe("default");
    });

    it("returns crosshair for drawing tools", () => {
      const setup = createPanningSetup();
      setup.activeTool.value = "rectangle";
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      expect(panning.panningCursor.value).toBe("crosshair");
    });

    it("returns grab for hand tool", () => {
      const setup = createPanningSetup();
      setup.activeTool.value = "hand";
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      expect(panning.panningCursor.value).toBe("grab");
    });

    it("returns grab when space is held", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("keydown", { key: " ", preventDefault: vi.fn() });

      expect(panning.spaceHeld.value).toBe(true);
      expect(panning.panningCursor.value).toBe("grab");
    });

    it("returns grabbing when panning", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("keydown", { key: " ", preventDefault: vi.fn() });
      eventMap.fire("pointerdown", { clientX: 100, clientY: 100, pointerId: 1 });

      expect(panning.isPanning.value).toBe(true);
      expect(panning.panningCursor.value).toBe("grabbing");
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

    it("clamps zoom delta to MAX_ZOOM_STEP", () => {
      const setup = createPanningSetup();
      using _panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("wheel", {
        deltaY: -500,
        ctrlKey: true,
        metaKey: false,
        offsetX: 50,
        offsetY: 60,
      });

      // MAX_ZOOM_STEP = 10, so clamped: sign(-500)*min(500,10) = -10, delta = 10*0.01 = 0.1
      expect(setup.zoomBy).toHaveBeenCalledWith(0.1, expect.anything());
    });

    it("shift+wheel scrolls horizontally using deltaY", () => {
      const setup = createPanningSetup();
      using _panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("wheel", {
        deltaX: 0,
        deltaY: 50,
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
      });

      expect(setup.panBy).toHaveBeenCalledWith(-50, 0);
    });

    it("shift+wheel falls back to deltaX when deltaY is 0 (macOS)", () => {
      const setup = createPanningSetup();
      using _panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("wheel", {
        deltaX: 30,
        deltaY: 0,
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
      });

      expect(setup.panBy).toHaveBeenCalledWith(-30, 0);
    });

    it("wheel events are suppressed during active pan", () => {
      const setup = createPanningSetup();
      using _panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      // Start panning via space+pointerdown
      eventMap.fire("keydown", { key: " ", preventDefault: vi.fn() });
      eventMap.fire("pointerdown", { clientX: 100, clientY: 100, pointerId: 1 });

      setup.panBy.mockClear();
      setup.zoomBy.mockClear();

      // Wheel during active pan should be ignored
      eventMap.fire("wheel", { deltaX: 10, deltaY: 20, ctrlKey: false, metaKey: false });

      expect(setup.panBy).not.toHaveBeenCalled();
      expect(setup.zoomBy).not.toHaveBeenCalled();
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

      eventMap.fire("pointerup", { clientX: 120, clientY: 130, pointerId: 1, button: 0 });
      expect(panning.isPanning.value).toBe(false);
    });

    it("pointer up with wrong button does not stop panning", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("keydown", { key: " ", preventDefault: vi.fn() });
      eventMap.fire("pointerdown", { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
      expect(panning.isPanning.value).toBe(true);

      // Release middle button — should not stop panning started by left button
      eventMap.fire("pointerup", { clientX: 120, clientY: 130, pointerId: 1, button: 1 });
      expect(panning.isPanning.value).toBe(true);
    });
  });

  describe("middle mouse button panning", () => {
    it("middle button press starts panning", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("pointerdown", { clientX: 200, clientY: 200, pointerId: 1, button: 1 });

      expect(panning.isPanning.value).toBe(true);
    });

    it("middle button drag calls panBy with correct deltas", () => {
      const setup = createPanningSetup();
      using _panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("pointerdown", { clientX: 200, clientY: 200, pointerId: 1, button: 1 });
      eventMap.fire("pointermove", { clientX: 250, clientY: 220, pointerId: 1 });

      expect(setup.panBy).toHaveBeenCalledWith(50, 20);
    });

    it("middle button release stops panning", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("pointerdown", { clientX: 200, clientY: 200, pointerId: 1, button: 1 });
      expect(panning.isPanning.value).toBe(true);

      eventMap.fire("pointerup", { clientX: 250, clientY: 220, pointerId: 1, button: 1 });
      expect(panning.isPanning.value).toBe(false);
    });

    it("middle button sets grabbing cursor immediately", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("pointerdown", { clientX: 200, clientY: 200, pointerId: 1, button: 1 });

      expect(panning.panningCursor.value).toBe("grabbing");
    });

    it("middle button works regardless of active tool", () => {
      const setup = createPanningSetup();
      setup.activeTool.value = "rectangle";
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("pointerdown", { clientX: 200, clientY: 200, pointerId: 1, button: 1 });

      expect(panning.isPanning.value).toBe(true);
    });

    it("right-click does not start panning", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("pointerdown", { clientX: 200, clientY: 200, pointerId: 1, button: 2 });

      expect(panning.isPanning.value).toBe(false);
    });
  });

  describe("window blur cleanup", () => {
    it("blur event resets isPanning", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("keydown", { key: " ", preventDefault: vi.fn() });
      eventMap.fire("pointerdown", { clientX: 100, clientY: 100, pointerId: 1 });
      expect(panning.isPanning.value).toBe(true);
      expect(panning.spaceHeld.value).toBe(true);

      eventMap.fire("blur", {});

      expect(panning.isPanning.value).toBe(false);
      expect(panning.spaceHeld.value).toBe(false);
    });

    it("blur event is no-op when not panning", () => {
      const setup = createPanningSetup();
      using panning = withSetup(() => usePanning(setup));
      eventMap = createEventHandlerMap(handlers);

      eventMap.fire("blur", {});

      expect(panning.isPanning.value).toBe(false);
      expect(panning.spaceHeld.value).toBe(false);
    });
  });
});
