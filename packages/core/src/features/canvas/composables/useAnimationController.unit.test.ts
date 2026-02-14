import { ref, watch } from "vue";
import type { WatchSource } from "vue";
import { withSetup } from "../../../__test-utils__/withSetup";
import { useAnimationController } from "./useAnimationController";

const visibilityRef = ref<DocumentVisibilityState>("visible");

vi.mock("@vueuse/core", () => ({
  useDocumentVisibility: () => visibilityRef,
  whenever: (source: WatchSource<unknown>, cb: () => void) => {
    watch(source, (v) => {
      if (v) cb();
    });
  },
}));

describe("useAnimationController", () => {
  let markInteractiveDirty: () => void;
  let rafCallbacks: (() => void)[];
  let originalRaf: typeof requestAnimationFrame;
  let originalCaf: typeof cancelAnimationFrame;
  let nowValue: number;

  // eslint-disable-next-line vitest/no-hooks -- shared RAF mock must be reset between tests
  beforeEach(() => {
    markInteractiveDirty = vi.fn<() => void>();
    visibilityRef.value = "visible";
    rafCallbacks = [];
    nowValue = 1000;

    vi.spyOn(performance, "now").mockImplementation(() => nowValue);

    originalRaf = globalThis.requestAnimationFrame;
    originalCaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafCallbacks.push(() => cb(nowValue));
      return rafCallbacks.length;
    }) as unknown as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = vi.fn();
  });

  // eslint-disable-next-line vitest/no-hooks -- shared RAF mock must be restored between tests
  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCaf;
    vi.restoreAllMocks();
  });

  function flushRaf(): void {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    for (const cb of cbs) cb();
  }

  function createController() {
    return withSetup(() => useAnimationController({ markInteractiveDirty }));
  }

  describe("start", () => {
    it("schedules an animation and marks interactive dirty", () => {
      using ctrl = createController();
      ctrl.start("test", () => ({ value: 1 }));

      expect(markInteractiveDirty).toHaveBeenCalledOnce();
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it("sets running to true for started animation", () => {
      using ctrl = createController();
      ctrl.start("test", () => ({ value: 1 }));

      expect(ctrl.running("test")).toBe(true);
    });

    it("returns false for non-existent animation", () => {
      using ctrl = createController();

      expect(ctrl.running("nonexistent")).toBe(false);
    });
  });

  describe("tick", () => {
    it("passes deltaTime and state to animation function", () => {
      using ctrl = createController();
      const animFn = vi.fn(() => ({ count: 1 }));

      ctrl.start("test", animFn);
      nowValue = 1016; // 16ms elapsed
      flushRaf();

      expect(animFn).toHaveBeenCalledWith({
        deltaTime: 16,
        state: undefined,
      });
    });

    it("passes previous state on subsequent ticks", () => {
      using ctrl = createController();
      const animFn = vi.fn(({ state }: { state: { count: number } | undefined }) => {
        return { count: (state?.count ?? 0) + 1 };
      });

      ctrl.start("test", animFn);
      nowValue = 1016;
      flushRaf();

      nowValue = 1032;
      flushRaf();

      expect(animFn).toHaveBeenCalledTimes(2);
      expect(animFn).toHaveBeenLastCalledWith({
        deltaTime: 16,
        state: { count: 1 },
      });
    });

    it("removes animation when function returns null", () => {
      using ctrl = createController();
      ctrl.start("test", () => null);

      nowValue = 1016;
      flushRaf();

      expect(ctrl.running("test")).toBe(false);
    });

    it("marks interactive dirty after each tick", () => {
      using ctrl = createController();
      ctrl.start("test", () => ({ value: 1 }));
      vi.mocked(markInteractiveDirty).mockClear();

      nowValue = 1016;
      flushRaf();

      expect(markInteractiveDirty).toHaveBeenCalled();
    });

    it("does not schedule another RAF when all animations complete", () => {
      using ctrl = createController();
      ctrl.start("test", () => null);

      nowValue = 1016;
      flushRaf();

      expect(rafCallbacks).toHaveLength(0);
      expect(vi.mocked(requestAnimationFrame)).toHaveBeenCalledTimes(1);
    });
  });

  describe("getState", () => {
    it("returns undefined before first tick", () => {
      using ctrl = createController();
      ctrl.start("test", () => ({ value: 42 }));

      expect(ctrl.getState("test")).toBeUndefined();
    });

    it("returns current state after tick", () => {
      using ctrl = createController();
      ctrl.start("test", () => ({ value: 42 }));

      nowValue = 1016;
      flushRaf();

      expect(ctrl.getState<{ value: number }>("test")).toEqual({ value: 42 });
    });

    it("returns undefined for non-existent animation", () => {
      using ctrl = createController();

      expect(ctrl.getState("nonexistent")).toBeUndefined();
    });
  });

  describe("cancel", () => {
    it("removes a running animation", () => {
      using ctrl = createController();
      ctrl.start("test", () => ({ value: 1 }));
      ctrl.cancel("test");

      expect(ctrl.running("test")).toBe(false);
    });

    it("does not error when canceling non-existent animation", () => {
      using ctrl = createController();
      expect(() => ctrl.cancel("nonexistent")).not.toThrow();
    });
  });

  describe("visibility", () => {
    it("skips tick execution when tab is hidden", () => {
      visibilityRef.value = "hidden";
      using ctrl = createController();
      ctrl.start("test", () => ({ value: 1 }));

      flushRaf();

      expect(ctrl.running("test")).toBe(true);
      expect(ctrl.getState("test")).toBeUndefined();
    });
  });

  describe("multiple animations", () => {
    it("ticks all animations in a single frame", () => {
      using ctrl = createController();
      const fn1 = vi.fn(() => ({ a: 1 }));
      const fn2 = vi.fn(() => ({ b: 2 }));

      ctrl.start("anim1", fn1);
      ctrl.start("anim2", fn2);

      nowValue = 1016;
      flushRaf();

      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
    });

    it("removes only completed animations", () => {
      using ctrl = createController();
      let tickCount = 0;
      ctrl.start("stays", () => ({ v: 1 }));
      ctrl.start("leaves", () => {
        tickCount++;
        return tickCount === 1 ? { v: 2 } : null;
      });

      nowValue = 1016;
      flushRaf();

      expect(ctrl.running("stays")).toBe(true);
      expect(ctrl.running("leaves")).toBe(true);

      nowValue = 1032;
      flushRaf();

      expect(ctrl.running("stays")).toBe(true);
      expect(ctrl.running("leaves")).toBe(false);
    });
  });
});
