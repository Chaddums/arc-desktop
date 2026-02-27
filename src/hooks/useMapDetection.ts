/**
 * useMapDetection — Detects current map from OCR loading screen text.
 * Fuzzy-matches OCR results against known map names.
 * Falls back to active event map when no OCR match.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { GameMap, Bot, GameEvent, RaidTheoryQuest } from "../types";
import { loc } from "../utils/loc";

export interface MapIntel {
  mapId: string;
  mapName: string;
  enemies: { name: string; threat: string; weakness: string; drops: string[] }[];
  quests: { id: string; name: string; trader?: string; objectives: string[] }[];
  loot: string[];
  activeEvents: { name: string; endTime: number }[];
  source: "ocr" | "event" | "manual";
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function fuzzyMatch(ocrText: string, mapName: string): number {
  const ocr = normalize(ocrText);
  const name = normalize(mapName);
  if (ocr.includes(name) || name.includes(ocr)) return 1;

  // Token overlap
  const ocrTokens = ocr.split(/\s+/).filter((t) => t.length > 2);
  const nameTokens = name.split(/\s+/).filter((t) => t.length > 2);
  if (nameTokens.length === 0) return 0;

  let matches = 0;
  for (const nt of nameTokens) {
    if (ocrTokens.some((ot) => ot.includes(nt) || nt.includes(ot))) matches++;
  }
  return matches / nameTokens.length;
}

export function useMapDetection(
  maps: GameMap[],
  bots: Bot[],
  activeEvents: GameEvent[],
  allQuests: RaidTheoryQuest[],
  completedQuestIds: Set<string>,
  squadQuestIds?: string[]
) {
  const [currentMap, setCurrentMap] = useState<MapIntel | null>(null);
  const [manualMap, setManualMap] = useState<string | null>(null);
  const lastDetection = useRef<number>(0);

  // Build intel for a given map
  const buildIntel = useCallback(
    (mapName: string, mapId: string, source: "ocr" | "event" | "manual"): MapIntel => {
      const nameLower = mapName.toLowerCase();

      // Enemies on this map
      const enemies = bots
        .filter((b) => b.maps.some((m) => m.toLowerCase().includes(nameLower) || nameLower.includes(m.toLowerCase())))
        .map((b) => ({
          name: loc(b.name),
          threat: b.threat ?? "Unknown",
          weakness: b.weakness ?? "None",
          drops: b.drops ?? [],
        }));

      // Active quests relevant to this map (check objectives for map name keywords)
      const quests = allQuests
        .filter((q) => {
          if (completedQuestIds.has(q.id)) return false;
          // Check if quest objectives mention this map
          const objectives = q.objectives ?? [];
          return objectives.some(
            (obj) => normalize(obj).includes(nameLower)
          ) || (squadQuestIds ?? []).includes(q.id);
        })
        .map((q) => ({
          id: q.id,
          name: loc(q.name),
          trader: q.trader,
          objectives: q.objectives ?? [],
        }));

      // Notable loot: collect unique drops from enemies on this map
      const lootSet = new Set<string>();
      enemies.forEach((e) => e.drops.forEach((d) => lootSet.add(d)));
      const loot = [...lootSet].slice(0, 12);

      // Active events on this map
      const mapEvents = activeEvents
        .filter((ev) => normalize(ev.map).includes(nameLower) || nameLower.includes(normalize(ev.map)))
        .map((ev) => ({ name: ev.name, endTime: ev.endTime }));

      return { mapId, mapName, enemies, quests, loot, activeEvents: mapEvents, source };
    },
    [bots, allQuests, completedQuestIds, activeEvents, squadQuestIds]
  );

  // OCR-based detection
  useEffect(() => {
    if (!window.arcDesktop?.onOCRResult) return;
    if (manualMap) return; // Manual override active

    const unsub = window.arcDesktop.onOCRResult((result) => {
      if (!result.text || result.confidence < 40) return;
      if (result.zone !== "loadingScreen" && result.zone !== "centerPopup") return;

      // Debounce: only process once per 10 seconds
      if (Date.now() - lastDetection.current < 10000) return;

      let bestMatch: { map: GameMap; score: number } | null = null;
      for (const map of maps) {
        const name = loc(map.name);
        const score = fuzzyMatch(result.text, name);
        if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { map, score };
        }
      }

      if (bestMatch) {
        lastDetection.current = Date.now();
        const intel = buildIntel(loc(bestMatch.map.name), bestMatch.map.id, "ocr");
        setCurrentMap(intel);
      }
    });

    return unsub;
  }, [maps, buildIntel, manualMap]);

  // Fallback: infer from active events
  useEffect(() => {
    if (currentMap || manualMap) return;
    if (activeEvents.length === 0) return;

    const eventMap = activeEvents[0].map;
    const match = maps.find((m) => normalize(loc(m.name)).includes(normalize(eventMap)));
    if (match) {
      const intel = buildIntel(loc(match.name), match.id, "event");
      setCurrentMap(intel);
    }
  }, [activeEvents, maps, currentMap, manualMap, buildIntel]);

  // Manual map selection
  const selectMap = useCallback(
    (mapId: string) => {
      const map = maps.find((m) => m.id === mapId);
      if (!map) return;
      setManualMap(mapId);
      const intel = buildIntel(loc(map.name), map.id, "manual");
      setCurrentMap(intel);
    },
    [maps, buildIntel]
  );

  const clearMap = useCallback(() => {
    setManualMap(null);
    setCurrentMap(null);
  }, []);

  return { currentMap, selectMap, clearMap, maps };
}
