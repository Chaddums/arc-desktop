/**
 * useOverlayConfig — Full overlay layout configuration.
 * Extends useOverlaySections with appearance (opacity, scale), position (anchor corner),
 * per-section config (order, lock), and HUD color overrides.
 * Persisted via AsyncStorage. Syncs section toggles back to the legacy key for OverlayHUD compat.
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CONFIG_KEY = "@arcview/overlay-config";
const LEGACY_SECTIONS_KEY = "@arcview/overlay-sections";

export type AnchorPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

export type SectionId = "eventFeed" | "activeQuests" | "squadLoadout" | "mapBriefing";

export interface OverlaySections {
  eventFeed: boolean;
  activeQuests: boolean;
  squadLoadout: boolean;
  mapBriefing: boolean;
}

export interface SectionPosition {
  x: number;
  y: number;
}

export interface SectionConfig {
  id: SectionId;
  enabled: boolean;
  order: number;
  locked: boolean;
  position?: SectionPosition;
}

export interface HudColorConfig {
  accentColor: string;
  borderColor: string;
  headerColor: string;
}

export interface OverlayConfig {
  sections: OverlaySections;
  sectionConfigs: SectionConfig[];
  opacity: number;
  scale: number;
  anchor: AnchorPosition;
  hudColors: HudColorConfig | null;
}

const DEFAULT_SECTION_CONFIGS: SectionConfig[] = [
  { id: "eventFeed", enabled: true, order: 0, locked: false },
  { id: "activeQuests", enabled: true, order: 1, locked: false },
  { id: "squadLoadout", enabled: true, order: 2, locked: false },
  { id: "mapBriefing", enabled: false, order: 3, locked: false },
];

const DEFAULTS: OverlayConfig = {
  sections: {
    eventFeed: true,
    activeQuests: true,
    squadLoadout: true,
    mapBriefing: false,
  },
  sectionConfigs: DEFAULT_SECTION_CONFIGS,
  opacity: 0.92,
  scale: 1.0,
  anchor: "bottom-right",
  hudColors: null,
};

/** Derive sectionConfigs from legacy sections booleans */
function deriveSectionConfigs(sections: OverlaySections): SectionConfig[] {
  const ids: SectionId[] = ["eventFeed", "activeQuests", "squadLoadout", "mapBriefing"];
  return ids.map((id, i) => ({
    id,
    enabled: sections[id],
    order: i,
    locked: false,
  }));
}

/** Sync sections booleans from sectionConfigs */
function syncSectionsFromConfigs(configs: SectionConfig[]): OverlaySections {
  const sections: OverlaySections = {
    eventFeed: false,
    activeQuests: false,
    squadLoadout: false,
    mapBriefing: false,
  };
  for (const cfg of configs) {
    sections[cfg.id] = cfg.enabled;
  }
  return sections;
}

export function useOverlayConfig() {
  const [config, setConfig] = useState<OverlayConfig>(DEFAULTS);

  // Load config on mount (migrate from legacy key if needed)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CONFIG_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const loaded = { ...DEFAULTS, ...parsed };
          // Migration: if no sectionConfigs, derive from sections
          if (!parsed.sectionConfigs) {
            loaded.sectionConfigs = deriveSectionConfigs(loaded.sections);
          }
          if (!parsed.hudColors) {
            loaded.hudColors = null;
          }
          setConfig(loaded);
          return;
        }
        // Migrate from legacy sections key
        const legacy = await AsyncStorage.getItem(LEGACY_SECTIONS_KEY);
        if (legacy) {
          const sections = { ...DEFAULTS.sections, ...JSON.parse(legacy) };
          const migrated = { ...DEFAULTS, sections, sectionConfigs: deriveSectionConfigs(sections) };
          setConfig(migrated);
          await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(migrated));
        }
      } catch {}
    })();
  }, []);

  // Persist helper
  const persist = useCallback((updated: OverlayConfig) => {
    setConfig(updated);
    AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(updated)).catch(() => {});
    // Sync sections to legacy key so OverlayHUD's useOverlaySections stays in sync
    AsyncStorage.setItem(LEGACY_SECTIONS_KEY, JSON.stringify(updated.sections)).catch(() => {});
  }, []);

  const updateSection = useCallback(
    (key: keyof OverlaySections) => {
      const newSections = { ...config.sections, [key]: !config.sections[key] };
      const newConfigs = config.sectionConfigs.map((cfg) =>
        cfg.id === key ? { ...cfg, enabled: !cfg.enabled } : cfg,
      );
      persist({ ...config, sections: newSections, sectionConfigs: newConfigs });
    },
    [config, persist],
  );

  const updateAppearance = useCallback(
    (changes: Partial<Pick<OverlayConfig, "opacity" | "scale">>) => {
      persist({ ...config, ...changes });
    },
    [config, persist],
  );

  const updateAnchor = useCallback(
    (anchor: AnchorPosition) => {
      persist({ ...config, anchor });
    },
    [config, persist],
  );

  const reorderSections = useCallback(
    (orderedIds: SectionId[]) => {
      const newConfigs = orderedIds.map((id, i) => {
        const existing = config.sectionConfigs.find((c) => c.id === id)!;
        return { ...existing, order: i };
      });
      const newSections = syncSectionsFromConfigs(newConfigs);
      persist({ ...config, sections: newSections, sectionConfigs: newConfigs });
    },
    [config, persist],
  );

  const toggleSectionLock = useCallback(
    (id: SectionId) => {
      const newConfigs = config.sectionConfigs.map((cfg) =>
        cfg.id === id ? { ...cfg, locked: !cfg.locked } : cfg,
      );
      persist({ ...config, sectionConfigs: newConfigs });
    },
    [config, persist],
  );

  const updateSectionPosition = useCallback(
    (id: SectionId, position: { x: number; y: number }) => {
      const newConfigs = config.sectionConfigs.map((cfg) =>
        cfg.id === id ? { ...cfg, position } : cfg,
      );
      persist({ ...config, sectionConfigs: newConfigs });
    },
    [config, persist],
  );

  const updateHudColors = useCallback(
    (colors: HudColorConfig | null) => {
      persist({ ...config, hudColors: colors });
    },
    [config, persist],
  );

  const resetToDefaults = useCallback(() => {
    persist(DEFAULTS);
  }, [persist]);

  return {
    config,
    updateSection,
    updateAppearance,
    updateAnchor,
    reorderSections,
    toggleSectionLock,
    updateSectionPosition,
    updateHudColors,
    resetToDefaults,
  };
}
