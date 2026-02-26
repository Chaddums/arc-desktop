/**
 * useRoutePlanner — Route CRUD with AsyncStorage persistence.
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedRoute } from "../types";

const STORAGE_KEY = "@arcview/routes";

export function useRoutePlanner() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  // Load routes from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setRoutes(JSON.parse(raw));
        } catch {}
      }
    }).catch(() => {});
  }, []);

  const persist = useCallback((updated: SavedRoute[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  }, []);

  const createRoute = useCallback(() => {
    const newRoute: SavedRoute = {
      id: `route_${Date.now()}`,
      name: `Route ${routes.length + 1}`,
      mapId: "",
      waypoints: [],
      createdAt: Date.now(),
    };
    const updated = [...routes, newRoute];
    setRoutes(updated);
    persist(updated);
    setSelectedRoute(newRoute.id);
  }, [routes, persist]);

  const deleteRoute = useCallback(
    (id: string) => {
      const updated = routes.filter((r) => r.id !== id);
      setRoutes(updated);
      persist(updated);
      if (selectedRoute === id) setSelectedRoute(null);
    },
    [routes, selectedRoute, persist]
  );

  const updateRoute = useCallback(
    (id: string, changes: Partial<SavedRoute>) => {
      const updated = routes.map((r) => (r.id === id ? { ...r, ...changes } : r));
      setRoutes(updated);
      persist(updated);
    },
    [routes, persist]
  );

  return {
    routes,
    selectedRoute,
    setSelectedRoute,
    createRoute,
    deleteRoute,
    updateRoute,
  };
}
