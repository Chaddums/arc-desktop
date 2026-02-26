/**
 * useEnemyBrowser — Bot list with debounced search + threat filter.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchBots, fetchMaps } from "../services/raidtheory";
import type { Bot, GameMap } from "../types";

export function useEnemyBrowser() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [search, setSearch] = useState("");
  const [selectedThreat, setSelectedThreat] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [botData, mapData] = await Promise.all([fetchBots(), fetchMaps()]);
      setBots(Array.isArray(botData) ? botData : []);
      setMaps(Array.isArray(mapData) ? mapData : []);
    } catch (e: any) {
      setError(e.message || "Failed to load enemy data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    bots,
    maps,
    search,
    setSearch,
    selectedThreat,
    setSelectedThreat,
    selectedBot,
    setSelectedBot,
    loading,
    error,
    refresh: loadData,
  };
}
