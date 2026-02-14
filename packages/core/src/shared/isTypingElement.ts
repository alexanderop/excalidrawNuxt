/**
 * Returns true if the given element is a text input or textarea,
 * meaning the user is likely typing and keyboard shortcuts should be suppressed.
 */
export function isTypingElement(el: Element | null | undefined): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA";
}
