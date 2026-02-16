/* v8 ignore start -- RAF animation loop; timing non-deterministic in headless browsers, implicitly exercised via flush() */
import { computed, onScopeDispose } from "vue";
import { useDocumentVisibility, whenever } from "@vueuse/core";

interface AnimationParams<S> {
  deltaTime: number;
  state: S | undefined;
}

type AnimationFn<S> = (params: AnimationParams<S>) => S | null;

export interface UseAnimationControllerOptions {
  markInteractiveDirty: () => void;
}

export interface UseAnimationControllerReturn {
  start: <S extends object>(key: string, animation: AnimationFn<S>) => void;
  cancel: (key: string) => void;
  running: (key: string) => boolean;
  getState: <S extends object>(key: string) => S | undefined;
}

interface AnimationEntry {
  /** Advances one frame. Returns true to keep running, false when complete. */
  tick: (deltaTime: number) => boolean;
  /** Read the current animation state (type-erased). */
  readState: () => object | undefined;
  lastTime: number;
}

export function useAnimationController(
  options: UseAnimationControllerOptions,
): UseAnimationControllerReturn {
  const { markInteractiveDirty } = options;
  const animations = new Map<string, AnimationEntry>();
  let rafId: number | null = null;
  const visibility = useDocumentVisibility();

  function tickAll(): void {
    rafId = null;

    if (visibility.value === "hidden") return;
    if (animations.size === 0) return;

    const now = performance.now();

    for (const [key, entry] of animations) {
      const deltaTime = now - entry.lastTime;
      entry.lastTime = now;

      if (!entry.tick(deltaTime)) {
        animations.delete(key);
      }
    }

    if (animations.size > 0) {
      markInteractiveDirty();
      scheduleTickLoop();
    }
  }

  function scheduleTickLoop(): void {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(tickAll);
  }

  function start<S extends object>(key: string, animation: AnimationFn<S>): void {
    animations.set(key, createEntry(animation));
    markInteractiveDirty();
    scheduleTickLoop();
  }

  function cancel(key: string): void {
    animations.delete(key);
  }

  function running(key: string): boolean {
    return animations.has(key);
  }

  // Callers know their own S — closure in createEntry<S> guarantees runtime correctness.
  function getState<S extends object>(key: string): S | undefined {
    const entry = animations.get(key);
    if (!entry) return undefined;
    return narrowState<S>(entry.readState());
  }

  // Resume animations when tab becomes visible again
  const isVisible = computed(() => visibility.value === "visible");
  whenever(isVisible, () => {
    if (animations.size === 0) return;

    // Reset lastTime so deltaTime doesn't include time spent hidden
    const now = performance.now();
    for (const entry of animations.values()) {
      entry.lastTime = now;
    }
    markInteractiveDirty();
    scheduleTickLoop();
  });

  onScopeDispose(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    animations.clear();
  });

  return { start, cancel, running, getState };
}

function createEntry<S extends object>(animation: AnimationFn<S>): AnimationEntry {
  let state: S | undefined;

  return {
    tick(deltaTime: number): boolean {
      const result = animation({ deltaTime, state });
      if (result === null) return false;
      state = result;
      return true;
    },
    readState: () => state,
    lastTime: performance.now(),
  };
}

/** Safe narrowing: closure-based state storage guarantees the runtime type matches S. */
function narrowState<S extends object>(value: object | undefined): S | undefined {
  return value as S | undefined;
}
