/**
 * OverlayHUD — In-game HUD with loadout, events, quests, squad, and map intel.
 * ResizeObserver auto-adjusts overlay window height to fit content.
 * Mouse enter/leave toggles click-through via IPC.
 */

import React, { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
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
import { Colors, fonts } from "../theme";
import OverlayEventFeed from "./OverlayEventFeed";
import OverlayActiveQuests from "./OverlayActiveQuests";
import OverlaySquadLoadout from "./OverlaySquadLoadout";
import OverlayMapBriefing from "./OverlayMapBriefing";
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

  // ─── ResizeObserver ────────────────────────────────────────────
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || !window.arcDesktop) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = Math.min(Math.ceil(entry.contentRect.height), 600);
        window.arcDesktop?.resizeOverlay(420, height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const handleDragMouseEnter = useCallback(() => {
    if (locked) return;
    window.arcDesktop?.setIgnoreMouseEvents(false);
  }, [locked]);

  const handleDragMouseDown = useCallback(() => {
    if (locked) return;
    window.arcDesktop?.overlayStartDrag();
  }, [locked]);

  const handleDragMouseUp = useCallback(() => {
    window.arcDesktop?.overlayStopDrag();
  }, []);

  useEffect(() => {
    const onMouseUp = () => window.arcDesktop?.overlayStopDrag();
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  // ─── Border style ─────────────────────────────────────────────
  const borderStyle = isImminent
    ? styles.stripImminent
    : hasActive
    ? styles.stripActive
    : null;

  const buildClassColor = BUILD_CLASS_COLORS[myLoadout.buildClass] ?? Colors.textMuted;

  return (
    <div
      style={{ display: "flex", flexDirection: "column" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={contentRef}>
        {/* ─── HUD Strip (always visible) ─────────────────────── */}
        <div style={isImminent ? imminentPulseStyle : hasActive ? sheenStyle : undefined}>
          <View style={[styles.strip, borderStyle]}>
            {/* Drag handle */}
            <div
              style={dragHandleStyle}
              onMouseEnter={handleDragMouseEnter}
              onMouseDown={handleDragMouseDown}
              onMouseUp={handleDragMouseUp}
            >
              <Text style={styles.dragIcon}>{"\u2801\u2801\u2801"}</Text>
            </div>

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
                  <Text style={styles.scoreText}>{myLoadout.stats.overallScore}</Text>
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

        {/* ─── Collapsible Sections ───────────────────────────── */}
        <OverlayEventFeed
          activeEvents={activeEvents}
          upcomingEvents={upcomingEvents}
          now={now}
          expanded={sections.eventFeed}
          onToggle={() => toggleSection("eventFeed")}
        />

        <OverlayActiveQuests
          quests={allQuests}
          completedIds={completedIds}
          expanded={sections.activeQuests}
          onToggle={() => toggleSection("activeQuests")}
        />

        <OverlaySquadLoadout
          squad={squad}
          expanded={sections.squadLoadout}
          onToggle={() => toggleSection("squadLoadout")}
        />

        <OverlayMapBriefing
          maps={mapRec.maps}
          selectedMap={mapRec.selectedMap}
          onSelectMap={mapRec.setSelectedMap}
          riskAssessment={riskScore.assessment}
          threatSummary={mapRec.threatSummary}
          loadoutFitScore={loadoutFitScore}
          expanded={sections.mapBriefing}
          onToggle={() => toggleSection("mapBriefing")}
        />

        {/* ─── Existing triggered components ──────────────────── */}
        <OverlayEventToast alerts={eventAlerts} onDismiss={dismissAlert} />
        <OverlayQuestProgress
          completionQueue={completionQueue}
          onDismiss={dismissCompletion}
          audioVolume={alertSettings.audioVolume}
        />
        <OverlayMapPip intel={currentMap} onVisibilityChange={setPipVisible} />
        <OverlayStashPip
          verdicts={stashOrganizer.verdicts}
          stats={stashOrganizer.stats}
          loading={stashOrganizer.loading}
        />
        <OverlayMapIntel intel={currentMap} collapsed={pipVisible} />
        <OverlayChecklist />
        <OverlaySquadQuests />
      </div>
    </div>
  );
}

// ─── CSS animations + corner bracket decoration ───────────────────
const sheenStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
};

const dragHandleStyle: React.CSSProperties = {
  padding: "12px 14px",
  cursor: "grab",
  userSelect: "none",
};

const imminentPulseStyle: React.CSSProperties = {
  position: "relative",
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
  dragIcon: {
    fontSize: 16,
    color: "rgba(107, 132, 152, 0.6)",
    letterSpacing: 3,
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
});
