/**
 * useIntel — Intel tab state machine.
 * Wraps useEventTimer + enemy browser + route planner.
 */

import { useState, useCallback, useMemo } from "react";
import { useEventTimer } from "./useEventTimer";
import { useEnemyBrowser } from "./useEnemyBrowser";
import { useRoutePlanner } from "./useRoutePlanner";
import type { IntelViewMode } from "../types";

export function useIntel() {
  const [viewMode, setViewMode] = useState<IntelViewMode>("dashboard");

  // Events
  const eventTimer = useEventTimer();

  // Enemies
  const enemyBrowser = useEnemyBrowser();

  // Routes
  const routePlanner = useRoutePlanner();

  const goBack = useCallback(() => {
    switch (viewMode) {
      case "eventList":
      case "mapDetail":
      case "enemyList":
      case "routePlanner":
        setViewMode("dashboard");
        break;
      case "enemyDetail":
        setViewMode("enemyList");
        break;
      case "routeDetail":
        setViewMode("routePlanner");
        break;
      default:
        setViewMode("dashboard");
    }
  }, [viewMode]);

  const refresh = useCallback(async () => {
    await Promise.all([
      eventTimer.refresh(),
      enemyBrowser.refresh(),
    ]);
  }, [eventTimer.refresh, enemyBrowser.refresh]);

  return {
    viewMode,
    setViewMode,
    // Events
    activeEvents: eventTimer.activeEvents,
    upcomingEvents: eventTimer.upcomingEvents,
    selectedMap: eventTimer.selectedMap,
    setSelectedMap: eventTimer.setSelectedMap,
    now: eventTimer.now,
    // Enemies
    bots: enemyBrowser.bots,
    maps: enemyBrowser.maps,
    botSearch: enemyBrowser.search,
    setBotSearch: enemyBrowser.setSearch,
    selectedThreat: enemyBrowser.selectedThreat,
    setSelectedThreat: enemyBrowser.setSelectedThreat,
    selectedBot: enemyBrowser.selectedBot,
    setSelectedBot: enemyBrowser.setSelectedBot,
    // Routes
    routes: routePlanner.routes,
    selectedRoute: routePlanner.selectedRoute,
    setSelectedRoute: routePlanner.setSelectedRoute,
    createRoute: routePlanner.createRoute,
    deleteRoute: routePlanner.deleteRoute,
    updateRoute: routePlanner.updateRoute,
    // Common
    loading: eventTimer.loading || enemyBrowser.loading,
    error: eventTimer.error || enemyBrowser.error,
    goBack,
    refresh,
  };
}
