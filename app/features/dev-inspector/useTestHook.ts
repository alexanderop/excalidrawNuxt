/**
 * Type-safe accessor for the global `__h` test hook.
 *
 * `globalThis.__h` is set by `DrawVueTestHarness` during browser tests.
 * The dev inspector reads it to display live canvas state. The double
 * assertion is unavoidable here (`globalThis` has no index signature),
 * but this single accessor eliminates 3 violations across Vue files.
 */

type HookRecord = Record<string, Record<string, unknown>>;

export function useTestHook(): HookRecord | undefined {
  // eslint-disable-next-line no-restricted-syntax -- globalThis has no index signature; single crossing point for __h access
  return (globalThis as unknown as { __h?: HookRecord }).__h;
}
