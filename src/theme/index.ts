/**
 * ARC View Theme — Sci-Fi Military Palette
 *
 * Cool teal/steel palette adapted from LAMA's warm gold/amber.
 * Supports dual themes: Clean (default) and Tactical (gritty variant).
 */

import { Platform, TextStyle, ViewStyle } from "react-native";

// ─── Theme Palette Type ─────────────────────────────────────────
export interface ThemePalette {
  bg: string;
  bgDeep: string;
  card: string;
  cardElevated: string;
  input: string;
  border: string;
  borderAccent: string;
  borderGlow: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  accentGlow: string;
  accentBg: string;
  scanline: string;
  green: string;
  red: string;
  amber: string;
  purple: string;
  rowAlt: string;
  verdictKeep: string;
  verdictSell: string;
  verdictRecycle: string;
  diffPositive: string;
  diffNegative: string;
  diffNeutral: string;
  statusOnline: string;
  statusOffline: string;
  statusAway: string;
  riskLow: string;
  riskMedium: string;
  riskHigh: string;
}

// ─── Theme Definitions ──────────────────────────────────────────

export const THEME_CLEAN: ThemePalette = {
  bg:            "#0a0e12",
  bgDeep:        "#060a0e",
  card:          "#111a22",
  cardElevated:  "#182430",
  input:         "#0c1218",
  border:        "#1e2e3a",
  borderAccent:  "#2a5a6a",
  borderGlow:    "rgba(0, 180, 216, 0.3)",
  text:          "#c8d6e0",
  textSecondary: "#6b8498",
  textMuted:     "#3d5568",
  accent:        "#00b4d8",
  accentDim:     "#0077b6",
  accentGlow:    "rgba(0, 180, 216, 0.08)",
  accentBg:      "rgba(0, 180, 216, 0.12)",
  scanline:      "rgba(0, 180, 216, 0.03)",
  green:         "#2d9b4e",
  red:           "#c0392b",
  amber:         "#e67e22",
  purple:        "#8e44ad",
  rowAlt:        "rgba(0, 180, 216, 0.03)",
  verdictKeep:   "#2d9b4e",
  verdictSell:   "#e67e22",
  verdictRecycle: "#2980b9",
  diffPositive:  "#2d9b4e",
  diffNegative:  "#c0392b",
  diffNeutral:   "#6b8498",
  statusOnline:  "#2d9b4e",
  statusOffline: "#3d5568",
  statusAway:    "#e67e22",
  riskLow:       "#2d9b4e",
  riskMedium:    "#e67e22",
  riskHigh:      "#c0392b",
};

export const THEME_TACTICAL: ThemePalette = {
  bg:            "#0c0c0a",
  bgDeep:        "#080806",
  card:          "#16160f",
  cardElevated:  "#1e1e14",
  input:         "#0e0e0a",
  border:        "#2a2a1e",
  borderAccent:  "#4a4a2a",
  borderGlow:    "rgba(180, 160, 40, 0.3)",
  text:          "#d4d0b8",
  textSecondary: "#8a8468",
  textMuted:     "#5a5640",
  accent:        "#b4a028",
  accentDim:     "#8a7a1e",
  accentGlow:    "rgba(180, 160, 40, 0.08)",
  accentBg:      "rgba(180, 160, 40, 0.12)",
  scanline:      "rgba(180, 160, 40, 0.03)",
  green:         "#4a8c2a",
  red:           "#a83020",
  amber:         "#c87020",
  purple:        "#7a3a8a",
  rowAlt:        "rgba(180, 160, 40, 0.03)",
  verdictKeep:   "#4a8c2a",
  verdictSell:   "#c87020",
  verdictRecycle: "#2a7090",
  diffPositive:  "#4a8c2a",
  diffNegative:  "#a83020",
  diffNeutral:   "#8a8468",
  statusOnline:  "#4a8c2a",
  statusOffline: "#5a5640",
  statusAway:    "#c87020",
  riskLow:       "#4a8c2a",
  riskMedium:    "#c87020",
  riskHigh:      "#a83020",
};

// ─── Color Presets (accessibility) ─────────────────────────────
export type ColorPreset = "default" | "colorblind" | "highContrast";

