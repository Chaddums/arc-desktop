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
import { useAlertSettings } from "../hooks/useAlertSettings";
import { formatCountdown } from "../utils/format";
import { Colors } from "../theme";
import OverlayChecklist from "./OverlayChecklist";
import OverlayQuestProgress from "./OverlayQuestProgress";

export default function OverlayHUD() {
  const { activeEvents, upcomingEvents, now } = useEventTimer();
  const { questsByTrader } = useQuestTracker();
  const allQuests = Object.values(questsByTrader).flat();
  const { completionQueue, dismissCompletion } = useAutoQuestTracker(allQuests);
  const { settings: alertSettings } = useAlertSettings();

  const nextEvent = upcomingEvents[0];
  const countdown = nextEvent ? nextEvent.startTime - now : null;

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

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <View style={styles.strip}>
        {/* Drag handle */}
        <View style={styles.dragHandle}>
          <Text style={styles.dragIcon}>{"\u2801\u2801\u2801"}</Text>
        </View>

        {/* Active events */}
        <View style={styles.segment}>
          <Text style={styles.segmentLabel}>ACTIVE</Text>
          <Text style={styles.segmentValue}>{activeEvents.length}</Text>
        </View>

        <View style={styles.separator} />

        {/* Next event countdown */}
        <View style={styles.segment}>
          <Text style={styles.segmentLabel}>NEXT</Text>
          <Text style={styles.segmentValue}>
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
      <OverlayQuestProgress
        completionQueue={completionQueue}
        onDismiss={dismissCompletion}
        audioVolume={alertSettings.audioVolume}
      />
      <OverlayChecklist />
    </div>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 14, 18, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.6)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    height: 52,
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
