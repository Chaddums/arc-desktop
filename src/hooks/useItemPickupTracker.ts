/**
 * useItemPickupTracker — Parses OCR results from `itemPickup` and `centerPopup`
 * zones to detect item pickups during gameplay. Maintains a running session
 * feed of structured pickup events with deduplication.
 *
 * ARC Raiders pickup text patterns:
 *   "Picked up Copper Wire x3"
 *   "Copper Wire x3"
 *   "x2 Bandage"
 *   "+1 Scrap Metal"
 *   "Scrap Metal" (single item, no quantity)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useOCRSettings } from "./useOCRSettings";

// ─── Types ───────────────────────────────────────────────────────

/** A single detected item pickup event. */
export interface ItemPickup {
  itemName: string;
  quantity: number;
  timestamp: number;
  zone: string;
  /** Original OCR text before parsing */
  raw: string;
}

/** Aggregate pickup state for the current session. */
export interface ItemPickupState {
  /** Last 20 pickups, newest first */
  recentPickups: ItemPickup[];
  /** Total individual items picked up this session */
  sessionTotal: number;
  /** Cumulative quantity per item name */
  sessionItems: Map<string, number>;
}

// ─── Constants ───────────────────────────────────────────────────

const MAX_RECENT = 20;
const DEDUP_WINDOW_MS = 5_000;
const MIN_CONFIDENCE = 50;
const MIN_ITEM_NAME_LENGTH = 4;

/** Common UI / menu strings that should never be treated as item names */
const IGNORE_STRINGS = new Set([
  "back", "esc", "exit", "menu", "close", "ok", "yes", "no",
  "cancel", "confirm", "continue", "skip", "loading", "play",
  "fill squad", "off", "on", "crossplay", "deploy", "ready",
  "settings", "system", "options", "chat", "sonnet", "events",
  "log", "raid", "session", "loot", "items", "unique",
]);

/**
 * Reject strings that look like OCR noise rather than real item pickups.
 * Real pickups are short, clean phrases like "Copper Wire x3".
 * Noise is long, garbled, mixed-case junk from UI elements.
 */
function looksLikeNoise(text: string): boolean {
  // Too many words → probably UI text, not a pickup line
  const words = text.split(/\s+/);
  if (words.length > 6) return true;
  // High ratio of single-char tokens → OCR garbage
  const singleCharTokens = words.filter((w) => w.length === 1).length;
  if (words.length > 2 && singleCharTokens / words.length > 0.4) return true;
  // Contains numbers mixed with letters in a way that looks like garbled OCR
  // e.g. "K im. ERre ( lay Pv LI CHAT 220 Sonnet hE"
  if (/[A-Z]{2,}.*[a-z].*[A-Z]{2,}/.test(text)) return true;
  // Parentheses or brackets in item names are very rare
  if (/[()[\]{}]/.test(text)) return true;
  return false;
}

// ─── Parsing ─────────────────────────────────────────────────────

interface ParsedPickup {
  itemName: string;
  quantity: number;
}

/**
 * Pickup patterns — STRICT. Only patterns with a clear pickup signal
 * (keyword prefix like "Picked up" or "+N") to avoid false positives
 * from random OCR text on menus/lobby screens.
 *
 * Loose patterns like "X x3" are intentionally excluded because any
 * text ending in "x" + digits will false-match (e.g. "strategy x5").
 */
const PICKUP_PATTERNS: { regex: RegExp; nameIdx: number; qtyIdx: number }[] = [
  // "Picked up Copper Wire x3"
  { regex: /picked\s+up\s+(.+?)\s+x(\d+)/i, nameIdx: 1, qtyIdx: 2 },
  // "Picked up Scrap Metal" (no quantity)
  { regex: /picked\s+up\s+(.+)/i, nameIdx: 1, qtyIdx: -1 },
  // "+1 Scrap Metal" or "+3 Copper Wire"
  { regex: /^\+(\d+)\s+(.+)/i, nameIdx: 2, qtyIdx: 1 },
];

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function isIgnored(text: string): boolean {
  if (text.length < MIN_ITEM_NAME_LENGTH) return true;
  // Only digits / whitespace
  if (/^\d+$/.test(text.replace(/\s/g, ""))) return true;
  // Check against known UI strings (case-insensitive, also check individual words)
  const lower = text.toLowerCase();
  if (IGNORE_STRINGS.has(lower)) return true;
  // If the whole text is a single known UI word
  const words = lower.split(/\s+/);
  if (words.length <= 2 && words.every((w) => IGNORE_STRINGS.has(w))) return true;
  return false;
}

