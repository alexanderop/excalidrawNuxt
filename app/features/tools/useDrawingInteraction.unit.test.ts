import { shallowRef } from "vue";
import { withSetup } from "~/__test-utils__/withSetup";
import { createEventHandlerMap } from "~/__test-utils__/mocks/eventListenerMock";
import { createCanvasStub } from "~/__test-utils__/mocks/canvasStub";
import type { ExcalidrawElement } from "~/features/elements/types";
import { pointFrom } from "~/shared/math";
import type { GlobalPoint } from "~/shared/math";
import { useDrawingInteraction } from "./useDrawingInteraction";
import type { ToolType } from "./types";

type EventHandler = (...args: unknown[]) => void;
const { handlers, mockUseEventListener } = vi.hoisted(() => {
  const handlers = new Map<string, EventHandler[]>();
  const mockUseEventListener = (_target: unknown, event: string, handler: EventHandler): void => {
    const existing = handlers.get(event) ?? [];
    existing.push(handler);
    handlers.set(event, existing);
  };
  return { handlers, mockUseEventListener };
});
const { firePointer, clear } = createEventHandlerMap(handlers);

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return { ...actual, useEventListener: mockUseEventListener };
});

function createSetup() {
  const canvasRef = shallowRef<HTMLCanvasElement | null>(createCanvasStub());
  const activeTool = shallowRef<ToolType>("rectangle");
  const onElementCreated = vi.fn();
  const markNewElementDirty = vi.fn();
  const markStaticDirty = vi.fn();
  const markInteractiveDirty = vi.fn();

  return {
    canvasRef,
    activeTool,
    setTool: (tool: ToolType) => {
      activeTool.value = tool;
    },
    spaceHeld: shallowRef(false),
    isPanning: shallowRef(false),
    toScene: (x: number, y: number) => pointFrom<GlobalPoint>(x, y),
    onElementCreated,
    markNewElementDirty,
    markStaticDirty,
    markInteractiveDirty,
    elements: shallowRef<readonly ExcalidrawElement[]>([]),
    zoom: shallowRef(1),
    suggestedBindings: shallowRef<readonly ExcalidrawElement[]>([]),
  };
}

describe("useDrawingInteraction", () => {
  // eslint-disable-next-line vitest/no-hooks -- clearing shared event handler map between tests
  beforeEach(() => {
    clear();
  });

  it("clears new-element canvas after drawing completes (no ghost element)", () => {
    const opts = createSetup();

    using _ctx = withSetup(() => useDrawingInteraction(opts));

    // Draw: pointerdown -> pointermove -> pointerup
    firePointer("pointerdown", 100, 100);
    firePointer("pointermove", 200, 200);

    opts.markNewElementDirty.mockClear();

    firePointer("pointerup", 200, 200);

    // markNewElementDirty MUST be called on pointerup to clear the ghost
    expect(opts.markNewElementDirty).toHaveBeenCalled();
  });

  it("creates exactly one element after draw-then-release", () => {
    const opts = createSetup();

    using ctx = withSetup(() => useDrawingInteraction(opts));

    // Draw a rectangle
    firePointer("pointerdown", 50, 50);
    firePointer("pointermove", 150, 150);
    firePointer("pointerup", 150, 150);

    expect(opts.onElementCreated).toHaveBeenCalledTimes(1);

    const created = opts.onElementCreated.mock.calls[0]![0];
    expect(created.x).toBe(50);
    expect(created.y).toBe(50);
    expect(created.width).toBe(100);
    expect(created.height).toBe(100);

    // newElement should be null after drawing finishes
    expect(ctx.newElement.value).toBeNull();
  });

  it("switches to selection tool after drawing", () => {
    const opts = createSetup();

    using _ctx = withSetup(() => useDrawingInteraction(opts));

    expect(opts.activeTool.value).toBe("rectangle");

    firePointer("pointerdown", 10, 10);
    firePointer("pointermove", 110, 110);
    firePointer("pointerup", 110, 110);

    expect(opts.activeTool.value).toBe("selection");
  });
});
