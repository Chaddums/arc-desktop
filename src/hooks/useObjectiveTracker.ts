/**
 * useObjectiveTracker — Parses OCR results from `objectiveComplete` and
 * `centerPopup` zones to detect quest objective progress and completion events.
 *
 * ARC Raiders objective text patterns:
 *   "Objective Complete"
 *   "3/5 Collected"
 *   "Delivered 2/3"
 *   "Quest Updated"
 *   "New Objective: Find the cache"
 *   "Bonus Objective Complete"
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useOCRSettings } from "./useOCRSettings";

// ─── Types ───────────────────────────────────────────────────────

/** Classification of an objective event. */
export type ObjectiveEventType = "complete" | "progress" | "new" | "update";

/** A single detected objective event. */
export interface ObjectiveEvent {
  type: ObjectiveEventType;
  text: string;
  /** Present when a progress fraction (e.g. 3/5) was parsed */
  progress?: { current: number; total: number };
  timestamp: number;
  zone: string;
  /** Original OCR text before parsing */
  raw: string;
}

/** Aggregate objective tracking state for the current session. */
export interface ObjectiveTrackerState {
  /** Last 15 events, newest first */
  recentEvents: ObjectiveEvent[];
  /** Total completion events this session */
  completionCount: number;
}

// ─── Constants ───────────────────────────────────────────────────

const MAX_RECENT = 15;
const DEDUP_WINDOW_MS = 10_000;
const MIN_CONFIDENCE = 50;
const MIN_TEXT_LENGTH = 5;

/**
 * Reject OCR noise — garbled multi-word text from menus/UI.
 * Real objectives are clean phrases like "Objective Complete" or "3/5 Collected".
 */
function looksLikeNoise(text: string): boolean {
  const words = text.split(/\s+/);
  if (words.length > 8) return true;
  const singleCharTokens = words.filter((w) => w.length === 1).length;
  if (words.length > 2 && singleCharTokens / words.length > 0.4) return true;
  if (/[A-Z]{2,}.*[a-z].*[A-Z]{2,}/.test(text)) return true;
  if (/[()[\]{}]/.test(text)) return true;
  return false;
}

// ─── Classification ──────────────────────────────────────────────

/** Patterns that indicate a completion event */
const COMPLETION_PATTERNS = [
  /\bcomplete\b/i,
  /\bcompleted\b/i,
  /\bfinished\b/i,
  /\bdone\b/i,
  /\bbonus\s+objective\s+complete\b/i,
];

/** Patterns that indicate a new objective */
const NEW_PATTERNS = [
  /\bnew\s+objective\b/i,
  /\bnew\s+quest\b/i,
  /\bobjective\s*:/i,
];

/** Patterns that indicate an update event */
const UPDATE_PATTERNS = [
  /\bquest\s+updated\b/i,
  /\bupdated\b/i,
  /\bobjective\s+updated\b/i,
];

/** Regex to extract progress fractions like "3/5" */
const PROGRESS_REGEX = /(\d+)\s*\/\s*(\d+)/;

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

interface ParsedObjective {
  type: ObjectiveEventType;
  text: string;
  progress?: { current: number; total: number };
}

function parseObjective(rawText: string): ParsedObjective | null {
  const text = normalizeText(rawText);
  if (text.length < MIN_TEXT_LENGTH) return null;
  if (looksLikeNoise(text)) return null;

  // Extract progress fraction if present
  let progress: { current: number; total: number } | undefined;
  const progressMatch = text.match(PROGRESS_REGEX);
  if (progressMatch) {
    const current = parseInt(progressMatch[1], 10);
    const total = parseInt(progressMatch[2], 10);
    if (total > 0 && current <= total * 2) {
      // Sanity check: current shouldn't be wildly larger than total
      progress = { current, total };
    }
  }

  // Classify event type (check in priority order)
  for (const pattern of COMPLETION_PATTERNS) {
    if (pattern.test(text)) {
      return { type: "complete", text, progress };
    }
  }

  for (const pattern of NEW_PATTERNS) {
    if (pattern.test(text)) {
      // Strip the "New Objective:" prefix for cleaner display text
      const displayText = text.replace(/^new\s+objective\s*:\s*/i, "").trim() || text;
      return { type: "new", text: displayText, progress };
    }
  }

  for (const pattern of UPDATE_PATTERNS) {
    if (pattern.test(text)) {
      return { type: "update", text, progress };
    }
  }

  // If we found a progress fraction but no keyword, treat as progress event
  if (progress) {
    return { type: "progress", text, progress };
  }

  // No recognizable pattern — skip
  return null;
}

// ─── Hook ────────────────────────────────────────────────────────

const VALID_ZONES = new Set(["objectiveComplete", "centerPopup"]);

/**
 * Tracks quest objective progress and completion from OCR results.
 * Classifies events as complete, progress, new, or update. Deduplicates
 * within a 10-second window and maintains a session event feed.
 */
export function useObjectiveTracker(): ObjectiveTrackerState & {
  clearSession: () => void;
} {
  const { settings: ocrSettings } = useOCRSettings();

  const [recentEvents, setRecentEvents] = useState<ObjectiveEvent[]>([]);
  const [completionCount, setCompletionCount] = useState(0);

  // Dedup: track last event time per normalized text
  const dedupMap = useRef<Map<string, number>>(new Map());

  const clearSession = useCallback(() => {
    setRecentEvents([]);
    setCompletionCount(0);
    dedupMap.current.clear();
  }, []);

  useEffect(() => {
    if (!window.arcDesktop?.onOCRResult) return;
    if (!ocrSettings.enabled) return;

    const unsub = window.arcDesktop.onOCRResult((result) => {
      // Only process relevant zones
      if (!result.zone || !VALID_ZONES.has(result.zone)) return;
      if (!result.text || result.confidence < MIN_CONFIDENCE) return;

      const parsed = parseObjective(result.text);
      if (!parsed) return;

      const now = Date.now();
      const dedupKey = `${parsed.type}:${parsed.text.toLowerCase()}`;

      // Dedup: skip if same event was detected within the window
      const lastSeen = dedupMap.current.get(dedupKey);
      if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) return;
      dedupMap.current.set(dedupKey, now);

      // Clean up old dedup entries
      for (const [key, time] of dedupMap.current) {
        if (now - time > DEDUP_WINDOW_MS * 2) {
          dedupMap.current.delete(key);
        }
      }

      const event: ObjectiveEvent = {
        type: parsed.type,
        text: parsed.text,
        progress: parsed.progress,
        timestamp: now,
        zone: result.zone,
        raw: result.text,
      };

      // Persist to player profile via IPC
      if (window.arcDesktop?.recordObjective) {
        window.arcDesktop.recordObjective(
          parsed.text,
          parsed.type,
          parsed.progress
        );
      }

      setRecentEvents((prev) => [event, ...prev].slice(0, MAX_RECENT));

      if (parsed.type === "complete") {
        setCompletionCount((prev) => prev + 1);
      }
    });

    return unsub;
  }, [ocrSettings.enabled]);

  return { recentEvents, completionCount, clearSession };
}
