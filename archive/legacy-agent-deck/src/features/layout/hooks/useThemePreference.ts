import { useEffect } from "react";
import type { ThemePreference } from "../../../types";

export function useThemePreference(theme: ThemePreference) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      if (root.dataset.runtime === "browser") {
        root.dataset.theme = "dark";
        root.dataset.themeSource = "browser-preview";
        return;
      }
      delete root.dataset.theme;
      delete root.dataset.themeSource;
      return;
    }
    root.dataset.theme = theme;
    delete root.dataset.themeSource;
  }, [theme]);
}
