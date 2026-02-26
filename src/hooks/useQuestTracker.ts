/**
 * useQuestTracker — Quest chain state machine.
 * Views: traderList → questChain → questDetail
 * Sources: RaidTheory quests (chain structure + objectives).
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchAllQuests } from "../services/raidtheory";
import type { RaidTheoryQuest, QuestsViewMode } from "../types";

export function useQuestTracker() {
  const [viewMode, setViewMode] = useState<QuestsViewMode>("traderList");
  const [allQuests, setAllQuests] = useState<RaidTheoryQuest[]>([]);
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const quests = await fetchAllQuests();
      setAllQuests(Array.isArray(quests) ? quests : []);
    } catch (e: any) {
      setError(e.message || "Failed to load quests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  // Group quests by trader
  const questsByTrader = useMemo(() => {
    const grouped: Record<string, RaidTheoryQuest[]> = {};
    for (const q of allQuests) {
      const trader = q.trader || "Unknown";
      if (!grouped[trader]) grouped[trader] = [];
      grouped[trader].push(q);
    }
    return grouped;
  }, [allQuests]);

  // Build ordered chain for selected trader
  const questChain = useMemo(() => {
    if (!selectedTrader) return [];
    const traderQuests = questsByTrader[selectedTrader] || [];
    if (traderQuests.length === 0) return traderQuests;

    const byId = new Map(traderQuests.map((q) => [q.id, q]));

    // Find roots (no previous quests, or previous quests not in this trader's set)
    const roots = traderQuests.filter(
      (q) =>
        !q.previousQuestIds ||
        q.previousQuestIds.length === 0 ||
        q.previousQuestIds.every((pid) => !byId.has(pid))
    );

    // BFS to build ordered chain
    const ordered: RaidTheoryQuest[] = [];
    const visited = new Set<string>();
    const queue = [...roots];

    while (queue.length > 0) {
      const quest = queue.shift()!;
      if (visited.has(quest.id)) continue;
      visited.add(quest.id);
      ordered.push(quest);

      // Follow next quest IDs
      if (quest.nextQuestIds) {
        for (const nextId of quest.nextQuestIds) {
          const next = byId.get(nextId);
          if (next && !visited.has(next.id)) {
            queue.push(next);
          }
        }
      }
    }

    // Include any orphans not reached by BFS
    for (const q of traderQuests) {
      if (!visited.has(q.id)) ordered.push(q);
    }

    return ordered;
  }, [selectedTrader, questsByTrader]);

  const questDetail = useMemo(() => {
    if (!selectedQuestId) return null;
    return allQuests.find((q) => q.id === selectedQuestId) ?? null;
  }, [selectedQuestId, allQuests]);

  const goToTrader = useCallback((trader: string) => {
    setSelectedTrader(trader);
    setViewMode("questChain");
  }, []);

  const goToQuest = useCallback((questId: string) => {
    setSelectedQuestId(questId);
    setViewMode("questDetail");
  }, []);

  const goBack = useCallback(() => {
    if (viewMode === "questDetail") {
      setSelectedQuestId(null);
      setViewMode("questChain");
    } else if (viewMode === "questChain") {
      setSelectedTrader(null);
      setViewMode("traderList");
    }
  }, [viewMode]);

  return {
    viewMode,
    selectedTrader,
    selectedQuest: selectedQuestId,
    questsByTrader,
    questChain,
    questDetail,
    loading,
    error,
    goToTrader,
    goToQuest,
    goBack,
    refresh: loadQuests,
  };
}
