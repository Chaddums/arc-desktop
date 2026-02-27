/**
 * useQuestPairing — Quest combo recommendations.
 * Analyzes quests across traders to find quests completable in the same raid.
 */

import { useMemo } from "react";
import { loc } from "../utils/loc";
import type { RaidTheoryQuest } from "../types";

export interface QuestPairing {
  map: string;
  quests: { questId: string; questName: string; trader: string }[];
  reasoning: string;
}

const MAP_KEYWORDS = ["dam", "spaceport", "buried city", "blue gate", "stella montis"];

export function useQuestPairing(
  questsByTrader: Record<string, RaidTheoryQuest[]>,
  completedIds: Set<string>,
) {
  const pairings = useMemo<QuestPairing[]>(() => {
    // Gather all incomplete quests
    const allQuests: { quest: RaidTheoryQuest; trader: string }[] = [];
    for (const [trader, quests] of Object.entries(questsByTrader)) {
      for (const quest of quests) {
        if (!completedIds.has(quest.id)) {
          allQuests.push({ quest, trader });
        }
      }
    }
    if (allQuests.length === 0) return [];

    // Group by objective keywords to find overlapping quests
    const groups = new Map<string, { quest: RaidTheoryQuest; trader: string }[]>();

    for (const entry of allQuests) {
      const objectives = (entry.quest.objectives ?? []).map((o) =>
        (typeof o === "string" ? o : loc(o)).toLowerCase(),
      );
      const questName = loc(entry.quest.name).toLowerCase();
      const allText = [questName, ...objectives].join(" ");

      // Check for map references
      for (const map of MAP_KEYWORDS) {
        if (allText.includes(map)) {
          const existing = groups.get(map) ?? [];
          existing.push(entry);
          groups.set(map, existing);
        }
      }

      // Check for kill objectives
      const killMatch = allText.match(/(?:kill|destroy|eliminate|defeat)\s+(\w+)/);
      if (killMatch) {
        const key = `kill_${killMatch[1]}`;
        const existing = groups.get(key) ?? [];
        existing.push(entry);
        groups.set(key, existing);
      }

      // Check for collect objectives
      const collectMatch = allText.match(/(?:collect|find|gather|retrieve)\s+(\w+)/);
      if (collectMatch) {
        const key = `collect_${collectMatch[1]}`;
        const existing = groups.get(key) ?? [];
        existing.push(entry);
        groups.set(key, existing);
      }
    }

    // Build pairings from groups with 2+ quests
    const results: QuestPairing[] = [];
    const seen = new Set<string>();

    for (const [key, entries] of groups) {
      if (entries.length < 2) continue;

      // Deduplicate by quest ID
      const unique = entries.filter(
        (e, i, arr) => arr.findIndex((x) => x.quest.id === e.quest.id) === i,
      );
      if (unique.length < 2) continue;

      const pairingKey = unique
        .map((e) => e.quest.id)
        .sort()
        .join("|");
      if (seen.has(pairingKey)) continue;
      seen.add(pairingKey);

      const traders = new Set(unique.map((e) => e.trader));
      const mapName = MAP_KEYWORDS.find((m) => key.includes(m));
      const displayMap = mapName
        ? mapName
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        : key
            .replace(/^(kill|collect)_/, "")
            .charAt(0)
            .toUpperCase() +
          key.replace(/^(kill|collect)_/, "").slice(1);

      const isMultiTrader = traders.size > 1;
      const reasoning = isMultiTrader
        ? `Complete ${unique.length} quests from ${traders.size} traders in one raid`
        : `Stack ${unique.length} quests from ${[...traders][0]} on the same run`;

      results.push({
        map: displayMap,
        quests: unique.map((e) => ({
          questId: e.quest.id,
          questName: loc(e.quest.name) || e.quest.id,
          trader: e.trader,
        })),
        reasoning,
      });
    }

    return results.sort((a, b) => b.quests.length - a.quests.length).slice(0, 10);
  }, [questsByTrader, completedIds]);

  return { pairings };
}
