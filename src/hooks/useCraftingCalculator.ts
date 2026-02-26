/**
 * useCraftingCalculator — Crafting station state machine.
 * Views: stationSelect → stationDetail → itemDetail, plus shoppingList overlay.
 * Sources: RaidTheory hideout stations + bots, MetaForge items.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchAllHideoutStations, fetchBots, fetchMaps } from "../services/raidtheory";
import { calculateShoppingList, type MaterialRequirement } from "../utils/materialCalculator";
import type { CraftingStation, Bot, GameMap, CraftingViewMode } from "../types";

interface SelectedCraft {
  stationId: string;
  targetLevel: number;
}

export function useCraftingCalculator() {
  const [viewMode, setViewMode] = useState<CraftingViewMode>("stationSelect");
  const [stations, setStations] = useState<CraftingStation[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedCrafts, setSelectedCrafts] = useState<SelectedCraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stationData, botData, mapData] = await Promise.all([
        fetchAllHideoutStations(),
        fetchBots(),
        fetchMaps(),
      ]);
      setStations(stationData);
      setBots(botData);
      setMaps(mapData);
    } catch (e: any) {
      setError(e.message || "Failed to load crafting data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate shopping list from selected crafts
  const shoppingList = useMemo<MaterialRequirement[]>(() => {
    if (selectedCrafts.length === 0) return [];
    return calculateShoppingList(selectedCrafts, stations, bots, maps);
  }, [selectedCrafts, stations, bots, maps]);

  const goToStation = useCallback((stationId: string) => {
    setSelectedStation(stationId);
    setSelectedLevel(null);
    setViewMode("stationDetail");
  }, []);

  const goToLevel = useCallback((stationId: string, level: number) => {
    setSelectedStation(stationId);
    setSelectedLevel(level);
    setViewMode("itemDetail");
  }, []);

  const goToShoppingList = useCallback(() => {
    setViewMode("shoppingList");
  }, []);

  const toggleCraft = useCallback((stationId: string, targetLevel: number) => {
    setSelectedCrafts((prev) => {
      const existing = prev.findIndex((c) => c.stationId === stationId);
      if (existing >= 0) {
        // If same level, remove; otherwise update
        if (prev[existing].targetLevel === targetLevel) {
          return prev.filter((_, i) => i !== existing);
        }
        return prev.map((c, i) =>
          i === existing ? { ...c, targetLevel } : c
        );
      }
      return [...prev, { stationId, targetLevel }];
    });
  }, []);

  const goBack = useCallback(() => {
    if (viewMode === "itemDetail") {
      setSelectedLevel(null);
      setViewMode("stationDetail");
    } else if (viewMode === "stationDetail") {
      setSelectedStation(null);
      setViewMode("stationSelect");
    } else if (viewMode === "shoppingList") {
      setViewMode("stationSelect");
    }
  }, [viewMode]);

  return {
    viewMode,
    stations,
    selectedStation,
    selectedLevel,
    shoppingList,
    selectedCrafts,
    loading,
    error,
    goToStation,
    goToLevel,
    goToShoppingList,
    toggleCraft,
    goBack,
    refresh: loadData,
  };
}
