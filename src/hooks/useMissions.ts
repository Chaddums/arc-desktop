/**
 * useMissions — Missions tab state machine.
 * Wraps useQuestTracker + useCraftingCalculator + daily optimizer.
 */

import { useState, useCallback, useMemo } from "react";
import { useQuestTracker } from "./useQuestTracker";
import { useCraftingCalculator } from "./useCraftingCalculator";
import { useEventTimer } from "./useEventTimer";
import type { MissionsViewMode, GameEvent } from "../types";

interface DailyRecommendation {
  title: string;
  reason: string;
}

export function useMissions() {
  const [viewMode, setViewMode] = useState<MissionsViewMode>("traderList");

  const questTracker = useQuestTracker();
  const craftingCalc = useCraftingCalculator();
  const eventTimer = useEventTimer();

  // Daily optimizer recommendations
  const dailyRecommendations = useMemo<DailyRecommendation[]>(() => {
    const recs: DailyRecommendation[] = [];

    // Recommend maps with active events
    const eventMaps = [...new Set(eventTimer.activeEvents.map((e) => e.map))];
    for (const map of eventMaps) {
      const mapEvents = eventTimer.activeEvents.filter((e) => e.map === map);
      recs.push({
        title: `Run ${map}`,
        reason: `${mapEvents.length} active event${mapEvents.length > 1 ? "s" : ""}: ${mapEvents.map((e) => e.name).join(", ")}`,
      });
    }

    // If crafting materials needed, suggest farming
    if (craftingCalc.shoppingList.length > 0) {
      const materials = craftingCalc.shoppingList.slice(0, 3).map((m) => m.itemName).join(", ");
      recs.push({
        title: "Farm crafting materials",
        reason: `You need: ${materials}${craftingCalc.shoppingList.length > 3 ? ` and ${craftingCalc.shoppingList.length - 3} more` : ""}`,
      });
    }

    return recs;
  }, [eventTimer.activeEvents, craftingCalc.shoppingList]);

  const goBack = useCallback(() => {
    switch (viewMode) {
      case "questChain":
        setViewMode("traderList");
        break;
      case "questDetail":
        setViewMode("questChain");
        break;
      case "hideoutOverview":
      case "dailyOptimizer":
        setViewMode("traderList");
        break;
      case "stationDetail":
        setViewMode("hideoutOverview");
        break;
      case "shoppingList":
        setViewMode("hideoutOverview");
        break;
      default:
        setViewMode("traderList");
    }
  }, [viewMode]);

  const refresh = useCallback(async () => {
    await Promise.all([questTracker.refresh(), craftingCalc.refresh()]);
  }, [questTracker.refresh, craftingCalc.refresh]);

  return {
    viewMode,
    setViewMode,
    // Quests
    questsByTrader: questTracker.questsByTrader,
    questChain: questTracker.questChain,
    questDetail: questTracker.questDetail,
    selectedTrader: questTracker.selectedTrader,
    selectedQuestId: questTracker.selectedQuest,
    goToTrader: (trader: string) => {
      questTracker.goToTrader(trader);
      setViewMode("questChain");
    },
    goToQuest: (questId: string) => {
      questTracker.goToQuest(questId);
      setViewMode("questDetail");
    },
    // Crafting
    stations: craftingCalc.stations,
    selectedStation: craftingCalc.selectedStation,
    selectedLevel: craftingCalc.selectedLevel,
    shoppingList: craftingCalc.shoppingList,
    selectedCrafts: craftingCalc.selectedCrafts,
    goToStation: (stationId: string) => {
      craftingCalc.goToStation(stationId);
      setViewMode("stationDetail");
    },
    goToLevel: craftingCalc.goToLevel,
    goToShoppingList: () => {
      craftingCalc.goToShoppingList();
      setViewMode("shoppingList");
    },
    toggleCraft: craftingCalc.toggleCraft,
    // Daily optimizer
    dailyRecommendations,
    activeEvents: eventTimer.activeEvents,
    // Common
    loading: questTracker.loading || craftingCalc.loading,
    error: questTracker.error || craftingCalc.error,
    goBack,
    refresh,
  };
}
