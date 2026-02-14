import { shallowRef } from "vue";
import { describe, it, expect } from "vitest";
import { withSetup } from "../../__test-utils__/withSetup";
import { createEventHandlerMap } from "../../__test-utils__/mocks/eventListenerMock";
import { createCanvasStub } from "../../__test-utils__/mocks/canvasStub";
import type { ExcalidrawElement } from "../elements/types";
import { pointFrom } from "../../shared/math";
import type { GlobalPoint } from "../../shared/math";
import { useFreeDrawInteraction } from "./useFreeDrawInteraction";
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
const { firePointer: _firePointer, fire, clear } = createEventHandlerMap(handlers);

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return { ...actual, useEventListener: mockUseEventListener };
});

vi.mock("@excalidraw/element", () => ({
  getBoundsFromPoints: vi.fn((points: number[][]) => {
    if (!points || points.length === 0) return [0, 0, 0, 0];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of points) {
      if (x! < minX) minX = x!;
      if (y! < minY) minY = y!;
      if (x! > maxX) maxX = x!;
      if (y! > maxY) maxY = y!;
    }
    return [minX, minY, maxX, maxY];
  }),
}));

function createSetup() {
  const canvasRef = shallowRef<HTMLCanvasElement | null>(createCanvasStub());
  const activeTool = shallowRef<ToolType>("freedraw");
  const onElementCreated = vi.fn();
  const markNewElementDirty = vi.fn();
  const markStaticDirty = vi.fn();
  const onInteractionStart = vi.fn();
  const onInteractionEnd = vi.fn();

  return {
    canvasRef,
    activeTool,
    spaceHeld: shallowRef(false),
    isPanning: shallowRef(false),
    toScene: (x: number, y: number) => pointFrom<GlobalPoint>(x, y),
    onElementCreated,
    markNewElementDirty,
    markStaticDirty,
    getStyleOverrides: () => ({}),
    onInteractionStart,
    onInteractionEnd,
  };
}

