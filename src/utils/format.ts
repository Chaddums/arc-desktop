/**
 * ARC View Formatters — countdown, quantity, XP display, and more.
 * Same pattern as LAMA's format.ts with game-specific formatters.
 */

/** Format milliseconds remaining into a countdown string */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (days > 0) return `${days}d ${hours}h ${pad(minutes)}m`;
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

/** Format a quantity with K/M suffix */
export function formatQuantity(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/** Format XP value for display */
export function formatXP(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M XP`;
  if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)}K XP`;
  return `${xp} XP`;
}

/** Format percentage change with arrow */
export function formatChange(change: number): string {
  if (change === 0) return "\u2500 0%";
  return `${change > 0 ? "\u25B2" : "\u25BC"} ${Math.abs(change).toFixed(1)}%`;
}

/** Format a date as relative time (e.g. "2h ago", "3d ago") */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Format a value with currency-style display */
export function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/** Format a percentage (0-1) for display */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Format a risk score (1-100) with label */
export function formatRiskScore(score: number): string {
  if (score <= 33) return `${score} (Low)`;
  if (score <= 66) return `${score} (Moderate)`;
  return `${score} (High)`;
}
