import type { EmbedProvider, EmbedData } from "../types";

const RE_VIMEO =
  /^(?:https?:\/\/)?(?:w{3}\.)?(?:player\.)?vimeo\.com\/(?:video\/)?([^\s?]+)(?:\?.*)?$/;

export const vimeoProvider: EmbedProvider = {
  id: "vimeo",
  name: "Vimeo",

  test(url: string): boolean {
    return RE_VIMEO.test(url);
  },

  getEmbedData(url: string): EmbedData | null {
    const match = url.match(RE_VIMEO);
    if (!match?.[1]) return null;

    const target = match[1];
    if (!/^\d+$/.test(target)) return null;

    return {
      url: `https://player.vimeo.com/video/${target}?api=1`,
      intrinsicSize: { w: 560, h: 315 },
      renderType: "src",
      sandbox: { allowSameOrigin: true },
      providerName: "Vimeo",
    };
  },
};
