/**
 * OverlayMapSelectorContext — Context panel shown when map selector menu detected.
 * Shows quest alignment per map, best map recommendation, and active events.
 * Tier 2 context-aware panel.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { RaidTheoryQuest, GameEvent } from "../types";
import type { QuestPairing } from "../hooks/useQuestPairing";
import { Colors, fonts } from "../theme";

interface Props {
  pairings: QuestPairing[];
  activeEvents: GameEvent[];
  maps: string[];
  headerColor?: string;
  borderColor?: string;
}

export default function OverlayMapSelectorContext({
  pairings,
  activeEvents,
  maps,
  headerColor,
  borderColor,
}: Props) {
  if (pairings.length === 0 && activeEvents.length === 0) return null;

  // Best map = pairing with most quests
  const bestMap = pairings[0] ?? null;

  return (
    <View style={[styles.container, borderColor ? { borderColor } : undefined]}>
      <View style={styles.header}>
        <View style={styles.contextDot} />
        <Text style={[styles.headerText, headerColor ? { color: headerColor } : undefined]}>MAP SELECT INTEL</Text>
      </View>

      {/* Best map recommendation */}
      {bestMap && (
        <View style={styles.recommendation}>
          <Text style={styles.recLabel}>RECOMMENDED</Text>
          <Text style={styles.recMap}>{bestMap.map}</Text>
          <Text style={styles.recReason}>
            {bestMap.quests.length} quests completable
          </Text>
        </View>
      )}

      {/* Quest alignment per map */}
      {pairings.slice(0, 4).map((pairing) => (
        <View key={pairing.map} style={styles.mapRow}>
          <Text style={styles.mapName}>{pairing.map}</Text>
          <View style={styles.questBar}>
            <View
              style={[
                styles.questBarFill,
                {
                  width: `${Math.min(100, pairing.quests.length * 25)}%`,
                  backgroundColor:
                    pairing === bestMap ? Colors.green : Colors.accent,
                },
              ]}
            />
          </View>
          <Text style={styles.questCount}>{pairing.quests.length}q</Text>
        </View>
      ))}

      {/* Active events on maps */}
      {activeEvents.length > 0 && (
        <View style={styles.eventsSection}>
          <Text style={styles.eventsHeader}>ACTIVE EVENTS</Text>
          {activeEvents.slice(0, 3).map((evt, i) => (
            <View key={i} style={styles.eventRow}>
              <View style={styles.eventDot} />
              <Text style={styles.eventName} numberOfLines={1}>{evt.name}</Text>
              <Text style={styles.eventMap}>{evt.map}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 14, 18, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.6)",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  contextDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
  },
  recommendation: {
    backgroundColor: "rgba(45, 155, 78, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(45, 155, 78, 0.3)",
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 4,
  },
  recLabel: {
    fontSize: 7,
    fontWeight: "700",
    color: Colors.green,
    letterSpacing: 0.5,
  },
  recMap: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  recReason: {
    fontSize: 8,
    color: Colors.textMuted,
  },
  mapRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 20,
    gap: 6,
  },
  mapName: {
    fontSize: 9,
    fontWeight: "600",
    color: Colors.text,
    width: 70,
  },
  questBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(42, 90, 106, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  questBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  questCount: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
    width: 20,
    textAlign: "right",
  },
  eventsSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(42, 90, 106, 0.3)",
    paddingTop: 4,
    marginTop: 4,
  },
  eventsHeader: {
    fontSize: 7,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.6)",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 18,
    gap: 4,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.green,
  },
  eventName: {
    flex: 1,
    fontSize: 9,
    fontWeight: "600",
    color: Colors.text,
  },
  eventMap: {
    fontSize: 8,
    color: Colors.textSecondary,
  },
});
