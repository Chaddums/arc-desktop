/**
 * OverlayHUD — Compact in-game HUD strip for the overlay window.
 * Shows active event count + next event countdown.
 * Mouse enter/leave toggles click-through via IPC.
 */

import React, { useEffect, useCallback, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useEventTimer } from "../hooks/useEventTimer";
import { useAutoQuestTracker } from "../hooks/useAutoQuestTracker";
import { useQuestTracker } from "../hooks/useQuestTracker";
import { useEnemyBrowser } from "../hooks/useEnemyBrowser";
import { useCompletedQuests } from "../hooks/useCompletedQuests";
import { useAlertSettings } from "../hooks/useAlertSettings";
import { useMapDetection } from "../hooks/useMapDetection";
import { formatCountdown } from "../utils/format";
import { Colors } from "../theme";
import OverlayChecklist from "./OverlayChecklist";
import OverlayQuestProgress from "./OverlayQuestProgress";
import OverlaySquadQuests from "./OverlaySquadQuests";
import OverlayMapIntel from "./OverlayMapIntel";
import OverlayMapPip from "./OverlayMapPip";

export default function OverlayHUD() {
  const { activeEvents, upcomingEvents, now } = useEventTimer();
  const { questsByTrader } = useQuestTracker();
  const { bots, maps } = useEnemyBrowser();
  const { completedIds } = useCompletedQuests();
  const allQuests = Object.values(questsByTrader).flat();
  const { completionQueue, dismissCompletion } = useAutoQuestTracker(allQuests);
  const { settings: alertSettings } = useAlertSettings();
  const { currentMap } = useMapDetection(maps, bots, activeEvents, allQuests, completedIds);
  const [pipVisible, setPipVisible] = useState(false);

  const nextEvent = upcomingEvents[0];
  const countdown = nextEvent ? nextEvent.startTime - now : null;

  // Imminent = less than 5 min
  const isImminent = countdown != null && countdown > 0 && countdown < 5 * 60 * 1000;
  // Has high-value events
  const hasActive = activeEvents.length > 0;

  // Enable click-through by default
  useEffect(() => {
    window.arcDesktop?.setIgnoreMouseEvents(true, { forward: true });
  }, []);

  const handleMouseEnter = useCallback(() => {
    window.arcDesktop?.setIgnoreMouseEvents(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    window.arcDesktop?.setIgnoreMouseEvents(true, { forward: true });
  }, []);

  // Tiered border: imminent → amber pulse, active → accent, default → dim
  const borderStyle = isImminent
    ? styles.stripImminent
    : hasActive
    ? styles.stripActive
    : null;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={isImminent ? imminentPulseStyle : hasActive ? sheenStyle : undefined}>
        <View style={[styles.strip, borderStyle]}>
          {/* Drag handle */}
          <View style={styles.dragHandle}>
            <Text style={styles.dragIcon}>{"\u2801\u2801\u2801"}</Text>
          </View>

          {/* Active events */}
          <View style={styles.segment}>
            <Text style={styles.segmentLabel}>ACTIVE</Text>
            <Text style={[styles.segmentValue, hasActive && styles.segmentValueActive]}>
              {activeEvents.length}
            </Text>
          </View>

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

          {nextEvent && (
            <>
              <View style={styles.separator} />
              <View style={[styles.segment, styles.segmentWide]}>
                <Text style={styles.eventName} numberOfLines={1}>
                  {nextEvent.name}
                </Text>
                <Text style={styles.eventMap}>{nextEvent.map}</Text>
              </View>
            </>
          )}
        </View>
      </div>
      <OverlayQuestProgress
        completionQueue={completionQueue}
        onDismiss={dismissCompletion}
        audioVolume={alertSettings.audioVolume}
      />
      <OverlayMapPip intel={currentMap} onVisibilityChange={setPipVisible} />
      <OverlayMapIntel intel={currentMap} collapsed={pipVisible} />
      <OverlayChecklist />
      <OverlaySquadQuests />
    </div>
  );
}

// ─── CSS animations for overlay polish (web only) ────────────────

const sheenStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
};

const imminentPulseStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  animation: "overlayPulse 2s ease-in-out infinite",
};

// Inject overlay keyframes
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
    backgroundColor: "rgba(10, 14, 18, 0.88)",
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
  dragHandle: {
    paddingHorizontal: 6,
    cursor: "grab",
    // @ts-ignore — web-only property
    WebkitAppRegion: "drag",
  } as any,
  dragIcon: {
    fontSize: 14,
    color: "rgba(107, 132, 152, 0.6)",
    letterSpacing: 2,
  },
  segment: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  segmentWide: {
    flex: 1,
    alignItems: "flex-start",
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
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  segmentValueActive: {
    color: Colors.green,
  },
  segmentValueImminent: {
    color: Colors.amber,
  },
  separator: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(42, 90, 106, 0.4)",
  },
  eventName: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.text,
  },
  eventMap: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
