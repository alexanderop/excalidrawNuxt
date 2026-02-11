export const COLOR_PALETTE = {
  transparent: "transparent",
  black: "#1e1e1e",
  white: "#ffffff",

  // [shade0=lightest, shade1, shade2, shade3, shade4=darkest]
  red: ["#ffc9c9", "#ffa8a8", "#ff8787", "#ff6b6b", "#fa5252"],
  pink: ["#eebefa", "#e599f7", "#da77f2", "#cc5de8", "#be4bdb"],
  grape: ["#d0bfff", "#b197fc", "#9775fa", "#845ef7", "#7950f2"],
  violet: ["#b4d0fe", "#91a7ff", "#748ffc", "#5c7cfa", "#4c6ef5"],
  blue: ["#a5d8ff", "#74c0fc", "#4dabf7", "#339af0", "#228be6"],
  cyan: ["#99e9f2", "#66d9e8", "#3bc9db", "#22b8cf", "#15aabf"],
  teal: ["#96f2d7", "#63e6be", "#38d9a9", "#20c997", "#12b886"],
  green: ["#b2f2bb", "#8ce99a", "#69db7c", "#51cf66", "#40c057"],
  yellow: ["#ffec99", "#ffe066", "#ffd43b", "#fcc419", "#fab005"],
  orange: ["#ffd8a8", "#ffc078", "#ffa94d", "#ff922b", "#fd7e14"],
} as const;

export const COLOR_NAMES = [
  "red",
  "pink",
  "grape",
  "violet",
  "blue",
  "cyan",
  "teal",
  "green",
  "yellow",
  "orange",
] as const;

export type ColorName = (typeof COLOR_NAMES)[number];

/** All palette hue colors flattened into a single array (50 colors, row-major: shade0 of each hue, then shade1, etc.) */
export function getAllPaletteColors(): string[] {
  const colors: string[] = [];
  for (let shade = 0; shade < 5; shade++) {
    for (const name of COLOR_NAMES) {
      colors.push(COLOR_PALETTE[name][shade as 0 | 1 | 2 | 3 | 4]);
    }
  }
  return colors;
}

/** Top picks: transparent, black, white, then midtone (shade2) of each hue */
export function getTopPickColors(): string[] {
  return [
    COLOR_PALETTE.transparent,
    COLOR_PALETTE.black,
    COLOR_PALETTE.white,
    ...COLOR_NAMES.map((name) => COLOR_PALETTE[name][2]),
  ];
}

/** Check if a color exists in the standard palette */
export function isStandardColor(color: string): boolean {
  if (
    color === COLOR_PALETTE.transparent ||
    color === COLOR_PALETTE.black ||
    color === COLOR_PALETTE.white
  ) {
    return true;
  }
  const lower = color.toLowerCase();
  for (const name of COLOR_NAMES) {
    for (const shade of COLOR_PALETTE[name]) {
      if (shade.toLowerCase() === lower) return true;
    }
  }
  return false;
}