const COLOR_PRESET_OVERRIDES: Record<ColorPreset, Partial<ThemePalette>> = {
  default: {},
  colorblind: {
    green:        "#2196F3",   // Blue instead of green
    red:          "#FF5722",   // Orange-red (distinct from blue)
    amber:        "#FFC107",   // Bright yellow
    diffPositive: "#2196F3",
    diffNegative: "#FF5722",
    riskLow:      "#2196F3",
    riskHigh:     "#FF5722",
    verdictKeep:  "#2196F3",
    verdictSell:  "#FFC107",
    statusOnline: "#2196F3",
  },
  highContrast: {
    bg:            "#000000",
    card:          "#0a0a0a",
    text:          "#ffffff",
    textSecondary: "#b0b0b0",
    textMuted:     "#707070",
    border:        "#404040",
    borderAccent:  "#606060",
    accent:        "#00e5ff",
    green:         "#00ff41",
    red:           "#ff1744",
    amber:         "#ffab00",
  },
};

// ─── Active Colors (mutable — updated by applyTheme) ────────────
export const colors: ThemePalette = { ...THEME_CLEAN };

/** Active theme name */
export let activeTheme: "clean" | "tactical" = "clean";
/** Active color preset */
export let activeColorPreset: ColorPreset = "default";

/** Apply a theme + color preset. Mutates `colors` in place so all imports update on re-render. */
export function applyTheme(
  theme: "clean" | "tactical" = "clean",
  preset: ColorPreset = "default",
) {
  const base = theme === "tactical" ? THEME_TACTICAL : THEME_CLEAN;
  const overrides = COLOR_PRESET_OVERRIDES[preset] ?? {};
  Object.assign(colors, base, overrides);
  activeTheme = theme;
  activeColorPreset = preset;
}

// ─── Rarity Colors ──────────────────────────────────────────────
export const rarityColors = {
  common:    "#8c9ba5",
  uncommon:  "#2d9b4e",
  rare:      "#2980b9",
  epic:      "#d35400",
  legendary: "#8e44ad",
} as const;

// ─── Threat Colors ──────────────────────────────────────────────
export const threatColors = {
  Low:      "#8c9ba5",
  Medium:   "#e67e22",
  High:     "#c0392b",
  Critical: "#e74c3c",
  Extreme:  "#8e44ad",
} as const;

// ─── Typography ─────────────────────────────────────────────────
export const fonts = {
  sans: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
} as const;

// ─── Spacing (tighter for dense information display) ────────────
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  xxl: 20,
} as const;

// ─── Typography Scale ───────────────────────────────────────────
export const fontSize = {
  xs: 10,
  sm: 11,
  md: 13,
  lg: 15,
  xl: 18,
  xxl: 22,
  title: 24,
} as const;

// ─── Reusable Text Presets ──────────────────────────────────────
export const textPresets = {
  /** Uppercase section label: 10px, 700, secondary, 0.1em tracking */
  label: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  } as TextStyle,

  /** Monospace stat value: tabular nums */
  mono: {
    fontFamily: Platform.OS === "web" ? fonts.mono : undefined,
    fontVariant: ["tabular-nums"],
  } as TextStyle,

  /** Section title: 13px bold, uppercase */
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  } as TextStyle,

  /** Sub heading: 11px bold, uppercase */
  subHeading: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  } as TextStyle,

  /** Screen header: 20px bold */
  screenHeader: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxs,
  } as TextStyle,
} as const;

// ─── Reusable View Presets ──────────────────────────────────────
export const viewPresets = {
  /** Primary action button */
  button: {
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  } as ViewStyle,

  /** Secondary / outline button */
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  } as ViewStyle,

  /** Standard row with bottom border */
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,

  /** Scroll content container (tight padding) */
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 12,
  } as ViewStyle,

  /** Quick nav row */
  quickNav: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  } as ViewStyle,
} as const;

// ─── Layout Breakpoints ─────────────────────────────────────────
export const breakpoints = {
  /** Switch to sidebar nav */
  desktop: 768,
  /** Switch to 3-column grids */
  wide: 1024,
} as const;

// ─── Animation Timing ───────────────────────────────────────────
export const timing = {
  fast: 150,
  normal: 200,
  slow: 300,
} as const;

// Alias for uppercase import convention used by components
export { colors as Colors };
