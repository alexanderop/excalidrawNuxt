import type { ExcalidrawElement } from "~/features/elements/types";
import type { Theme } from "~/features/theme/types";
import { getCodeData } from "./types";
import { useShikiHighlighter } from "./useShikiHighlighter";
import {
  CODE_FONT_SIZE,
  CODE_FONT_FAMILY,
  CODE_LINE_HEIGHT,
  CODE_CHAR_WIDTH,
  CODE_PADDING,
  CODE_BORDER_RADIUS,
  CODE_HEADER_DOT_RADIUS,
  CODE_HEADER_DOT_GAP,
  CODE_HEADER_DOT_LEFT,
  CODE_HEADER_DOT_Y,
  CODE_HEADER_DOT_COLORS,
  CODE_LANGUAGE_LABELS,
  CODE_THEME_COLORS,
} from "./constants";

export function renderCodeElement(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  theme: Theme,
): void {
  const { code, language } = getCodeData(element);
  const colors = CODE_THEME_COLORS[theme];
  const { x, y, width, height, opacity } = element;
  const lineHeightPx = CODE_FONT_SIZE * CODE_LINE_HEIGHT;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = opacity / 100;

  // 1. Background with rounded corners + clip
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, CODE_BORDER_RADIUS);
  ctx.fillStyle = colors.bg;
  ctx.fill();
  ctx.save();
  ctx.clip();

  // 2. Header bar
  ctx.fillStyle = colors.headerBg;
  ctx.fillRect(0, 0, width, CODE_PADDING.top);

  // Header dots (macOS traffic lights)
  for (const [i, dotColor] of CODE_HEADER_DOT_COLORS.entries()) {
    ctx.beginPath();
    const dotX = CODE_HEADER_DOT_LEFT + i * (CODE_HEADER_DOT_RADIUS * 2 + CODE_HEADER_DOT_GAP);
    ctx.arc(dotX, CODE_HEADER_DOT_Y, CODE_HEADER_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
  }

  // Language label (right-aligned in header)
  const langLabel = CODE_LANGUAGE_LABELS[language] ?? language;
  ctx.font = `12px ${CODE_FONT_FAMILY}`;
  ctx.fillStyle = colors.headerText;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(langLabel, width - 12, CODE_HEADER_DOT_Y);

  // If no code, restore and return early
  if (!code) {
    ctx.restore();
    ctx.restore();
    return;
  }

  const lines = code.split("\n");
  const { highlight, ready } = useShikiHighlighter();

  // 3. Line numbers
  ctx.font = `${CODE_FONT_SIZE}px ${CODE_FONT_FAMILY}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = colors.gutterText;
  for (let i = 0; i < lines.length; i++) {
    const y = CODE_PADDING.top + i * lineHeightPx;
    ctx.fillText(String(i + 1), CODE_PADDING.left - 12, y);
  }

  // 4. Syntax-highlighted tokens (or plain text fallback)
  ctx.textAlign = "left";

  if (!ready.value) {
    ctx.fillStyle = colors.defaultText;
    for (const [i, line] of lines.entries()) {
      const y = CODE_PADDING.top + i * lineHeightPx;
      ctx.fillText(line, CODE_PADDING.left, y);
    }
  }

  if (ready.value) {
    const tokens = highlight(code, language, theme);

    for (const [lineIdx, lineTokens] of tokens.entries()) {
      const y = CODE_PADDING.top + lineIdx * lineHeightPx;
      let x = CODE_PADDING.left;

      for (const token of lineTokens) {
        ctx.fillStyle = token.color;
        ctx.fillText(token.content, x, y);
        x += token.content.length * CODE_CHAR_WIDTH;
      }
    }
  }

  ctx.restore(); // clip
  ctx.restore(); // translate + alpha
}
