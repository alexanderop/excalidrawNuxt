export const PROTOCOL_RE = /^[a-z][\d+.a-z-]*:/i;

export function normalizeLink(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (PROTOCOL_RE.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
