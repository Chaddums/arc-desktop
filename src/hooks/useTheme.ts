/**
 * useTheme — Theme selection with AsyncStorage persistence.
 * Calls applyTheme() to mutate the shared colors object, then
 * triggers a state change so React re-renders with new values.
 */

import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { applyTheme, activeTheme, activeColorPreset } from "../theme";
import type { ColorPreset } from "../theme";

const THEME_KEY = "@arc-view/theme";
const PRESET_KEY = "@arc-view/color-preset";

export function useTheme() {
  const [theme, setThemeState] = useState<"clean" | "tactical">(activeTheme);
  const [preset, setPresetState] = useState<ColorPreset>(activeColorPreset);

  // Load saved preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedTheme, savedPreset] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(PRESET_KEY),
        ]);
        const t = (savedTheme === "tactical" ? "tactical" : "clean") as "clean" | "tactical";
        const p = (["colorblind", "highContrast"].includes(savedPreset ?? "") ? savedPreset : "default") as ColorPreset;
        applyTheme(t, p);
        setThemeState(t);
        setPresetState(p);
      } catch {
        // ignore
      }
    })();
  }, []);

  const setTheme = useCallback(async (t: "clean" | "tactical") => {
    applyTheme(t, preset);
    setThemeState(t);
    try { await AsyncStorage.setItem(THEME_KEY, t); } catch {}
  }, [preset]);

  const setColorPreset = useCallback(async (p: ColorPreset) => {
    applyTheme(theme, p);
    setPresetState(p);
    try { await AsyncStorage.setItem(PRESET_KEY, p); } catch {}
  }, [theme]);

  return { theme, preset, setTheme, setColorPreset };
}
