/**
 * OverlayHUD — In-game HUD with loadout, events, quests, squad, and map intel.
 * ResizeObserver auto-adjusts overlay window height to fit content.
 * Mouse enter/leave toggles click-through via IPC.
 * Supports dynamic section ordering and HUD color overrides.
 */

import React, { useEffect, useCallback, useState, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEventTimer } from "../hooks/useEventTimer";
import { useAutoQuestTracker } from "../hooks/useAutoQuestTracker";
import { useQuestTracker } from "../hooks/useQuestTracker";
import { useEnemyBrowser } from "../hooks/useEnemyBrowser";
import { useCompletedQuests } from "../hooks/useCompletedQuests";
import { useAlertSettings } from "../hooks/useAlertSettings";
import { useMapDetection } from "../hooks/useMapDetection";
import { useItemBrowser } from "../hooks/useItemBrowser";
import { useMyLoadout } from "../hooks/useMyLoadout";
import { useMapRecommendations } from "../hooks/useMapRecommendations";
import { useRiskScore } from "../hooks/useRiskScore";
import { useRaidLog } from "../hooks/useRaidLog";
import { useSquad } from "../hooks/useSquad";
import { useOverlaySections } from "../hooks/useOverlaySections";
import { useStashOrganizer } from "../hooks/useStashOrganizer";
import { formatCountdown } from "../utils/format";
import { loc } from "../utils/loc";
import { Colors, fonts } from "../theme";
import type { SectionId, SectionConfig, HudColorConfig } from "../hooks/useOverlayConfig";
import { useQuestPairing } from "../hooks/useQuestPairing";
import { useBuildAdvisor } from "../hooks/useBuildAdvisor";
import { useSkillTree } from "../hooks/useSkillTree";
import { useDailyQuests } from "../hooks/useDailyQuests";
import { useMenuDetection } from "../hooks/useMenuDetection";
import OverlayEventFeed from "./OverlayEventFeed";
import OverlayActiveQuests from "./OverlayActiveQuests";
import OverlaySquadLoadout from "./OverlaySquadLoadout";
import OverlayMapBriefing from "./OverlayMapBriefing";
import OverlayQuestTracker from "./OverlayQuestTracker";
import OverlayBuildAdvice from "./OverlayBuildAdvice";
import OverlayDailyQuests from "./OverlayDailyQuests";
import OverlayInventoryContext from "./OverlayInventoryContext";
import OverlayTraderContext from "./OverlayTraderContext";
import OverlayMapSelectorContext from "./OverlayMapSelectorContext";
import OverlayWorkshopContext from "./OverlayWorkshopContext";
import OverlayMapInspectorContext from "./OverlayMapInspectorContext";
import OverlaySkillTreeContext from "./OverlaySkillTreeContext";
import OverlayChecklist from "./OverlayChecklist";
import OverlayQuestProgress from "./OverlayQuestProgress";
import OverlaySquadQuests from "./OverlaySquadQuests";
import OverlayMapIntel from "./OverlayMapIntel";
import OverlayMapPip from "./OverlayMapPip";
import OverlayStashPip from "./OverlayStashPip";
import OverlayEventToast from "./OverlayEventToast";

// ─── Build class badge colors ──────────────────────────────────
const BUILD_CLASS_COLORS: Record<string, string> = {
  DPS: Colors.red,
  Tank: Colors.accent,
  Support: Colors.green,
  Hybrid: Colors.amber,
};

const SECTION_LABELS: Record<SectionId, string> = {
  eventFeed: "EVENT FEED",
  activeQuests: "ACTIVE QUESTS",
  squadLoadout: "SQUAD LOADOUT",
  mapBriefing: "MAP BRIEFING",
  questTracker: "QUEST TRACKER",
  buildAdvice: "BUILD ADVICE",
  dailyQuests: "DAILY QUESTS",
  inventoryContext: "INVENTORY",
  traderContext: "TRADERS",
  mapSelectorContext: "MAP SELECTOR",
  workshopContext: "WORKSHOP",
  mapInspectorContext: "MAP INSPECTOR",
  skillTreeContext: "SKILL TREE",
};

