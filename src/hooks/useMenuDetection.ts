/**
 * useMenuDetection — Detects which game menu the player is in via OCR.
 * Fuzzy-matches OCR text from menu header capture zones against known menu names.
 * Uses 2-second debounce to prevent flicker during menu transitions.
 */

import { useState, useEffect, useRef } from "react";
import type { MenuState } from "./useOverlayConfig";

/** Known menu header strings and which MenuState they map to */
const MENU_PATTERNS: { patterns: string[]; state: MenuState }[] = [
  { patterns: ["inventory", "inv", "backpack", "loadout"], state: "inventory" },
  { patterns: ["stash", "storage", "vault"], state: "stash" },
  { patterns: ["trader", "merchant", "shop", "vendor", "buy", "sell"], state: "trader_menu" },
  { patterns: ["workshop", "workbench", "craft", "crafting", "bench"], state: "workshop" },
  { patterns: ["map select", "map selector", "choose map", "select map", "deployment"], state: "map_selector" },
  { patterns: ["map", "tactical map", "overview"], state: "map_inspector" },
  { patterns: ["skill", "skills", "skill tree", "perks", "perk tree"], state: "skill_tree" },
];

const DEBOUNCE_MS = 2000;

/** Simple fuzzy match: returns a confidence score 0-1 */
function fuzzyMatch(ocrText: string, pattern: string): number {
  const text = ocrText.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const pat = pattern.toLowerCase();

  // Exact substring match
  if (text.includes(pat)) return 1.0;

  // Token match — check if all tokens of the pattern appear in the text
  const patTokens = pat.split(/\s+/);
  const textTokens = text.split(/\s+/);
  let matchCount = 0;
  for (const pt of patTokens) {
    if (textTokens.some((tt) => tt.includes(pt) || levenshtein1(tt, pt))) {
      matchCount++;
    }
  }
  return matchCount / patTokens.length;
}

/** Returns true if Levenshtein distance between a and b is <= 1 */
function levenshtein1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;

  let diffs = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] !== b[j]) {
      diffs++;
      if (diffs > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    } else {
      i++;
      j++;
    }
  }
  return diffs + (a.length - i) + (b.length - j) <= 1;
}

export function useMenuDetection() {
  const [menuState, setMenuState] = useState<MenuState>("none");
  const lastDetection = useRef<{ state: MenuState; timestamp: number }>({
    state: "none",
    timestamp: 0,
  });

  useEffect(() => {
    if (!window.arcDesktop?.onOCRResult) return;

    const unsub = window.arcDesktop.onOCRResult((result) => {
      // Only process results from menu detection zones
      if (!result.zone?.startsWith("menuHeader") && !result.zone?.startsWith("menuTitle")) {
        return;
      }
      if (!result.text || result.confidence < 40) return;

      const ocrText = result.text.trim();
      if (ocrText.length < 2) return;

      // Find best matching menu state
      let bestState: MenuState = "none";
      let bestScore = 0;

      for (const entry of MENU_PATTERNS) {
        for (const pattern of entry.patterns) {
          const score = fuzzyMatch(ocrText, pattern);
          if (score > bestScore && score >= 0.6) {
            bestScore = score;
            bestState = entry.state;
          }
        }
      }

      const now = Date.now();
      const prev = lastDetection.current;

      // Debounce: only update if same state detected consistently, or enough time passed
      if (bestState === prev.state) {
        // Same state — keep it
        if (bestState !== "none") {
          setMenuState(bestState);
        }
      } else if (now - prev.timestamp > DEBOUNCE_MS) {
        // Enough time passed — accept the new state
        lastDetection.current = { state: bestState, timestamp: now };
        setMenuState(bestState);
      } else {
        // Within debounce window and state changed — note it but don't apply yet
        lastDetection.current = { state: bestState, timestamp: now };
      }
    });

    return unsub;
  }, []);

  // Also detect "none" when no OCR results come in for a while (menu closed)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (
        menuState !== "none" &&
        now - lastDetection.current.timestamp > 5000
      ) {
        setMenuState("none");
        lastDetection.current = { state: "none", timestamp: now };
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [menuState]);

  return { menuState };
}
