/**
 * ThemeContext — Provides reactive theme switching.
 * When theme/preset changes, applyTheme() mutates the shared `colors` object
 * and bumps a version counter. Components that call useColors() re-render
 * with the fresh mutable values.
 */

import React, { createContext, useState, useCallback, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { applyTheme, colors } from "./index";
import type { ColorPreset, ThemePalette } from "./index";

interface ThemeContextValue {
  theme: "clean" | "tactical";
  preset: ColorPreset;
  setTheme: (t: "clean" | "tactical") => void;
  setColorPreset: (p: ColorPreset) => void;
  version: number;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "clean",
  preset: "default",
  setTheme: () => {},
  setColorPreset: () => {},
  version: 0,
});

const THEME_KEY = "@arc-view/theme";
const PRESET_KEY = "@arc-view/color-preset";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<"clean" | "tactical">("clean");
  const [preset, setPresetState] = useState<ColorPreset>("default");
  const [version, setVersion] = useState(0);

  // Load saved preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedTheme, savedPreset] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(PRESET_KEY),
        ]);
        const t = (savedTheme === "tactical" ? "tactical" : "clean") as "clean" | "tactical";
        const p = (["colorblind", "highContrast"].includes(savedPreset ?? "")
          ? savedPreset
          : "default") as ColorPreset;
        applyTheme(t, p);
        setThemeState(t);
        setPresetState(p);
        setVersion((v) => v + 1);
      } catch {
        // ignore
      }
    })();
  }, []);

  const setTheme = useCallback(
    async (t: "clean" | "tactical") => {
      applyTheme(t, preset);
      setThemeState(t);
      setVersion((v) => v + 1);
      try {
        await AsyncStorage.setItem(THEME_KEY, t);
      } catch {}
    },
    [preset],
  );

  const setColorPreset = useCallback(
    async (p: ColorPreset) => {
      applyTheme(theme, p);
      setPresetState(p);
      setVersion((v) => v + 1);
      try {
        await AsyncStorage.setItem(PRESET_KEY, p);
      } catch {}
    },
    [theme],
  );

  return (
    <ThemeContext.Provider value={{ theme, preset, setTheme, setColorPreset, version }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Subscribe to theme changes. Returns the mutable colors object (fresh on each render). */
export function useColors(): ThemePalette {
  useContext(ThemeContext);
  return colors;
}

/** Access full theme context (theme name, preset, setters). */
export function useThemeContext() {
  return useContext(ThemeContext);
}
