import { ref, shallowRef } from "vue";
import type { Ref, ShallowRef } from "vue";
import { withSetup } from "../../../__test-utils__/withSetup";
import { useRenderer } from "./useRenderer";

let rafCallback: FrameRequestCallback | null = null;
const cancelAnimationFrameMock = vi.fn();

function stubRaf() {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafCallback = cb;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrameMock);
}

stubRaf();

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useDevicePixelRatio: () => ({ pixelRatio: ref(2) }),
    useDocumentVisibility: () => ref("visible"),
  };
});

interface MockCanvasLayer {
  ctx: ShallowRef<CanvasRenderingContext2D | null>;
  canvas: Ref<HTMLCanvasElement | null>;
}

function createMockCanvas(): HTMLCanvasElement {
  return {
    width: 800,
    height: 600,
    style: { width: "800px", height: "600px" },
    getContext: () => ({
      setTransform: vi.fn(),
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: "",
    }),
  } as unknown as HTMLCanvasElement;
}

function createMockLayer(): MockCanvasLayer {
  const canvas = createMockCanvas();
  const ctx = canvas.getContext!("2d") as unknown as CanvasRenderingContext2D;
  return {
    ctx: shallowRef(ctx),
    canvas: ref(canvas) as Ref<HTMLCanvasElement | null>,
  };
}

function createRendererOptions(overrides: Record<string, unknown> = {}) {
  const staticLayer = createMockLayer();
  const newElementLayer = createMockLayer();
  const interactiveLayer = createMockLayer();

  return {
    staticLayer,
    newElementLayer,
    interactiveLayer,
    width: ref(800),
    height: ref(600),
    scrollX: ref(0),
    scrollY: ref(0),
    zoom: ref(1),
    bgColor: ref("#ffffff"),
    onRenderStatic: vi.fn(),
    onRenderNewElement: vi.fn(),
    onRenderInteractive: vi.fn(),
    ...overrides,
  };
}

/**
 * Flush the pending RAF and reset state so dirty flags are clean.
 * The composable starts with staticDirty=true but does NOT auto-schedule,
 * so we explicitly mark + flush to get a known clean state.
 */
function flushInitialRender(renderer: { markAllDirty: () => void }) {
  renderer.markAllDirty();
  if (rafCallback) {
    rafCallback(0);
    rafCallback = null;
  }
}

describe("useRenderer", () => {
  // eslint-disable-next-line vitest/no-hooks -- reset mocks between tests
  beforeEach(() => {
    rafCallback = null;
    cancelAnimationFrameMock.mockClear();
    stubRaf();
  });

  it("markStaticDirty schedules a render via requestAnimationFrame", () => {
    const options = createRendererOptions();
    using renderer = withSetup(() => useRenderer(options));

    flushInitialRender(renderer);

    renderer.markStaticDirty();
    expect(rafCallback).not.toBeNull();
  });

  it("markInteractiveDirty schedules a render", () => {
    const options = createRendererOptions();
    using renderer = withSetup(() => useRenderer(options));

    flushInitialRender(renderer);

    renderer.markInteractiveDirty();
    expect(rafCallback).not.toBeNull();
  });

  it("multiple markDirty calls only schedule one RAF (dedup)", () => {
    let rafCallCount = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallCount++;
      rafCallback = cb;
      return 1;
    });

    const options = createRendererOptions();
    using renderer = withSetup(() => useRenderer(options));

    flushInitialRender(renderer);
    const baseline = rafCallCount;

    renderer.markStaticDirty();
    renderer.markInteractiveDirty();
    renderer.markNewElementDirty();

    // Only one additional RAF should be scheduled despite 3 markDirty calls
    expect(rafCallCount - baseline).toBe(1);
  });

  it("RAF callback renders dirty layers (onRenderStatic called)", () => {
    const options = createRendererOptions();
    using renderer = withSetup(() => useRenderer(options));

    // Explicitly mark static dirty and trigger a render
    renderer.markStaticDirty();
    expect(rafCallback).not.toBeNull();
    rafCallback!(0);

    expect(options.onRenderStatic).toHaveBeenCalledTimes(1);
  });

  it("RAF callback skips clean layers (onRenderInteractive NOT called when not dirty)", () => {
    const options = createRendererOptions();
    using renderer = withSetup(() => useRenderer(options));

    // Only mark static dirty (not interactive)
    flushInitialRender(renderer);
    options.onRenderStatic.mockClear();
    options.onRenderInteractive.mockClear();

    renderer.markStaticDirty();
    expect(rafCallback).not.toBeNull();
    rafCallback!(0);

    expect(options.onRenderStatic).toHaveBeenCalledTimes(1);
    // interactiveDirty was not set, so onRenderInteractive should not be called
    expect(options.onRenderInteractive).not.toHaveBeenCalled();
  });

  it("markAllDirty marks all 3 layers", () => {
    const options = createRendererOptions();
    using renderer = withSetup(() => useRenderer(options));

    flushInitialRender(renderer);
    options.onRenderStatic.mockClear();
    options.onRenderNewElement.mockClear();
    options.onRenderInteractive.mockClear();

    renderer.markAllDirty();
    expect(rafCallback).not.toBeNull();
    rafCallback!(0);

    expect(options.onRenderStatic).toHaveBeenCalledTimes(1);
    expect(options.onRenderNewElement).toHaveBeenCalledTimes(1);
    expect(options.onRenderInteractive).toHaveBeenCalledTimes(1);
  });

  it("layer-specific render: only the dirty layer callback fires", () => {
    const options = createRendererOptions();
    using renderer = withSetup(() => useRenderer(options));

    flushInitialRender(renderer);
    options.onRenderStatic.mockClear();
    options.onRenderNewElement.mockClear();
    options.onRenderInteractive.mockClear();

    renderer.markInteractiveDirty();
    expect(rafCallback).not.toBeNull();
    rafCallback!(0);

    expect(options.onRenderStatic).not.toHaveBeenCalled();
    expect(options.onRenderNewElement).not.toHaveBeenCalled();
    expect(options.onRenderInteractive).toHaveBeenCalledTimes(1);
  });

  it("disposal cancels pending RAF", () => {
    const options = createRendererOptions();
    const { [Symbol.dispose]: dispose, ...renderer } = withSetup(() => useRenderer(options));

    // Schedule a render so there's a pending RAF
    renderer.markStaticDirty();
    expect(rafCallback).not.toBeNull();

    // Dispose should call cancelAnimationFrame
    dispose();
    expect(cancelAnimationFrameMock).toHaveBeenCalled();
  });
});
