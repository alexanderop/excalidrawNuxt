import type { Theme } from "../theme/types";

/** Render strategy for the embed iframe. */
export type EmbedRenderType = "src" | "srcdoc";

/** Data required to render an embed iframe. */
export type EmbedData = {
  /** The URL to set as iframe `src` (or the base URL for srcdoc embeds). */
  url: string;
  /** Preferred initial dimensions. */
  intrinsicSize: { w: number; h: number };
  /** Whether to use `src` or `srcdoc` for the iframe. */
  renderType: EmbedRenderType;
  /** For srcdoc embeds: function returning HTML string, receives current theme. */
  srcdoc?: (theme: Theme) => string;
  /** Sandbox flags for the iframe. */
  sandbox: { allowSameOrigin: boolean };
  /** Display name of the provider (e.g. "YouTube", "Vimeo"). */
  providerName: string;
};

/** A single embeddable provider that can match and transform URLs. */
export type EmbedProvider = {
  /** Unique identifier (e.g. "youtube", "vimeo"). */
  readonly id: string;
  /** Display name (e.g. "YouTube", "Vimeo"). */
  readonly name: string;
  /** Returns true if this provider handles the given URL. */
  test(url: string): boolean;
  /** Transforms the URL into embed data, or null if invalid. */
  getEmbedData(url: string): EmbedData | null;
};
