/**
 * useRaidLog — Raid history + personal stats (UNIQUE feature).
 * Persistent via AsyncStorage.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RaidEntry, LoadoutStats, MapStats, RaidOutcome } from "../types";

const STORAGE_KEY = "@arcview/raid_log";

export function useRaidLog() {
  const [entries, setEntries] = useState<RaidEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setEntries(JSON.parse(raw));
        } catch {}
      }
      setIsLoaded(true);
    }).catch(() => setIsLoaded(true));
  }, []);

  const persist = useCallback((updated: RaidEntry[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }, []);

  const addEntry = useCallback(
    (entry: Omit<RaidEntry, "id">) => {
      const newEntry: RaidEntry = {
        ...entry,
        id: `raid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };
      const updated = [newEntry, ...entries];
      setEntries(updated);
      persist(updated);
    },
    [entries, persist]
  );

  const removeEntry = useCallback(
    (id: string) => {
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      persist(updated);
    },
    [entries, persist]
  );

  // Compute loadout stats
  const loadoutStats = useMemo<LoadoutStats[]>(() => {
    const byLoadout = new Map<string, RaidEntry[]>();
    for (const entry of entries) {
      const key = [...entry.loadout].sort().join("+");
      const existing = byLoadout.get(key) ?? [];
      existing.push(entry);
      byLoadout.set(key, existing);
    }

    return [...byLoadout.entries()]
      .map(([key, raids]) => {
        const extractions = raids.filter((r) => r.outcome === "extracted").length;
        const totalLoot = raids.reduce((sum, r) => sum + (r.lootValue ?? 0), 0);
        return {
          loadoutKey: key,
          items: key.split("+"),
          totalRaids: raids.length,
          extractions,
          successRate: raids.length > 0 ? extractions / raids.length : 0,
          avgLootValue: raids.length > 0 ? totalLoot / raids.length : 0,
        };
      })
      .sort((a, b) => b.totalRaids - a.totalRaids);
  }, [entries]);

  // Compute map stats
  const mapStats = useMemo<MapStats[]>(() => {
    const byMap = new Map<string, RaidEntry[]>();
    for (const entry of entries) {
      const existing = byMap.get(entry.mapId) ?? [];
      existing.push(entry);
      byMap.set(entry.mapId, existing);
    }

    return [...byMap.entries()].map(([mapId, raids]) => {
      const extractions = raids.filter((r) => r.outcome === "extracted").length;
      return {
        mapId,
        totalRaids: raids.length,
        extractions,
        successRate: raids.length > 0 ? extractions / raids.length : 0,
      };
    });
  }, [entries]);

  return {
    entries,
    isLoaded,
    addEntry,
    removeEntry,
    loadoutStats,
    mapStats,
  };
}
