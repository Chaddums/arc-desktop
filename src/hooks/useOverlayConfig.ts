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

export type SectionId =
  | "eventFeed"
  | "activeQuests"
  | "squadLoadout"
  | "mapBriefing"
  // Tier 1 — new HUD panels
  | "questTracker"
  | "buildAdvice"
  | "dailyQuests"
  // Tier 2 — context-aware panels (show based on detected menu)
  | "inventoryContext"
  | "traderContext"
  | "mapSelectorContext"
  | "workshopContext"
  | "mapInspectorContext"
  | "skillTreeContext";

export type MenuState =
  | "none"
  | "inventory"
  | "stash"
  | "trader_menu"
  | "workshop"
  | "map_selector"
  | "map_inspector"
  | "skill_tree";

/** Which menu state triggers each context section */
export const CONTEXT_SECTION_TRIGGERS: Partial<Record<SectionId, MenuState[]>> = {
  inventoryContext: ["inventory", "stash"],
  traderContext: ["trader_menu"],
  mapSelectorContext: ["map_selector"],
  workshopContext: ["workshop"],
  mapInspectorContext: ["map_inspector"],
  skillTreeContext: ["skill_tree"],
};

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
  width?: number;
}

export interface HudColorConfig {
  accentColor: string;
  borderColor: string;
  headerColor: string;
}

export interface GameResolution {
  width: number;
  height: number;
  label: string;
}

export interface OverlayConfig {
  sections: OverlaySections;
  sectionConfigs: SectionConfig[];
  opacity: number;
  scale: number;
  anchor: AnchorPosition | null;
  hudColors: HudColorConfig | null;
  gameResolution: GameResolution;
}

const DEFAULT_SECTION_CONFIGS: SectionConfig[] = [
  { id: "eventFeed", enabled: true, order: 0, locked: false },
  { id: "activeQuests", enabled: true, order: 1, locked: false },
  { id: "squadLoadout", enabled: true, order: 2, locked: false },
  { id: "mapBriefing", enabled: false, order: 3, locked: false },
  { id: "questTracker", enabled: false, order: 4, locked: false },
  { id: "buildAdvice", enabled: false, order: 5, locked: false },
  { id: "dailyQuests", enabled: false, order: 6, locked: false },
  { id: "inventoryContext", enabled: true, order: 7, locked: false },
  { id: "traderContext", enabled: true, order: 8, locked: false },
  { id: "mapSelectorContext", enabled: true, order: 9, locked: false },
  { id: "workshopContext", enabled: true, order: 10, locked: false },
  { id: "mapInspectorContext", enabled: true, order: 11, locked: false },
  { id: "skillTreeContext", enabled: true, order: 12, locked: false },
];

export const RESOLUTION_PRESETS: GameResolution[] = [
  { width: 1920, height: 1080, label: "1920x1080 (Full HD)" },
  { width: 2560, height: 1440, label: "2560x1440 (QHD)" },
  { width: 3840, height: 2160, label: "3840x2160 (4K)" },
  { width: 1280, height: 720, label: "1280x720 (HD)" },
  { width: 2560, height: 1080, label: "2560x1080 (Ultrawide)" },
  { width: 3440, height: 1440, label: "3440x1440 (Ultrawide)" },
];

const DEFAULTS: OverlayConfig = {
  sections: {
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
  },
  sectionConfigs: DEFAULT_SECTION_CONFIGS,
  opacity: 0.92,
  scale: 1.0,
  anchor: null,
  hudColors: null,
  gameResolution: { width: 1920, height: 1080, label: "1920x1080 (Full HD)" },
};

/** All known section IDs in default order */
const ALL_SECTION_IDS: SectionId[] = [
  "eventFeed", "activeQuests", "squadLoadout", "mapBriefing",
  "questTracker", "buildAdvice", "dailyQuests",
  "inventoryContext", "traderContext", "mapSelectorContext", "workshopContext", "mapInspectorContext",
  "skillTreeContext",
];

/** Derive sectionConfigs from legacy sections booleans */
function deriveSectionConfigs(sections: OverlaySections): SectionConfig[] {
  return ALL_SECTION_IDS.map((id, i) => ({
    id,
    enabled: sections[id] ?? false,
    order: i,
    locked: false,
  }));
}

/** Sync sections booleans from sectionConfigs */
function syncSectionsFromConfigs(configs: SectionConfig[]): OverlaySections {
  const sections = { ...DEFAULTS.sections };
  for (const cfg of configs) {
    if (cfg.id in sections) {
      sections[cfg.id] = cfg.enabled;
    }
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
          } else {
            // Migration: add any new section IDs missing from saved configs
            const savedIds = new Set(loaded.sectionConfigs.map((c: SectionConfig) => c.id));
            const maxOrder = Math.max(...loaded.sectionConfigs.map((c: SectionConfig) => c.order), -1);
            let nextOrder = maxOrder + 1;
            for (const def of DEFAULT_SECTION_CONFIGS) {
              if (!savedIds.has(def.id)) {
                loaded.sectionConfigs.push({ ...def, order: nextOrder++ });
              }
            }
          }
          // Merge any new section keys into sections
          loaded.sections = { ...DEFAULTS.sections, ...loaded.sections };
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

  /** Reset layout to stacked defaults in the chosen corner + clear saved positions */
  const updateAnchor = useCallback(
    (anchor: AnchorPosition | null) => {
      // Clear all saved positions so sections stack from scratch
      const resetConfigs = config.sectionConfigs.map((cfg) => {
        const { position, width, ...rest } = cfg;
        return rest as SectionConfig;
      });
      persist({ ...config, anchor, sectionConfigs: resetConfigs });
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

  const updateSectionWidth = useCallback(
    (id: SectionId, width: number) => {
      const newConfigs = config.sectionConfigs.map((cfg) =>
        cfg.id === id ? { ...cfg, width } : cfg,
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

  const updateGameResolution = useCallback(
    (resolution: GameResolution) => {
      persist({ ...config, gameResolution: resolution });
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
    updateSectionWidth,
    updateHudColors,
    updateGameResolution,
    resetToDefaults,
  };
}
