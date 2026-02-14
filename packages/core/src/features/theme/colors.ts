import tinycolor from "tinycolor2";
import type { Theme } from "./types";

// Browser-only cache (null on server to avoid memory leaks)
const DARK_MODE_COLORS_CACHE: Map<string, string> | null =
  globalThis.window === undefined ? null : new Map();

interface RGB {
  r: number;
  g: number;
  b: number;
}

function cssInvert(r: number, g: number, b: number, percent: number): RGB {
  const factor = percent / 100;
  return {
    r: r * (1 - factor) + (255 - r) * factor,
    g: g * (1 - factor) + (255 - g) * factor,
    b: b * (1 - factor) + (255 - b) * factor,
  };
}

function cssHueRotate(r: number, g: number, b: number, degrees: number): RGB {
  const a = (degrees * Math.PI) / 180;
  const cosA = Math.cos(a);
  const sinA = Math.sin(a);

  const m = [
    0.213 + cosA * 0.787 - sinA * 0.213,
    0.715 - cosA * 0.715 - sinA * 0.715,
    0.072 - cosA * 0.072 + sinA * 0.928,
    0.213 - cosA * 0.213 + sinA * 0.143,
    0.715 + cosA * 0.285 + sinA * 0.14,
    0.072 - cosA * 0.072 - sinA * 0.283,
    0.213 - cosA * 0.213 - sinA * 0.787,
    0.715 - cosA * 0.715 + sinA * 0.715,
    0.072 + cosA * 0.928 + sinA * 0.072,
  ];

  return {
    r: Math.round(Math.min(255, Math.max(0, r * m[0]! + g * m[1]! + b * m[2]!))),
    g: Math.round(Math.min(255, Math.max(0, r * m[3]! + g * m[4]! + b * m[5]!))),
    b: Math.round(Math.min(255, Math.max(0, r * m[6]! + g * m[7]! + b * m[8]!))),
  };
}

function rgbToHex(r: number, g: number, b: number, alpha?: number): string {
  const hex = `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
  if (alpha !== undefined && alpha < 1) {
    const alphaHex = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0");
    return `${hex}${alphaHex}`;
  }
  return hex;
}

/**
 * Resolve a color for the given theme: pass through in light mode,
 * apply the dark-mode invert+hue-rotate filter in dark mode.
 */
export function resolveColor(color: string, theme: Theme): string {
  if (theme === "light") return color;
  return applyDarkModeFilter(color);
}

export function applyDarkModeFilter(color: string): string {
  const cached = DARK_MODE_COLORS_CACHE?.get(color);
  if (cached) return cached;

  const tc = tinycolor(color);
  const alpha = tc.getAlpha();
  const rgb = tc.toRgb();

  const inverted = cssInvert(rgb.r, rgb.g, rgb.b, 93);
  const rotated = cssHueRotate(inverted.r, inverted.g, inverted.b, 180);
  const result = rgbToHex(rotated.r, rotated.g, rotated.b, alpha);

  DARK_MODE_COLORS_CACHE?.set(color, result);

  return result;
}
