/**
 * OverlayHUD — In-game HUD with loadout, events, quests, squad, and map intel.
 * ResizeObserver auto-adjusts overlay window height to fit content.
 * Mouse enter/leave toggles click-through via IPC.
 * Supports dynamic section ordering and HUD color overrides.
 */

import React, { useEffect, useCallback, useState, useMemo, useRef } from "react";
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
import { loc } from "../utils/loc";
import { Colors } from "../theme";
import type { SectionId, SectionConfig, HudColorConfig } from "../hooks/useOverlayConfig";
import { DEFAULT_SECTION_CONFIGS } from "../hooks/useOverlayConfig";
import { useQuestPairing } from "../hooks/useQuestPairing";
import { useBuildAdvisor } from "../hooks/useBuildAdvisor";
import { useSkillTree } from "../hooks/useSkillTree";
import { useDailyQuests } from "../hooks/useDailyQuests";
import { useMenuDetection } from "../hooks/useMenuDetection";
import OverlayStatusStrip from "./OverlayStatusStrip";
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

const SECTION_LABELS: Record<SectionId, string> = {
  statusStrip: "STATUS BAR",
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
  "statusStrip",
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

  // ─── Edit mode state (F10 in-overlay card positioning) ──────
  const [editMode, setEditMode] = useState(false);
  const [editPositions, setEditPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const editDragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const editPositionsRef = useRef(editPositions);
  editPositionsRef.current = editPositions;

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

  // Lazy-load stash analysis only when inventory/stash menu detected
  const stashAnalyzedRef = React.useRef(false);
  useEffect(() => {
    if (!stashAnalyzedRef.current && (menuState === "inventory" || menuState === "stash")) {
      stashAnalyzedRef.current = true;
      stashOrganizer.refresh();
    }
  }, [menuState]);

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
          // Migrate: add new sections + backfill missing position/width from defaults
          const savedIds = new Set(saved.sectionConfigs.map((c: SectionConfig) => c.id));
          const maxOrder = Math.max(...saved.sectionConfigs.map((c: SectionConfig) => c.order), -1);
          let nextOrder = maxOrder + 1;
          let needsPersist = false;
          for (const id of DEFAULT_SECTION_ORDER) {
            if (!savedIds.has(id)) {
              const def = DEFAULT_SECTION_CONFIGS.find((d) => d.id === id);
              saved.sectionConfigs.push(def ? { ...def, order: nextOrder++ } : { id, enabled: true, order: nextOrder++, locked: false });
              needsPersist = true;
            }
          }
          // Backfill position/width for existing entries that lack them
          saved.sectionConfigs = saved.sectionConfigs.map((cfg: SectionConfig) => {
            if (!cfg.position) {
              const def = DEFAULT_SECTION_CONFIGS.find((d) => d.id === cfg.id);
              if (def?.position) {
                needsPersist = true;
                return { ...cfg, position: def.position, width: cfg.width ?? def.width };
              }
            }
            return cfg;
          });
          // Persist migration so builder picks up the same data on next load
          if (needsPersist) {
            await AsyncStorage.setItem("@arcview/overlay-config", JSON.stringify(saved));
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
  const STRIP_HEIGHT = 10; // top margin for flow-layout fallback
  const DEFAULT_CARD_FRAC = 0.2; // default card width as fraction of screen
  const EDGE_MARGIN = 6; // px inset from screen edges
  const CARD_HEIGHT_EST = 140; // estimated card height for bottom-edge clamping

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
        // Clamp so cards never bleed past screen edges
        const rawX = cfg.position.x * sw;
        const rawY = cfg.position.y * sh;
        const x = Math.max(EDGE_MARGIN, Math.min(rawX, sw - width - EDGE_MARGIN));
        const y = Math.max(EDGE_MARGIN, Math.min(rawY, sh - CARD_HEIGHT_EST - EDGE_MARGIN));
        positioned.push({
          id,
          position: { x, y },
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
    if (!locked && !editMode) {
      window.arcDesktop?.setIgnoreMouseEvents(true, { forward: true });
    }
  }, [locked, editMode]);

  // ─── Edit mode IPC listeners ──────────────────────────────────
  const exitEditMode = useCallback(() => {
    setEditMode(false);
    setDraggingId(null);
    editDragRef.current = null;
    window.arcDesktop?.setIgnoreMouseEvents(true, { forward: true });
  }, []);

  useEffect(() => {
    const unsubToggle = window.arcDesktop?.onOverlayEditModeToggle(() => {
      setEditMode((prev) => {
        const next = !prev;
        if (next) {
          window.arcDesktop?.setIgnoreMouseEvents(false);
        } else {
          editDragRef.current = null;
          window.arcDesktop?.setIgnoreMouseEvents(true, { forward: true });
        }
        return next;
      });
      // Clear drag state outside the updater
      setDraggingId(null);
    });
    const unsubExit = window.arcDesktop?.onOverlayExitEditMode(() => {
      exitEditMode();
    });
    return () => {
      unsubToggle?.();
      unsubExit?.();
    };
  }, [exitEditMode]);

  // ─── Edit mode drag system ───────────────────────────────────
  const handleEditDragStart = useCallback((e: React.MouseEvent, id: string, currentX: number, currentY: number) => {
    e.preventDefault();
    editDragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: currentX, origY: currentY };
    setDraggingId(id);
  }, []);

  useEffect(() => {
    if (!editMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const drag = editDragRef.current;
      if (!drag) return;
      const sw = window.innerWidth;
      const sh = window.innerHeight;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const x = Math.max(EDGE_MARGIN, Math.min(drag.origX + dx, sw - EDGE_MARGIN - 100));
      const y = Math.max(EDGE_MARGIN, Math.min(drag.origY + dy, sh - EDGE_MARGIN - 40));
      setEditPositions((prev) => ({ ...prev, [drag.id]: { x, y } }));
    };

    const handleMouseUp = async () => {
      const drag = editDragRef.current;
      if (!drag) return;
      editDragRef.current = null;
      setDraggingId(null);

      // Read latest position from ref (avoids stale closure)
      const pos = editPositionsRef.current[drag.id];
      if (!pos) return;

      // Normalize to 0-1 and save to AsyncStorage
      const sw = window.innerWidth;
      const sh = window.innerHeight;
      const normX = pos.x / sw;
      const normY = pos.y / sh;

      try {
        const raw = await AsyncStorage.getItem("@arcview/overlay-config");
        if (raw) {
          const cfg = JSON.parse(raw);
          if (cfg.sectionConfigs) {
            cfg.sectionConfigs = cfg.sectionConfigs.map((sc: any) =>
              sc.id === drag.id ? { ...sc, position: { x: normX, y: normY } } : sc,
            );
            await AsyncStorage.setItem("@arcview/overlay-config", JSON.stringify(cfg));
            // Update local savedConfigs so the card stays in place
            setSavedConfigs(cfg.sectionConfigs);
          }
        }
      } catch {}
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [editMode]);

  // ─── Mouse event handlers ─────────────────────────────────────
  const handleMouseEnter = useCallback(() => {
    if (locked || editMode) return;
    window.arcDesktop?.setIgnoreMouseEvents(false);
  }, [locked, editMode]);

  const handleMouseLeave = useCallback(() => {
    if (locked || editMode) return;
    window.arcDesktop?.setIgnoreMouseEvents(true, { forward: true });
  }, [locked, editMode]);

  // ─── HUD color overrides ──────────────────────────────────────
  const accentOverride = hudColors?.accentColor;
  const borderOverride = hudColors?.borderColor;
  const headerOverride = hudColors?.headerColor;

  // ─── Section renderer (dynamic order, crash-isolated) ──────────
  const renderSectionInner = (id: SectionId) => {
    switch (id) {
      case "statusStrip":
        return (
          <OverlayStatusStrip
            key={id}
            weaponName={weaponName}
            buildClass={myLoadout.buildClass}
            overallScore={myLoadout.stats.overallScore}
            countdown={countdown}
            isImminent={isImminent}
            hasActive={hasActive}
            headerColor={headerOverride}
            borderColor={borderOverride}
          />
        );
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
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: hudOpacity, overflow: "hidden" }}>
      {/* ─── Edit Mode Banner ────────────────────────────── */}
      {editMode && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 32,
          backgroundColor: "rgba(230, 126, 34, 0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "auto",
          zIndex: 9999,
        }}>
          <span style={{
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2,
            fontFamily: "monospace",
          }}>
            EDIT MODE — DRAG CARDS — PRESS F10 TO LOCK
          </span>
        </div>
      )}

      {/* ─── Positioned section cards (have builder-saved positions) ── */}
      {positionedSections.map(({ id, position, width }) => {
        const content = renderSection(id);
        const editPos = editPositions[id];
        const effectiveX = editPos ? editPos.x : position.x;
        const effectiveY = editPos ? editPos.y : position.y;
        const isDragging = draggingId === id;
        return (
          <div
            key={id}
            style={{
              position: "absolute",
              left: effectiveX,
              top: effectiveY,
              width,
              pointerEvents: "auto",
              transform: hudScale !== 1 ? `scale(${hudScale})` : undefined,
              transformOrigin: "top left",
              ...(editMode ? {
                outline: isDragging ? "2px solid rgba(230, 126, 34, 0.9)" : "1px dashed rgba(230, 126, 34, 0.6)",
                cursor: isDragging ? "grabbing" : "grab",
                boxShadow: isDragging ? "0 0 16px rgba(230, 126, 34, 0.4)" : undefined,
                userSelect: "none" as const,
              } : undefined),
            }}
            onMouseEnter={editMode ? undefined : handleMouseEnter}
            onMouseLeave={editMode ? undefined : handleMouseLeave}
            onMouseDown={editMode ? (e) => handleEditDragStart(e, id, effectiveX, effectiveY) : undefined}
          >
            {editMode && (
              <div style={{
                position: "absolute",
                top: -18,
                left: 0,
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(230, 126, 34, 0.9)",
                letterSpacing: 1,
                fontFamily: "monospace",
                pointerEvents: "none",
              }}>
                ⣿ {SECTION_LABELS[id]}
              </div>
            )}
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


const styles = StyleSheet.create({
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