describe("useFreeDrawInteraction", () => {
  // eslint-disable-next-line vitest/no-hooks -- clearing shared event handler map between tests
  beforeEach(() => {
    clear();
  });

  it("creates freedraw element on pointerdown", () => {
    const opts = createSetup();

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 100, offsetY: 100, button: 0, pressure: 0 });

    expect(ctx.newFreeDrawElement.value).not.toBeNull();
    expect(ctx.newFreeDrawElement.value!.type).toBe("freedraw");
  });

  it("ignores pointerdown when tool is not freedraw", () => {
    const opts = createSetup();
    opts.activeTool.value = "rectangle";

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 100, offsetY: 100, button: 0, pressure: 0 });

    expect(ctx.newFreeDrawElement.value).toBeNull();
  });

  it("ignores pointerdown when space is held", () => {
    const opts = createSetup();
    opts.spaceHeld.value = true;

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 100, offsetY: 100, button: 0, pressure: 0 });

    expect(ctx.newFreeDrawElement.value).toBeNull();
  });

  it("ignores pointerdown when panning", () => {
    const opts = createSetup();
    opts.isPanning.value = true;

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 100, offsetY: 100, button: 0, pressure: 0 });

    expect(ctx.newFreeDrawElement.value).toBeNull();
  });

  it("ignores non-primary button", () => {
    const opts = createSetup();

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 100, offsetY: 100, button: 2, pressure: 0 });

    expect(ctx.newFreeDrawElement.value).toBeNull();
  });

  it("accumulates points on pointermove", () => {
    const opts = createSetup();

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 10, offsetY: 10, button: 0, pressure: 0 });
    fire("pointermove", { offsetX: 20, offsetY: 20, pressure: 0 });
    fire("pointermove", { offsetX: 30, offsetY: 30, pressure: 0 });

    // Initial point + 2 moves = 3 points
    expect(ctx.newFreeDrawElement.value!.points).toHaveLength(3);
  });

  it("skips duplicate points on pointermove", () => {
    const opts = createSetup();

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 10, offsetY: 10, button: 0, pressure: 0 });
    fire("pointermove", { offsetX: 20, offsetY: 20, pressure: 0 });
    // Same delta as previous move (duplicate)
    fire("pointermove", { offsetX: 20, offsetY: 20, pressure: 0 });

    // Initial point + 1 unique move = 2 points (duplicate skipped)
    expect(ctx.newFreeDrawElement.value!.points).toHaveLength(2);
  });

  it("calls markNewElementDirty on pointermove", () => {
    const opts = createSetup();

    using _ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 10, offsetY: 10, button: 0, pressure: 0 });
    opts.markNewElementDirty.mockClear();

    fire("pointermove", { offsetX: 20, offsetY: 20, pressure: 0 });

    expect(opts.markNewElementDirty).toHaveBeenCalled();
  });

  it("detects real pressure (simulatePressure = false when pressure is not 0 or 0.5)", () => {
    const opts = createSetup();

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 10, offsetY: 10, button: 0, pressure: 0.8 });

    expect(ctx.newFreeDrawElement.value!.simulatePressure).toBe(false);
  });

  it("simulates pressure when pressure is 0", () => {
    const opts = createSetup();

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 10, offsetY: 10, button: 0, pressure: 0 });

    expect(ctx.newFreeDrawElement.value!.simulatePressure).toBe(true);
  });

  it("simulates pressure when pressure is 0.5", () => {
    const opts = createSetup();

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 10, offsetY: 10, button: 0, pressure: 0.5 });

    expect(ctx.newFreeDrawElement.value!.simulatePressure).toBe(true);
  });

  it("finalizes element on pointerup", () => {
    const opts = createSetup();

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 10, offsetY: 10, button: 0, pressure: 0 });
    fire("pointermove", { offsetX: 50, offsetY: 50, pressure: 0 });
    fire("pointerup", { offsetX: 50, offsetY: 50 });

    expect(ctx.newFreeDrawElement.value).toBeNull();
  });

  it("calls onElementCreated on pointerup", () => {
    const opts = createSetup();

    using _ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 10, offsetY: 10, button: 0, pressure: 0 });
    fire("pointermove", { offsetX: 50, offsetY: 50, pressure: 0 });
    fire("pointerup", { offsetX: 50, offsetY: 50 });

    expect(opts.onElementCreated).toHaveBeenCalledTimes(1);
    expect(opts.onElementCreated.mock.calls[0]![0].type).toBe("freedraw");
  });

  it("handles single-point click by nudging point", () => {
    const opts = createSetup();

    using _ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 10, offsetY: 10, button: 0, pressure: 0 });
    // No pointermove — single point click
    fire("pointerup", { offsetX: 10, offsetY: 10 });

    const created = opts.onElementCreated.mock.calls[0]![0] as ExcalidrawElement & {
      points: number[][];
    };
    // After nudge, should have 2 points
    expect(created.points).toHaveLength(2);
  });

  it("computes bounds on finalize", () => {
    const opts = createSetup();

    using _ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 10, offsetY: 10, button: 0, pressure: 0 });
    fire("pointermove", { offsetX: 50, offsetY: 60, pressure: 0 });
    fire("pointerup", { offsetX: 50, offsetY: 60 });

    const created = opts.onElementCreated.mock.calls[0]![0];
    // width/height should be set from bounds
    expect(typeof created.width).toBe("number");
    expect(typeof created.height).toBe("number");
  });

  it("finalizeFreeDrawIfActive finalizes active element", () => {
    const opts = createSetup();

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    fire("pointerdown", { offsetX: 10, offsetY: 10, button: 0, pressure: 0 });
    fire("pointermove", { offsetX: 50, offsetY: 50, pressure: 0 });

    ctx.finalizeFreeDrawIfActive();

    expect(ctx.newFreeDrawElement.value).toBeNull();
    expect(opts.onElementCreated).toHaveBeenCalledTimes(1);
  });

  it("finalizeFreeDrawIfActive is a no-op when no active element", () => {
    const opts = createSetup();

    using ctx = withSetup(() => useFreeDrawInteraction(opts));

    ctx.finalizeFreeDrawIfActive();

    expect(opts.onElementCreated).not.toHaveBeenCalled();
  });
});
