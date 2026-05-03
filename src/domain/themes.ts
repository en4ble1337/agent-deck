export type BoardThemeId = "default" | "graphite" | "midnight" | "ember";

export type BoardTheme = {
  id: BoardThemeId;
  name: string;
  swatches: readonly [string, string, string];
};

export const DEFAULT_BOARD_THEME_ID: BoardThemeId = "default";

export const BOARD_THEMES = [
  {
    id: "default",
    name: "Default",
    swatches: ["#101310", "#1e241f", "#48d597"],
  },
  {
    id: "graphite",
    name: "Graphite",
    swatches: ["#090a0b", "#1d2023", "#f6f8fa"],
  },
  {
    id: "midnight",
    name: "Midnight",
    swatches: ["#08111e", "#132236", "#38bdf8"],
  },
  {
    id: "ember",
    name: "Ember",
    swatches: ["#15100d", "#2a1c16", "#f59e0b"],
  },
] as const satisfies readonly BoardTheme[];

export function isBoardThemeId(value: string | null): value is BoardThemeId {
  return BOARD_THEMES.some((theme) => theme.id === value);
}
