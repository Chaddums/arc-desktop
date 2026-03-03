/**
 * OverlayQuestTracker — Quest/resource tracker checklist with auto-completing
 * objectives via OCR. Groups quests by map for efficient raid planning.
 * Tier 1 HUD panel.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { QuestPairing } from "../hooks/useQuestPairing";
import { Colors, fonts } from "../theme";

interface Props {
  pairings: QuestPairing[];
  completedIds: Set<string>;
  expanded: boolean;
  onToggle: () => void;
  headerColor?: string;
  borderColor?: string;
}

export default function OverlayQuestTracker({
  pairings,
  completedIds,
  expanded,
  onToggle,
  headerColor,
  borderColor,
}: Props) {
  // Count total trackable quests across all pairings
  const totalQuests = pairings.reduce((sum, p) => sum + p.quests.length, 0);
  const completedCount = pairings.reduce(
    (sum, p) => sum + p.quests.filter((q) => completedIds.has(q.questId)).length,
    0,
  );

  return (
    <View style={[styles.container, borderColor ? { borderColor } : undefined]}>
      <TouchableOpacity onPress={onToggle} style={styles.header} activeOpacity={0.7}>
        <Text style={[styles.headerText, headerColor ? { color: headerColor } : undefined]}>
          {expanded ? "\u25B4" : "\u25BE"} QUEST TRACKER ({completedCount}/{totalQuests})
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {pairings.slice(0, 3).map((pairing) => (
            <View key={pairing.map} style={styles.group}>
              <View style={styles.mapRow}>
                <View style={styles.mapDot} />
                <Text style={styles.mapName}>{pairing.map}</Text>
                <Text style={styles.reasoning} numberOfLines={1}>
                  {pairing.reasoning}
                </Text>
              </View>
              {pairing.quests.map((quest) => {
                const done = completedIds.has(quest.questId);
                return (
                  <View key={quest.questId} style={styles.questRow}>
                    <View style={[styles.checkbox, done && styles.checkboxDone]}>
                      {done && <Text style={styles.checkmark}>{"\u2713"}</Text>}
                    </View>
                    <Text
                      style={[styles.questName, done && styles.questNameDone]}
                      numberOfLines={1}
                    >
                      {quest.questName}
                    </Text>
                    <View style={styles.traderBadge}>
                      <Text style={styles.traderText}>
                        {quest.trader.slice(0, 3).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 14, 18, 0.90)",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "rgba(42, 90, 106, 0.6)",
    paddingHorizontal: 10,
  },
  header: {
    paddingVertical: 4,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  body: {
    paddingBottom: 4,
  },
  group: {
    marginBottom: 4,
  },
  mapRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 18,
    gap: 4,
  },
  mapDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  mapName: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reasoning: {
    flex: 1,
    fontSize: 8,
    color: Colors.textMuted,
    textAlign: "right",
  },
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 22,
    paddingLeft: 9,
    gap: 6,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(42, 90, 106, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  checkmark: {
    fontSize: 7,
    color: "#fff",
    fontWeight: "700",
  },
  questName: {
    flex: 1,
    fontSize: 10,
    fontWeight: "500",
    color: Colors.text,
  },
  questNameDone: {
    textDecorationLine: "line-through",
    color: Colors.textMuted,
  },
  traderBadge: {
    backgroundColor: "rgba(0, 180, 216, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 180, 216, 0.3)",
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  traderText: {
    fontSize: 7,
    fontWeight: "700",
    color: Colors.accent,
    letterSpacing: 0.5,
  },
});
