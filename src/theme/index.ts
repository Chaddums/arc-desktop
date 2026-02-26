/**
 * ARC View Theme — Sci-Fi Military Palette
 *
 * Cool teal/steel palette adapted from LAMA's warm gold/amber.
 * Same structure for easy cross-project reference.
 */

// ─── Core Colors ────────────────────────────────────────────────
export const colors = {
  bg:            "#0a0e12",     // Near-black with blue tint
  bgDeep:        "#060a0e",     // Deeper black for modals
  card:          "#141c24",     // Card surfaces
  cardElevated:  "#1a2632",     // Elevated card surface
  input:         "#0c1218",     // Input fields
  border:        "#1e2e3a",     // Steel border
  borderAccent:  "#2a5a6a",     // Teal accent (replaces borderGold)
  borderGlow:    "rgba(0, 180, 216, 0.3)",  // Brighter border focus
  text:          "#c8d6e0",     // Cool white
  textSecondary: "#6b8498",     // Blue-grey
  textMuted:     "#3d5568",     // Muted
  accent:        "#00b4d8",     // Primary — bright cyan
  accentDim:     "#0077b6",     // Dimmed accent
  accentGlow:    "rgba(0, 180, 216, 0.08)", // Subtle glow bg
  scanline:      "rgba(0, 180, 216, 0.03)", // Scanline texture
  green:         "#2d9b4e",     // Active events, success
  red:           "#c0392b",     // Error, critical threat
  amber:         "#e67e22",     // Warning, rare items
  purple:        "#8e44ad",     // Legendary

  // Verdict colors
  verdictKeep:    "#2d9b4e",
  verdictSell:    "#e67e22",
  verdictRecycle: "#2980b9",

  // Stat diff colors
  diffPositive: "#2d9b4e",
  diffNegative: "#c0392b",
  diffNeutral:  "#6b8498",

  // Squad status
  statusOnline:  "#2d9b4e",
  statusOffline: "#3d5568",
  statusAway:    "#e67e22",

  // Risk gradient
  riskLow:      "#2d9b4e",
  riskMedium:   "#e67e22",
  riskHigh:     "#c0392b",
} as const;

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

// ─── Spacing ────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
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

// Alias for uppercase import convention used by components
export { colors as Colors };
