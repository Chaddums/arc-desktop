/**
 * loc — Safely extract a display string from a LocalizedString or plain string.
 * Extracted from duplicated pattern in QuestsScreen + CraftingScreen.
 */

import type { LocalizedString } from "../types";

export function loc(value: LocalizedString | string | unknown, lang?: string): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, string>;
    if (lang && obj[lang]) return obj[lang];
    return obj.en || obj.de || Object.values(obj)[0] || "";
  }
  return String(value);
}
