/**
 * Pure VueUse replacement for Nuxt's `defineShortcuts`.
 *
 * Uses `useEventListener` from `@vueuse/core` to bind keyboard shortcuts
 * with the same API surface as `defineShortcuts` from `#imports`.
 *
 * Shortcut format: modifier keys separated by `_`, e.g. "meta_k", "alt_shift_d", "escape".
 * Modifiers: meta, ctrl, shift, alt. The last segment is the key name.
 */
import { useEventListener } from "@vueuse/core";

type Handler = (e: KeyboardEvent) => void;

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

function isInputElement(el: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined") return false;
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function matchesEvent(parsed: ParsedShortcut, e: KeyboardEvent): boolean {
  if (e.key.toLowerCase() !== parsed.key) return false;

  const expectsMeta = parsed.meta || parsed.ctrl;
  const hasMeta = !!(e.metaKey || e.ctrlKey);
  if (expectsMeta !== hasMeta) return false;
  if (parsed.shift !== !!e.shiftKey) return false;
  if (parsed.alt !== !!e.altKey) return false;
  return true;
}

export function useKeyboardShortcuts(config: ShortcutsConfig): void {
  if (typeof document === "undefined") return;

  useEventListener(document, "keydown", (e: KeyboardEvent) => {
    for (const [shortcut, value] of Object.entries(config)) {
      if (!value) continue;

      const handler = typeof value === "function" ? value : value.handler;
      const usingInput = typeof value === "object" ? value.usingInput : undefined;

      // Skip if focused on an input element and usingInput is not enabled
      if (!usingInput && isInputElement(e.target)) continue;

      const parsed = parseShortcut(shortcut);
      if (matchesEvent(parsed, e)) {
        handler(e);
        return;
      }
    }
  });
}
