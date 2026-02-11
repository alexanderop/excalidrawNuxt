import { shallowRef } from "vue";
import { createGlobalState } from "@vueuse/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { HighlighterCore } from "shiki/core";
import type { Theme } from "~/features/theme/types";
import type { CodeLanguage } from "./types";

export interface TokenInfo {
  content: string;
  color: string;
}

const MAX_CACHE_ENTRIES = 100;

function getShikiTheme(theme: Theme): string {
  return theme === "dark" ? "vitesse-dark" : "vitesse-light";
}

export const useShikiHighlighter = createGlobalState(() => {
  const ready = shallowRef(false);
  let highlighter: HighlighterCore | null = null;
  const tokenCache = new Map<string, TokenInfo[][]>();

  async function init(): Promise<void> {
    if (highlighter) return;

    highlighter = await createHighlighterCore({
      themes: [import("shiki/themes/vitesse-dark.mjs"), import("shiki/themes/vitesse-light.mjs")],
      langs: [import("shiki/langs/typescript.mjs"), import("shiki/langs/vue.mjs")],
      engine: createJavaScriptRegexEngine(),
    });

    ready.value = true;
  }

  // Fire-and-forget init on first use
  init();

  function highlight(code: string, language: CodeLanguage, theme: Theme): TokenInfo[][] {
    if (!highlighter) return [];

    const cacheKey = `${code}:${language}:${theme}`;
    const cached = tokenCache.get(cacheKey);
    if (cached) return cached;

    const shikiTheme = getShikiTheme(theme);
    const result = highlighter.codeToTokens(code, {
      lang: language,
      theme: shikiTheme,
    });

    const tokens: TokenInfo[][] = result.tokens.map((line) =>
      line.map((token) => ({
        content: token.content,
        color: token.color ?? "#cdd6f4",
      })),
    );

    // Evict oldest entries if cache is full
    if (tokenCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = tokenCache.keys().next().value;
      if (firstKey !== undefined) tokenCache.delete(firstKey);
    }

    tokenCache.set(cacheKey, tokens);
    return tokens;
  }

  function tokensToHtml(tokens: TokenInfo[][]): string {
    if (tokens.length === 0) return "";

    return tokens
      .map((line) =>
        line.map((t) => `<span style="color:${t.color}">${escapeHtml(t.content)}</span>`).join(""),
      )
      .join("\n");
  }

  return { ready, highlight, tokensToHtml };
});

function escapeHtml(str: string): string {
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