const DEFAULT_SECTION_ORDER: SectionId[] = [
  "eventFeed",
  "activeQuests",
  "squadLoadout",
  "mapBriefing",
  "questTracker",
  "buildAdvice",
  "dailyQuests",
  "inventoryContext",
  "traderContext",
  "mapSelectorContext",
  "workshopContext",
  "mapInspectorContext",
  "skillTreeContext",
];

export default function OverlayHUD() {
  // ─── Existing hooks ────────────────────────────────────────────
  const { activeEvents, upcomingEvents, eventAlerts, dismissAlert, now } = useEventTimer();
  const { questsByTrader } = useQuestTracker();
  const { bots, maps } = useEnemyBrowser();
  const { completedIds } = useCompletedQuests();
  const allQuests = useMemo(() => Object.values(questsByTrader).flat(), [questsByTrader]);
  const { completionQueue, dismissCompletion } = useAutoQuestTracker(allQuests);
  const { settings: alertSettings } = useAlertSettings();
  const { currentMap } = useMapDetection(maps, bots, activeEvents, allQuests, completedIds);
  const [pipVisible, setPipVisible] = useState(false);
  const [locked, setLocked] = useState(false);
  const stashOrganizer = useStashOrganizer();

  // ─── New hooks ─────────────────────────────────────────────────
  const { items } = useItemBrowser();
  const myLoadout = useMyLoadout(items);
  const mapRec = useMapRecommendations(items, bots);
  const riskScore = useRiskScore();
  const raidLog = useRaidLog();
  const { squad } = useSquad();
  const { sections, toggleSection } = useOverlaySections();

  // ─── Skill tree + Tier 1 + Tier 2 hooks ─────────────────────
  const { skillNodes, allocations: skillAllocations } = useSkillTree();
  const { pairings: questPairings } = useQuestPairing(questsByTrader, completedIds);
  const { getAdvice: getBuildAdvice, getAutoAdvice } = useBuildAdvisor(
    items, skillNodes, skillAllocations,
    myLoadout.buildClass, myLoadout.loadout, myLoadout.stats.survivability, !squad,
  );
  const dailyQuests = useDailyQuests();
  const { menuState } = useMenuDetection();

  // ─── Dynamic config from builder (via IPC or AsyncStorage) ─────
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(DEFAULT_SECTION_ORDER);
  const [savedConfigs, setSavedConfigs] = useState<SectionConfig[]>([]);
  const [hudColors, setHudColors] = useState<HudColorConfig | null>(null);
  const [hudOpacity, setHudOpacity] = useState(0.92);
  const [hudScale, setHudScale] = useState(1.0);
  const [enabledSections, setEnabledSections] = useState<Set<SectionId>>(
    new Set(DEFAULT_SECTION_ORDER),
  );

  /** Extract order, enabled set, and full configs from raw sectionConfigs */
  const applySectionConfigs = useCallback((cfgs: SectionConfig[]) => {
    const sorted = [...cfgs].sort((a, b) => a.order - b.order);
    setSectionOrder(sorted.map((s) => s.id));
    setEnabledSections(new Set(sorted.filter((s) => s.enabled).map((s) => s.id)));
    setSavedConfigs(sorted);
  }, []);

  // Load saved config from AsyncStorage on mount and apply to overlay window
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("@arcview/overlay-config");
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved.sectionConfigs) {
          // Migrate: add any new section IDs missing from saved configs
          const savedIds = new Set(saved.sectionConfigs.map((c: SectionConfig) => c.id));
          const maxOrder = Math.max(...saved.sectionConfigs.map((c: SectionConfig) => c.order), -1);
          let nextOrder = maxOrder + 1;
          for (const id of DEFAULT_SECTION_ORDER) {
            if (!savedIds.has(id)) {
              saved.sectionConfigs.push({ id, enabled: true, order: nextOrder++, locked: false });
            }
          }
          applySectionConfigs(saved.sectionConfigs);
        }
        if (saved.hudColors !== undefined) {
          setHudColors(saved.hudColors);
        }
        if (saved.opacity != null) setHudOpacity(saved.opacity);
        if (saved.scale != null) setHudScale(saved.scale);
      } catch {}
    })();
  }, [applySectionConfigs]);

  // Listen for IPC config pushes from the builder
  useEffect(() => {
    const unsub = window.arcDesktop?.onOverlayConfigChanged((cfg: any) => {
      if (cfg.sectionConfigs) {
        applySectionConfigs(cfg.sectionConfigs);
      }
      if (cfg.hudColors !== undefined) {
        setHudColors(cfg.hudColors);
      }
      if (cfg.opacity != null) setHudOpacity(cfg.opacity);
      if (cfg.scale != null) setHudScale(cfg.scale);
    });
    return () => unsub?.();
  }, [applySectionConfigs]);

  // ─── Build advice (memoized) ──────────────────────────────────
  const buildAdvice = useMemo(() => {
    if (!sections.buildAdvice) return null;
    return getBuildAdvice("Balanced");
  }, [sections.buildAdvice, getBuildAdvice]);

  // ─── Quest item needs for inventory context ──────────────────
  const neededQuestItems = useMemo(() => {
    const needed: { name: string; quantity: number; questName: string }[] = [];
    for (const quest of allQuests) {
      if (completedIds.has(quest.id)) continue;
      if (!quest.objectives) continue;
      for (const obj of quest.objectives) {
        const text = loc(obj);
        const collectMatch = text.match(/(?:collect|find|gather|retrieve)\s+(\d+)\s+(.+)/i);
        if (collectMatch) {
          needed.push({
            name: collectMatch[2].trim(),
            quantity: parseInt(collectMatch[1], 10) || 1,
            questName: loc(quest.name) || quest.id,
          });
        }
      }
    }
    return needed.slice(0, 6);
  }, [allQuests, completedIds]);

  // ─── Derived state ─────────────────────────────────────────────
  const nextEvent = upcomingEvents[0];
  const countdown = nextEvent ? nextEvent.startTime - now : null;
  const isImminent = countdown != null && countdown > 0 && countdown < 5 * 60 * 1000;
  const hasActive = activeEvents.length > 0;

  // Weapon name for strip badge
  const weaponName = myLoadout.loadout.weapon?.name ?? null;

  // Loadout fit score: ratio of equipped score to max possible (rough heuristic)
  const loadoutFitScore = useMemo(() => {
    if (!mapRec.selectedMap || myLoadout.equippedCount === 0) return 0;
    // Simple fit: overall score vs 100-point scale
    return Math.min(100, Math.round(myLoadout.stats.overallScore));
  }, [mapRec.selectedMap, myLoadout.equippedCount, myLoadout.stats.overallScore]);

  // ─── Risk score auto-calculation ──────────────────────────────
  useEffect(() => {
    if (!mapRec.selectedMap) return;
    riskScore.calculate({
      mapId: mapRec.selectedMap,
      loadout: myLoadout.equippedItems.map((it) => it.id),
      raidHistory: raidLog.entries,
      bots,
      activeEvents,
    });
  }, [mapRec.selectedMap, myLoadout.equippedItems, raidLog.entries, bots, activeEvents]);

  // ─── Positioned sections (denormalize 0-1 → screen pixels) ────
  const STRIP_HEIGHT = 52;
  const DEFAULT_CARD_FRAC = 0.2; // default card width as fraction of screen

  // Split sections into positioned (have saved builder positions) vs flow (stack in column)
  const { positionedSections, flowSections } = useMemo(() => {
    const sw = typeof window !== "undefined" ? window.innerWidth : 1920;
    const sh = typeof window !== "undefined" ? window.innerHeight : 1080;
    const positioned: { id: SectionId; position: { x: number; y: number }; width: number }[] = [];
    const flow: { id: SectionId; width: number }[] = [];

    for (const id of sectionOrder) {
      if (!enabledSections.has(id)) continue;
      const cfg = savedConfigs.find((c) => c.id === id);

      // Denormalize width
      const width = (cfg?.width && cfg.width <= 1)
        ? cfg.width * sw
        : DEFAULT_CARD_FRAC * sw;

      if (cfg?.position && cfg.position.x <= 1 && cfg.position.y <= 1) {
        // Has a saved position from builder → absolute position
        positioned.push({
          id,
          position: { x: cfg.position.x * sw, y: cfg.position.y * sh },
          width,
        });
      } else {
        // No saved position → flow in column layout
        flow.push({ id, width });
      }
    }
    return { positionedSections: positioned, flowSections: flow };
  }, [sectionOrder, enabledSections, savedConfigs]);

  // ─── Overlay lock state ────────────────────────────────────────
  useEffect(() => {
    window.arcDesktop?.getOverlayLocked().then(setLocked);
    const unsub = window.arcDesktop?.onOverlayLockChanged(setLocked);
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!locked) {
      window.arcDesktop?.setIgnoreMouseEvents(true, { forward: true });
    }
  }, [locked]);

  // ─── Mouse event handlers ─────────────────────────────────────
  const handleMouseEnter = useCallback(() => {
    if (locked) return;
    window.arcDesktop?.setIgnoreMouseEvents(false);
  }, [locked]);

  const handleMouseLeave = useCallback(() => {
    if (locked) return;
    window.arcDesktop?.setIgnoreMouseEvents(true, { forward: true });
  }, [locked]);

  const handleLockMouseEnter = useCallback(() => {
    window.arcDesktop?.setIgnoreMouseEvents(false);
  }, []);

  const handleLockMouseLeave = useCallback(() => {
    window.arcDesktop?.setIgnoreMouseEvents(true, { forward: true });
  }, []);

  // ─── Border style ─────────────────────────────────────────────
  const borderStyle = isImminent
    ? styles.stripImminent
    : hasActive
    ? styles.stripActive
    : null;

  const buildClassColor = BUILD_CLASS_COLORS[myLoadout.buildClass] ?? Colors.textMuted;

  // ─── HUD color overrides ──────────────────────────────────────
  const accentOverride = hudColors?.accentColor;
  const borderOverride = hudColors?.borderColor;
  const headerOverride = hudColors?.headerColor;

  // ─── Section renderer (dynamic order, crash-isolated) ──────────
  const renderSectionInner = (id: SectionId) => {
    switch (id) {
      case "eventFeed":
        return (
          <OverlayEventFeed
            key={id}
            activeEvents={activeEvents}
            upcomingEvents={upcomingEvents}
            now={now}
            expanded={sections.eventFeed}
            onToggle={() => toggleSection("eventFeed")}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );
      case "activeQuests":
        return (
          <OverlayActiveQuests
            key={id}
            quests={allQuests}
            completedIds={completedIds}
            expanded={sections.activeQuests}
            onToggle={() => toggleSection("activeQuests")}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );
      case "squadLoadout":
        return (
          <OverlaySquadLoadout
            key={id}
            squad={squad}
            expanded={sections.squadLoadout}
            onToggle={() => toggleSection("squadLoadout")}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );
      case "mapBriefing":
        return (
          <OverlayMapBriefing
            key={id}
            maps={mapRec.maps}
            selectedMap={mapRec.selectedMap}
            onSelectMap={mapRec.setSelectedMap}
            riskAssessment={riskScore.assessment}
            threatSummary={mapRec.threatSummary}
            loadoutFitScore={loadoutFitScore}
            expanded={sections.mapBriefing}
            onToggle={() => toggleSection("mapBriefing")}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );

      // ─── Tier 1 panels ──────────────────────────────────────
      case "questTracker":
        return (
          <OverlayQuestTracker
            key={id}
            pairings={questPairings}
            completedIds={completedIds}
            expanded={sections.questTracker}
            onToggle={() => toggleSection("questTracker")}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );
      case "buildAdvice":
        return (
          <OverlayBuildAdvice
            key={id}
            advice={buildAdvice}
            expanded={sections.buildAdvice}
            onToggle={() => toggleSection("buildAdvice")}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );
      case "dailyQuests":
        return (
          <OverlayDailyQuests
            key={id}
            quests={dailyQuests.quests}
            allChecked={dailyQuests.allChecked}
            onToggle={dailyQuests.toggleQuest}
            expanded={sections.dailyQuests}
            onToggleExpand={() => toggleSection("dailyQuests")}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );

      // ─── Tier 2 context panels (menu-aware) ─────────────────
      case "inventoryContext":
        return (
          <OverlayInventoryContext
            key={id}
            stats={stashOrganizer.stats}
            loading={stashOrganizer.loading}
            neededItems={neededQuestItems}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );
      case "traderContext":
        return (
          <OverlayTraderContext
            key={id}
            questsByTrader={questsByTrader}
            completedIds={completedIds}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );
      case "mapSelectorContext":
        return (
          <OverlayMapSelectorContext
            key={id}
            pairings={questPairings}
            activeEvents={activeEvents}
            maps={mapRec.maps}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );
      case "workshopContext":
        return (
          <OverlayWorkshopContext
            key={id}
            items={items}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );
      case "mapInspectorContext":
        return (
          <OverlayMapInspectorContext
            key={id}
            quests={allQuests}
            completedIds={completedIds}
            currentMap={mapRec.selectedMap}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );
      case "skillTreeContext":
        // Only show when skill tree menu is detected via OCR
        if (menuState !== "skill_tree") return null;
        return getAutoAdvice ? (
          <OverlaySkillTreeContext
            key={id}
            buildClass={getAutoAdvice.buildClass}
            recommendations={getAutoAdvice.skillRecommendations}
            deadPerks={getAutoAdvice.deadPerks}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        ) : null;

      default:
        return null;
    }
  };

  /** Crash-isolated section renderer — if one section throws, the rest survive */
  const renderSection = (id: SectionId) => {
    try {
      return renderSectionInner(id);
    } catch (err) {
      console.error(`[OverlayHUD] Section "${id}" crashed:`, err);
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorCardLabel}>{SECTION_LABELS[id]}</Text>
          <Text style={styles.errorCardHint}>Section error</Text>
        </View>
      );
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: hudOpacity }}>
      {/* ─── HUD Strip (always visible, top-left) ────────── */}
      <div
        style={{
          position: "absolute",
          left: 10,
          top: 10,
          pointerEvents: "auto",
          ...(isImminent ? imminentPulseStyle : hasActive ? sheenStyle : undefined),
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
          <View style={[
            styles.strip,
            borderStyle,
            borderOverride ? { borderColor: borderOverride } : undefined,
          ]}>
            {/* Loadout badge */}
            {weaponName ? (
              <View style={styles.segment}>
                <Text style={styles.weaponName} numberOfLines={1}>
                  {weaponName}
                </Text>
                <View style={styles.buildRow}>
                  <Text style={[styles.buildTag, { color: buildClassColor }]}>
                    {myLoadout.buildClass}
                  </Text>
                  <Text style={[
                    styles.scoreText,
                    accentOverride ? { color: accentOverride } : undefined,
                  ]}>
                    {myLoadout.stats.overallScore}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.segment}>
                <Text style={styles.segmentLabel}>LOADOUT</Text>
                <Text style={styles.segmentValueDim}>--</Text>
              </View>
            )}

            <View style={styles.separator} />

            {/* Next event countdown */}
            <View style={styles.segment}>
              <Text style={styles.segmentLabel}>NEXT</Text>
              <Text style={[
                styles.segmentValue,
                isImminent && styles.segmentValueImminent,
                accentOverride && !isImminent ? { color: accentOverride } : undefined,
              ]}>
                {countdown != null && countdown > 0
                  ? formatCountdown(countdown)
                  : activeEvents.length > 0
                  ? "NOW"
                  : "--:--"}
              </Text>
            </View>

            {/* Lock toggle button */}
            <View style={styles.separator} />
            <div
              style={{ WebkitAppRegion: "no-drag", cursor: "pointer", padding: "4px 10px" } as React.CSSProperties}
              onClick={() => window.arcDesktop?.setOverlayLocked(!locked)}
              onMouseEnter={handleLockMouseEnter}
              onMouseLeave={handleLockMouseLeave}
              title={locked ? "Unlock overlay (Shift+F9)" : "Lock overlay (Shift+F9)"}
            >
              <Text style={[styles.lockIcon, locked && styles.lockIconLocked]}>
                {locked ? "\uD83D\uDD12" : "\uD83D\uDD13"}
              </Text>
            </div>
          </View>
        </div>

      {/* ─── Positioned section cards (have builder-saved positions) ── */}
      {positionedSections.map(({ id, position, width }) => {
        const content = renderSection(id);
        return (
          <div
            key={id}
            style={{
              position: "absolute",
              left: position.x,
              top: position.y,
              width,
              pointerEvents: "auto",
              transform: hudScale !== 1 ? `scale(${hudScale})` : undefined,
              transformOrigin: "top left",
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {content || (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardLabel}>{SECTION_LABELS[id]}</Text>
                <Text style={styles.emptyCardHint}>Waiting for data…</Text>
              </View>
            )}
          </div>
        );
      })}

      {/* ─── Flow-layout section cards (no saved position — auto-stack) ── */}
      {flowSections.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: 10,
            top: STRIP_HEIGHT + 4,
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxHeight: "calc(100vh - 70px)",
            overflowY: "auto",
            transform: hudScale !== 1 ? `scale(${hudScale})` : undefined,
            transformOrigin: "top left",
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {flowSections.map(({ id, width }) => {
            const content = renderSection(id);
            return (
              <div key={id} style={{ width }}>
                {content || (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardLabel}>{SECTION_LABELS[id]}</Text>
                    <Text style={styles.emptyCardHint}>Loading…</Text>
                  </View>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Triggered components (bottom-right area) ──── */}
      <div
        style={{
          position: "absolute",
          right: 10,
          bottom: 10,
          pointerEvents: "auto",
          maxWidth: 360,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <OverlayEventToast alerts={eventAlerts} onDismiss={dismissAlert} />
        <OverlayQuestProgress
          completionQueue={completionQueue}
          onDismiss={dismissCompletion}
          audioVolume={alertSettings.audioVolume}
        />
        {/* Only show triggered pips when their section card isn't already enabled */}
        {!enabledSections.has("mapSelectorContext") && (
          <OverlayMapPip intel={currentMap} onVisibilityChange={setPipVisible} />
        )}
        {!enabledSections.has("inventoryContext") && (
          <OverlayStashPip
            verdicts={stashOrganizer.verdicts}
            stats={stashOrganizer.stats}
            loading={stashOrganizer.loading}
          />
        )}
        {!enabledSections.has("mapSelectorContext") && (
          <OverlayMapIntel intel={currentMap} collapsed={pipVisible} />
        )}
      </div>
    </div>
  );
}

// ─── CSS animations + corner bracket decoration ───────────────────
const sheenStyle: React.CSSProperties = {
  overflow: "hidden",
};

const imminentPulseStyle: React.CSSProperties = {
  overflow: "hidden",
  animation: "overlayPulse 2s ease-in-out infinite",
};

// Inject overlay keyframes + corner bracket styles
if (typeof document !== "undefined") {
  const styleId = "overlay-hud-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes overlayPulse {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.15); }
      }
      @keyframes overlaySheen {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
    `;
    document.head.appendChild(style);
  }
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 14, 18, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.6)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    height: 52,
  },
  stripActive: {
    borderColor: "rgba(0, 180, 216, 0.7)",
  },
  stripImminent: {
    borderColor: "rgba(230, 126, 34, 0.8)",
    borderWidth: 2,
  },
  segment: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  segmentLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1,
  },
  segmentValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  segmentValueDim: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textMuted,
    marginTop: 1,
  },
  segmentValueImminent: {
    color: Colors.amber,
  },
  separator: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(42, 90, 106, 0.4)",
  },
  // ─── Loadout badge ────────────────────────────────────────────
  weaponName: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.text,
    maxWidth: 100,
  },
  buildRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  buildTag: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scoreText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
  },
  lockIcon: {
    fontSize: 14,
    color: "rgba(107, 132, 152, 0.6)",
  },
  lockIconLocked: {
    color: Colors.amber,
  },
  // ─── Empty card placeholder ────────────────────────────────
  emptyCard: {
    backgroundColor: "rgba(10, 14, 18, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.4)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  emptyCardLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1,
  },
  emptyCardHint: {
    fontSize: 10,
    color: "rgba(107, 132, 152, 0.5)",
    marginTop: 2,
  },
  errorCard: {
    backgroundColor: "rgba(10, 14, 18, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(230, 126, 34, 0.5)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorCardLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(230, 126, 34, 0.8)",
    letterSpacing: 1,
  },
  errorCardHint: {
    fontSize: 10,
    color: "rgba(230, 126, 34, 0.5)",
    marginTop: 2,
  },
});
