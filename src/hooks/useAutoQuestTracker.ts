/**
 * useAutoQuestTracker — Listens for OCR results from the main process,
 * fuzzy-matches against active quest objectives, and auto-completes quests.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useCompletedQuests } from "./useCompletedQuests";
import { useOCRSettings } from "./useOCRSettings";
import type { RaidTheoryQuest } from "../types";

export interface QuestCompletion {
  questId: string;
  questName: string;
  objective: string;
  timestamp: number;
}

interface AutoQuestState {
  isScanning: boolean;
  lastCompletion: QuestCompletion | null;
  completionQueue: QuestCompletion[];
}

// ─── Fuzzy matching ─────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function matchObjective(ocrText: string, objective: string): number {
  const ocrTokens = normalize(ocrText);
  const objTokens = normalize(objective);
  if (objTokens.length === 0) return 0;

  let matches = 0;
  for (const token of objTokens) {
    if (ocrTokens.some((t) => levenshtein(t, token) <= 1)) matches++;
  }
  return matches / objTokens.length;
}

// ─── Hook ───────────────────────────────────────────────────────

const DEDUP_COOLDOWN_MS = 30_000;
const MAX_VISIBLE_COMPLETIONS = 3;

export function useAutoQuestTracker(allQuests: RaidTheoryQuest[]) {
  const { completedIds, markComplete } = useCompletedQuests();
  const { settings: ocrSettings } = useOCRSettings();
  const [state, setState] = useState<AutoQuestState>({
    isScanning: false,
    lastCompletion: null,
    completionQueue: [],
  });

  // Track recently completed IDs to avoid duplicate triggers
  const recentlyCompleted = useRef<Map<string, number>>(new Map());

  // Dismiss a completion from the visible queue
  const dismissCompletion = useCallback((timestamp: number) => {
    setState((prev) => ({
      ...prev,
      completionQueue: prev.completionQueue.filter((c) => c.timestamp !== timestamp),
    }));
  }, []);

  useEffect(() => {
    if (!window.arcDesktop?.onOCRResult) return;
    if (!ocrSettings.enabled) {
      setState((prev) => ({ ...prev, isScanning: false }));
      return;
    }

    const threshold = ocrSettings.matchThreshold;

    const unsub = window.arcDesktop.onOCRResult((result) => {
      if (!result.text || result.confidence < 30) return;

      setState((prev) => ({ ...prev, isScanning: true }));

      // Find active (incomplete) quests
      const activeQuests = allQuests.filter((q) => !completedIds.has(q.id));

      for (const quest of activeQuests) {
        if (!quest.objectives || quest.objectives.length === 0) continue;

        // Skip if recently completed (dedup)
        const lastTime = recentlyCompleted.current.get(quest.id);
        if (lastTime && Date.now() - lastTime < DEDUP_COOLDOWN_MS) continue;

        for (const objective of quest.objectives) {
          const score = matchObjective(result.text, objective);
          if (score >= threshold) {
            const now = Date.now();
            recentlyCompleted.current.set(quest.id, now);
            markComplete(quest.id);

            const completion: QuestCompletion = {
              questId: quest.id,
              questName: quest.name?.en || quest.id,
              objective,
              timestamp: now,
            };

            setState((prev) => {
              const queue = [completion, ...prev.completionQueue].slice(0, MAX_VISIBLE_COMPLETIONS);
              return { ...prev, lastCompletion: completion, completionQueue: queue };
            });

            break; // One match per quest per OCR frame
          }
        }
      }

      // Clean up old dedup entries
      const cutoff = Date.now() - DEDUP_COOLDOWN_MS;
      for (const [id, time] of recentlyCompleted.current) {
        if (time < cutoff) recentlyCompleted.current.delete(id);
      }
    });

    return unsub;
  }, [allQuests, completedIds, markComplete, ocrSettings.enabled, ocrSettings.matchThreshold]);

  return {
    isScanning: state.isScanning,
    lastCompletion: state.lastCompletion,
    completionQueue: state.completionQueue,
    dismissCompletion,
  };
}