function parsePickup(rawText: string): ParsedPickup | null {
  const text = normalizeText(rawText);
  if (isIgnored(text)) return null;
  if (looksLikeNoise(text)) return null;

  for (const { regex, nameIdx, qtyIdx } of PICKUP_PATTERNS) {
    const m = text.match(regex);
    if (m) {
      const itemName = normalizeText(m[nameIdx]);
      const quantity = qtyIdx === -1 ? 1 : parseInt(m[qtyIdx], 10) || 1;
      if (isIgnored(itemName)) return null;
      if (looksLikeNoise(itemName)) return null;
      return { itemName, quantity };
    }
  }

  // NO FALLBACK — only accept text that matches an explicit pickup pattern.
  // Without a pattern match, we can't distinguish real pickups from random
  // UI text the OCR captured. This prevents menu/lobby noise.
  return null;
}

// ─── Hook ────────────────────────────────────────────────────────

const VALID_ZONES = new Set(["itemPickup", "centerPopup"]);

/**
 * Tracks item pickups from OCR results during gameplay.
 * Parses pickup text, deduplicates within a 5-second window, and maintains
 * a running session feed suitable for overlay display.
 */
export function useItemPickupTracker(): ItemPickupState & {
  clearSession: () => void;
} {
  const { settings: ocrSettings } = useOCRSettings();

  const [recentPickups, setRecentPickups] = useState<ItemPickup[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionItems, setSessionItems] = useState<Map<string, number>>(
    () => new Map()
  );

  // Dedup: track last pickup time per item name
  const dedupMap = useRef<Map<string, number>>(new Map());

  const clearSession = useCallback(() => {
    setRecentPickups([]);
    setSessionTotal(0);
    setSessionItems(new Map());
    dedupMap.current.clear();
  }, []);

  useEffect(() => {
    if (!window.arcDesktop?.onOCRResult) return;
    if (!ocrSettings.enabled) return;

    const unsub = window.arcDesktop.onOCRResult((result) => {
      // Only process relevant zones
      if (!result.zone || !VALID_ZONES.has(result.zone)) return;
      if (!result.text || result.confidence < MIN_CONFIDENCE) return;

      const parsed = parsePickup(result.text);
      if (!parsed) return;

      const now = Date.now();
      const dedupKey = parsed.itemName.toLowerCase();

      // Dedup: skip if same item was picked up within the window
      const lastSeen = dedupMap.current.get(dedupKey);
      if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) return;
      dedupMap.current.set(dedupKey, now);

      // Clean up old dedup entries
      for (const [key, time] of dedupMap.current) {
        if (now - time > DEDUP_WINDOW_MS * 2) {
          dedupMap.current.delete(key);
        }
      }

      const pickup: ItemPickup = {
        itemName: parsed.itemName,
        quantity: parsed.quantity,
        timestamp: now,
        zone: result.zone,
        raw: result.text,
      };

      // Emit IPC (placeholder — will be wired up later)
      if (window.arcDesktop?.recordItemPickup) {
        window.arcDesktop.recordItemPickup(parsed.itemName, parsed.quantity);
      }

      setRecentPickups((prev) => [pickup, ...prev].slice(0, MAX_RECENT));
      setSessionTotal((prev) => prev + parsed.quantity);
      setSessionItems((prev) => {
        const next = new Map(prev);
        next.set(parsed.itemName, (next.get(parsed.itemName) || 0) + parsed.quantity);
        return next;
      });
    });

    return unsub;
  }, [ocrSettings.enabled]);

  return { recentPickups, sessionTotal, sessionItems, clearSession };
}
