/**
 * Stub for Nuxt's `#imports` virtual module in unit tests.
 *
 * `defineShortcuts` uses `useEventListener` from `@vueuse/core` under the hood,
 * so tests that mock `useEventListener` will capture shortcut handlers automatically.
 */
import { useEventListener } from "@vueuse/core";

type Handler = (e?: unknown) => void;

interface ShortcutConfig {
  handler: Handler;
  usingInput?: string | boolean;
  whenever?: unknown[];
}

type ShortcutsConfig = Record<string, ShortcutConfig | Handler | false | null | undefined>;

interface ParsedShortcut {
  key: string;
  meta: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.toLowerCase().split("_");
  const key = parts.pop()!;
  return {
    key,
    meta: parts.includes("meta"),
    ctrl: parts.includes("ctrl"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
  };
}

function matchesEvent(parsed: ParsedShortcut, e: KeyboardEvent): boolean {
  if (e.key.toLowerCase() !== parsed.key) return false;

  const hasMeta = !!(e.metaKey || e.ctrlKey);
  if (parsed.meta !== hasMeta) return false;
  if (parsed.shift !== !!e.shiftKey) return false;
  // Note: real defineShortcuts doesn't check altKey (known bug)
  return true;
}

export function defineShortcuts(config: ShortcutsConfig): void {
  if (typeof document === "undefined") return;

  useEventListener(document, "keydown", (e: KeyboardEvent) => {
    for (const [shortcut, value] of Object.entries(config)) {
      if (!value) continue;
      const handler = typeof value === "function" ? value : value.handler;
      const parsed = parseShortcut(shortcut);
      if (matchesEvent(parsed, e)) {
        handler(e);
        return;
      }
    }
  });
}

export function extractShortcuts(): Record<string, () => void> {
  return {};
}
