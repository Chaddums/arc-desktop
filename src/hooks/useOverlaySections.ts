/**
 * useOverlaySections — Persisted expand/collapse state for overlay sections.
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@arcview/overlay-sections";

export interface OverlaySections {
  eventFeed: boolean;
  activeQuests: boolean;
  squadLoadout: boolean;
  mapBriefing: boolean;
  questTracker: boolean;
  buildAdvice: boolean;
  dailyQuests: boolean;
  inventoryContext: boolean;
  traderContext: boolean;
  mapSelectorContext: boolean;
  workshopContext: boolean;
  mapInspectorContext: boolean;
  skillTreeContext: boolean;
}

const DEFAULTS: OverlaySections = {
  eventFeed: true,
  activeQuests: true,
  squadLoadout: true,
  mapBriefing: false,
  questTracker: false,
  buildAdvice: false,
  dailyQuests: false,
  inventoryContext: true,
  traderContext: true,
  mapSelectorContext: true,
  workshopContext: true,
  mapInspectorContext: true,
  skillTreeContext: true,
};

export function useOverlaySections() {
  const [sections, setSections] = useState<OverlaySections>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setSections({ ...DEFAULTS, ...JSON.parse(raw) });
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const toggleSection = useCallback(
    (key: keyof OverlaySections) => {
      const updated = { ...sections, [key]: !sections[key] };
      setSections(updated);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    },
    [sections]
  );

  return { sections, toggleSection };
}
