import { DEFAULT_BOARD_THEME_ID, isBoardThemeId, type BoardThemeId } from "@/domain/themes";

const STORAGE_KEY = "terminal-board.theme";

export function readStoredBoardThemeId(): BoardThemeId {
  if (typeof window === "undefined") {
    return DEFAULT_BOARD_THEME_ID;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isBoardThemeId(stored) ? stored : DEFAULT_BOARD_THEME_ID;
}

export function writeStoredBoardThemeId(themeId: BoardThemeId) {
  window.localStorage.setItem(STORAGE_KEY, themeId);
}
