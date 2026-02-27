/**
 * useTheme — Theme selection delegating to ThemeContext.
 * Kept as a convenience wrapper for components that just need theme/preset/setters.
 */

import { useThemeContext } from "../theme/ThemeContext";

export function useTheme() {
  const { theme, preset, setTheme, setColorPreset } = useThemeContext();
  return { theme, preset, setTheme, setColorPreset };
}
